/**
 * src/services/photo.service.ts
 * * This is our "Kitchen Manager".
 * It now validates the order against the provider's rules before queueing the job.
 */
import { getProvider } from "./providers/provider.strategy";
import { GenerateImageInput } from "./providers/provider.interface";
import { JobService, IPhotoJobData } from "./job.service";
import CustomError from "../utils/CustomError"; // Assuming you have a custom error utility
import {
  insertForAiFilters,
  insertForPack,
} from "./db/generatedImages.service";
import MstarManager from "./mstar/mstarManager";
import { prisma } from "../lib/prisma";

export class PhotoService {
  private jobService = new JobService();

  /**
   * Validates the request and adds a new image generation task to the queue.
   * @returns The ID of the created job.
   */
  public async queueGenerationJob(
    providerName: string,
    modelName: string,
    input: GenerateImageInput,
    userId: string,
    aiFilterId?: string,
    packId?: string
  ): Promise<string> {
    if (!aiFilterId && !packId) {
      throw new CustomError(
        "Either an aiFilterId or a packId must be provided.",
        400
      );
    }

    // 1. Find the correct provider for this request.
    const provider = getProvider(providerName, modelName);
    if (!provider) {
      throw new CustomError(
        `Invalid provider or model specified: ${providerName}/${modelName}.`,
        400
      );
    }

    // 2. *** NEW VALIDATION STEP ***
    // Ask the provider to validate the specific input parameters.
    const validationResult = provider.validateInput(input);
    if (!validationResult.isValid) {
      // If validation fails, throw a 400 Bad Request error with the
      // provider's specific error message. The user gets immediate feedback.
      throw new CustomError(
        validationResult.message ||
          "Invalid input provided for the selected model.",
        400
      );
    }

    const mstarManager = new MstarManager(prisma);

    let image;
    let transactionId;

    // Use an if/else if block to handle the creation logic.
    // This ensures 'image' is assigned a value if either ID is present.
    if (aiFilterId) {
      image = await insertForAiFilters(aiFilterId, userId);
      let aiFilter = await prisma.aiFilter.findUnique({
        where: { id: aiFilterId },
      });
      if (!aiFilter) {
        throw new CustomError("Ai Filter not found", 404);
      }
      const transaction = await mstarManager.reserveMstars(
        userId,
        aiFilter.aiModelId,
        1,
        aiFilterId
      );
      transactionId = transaction.id;
    } else if (packId) {
      image = await insertForPack(packId, userId);
      let pack = await prisma.packs.findUnique({ where: { id: packId } });
      if (!pack) {
        throw new CustomError("Pack not found", 404);
      }
      const transaction = await mstarManager.reserveMstars(
        userId,
        pack.aiModelId,
        1
      );
      transactionId = transaction.id;
    } else {
      // This path is now unreachable due to the check at the start of the function,
      // but it helps satisfy the TypeScript compiler.
      throw new CustomError(
        "Failed to create an image record in the database.",
        500
      );
    }

    const imageId = image.id;

    // 3. Validation passed. Create the job data.
    const jobData: IPhotoJobData = {
      imageId,
      providerName,
      modelName,
      input,
      transactionId,
    };

    // 4. Add the job to the queue.
    const job = await this.jobService.addJob(jobData);

    // 5. Return the job's ID to the client.
    return imageId;
  }
}
