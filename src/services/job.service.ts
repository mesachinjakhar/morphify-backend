/**
 * src/services/job.service.ts
 * * This service manages our job queue (BullMQ).
 * It handles adding jobs and retrieving them to check their status.
 */
import { Queue, Job } from "bullmq";
import {
  GenerateImageInput,
  GenerateImageOutput,
} from "./providers/provider.interface";

import redisClient from "../auth/config/redis";

// Define the structure of the data our job will carry.
export interface IPhotoJobData {
  imageId: string;
  providerName: string;
  modelName: string;
  input: GenerateImageInput;
}

// --- Connection Setup ---
// In a real app, connection details should come from environment variables.
const connection = redisClient;

connection.on("connect", () => console.log("Redis connected successfully!"));
connection.on("error", (err) => console.error("Redis connection error:", err));

// --- Queue Definition ---
// We create a single queue named 'photo-generation'.
// The generic types define the job data and the expectedreturn value.
export const photoQueue = new Queue<IPhotoJobData, GenerateImageOutput>(
  "photo-generation",
  { connection }
);

// --- Service Class ---
export class JobService {
  /**
   * Adds a new image generation task to the queue.
   * @param data The job details.
   * @returns The created job instance.
   */
  public async addJob(
    data: IPhotoJobData
  ): Promise<Job<IPhotoJobData, GenerateImageOutput>> {
    // The first argument is a name for this type of job within the queue.
    const job = await photoQueue.add("generate-image", data, {
      attempts: 3, // Retry up to 3 times if the job fails
      backoff: {
        // CORRECTED: Was "backff"
        type: "exponential",
        delay: 5000, // Wait 5s before first retry, 10s for second, etc.
      },
    });
    console.log(
      `Added job with bullMq Id: ${job.id} to the queue for model ${data.modelName}.`
    );
    return job;
  }

  /**
   * Retrieves a job from the queue by its ID to check its status.
   * @param jobId The ID of the job to retrieve.
   * @returns The job instance, or null if not found.
   */
  public async getJob(
    jobId: string
  ): Promise<Job<IPhotoJobData, GenerateImageOutput> | null> {
    const job = await photoQueue.getJob(jobId);
    return job ?? null;
  }
}
