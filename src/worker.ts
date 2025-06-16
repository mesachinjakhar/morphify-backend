/**
 * src/worker.ts
 * * This is the "Kitchen Staff" process. It's the real workhorse.
 * It connects to Redis, listens for jobs, and executes them by calling the
 * correct AI provider.
 * ---
 * To run this, you'll execute it as a separate process from your main API server:
 * `npx ts-node src/worker.ts`
 */
import { Worker, Job, Queue } from "bullmq";
import "dotenv/config"; // Ensures environment variables are loaded

import { getProvider } from "./services/providers/provider.strategy";
import { IPhotoJobData } from "./services/job.service";
import { GenerateImageOutput } from "./services/providers/provider.interface";
import { prisma } from "./lib/prisma";
import MstarManager from "./services/mstar/mstarManager";

const mstarManager = new MstarManager(prisma);

// Centralized connection details
const redisConnection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
};

// --- Initialize a queue object for the NEXT stage in the pipeline ---
const imageProcessingQueue = new Queue("image-processing", {
  connection: redisConnection,
});

// The processor function is where the actual work happens.
// It receives a job and must return a promise that resolves with the result.
const processor = async (
  job: Job<IPhotoJobData, GenerateImageOutput>
): Promise<GenerateImageOutput> => {
  const { imageId, providerName, modelName, input } = job.data;
  await job.log(
    `Starting job ${imageId}: Generating image with ${providerName}/${modelName}.`
  );

  // This is the core logic: the worker waits, so the user doesn't have to.
  const provider = getProvider(providerName, modelName);

  if (!provider) {
    await job.log("Error: Provider or model not found.");
    throw new Error(`Provider or model not found for job ${job.id}`);
  }

  // Update progress (optional but good for observability)
  await job.updateProgress(25);
  await job.log("Provider found, starting image generation...");

  // The worker process calls the provider and waits for the full response.
  // This could take seconds or minutes, which is perfectly fine for a background worker.
  const result = await provider.generateImage(input);

  await job.log("Image generation completed successfully.");
  await job.updateProgress(100);

  // The return value of this function is saved as the job's result.
  return result;
};

// --- Worker Initialization ---
console.log("Worker process starting...");
console.log(
  `Connecting to Redis at ${redisConnection.host}:${redisConnection.port}`
);

const worker = new Worker<IPhotoJobData, GenerateImageOutput>(
  "photo-generation", // Must match the queue name from job.service.ts
  processor,
  {
    connection: redisConnection,
    concurrency: 5, // Process up to 5 jobs simultaneously from this worker instance.
    removeOnComplete: { count: 100 }, // Keep the last 1000 completed jobs
    removeOnFail: { count: 50 }, // Keep the last 5000 failed jobs
  }
);

// --- REFACTORED Event Listeners ---
worker.on("completed", async (job, result) => {
  const { imageId, transactionId } = job.data; // Retrieve transactionId from job data

  if (!transactionId) {
    console.error(
      `CRITICAL ERROR: Job ${job.id} (imageId: ${imageId}) completed without a transactionId. Cannot process.`
    );
    // Mark as failed because we cannot resolve the transaction state
    await prisma.generatedImages.update({
      where: { id: imageId },
      data: {
        status: "FAILED",
        failReason: "Internal Error: Missing transaction ID.",
      },
    });
    return;
  }

  console.log(
    `Job ${job.id} completed. Result type: ${result.type}. Committing transaction ${transactionId}.`
  );

  try {
    // --- STAGE 1: Commit the M-Star Transaction ---
    // This is the point of no return. The user is now charged for the generation.
    await mstarManager.commitTransaction(transactionId);
    console.log(`Transaction ${transactionId} committed successfully.`);

    // --- STAGE 2: Hand-off to Image Processing Queue ---
    // This part is largely the same, but if it fails, the user has already been correctly charged.
    if (result.type === "b64_json") {
      await prisma.generatedImages.update({
        where: { id: imageId },
        data: { status: "UPLOADING", providerRequestId: result.requestId },
      });
      await imageProcessingQueue.add("process-b64", {
        imageId: imageId,
        b64_json: result.data,
      });
    } else if (result.type === "url") {
      await prisma.generatedImages.update({
        where: { id: imageId },
        data: {
          status: "GENERATED",
          providerRequestId: result.requestId,
          imageUrl: result.data,
        },
      });
      await imageProcessingQueue.add("process-url", {
        imageId: imageId,
        url: result.data,
      });
    }
  } catch (error) {
    // This catch block now handles failures in either committing the transaction
    // or handing off to the next queue.
    console.error(
      `Failed during post-processing for job ${job.id} (imageId: ${imageId}):`,
      error
    );

    // Type guard to safely access the error message.
    let failReason = "Failed to queue for image processing.";
    if (error instanceof Error) {
      if (
        error.message === "Transaction not found or not in PROCESSING state."
      ) {
        failReason = "Failed to commit transaction.";
      } else {
        // Use the actual error message if it's a different error
        failReason = error.message;
      }
    } else {
      failReason = "An unknown error occurred during post-processing.";
    }

    // We update the DB to reflect the failure. The transaction might have been committed
    // but the subsequent step failed, which is a valid failure state.
    await prisma.generatedImages.update({
      where: { id: imageId },
      data: {
        status: "FAILED",
        failReason: failReason,
      },
    });
  }
});

