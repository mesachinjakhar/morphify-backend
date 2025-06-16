import MstarManager from "../services/mstar/mstarManager";
import { prisma } from "../lib/prisma";
import { NextFunction, Request, Response } from "express";
import CustomError from "../utils/CustomError";

export const getUser = (req: Request, res: Response, next: NextFunction) => {
  res.send("Hello");
};

export const createUser = (req: Request, res: Response, next: NextFunction) => {
  res.send("Hello");
};

export const getUserModels = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = (req as any).user?.id;

  if (!userId) {
    res
      .status(401)
      .json({ status: "fail", message: "Unauthorized: Invalid token" });
    return;
  }

  const models = await prisma.model.findMany({
    where: {
      userId: userId,
    },
  });

  res.status(200).json({
    status: "success",
    message: "User models fetched successfully",
    data: models,
  });
  return;
};
// Assuming 'prisma' is your Prisma client instance.
// import { prisma } from './your-prisma-client-path';

export const getImageStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Cast `req` to `any` to access the custom `user` property.
    // A better practice would be to extend Express's Request type in a declarations file.
    const userId = (req as any).user?.id;
    const { jobId } = req.query;

    let falAiRequestId = req.query.falAiRequestId as string;

    console.log("user id: ", userId);

    if (!userId) {
      // Return a 401 Unauthorized error if the user ID is missing from the token.
      res
        .status(401)
        .json({ status: "fail", message: "Unauthorized: Invalid token" });
      return;
    }

    // --- Start of Fix ---
    // This new check ensures falAiRequestId is present AND is a string
    if (!jobId || typeof jobId !== "string") {
      res.status(400).json({
        status: "fail",
        message:
          "A single, valid Job ID must be provided as a query parameter.",
      });
      return;
    }

    if (!jobId) {
      // Return a 400 Bad Request error if the request ID is missing from params.
      res.status(400).json({ status: "fail", message: "Job ID not provided" });
      return;
    }

    let images = [];

    // Fetch all images associated with the user and the specific job ID.
    if (falAiRequestId) {
      images = await prisma.generatedImages.findMany({
        where: {
          providerRequestId: falAiRequestId,
          userId: userId,
        },
      });
    } else {
      images = await prisma.generatedImages.findMany({
        where: {
          id: jobId,
          userId: userId,
        },
      });
    }

    // If no images are found for that request ID, it's a client error (wrong ID).
    if (images.length === 0) {
      res.status(404).json({
        status: "fail",
        message: "No images found for this Job ID",
      });
      return;
    }

    // Filter the images to find only those that have been successfully generated.
    const completedImages = images.filter(
      (image) => image.status === "GENERATED"
    );

    const totalPhotos = images.length;
    const completedCount = completedImages.length;

    // Determine the overall status based on the image counts.
    const overallStatus =
      totalPhotos === completedCount ? "COMPLETED" : "PENDING";

    // Send a success response with the status and details.
    res.status(200).json({
      status: "success",
      data: {
        jobId: jobId,
        status: overallStatus,
        numPhotos: totalPhotos,
        completedPhotos: completedImages,
      },
    });
    return;
  } catch (error) {
    // Pass any unexpected errors to the global error handler.
    console.error("Error getting image status:", error);
    next(error);
  }
};

export const getGeneratedImages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = (req as any).user?.id;
  if (!userId) {
    // Return a 401 Unauthorized error if the user ID is missing from the token.
    res
      .status(401)
      .json({ status: "fail", message: "Unauthorized: Invalid token" });
    return;
  }

  // Fetch all images associated with the user
  const images = await prisma.generatedImages.findMany({
    where: {
      userId: userId,
      status: "GENERATED",
    },
  });

  res.status(200).json({
    status: "success",
    data: images,
  });
};

export const getMstarBalance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user as { id: string };
    if (!user) {
      throw new CustomError("Auth Failed. No user found", 400);
    }

    const userId = user.id;

    const mstarManager = new MstarManager(prisma);

    const balance = await mstarManager.getTotalBalance(userId);
    res.status(200).json({
      status: "success",
      message: "User balance fetched successfully",
      data: { balance: balance },
    });
  } catch (error) {
    next(error);
  }
};
