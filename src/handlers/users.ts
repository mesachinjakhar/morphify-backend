import MstarManager from "../services/mstar/mstarManager";
import { prisma } from "../lib/prisma";
import { NextFunction, Request, Response } from "express";
import CustomError from "../utils/CustomError";
import { z } from "zod";

export const getUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user as { id: string };
  if (!user) {
    res.status(401).json({ status: "fail", message: "No user found" });
    return;
  }

  const userId = user.id;

  const fetchedUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!fetchedUser) {
    res.status(401).json({ status: "fail", message: "No user found" });
    return;
  }
  res
    .status(200)
    .json({
      status: "success",
      message: "User fetched successfully",
      data: fetchedUser,
    });
  return;
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

const profileUpdateSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Name must be a non-empty string" })
    .optional(),
  gender: z
    .enum(["male", "female", "other"], {
      errorMap: () => ({ message: "Invalid gender value" }),
    })
    .optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "Date of birth must be a valid date (YYYY-MM-DD)",
    })
    .optional(),
});

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const validationResult = profileUpdateSchema.safeParse(req.body);

  if (!validationResult.success) {
    res
      .status(400)
      .json({ errors: validationResult.error.flatten().fieldErrors });
    return;
  }

  if (!req.user) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  const updateData = validationResult.data;
  const userId = (req.user as { id: string }).id;

  try {
    if (updateData.dateOfBirth) {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { dateOfBirth: true },
      });

      if (!currentUser) {
        res.status(404).json({ message: "User not found." });
        return;
      }

      if (currentUser.dateOfBirth) {
        // Only block if they're trying to _change_ an existing DOB
        res.status(400).json({
          message: "Date of birth has already been set and cannot be changed.",
        });
        return;
      }
      // No `return` here: let it fall through so the update will include dateOfBirth
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    console.log(`Profile updated for user ID: ${userId}`, updateData);

    res.status(200).json({
      message: "Profile updated successfully",
      updatedFields: updateData,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    next(error);
  }
};
