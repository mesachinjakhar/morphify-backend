import MstarManager from "../services/mstar/mstarManager";
import { prisma } from "../lib/prisma";
import { NextFunction, Request, Response } from "express";
import CustomError from "../utils/CustomError";
import { z } from "zod";
import { Prisma } from "@prisma/client";

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
  res.status(200).json({
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

  // --- Pagination Logic ---
  // Get page and limit from query parameters, with sensible defaults.
  // We use parseInt to convert string queries to numbers.
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20; // Default to 20 images per page
  const skip = (page - 1) * limit; // Calculate the number of records to skip

  try {
    // We use a Prisma transaction to efficiently run both queries at the same time.
    const [images, totalImages] = await prisma.$transaction([
      // First query: Fetch the paginated list of images.
      prisma.generatedImages.findMany({
        where: {
          userId: userId,
          status: "GENERATED",
        },
        // It's crucial to order the results consistently for pagination to work correctly.
        orderBy: {
          createdAt: "desc",
        },
        // 'skip' is the offset, and 'take' is the limit.
        skip: skip,
        take: limit,
      }),
      // Second query: Fetch the total count of images that match the criteria.
      prisma.generatedImages.count({
        where: {
          userId: userId,
          status: "GENERATED",
        },
      }),
    ]);

    // Return the fetched images along with pagination metadata.
    res.status(200).json({
      status: "success",
      data: {
        images,
        totalImages,
        currentPage: page,
        totalPages: Math.ceil(totalImages / limit),
      },
    });
  } catch (error) {
    // In case of a database error, pass it to your error-handling middleware.
    console.error("Failed to fetch generated images:", error);
    next(error);
  }
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

declare global {
  namespace Express {
    interface User {
      provider: string;
      id: string; // This is the Google User ID (the 'sub' claim)
      email: string;
      name: string;
      picture: string;
      // Add any other properties from the Google profile you might need
      [key: string]: any;
    }
  }
}

/**
 * @route   DELETE /api/user/delete
 * @desc    Deletes a user account after verifying their Google ID token.
 * @access  Private (Requires Bearer Token)
 */
export const deleteAccount = async (req: Request, res: Response) => {
  // At this point, the passport middleware has already run and verified the token.
  // The authenticated user's profile is attached to `req.user`.
  if (!req.user) {
    // This case should ideally not be hit if the middleware is set up correctly,
    // but it's good practice for type safety and edge cases.
    res
      .status(401)
      .json({ message: "Authentication failed: No user profile found." });
    return;
  }

  const googleUserId = req.user.id;
  const userEmail = req.user.email;

  console.log(
    `Attempting to delete account for user ID: ${googleUserId} (${userEmail})`
  );

  try {
    // Find the user in your database using their unique Google ID and delete them.
    // It's crucial to use the immutable Google ID ('sub') rather than the email,
    // as emails can sometimes change.
    //
    // ASSUMPTION: Your Prisma User model has a field (e.g., `googleId`)
    // that is unique and stores the user's Google 'sub' ID.
    //
    // Example Prisma Schema:
    // model User {
    //   id        String   @id @default(cuid())
    //   email     String   @unique
    //   name      String?
    //   googleId  String?  @unique  // <-- The field to match against
    //   createdAt DateTime @default(now())
    // }

    const deletedUser = await prisma.user.delete({
      where: {
        email: userEmail,
        providerId: googleUserId,
      },
    });

    console.log(`Successfully deleted user: ${deletedUser.email}`);

    // Send a success response. 200 with a message or 204 No Content are both fine.
    res.status(200).json({ message: "Account deleted successfully." });
    return;
  } catch (error) {
    console.error("Error during account deletion:", error);

    // Check if the error is from Prisma and is for a record not being found.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      // This error code means 'An operation failed because it depends on one or more records that were required but not found.'
      // In a `delete` operation, it means the user to be deleted didn't exist.
      res.status(404).json({ message: "User not found in our database." });
      return;
    }

    // For all other errors (e.g., database connection issue), send a generic server error.
    res.status(500).json({ message: "An internal server error occurred." });
    return;
  }
};

interface UpdateLocationBody {
  userId: string;
  city: string | null;
  country: string | null;
  postalCode: string | null;
}

export const updateLocation = async (req: Request, res: Response) => {
  const { userId, city, country, postalCode } = req.body as UpdateLocationBody;

  if (!userId) {
    res.status(400).json({ error: "Missing userId" });
    return;
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        city,
        country,
        postalCode,
      },
    });

    res.json({
      status: "success",
      data: {
        id: updatedUser.id,
        city: updatedUser.city,
        country: updatedUser.country,
        postalCode: updatedUser.postalCode,
      },
    });
    return;
  } catch (error) {
    console.error("Failed to update user location:", error);
    res.status(500).json({ error: "Internal server error" });
    return;
  }
};
