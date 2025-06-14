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
  const { imageId } = job.data;
  console.log(
    `Job ${job.id} completed. Result type: ${result.type}. Handing off to image-processing worker.`
  );

  try {
    // --- JOB HANDOFF LOGIC ---
    if (result.type === "b64_json") {
      // For b64 data, we must wait for the upload. Mark status as UPLOADING.
      await prisma.generatedImages.update({
        where: { id: imageId },
        data: { status: "UPLOADING", providerRequestId: result.requestId }, // A new intermediate status
      });
      // Create a job to process the Base64 data
      await imageProcessingQueue.add("process-b64", {
        imageId: imageId,
        b64_json: result.data,
      });
    } else if (result.type === "url") {
      // For a URL, we can show the result immediately and process in the background.
      // Step 1: Update DB with the temporary URL and mark as GENERATED.
      await prisma.generatedImages.update({
        where: { id: imageId },
        data: {
          status: "GENERATED",
          providerRequestId: result.requestId,
          imageUrl: result.data, // This is the temporary URL from the provider
        },
      });
      console.log(
        `Temporarily updated DB for imageId ${imageId} with provider URL.`
      );

      // Step 2: Queue a background job to download the image and move it to our S3.
      await imageProcessingQueue.add("process-url", {
        imageId: imageId,
        url: result.data,
      });
    }
  } catch (error) {
    console.error(
      `Failed to hand off job ${job.id} (imageId: ${imageId}) to the image-processing queue:`,
      error
    );
    // If the handoff fails, we must mark the original job as failed in the DB.
    await prisma.generatedImages.update({
      where: { id: imageId },
      data: {
        status: "FAILED",
        failReason: "Failed to queue for image processing.",
      },
    });
  }
});

// The 'failed' handler for this worker can remain largely the same.
// It should update the DB to FAILED immediately.
worker.on("failed", async (job, err) => {
  if (job) {
    console.error(
      `Job for imageId ${job.data.imageId} has failed with error: ${err.message}`
    );
    try {
      await prisma.generatedImages.update({
        where: { id: job.data.imageId },
        data: {
          status: "FAILED",
          failReason: err.message,
          attempt: { increment: 1 },
        },
      });
    } catch (dbError) {
      console.error(
        `Failed to update database for FAILED job (imageId: ${job.data.imageId}):`,
        dbError
      );
    }
  } else {
    console.error(
      `A job failed, but the job object was undefined. Error: ${err.message}`
    );
  }
});

worker.on("error", (err) => {
  console.error("Worker encountered an error:", err);
});

console.log(
  'Worker is up and listening for jobs on the "photo-generation" queue.'
);
