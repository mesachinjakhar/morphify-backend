/**
 * src/handlers/photo.handler.ts
 * * This is our "Head Chef".
 * It takes the raw order, passes it to the Kitchen Manager to be queued,
 * and gives the customer their ticket number (jobId).
 */
import { NextFunction, Request, Response } from "express";
import { PhotoService } from "../services/photo.service";
import CustomError from "../utils/CustomError";
import { prisma } from "../lib/prisma";
import MstarManager from "../services/mstar/mstarManager";

type AiFilterWithRelations = {
  id: string;
  name: string;
  additionalCost: number;
  isFeatureHero: boolean;
  aiModel: {
    id: string;
    name: string;
    mstarsCostPerCall: number;
    aiProvider: {
      name: string;
    };
  };
  showcase: {
    images: {
      beforeImage: string;
      afterImage: string;
    }[];
  } | null;
};

export class PhotoHandler {
  private photoService = new PhotoService();

  /**
   * Handles the initial request to generate a photo.
   * This method will always queue a job and respond immediately.
   */
  public requestPhotoGeneration = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { provider, model } = req.params;
      const { aiFilterId, packId, ...filteredBody } = req.body;

      // Step 1. Make sure all inputs are provided to process the request
      const user = req.user as { id: string };
      if (!user) {
        throw new CustomError("Customer is invalid", 401);
      }
      const userId = user.id;

      if (!aiFilterId && !packId) {
        throw new CustomError(
          "Either an aiFilterId or a packId must be provided.",
          400
        );
      }
      if (aiFilterId && packId) {
        throw new CustomError(
          "Either provide a packId or aiFilterId. Both can't be accepted right now.",
          400
        );
      }

      //  Step 2. Call the photo service
      const jobId = await this.photoService.queueGenerationJob(
        provider,
        model,
        filteredBody,
        userId,
        aiFilterId, // Pass aiFilterId (will be string or undefined)
        packId // Pass packId (will be string or undefined)
      );

      // 2. Immediately respond to the client with "Accepted".
      // This tells the client that we've received the request and are working on it.
      res.status(202).json({
        status: "processing",
        message: "Image generation request accepted and is being processed.",
        jobId: jobId,
        // Provide a convenient URL for the client to poll for the status.
        statusUrl: `/api/v1/photos/status/${jobId}`,
      });
    } catch (error) {
      // Pass any errors (e.g., invalid model) to the global error handler.
      next(error);
    }
  };

  public getAllAiFilters = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // Fetch all AI filters and include their related models, providers, and showcase images in a single query.
      // This is much more efficient than querying for each filter in a loop.
      const filtersWithDetails: AiFilterWithRelations[] =
        await prisma.aiFilter.findMany({
          include: {
            // Include the related AiModel record
            aiModel: {
              include: {
                // Within AiModel, include the related AiProvider record
                aiProvider: true,
              },
            },
            // Include the related AiFilterShowCase record
            showcase: {
              include: {
                // Within AiFilterShowCase, include the related ShowcaseImagePair records
                images: true,
              },
            },
          },
        });

      // Map the retrieved data to the desired response format.
      const formattedResponse = filtersWithDetails.map((filter) => {
        // Calculate the total cost by adding the model's base cost and the filter's additional cost.
        const totalCost =
          filter.aiModel.mstarsCostPerCall + filter.additionalCost;

        // Extract the showcase images, providing an empty array if no showcase exists.
        const showcaseImages = filter.showcase
          ? filter.showcase.images.map((img) => ({
              beforeImage: img.beforeImage,
              afterImage: img.afterImage,
            }))
          : [];

        return {
          id: filter.id, // The ID of the filter itself
          name: filter.name,
          isFeatureHero: filter.isFeatureHero,
          aiModelId: filter.aiModel.id,
          aiModelName: filter.aiModel.name,
          aiModelProvider: filter.aiModel.aiProvider.name,
          mstarsCostPerCall: totalCost,
          showcase: showcaseImages,
        };
      });

      // Send the formatted data as the response.
      res.status(200).json(formattedResponse);
    } catch (error) {
      // Pass any errors to the next middleware for centralized error handling.
      console.error("Failed to get AI filters:", error);
      next(error);
    }
  };

  public getCost = async (req: Request, res: Response, next: NextFunction) => {
    const { aiFilterId, packId, numOfPhotos, isModel } = req.body;

    if (isModel) {
      const model = await prisma.aiModel.findUnique({
        where: { id: "f640f8fe-7bb2-4bdf-bf97-9fe35398690d" },
      });
      if (!model) {
        throw new CustomError("Ai Model not found", 500);
      }
      res.status(200).json({
        status: "success",
        message: "cost calculated successfully",
        data: { cost: model.mstarsCostPerCall },
      });
      return;
    }

    if (!aiFilterId && !packId) {
      throw new CustomError("Either provide Ai Filter Id or Pack id", 400);
    }

    let num = numOfPhotos;
    if (!num) {
      num = 1;
    }

    if (aiFilterId) {
      const aiFilter = await prisma.aiFilter.findUnique({
        where: { id: aiFilterId },
      });
      if (!aiFilter) {
        throw new CustomError("Ai Filter not found", 404);
      }
      const modelId = aiFilter.aiModelId;
      const mstarManagar = new MstarManager(prisma);
      const cost = await mstarManagar.calculateCost(modelId, num, aiFilterId);
      res.status(200).json({
        status: "success",
        message: "cost calculated successfully",
        data: { cost: cost },
      });
      return;
    }

    if (packId) {
      const pack = await prisma.packs.findUnique({ where: { id: packId } });
      if (!pack) {
        throw new CustomError("Pack not found", 404);
      }
      const modelId = pack.aiModelId;
      const mstarManagar = new MstarManager(prisma);
      const cost = await mstarManagar.calculateCost(modelId, num);
      res.status(200).json({
        status: "success",
        message: "cost calculated successfully",
        data: { cost: cost },
      });
      return;
    }
  };

  // Example of how you might set up a basic error handler in Express
  errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    res.status(500).json({
      message: "An internal server error occurred",
      error: err.message,
    });
  };
}
