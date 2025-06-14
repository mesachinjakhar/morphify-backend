/**
 * src/image.worker.ts
 * * This is the "Image Processor" worker.
 * It listens for jobs to download or decode images and upload them to S3.
 * It is responsible for the final DB update upon success.
 * ---
 * To run this, you'll execute it as another separate process:
 * `npx ts-node src/image.worker.ts`
 */
import { Worker, Job } from "bullmq";
import "dotenv/config";
import { S3Service } from "./services/s3.service";
import { prisma } from "./lib/prisma";

// --- Types for Job Data ---
interface IBaseJobData {
  imageId: string; // The ID of the image record in our database.
}
interface IUrlJobData extends IBaseJobData {
  url: string;
}
interface IB64JobData extends IBaseJobData {
  b64_json: string;
}

// Centralized connection details
const redisConnection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
};

// --- The Processor ---
// This function determines what to do based on the job's name.
const processor = async (
  job: Job<IUrlJobData | IB64JobData>
): Promise<void> => {
  const { imageId } = job.data;
  await job.log(`Starting image processing for imageId: ${imageId}`);

  let finalImageUrl: string;

  try {
    // We use the job's name to decide which logic to run.
    if (job.name === "process-url") {
      const data = job.data as IUrlJobData;
      await job.log(`Downloading from URL: ${data.url}`);
      finalImageUrl = await S3Service.downloadAndUploadToS3(data.url);
    } else if (job.name === "process-b64") {
      const data = job.data as IB64JobData;
      await job.log(`Decoding and uploading Base64 data.`);
      finalImageUrl = await S3Service.uploadB64ToS3(data.b64_json);
    } else {
      throw new Error(`Unknown job name: ${job.name}`);
    }

    await job.log(`Upload successful. Final S3 URL: ${finalImageUrl}`);

    // --- FINAL DATABASE UPDATE ---
    // Now we update the database record with the permanent S3 URL.
    await prisma.generatedImages.update({
      where: { id: imageId },
      data: {
        status: "GENERATED",
        imageUrl: finalImageUrl, // The permanent S3 URL
      },
    });
    console.log(`Successfully updated DB for imageId ${imageId}.`);
  } catch (error: any) {
    console.error(`Processing failed for imageId ${imageId}:`, error.message);
    // On failure, update the DB record to FAILED.
    await prisma.generatedImages.update({
      where: { id: imageId },
      data: {
        status: "FAILED",
        failReason: `Image processing failed: ${error.message}`,
        attempt: { increment: 1 },
      },
    });
    // Re-throw the error to make sure the job is marked as 'failed' in BullMQ
    throw error;
  }
};

// --- Worker Initialization ---
console.log("Image processing worker starting...");
const worker = new Worker("image-processing", processor, {
  connection: redisConnection,
  concurrency: 10, // Can handle more concurrent jobs as they are I/O bound.
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
});

worker.on("completed", (job) => {
  console.log(
    `Image processing job ${job.id} for imageId ${job.data.imageId} has completed.`
  );
});

worker.on("failed", (job, err) => {
  if (job) {
    console.error(
      `Image processing job ${job.id} for imageId ${job.data.imageId} has failed: ${err.message}`
    );
  } else {
    console.error(
      `An image processing job failed with an undefined job object: ${err.message}`
    );
  }
});

worker.on("error", (err) => {
  console.error("Image processing worker encountered an error:", err);
});

console.log(
  'Image Processor is up and listening for jobs on the "image-processing" queue.'
);