// The 'failed' handler for this worker can remain largely the same.
// It should update the DB to FAILED immediately.
worker.on("failed", async (job, error) => {
  // Define the maximum number of attempts before considering the job permanently failed.
  const MAX_ATTEMPTS = 3;

  // --- STAGE 1: Basic Job and Error Validation ---
  if (!job) {
    console.error(
      "A job failed, but the job object was undefined. This might be due to a Redis connection issue."
    );
    throw new Error("Job object is undefined in the 'failed' event handler.");
  }

  const { imageId, transactionId } = job.data;
  const errorMessage =
    error instanceof Error ? error.message : "An unknown error occurred.";

  console.log(
    `Job ${job.id} (imageId: ${imageId}) reported a failure with error: ${errorMessage}`
  );

  try {
    // --- STAGE 2: Increment Attempt Count and Check Status in DB ---

    // Atomically increment the attempt counter and store the latest fail reason.
    // The `update` call returns the updated record, so we can check the new attempt count.
    const updatedImage = await prisma.generatedImages.update({
      where: { id: imageId },
      data: {
        attempt: { increment: 1 },
        // Storing the latest error message is useful for debugging each attempt.
        failReason: errorMessage,
      },
    });

    const newAttemptCount = updatedImage.attempt;
    console.log(
      `Image ${imageId} is now on attempt ${newAttemptCount}/${MAX_ATTEMPTS}.`
    );

    // --- STAGE 3: Decide Whether to Refund or Retry ---

    // If we have not yet reached the max number of attempts, do not refund.
    // BullMQ will handle the retry based on its configuration.
    if (newAttemptCount < MAX_ATTEMPTS) {
      console.log(
        `Job ${job.id} will be retried. Not cancelling transaction at this time.`
      );
      return; // Exit and wait for the next attempt.
    }

    // --- STAGE 4: Handle Permanent Failure (Max Attempts Reached) ---

    console.error(
      `Job ${job.id} has failed on its final attempt (${newAttemptCount}/${MAX_ATTEMPTS}). Proceeding to cancel transaction and mark as failed.`
    );

    if (transactionId) {
      try {
        // Attempt to cancel the transaction (issue a refund).
        await mstarManager.cancelTransaction(transactionId);
        console.log(
          `Transaction ${transactionId} for job ${job.id} cancelled successfully.`
        );

        // After a successful refund, finalize the image status as FAILED in the database.
        await prisma.generatedImages.update({
          where: { id: imageId },
          data: {
            status: "FAILED",
            failReason: `Job failed after ${newAttemptCount} attempts. User was refunded. Final error: ${errorMessage}`,
          },
        });
      } catch (cancelError) {
        // CRITICAL STATE: The job failed, AND we failed to refund the user.
        const refundErrorMessage =
          cancelError instanceof Error
            ? cancelError.message
            : "Unknown refund process error.";
        console.error(
          `CRITICAL ERROR: Job ${job.id} failed, and refunding transaction ${transactionId} also FAILED. Manual intervention required. Refund error: ${refundErrorMessage}`
        );

        await prisma.generatedImages.update({
          where: { id: imageId },
          data: {
            status: "FAILED",
            failReason: `CRITICAL: The job failed, and the automated refund also failed. Please contact support. Final job error: ${errorMessage}`,
          },
        });
      }
    } else {
      // CRITICAL STATE: The job failed permanently, but no transactionId is available.
      console.error(
        `CRITICAL ERROR: Failed job ${job.id} is missing a transactionId. Cannot issue a refund.`
      );

      await prisma.generatedImages.update({
        where: { id: imageId },
        data: {
          status: "FAILED",
          failReason: `Job failed after ${newAttemptCount} attempts, but no transactionId was found, so no refund was issued. Final error: ${errorMessage}`,
        },
      });
    }
  } catch (dbError) {
    // Handle cases where the database update itself fails.
    const dbErrorMessage =
      dbError instanceof Error ? dbError.message : "Unknown DB error.";
    console.error(
      `FATAL ERROR: Could not update the attempt count in the database for job ${job.id} (imageId: ${imageId}). Error: ${dbErrorMessage}`
    );
    // Depending on your requirements, you might want to throw this error to crash the worker
    // and signal a major problem with your database connection or schema.
    throw dbError;
  }
});

worker.on("error", (err) => {
  console.error("Worker encountered an error:", err);
});

console.log(
  'Worker is up and listening for jobs on the "photo-generation" queue.'
);
