import { Router } from "express";
import { prisma } from "../lib/prisma";
import { Request, Response, NextFunction } from "express";

import {
  TrainModel,
  GenerateImage,
  GenerateImagesFromPack,
} from "../types/trainModel";

import { FalAIModel } from "../models/FalAIModel";
import s3 from "../config/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import authMiddleware from "../middlewares/authMiddleware";
import createUniqueTriggerWord from "../utils/createUniqueTriggerWord";
import selectRandomPrompt from "../utils/selectRandomPrompt";
import downloadAndUploadImage from "../utils/downloadAndUploadImage";
import MstarManager from "../services/mstar/mstarManager";
import CustomError from "@/utils/CustomError";

const falAiClient = new FalAIModel();

const router = Router();

const USER_ID = "12345678910";

router.post("/training", authMiddleware, async (req, res) => {
  // Step 1: Check if body is valid or not
  const parsedBody = TrainModel.safeParse(req.body);

  if (!parsedBody.success) {
    res.status(411).json({
      status: "fail",
      message: "Input is incorrect",
    });
    return;
  }

  // Step 2: Extract the authenticated user from req header
  const user = req.user as { id: string };
  if (!user || !user.id) {
    throw new Error("Cant find user");
  }

  // Step 3: Create a trigger word for Model creation
  const triggerWord = createUniqueTriggerWord(parsedBody.data.name);

  // Step 4: Send request to Fal Ai for Model Generation
  const { request_id, response_url } = await falAiClient.trainModel(
    parsedBody.data.zipUrl,
    triggerWord
  );

  // Step 5: Insert the Model details into Database
  const data = await prisma.model.create({
    data: {
      name: parsedBody.data.name,
      type: parsedBody.data.type,
      age: parsedBody.data.age,
      ethnicity: parsedBody.data.ethnicity,
      eyeColor: parsedBody.data.eyeColor,
      bald: parsedBody.data.bald,
      userId: user.id,
      falAiRequestId: request_id,
      zipUrl: parsedBody.data.zipUrl,
      triggerWord: triggerWord,
    },
  });

  // Step 6: Send Response
  res.json({
    modelId: data.id,
  });
});

// router.post("/generate", async (req, res) => {
//   const parsedBody = GenerateImage.safeParse(req.body);

//   if (!parsedBody.success) {
//     res.status(411).json({
//       status: "fail",
//       message: "Input is incorrect",
//     });
//     return;
//   }

//   // 1. Fetch the model from the DB
//   const model = await prisma.model.findUnique({
//     where: {
//       id: parsedBody.data.modelId,
//     },
//   });

//   // 2. Check that the model exists and has BOTH the tensorPath and triggerWord
//   if (!model || !model.tensorPath || !model.triggerWord) {
//     res.status(404).json({
//       // Use 404 for Not Found
//       message: "Model not found or is not fully trained.",
//     });
//     return;
//   }

//   // 3. IMPORTANT: Construct the full prompt
//   // Combine the trigger word, the user's prompt, and other details for best results.
//   const fullPrompt = `photo of ${model.triggerWord}, a ${model.age}-year-old ${model.ethnicity} ${model.type}`;
//   console.log("Constructed Full Prompt:", fullPrompt);

//   const { request_id, response_url } = await falAiClient.generateImage(
//     parsedBody.data.prompt,
//     model.tensorPath
//   );

//   const data = await prisma.outputImages.create({
//     data: {
//       prompt: parsedBody.data.prompt,
//       userId: USER_ID,
//       modelId: parsedBody.data.modelId,
//       imageUrl: "",
//       falAiRequestId: request_id,
//     },
//   });
//   res.json({
//     imageId: data.id,
//   });
// });

router.post("/pack/generate", authMiddleware, async (req, res, next) => {
  // Step 1. Check if body is valid or not
  const parsedBody = GenerateImagesFromPack.safeParse(req.body);

  const user = req.user as { id: string };

  if (!user) {
    res.status(411).json({
      status: "fail",
      message: "User not found",
    });
    return;
  }

  if (!parsedBody.success) {
    res.status(411).json({
      status: "fail",
      message: "Input is incorrect",
    });
    return;
  }

  // Step 2. Fetch Model details from the Database
  const model = await prisma.model.findUnique({
    where: {
      id: parsedBody.data.modelId,
    },
  });

  // Step 3. Check that the model exists and has BOTH the tensorPath and triggerWord
  if (!model || !model.tensorPath || !model.triggerWord) {
    res.status(404).json({
      // Use 404 for Not Found
      message: "Model not found or is not fully trained.",
    });
    return;
  }

  const aiModel = await prisma.packs.findUnique({
    where: { id: parsedBody.data.packId },
  });

  if (!aiModel) {
    res.status(404).json({
      // Use 404 for Not Found
      message: "Pack not found",
    });
    return;
  }

  const aiModelId = aiModel.aiModelId;

  let transactionId: string;

  try {
    const mstarManager = new MstarManager(prisma);
    const transaction = await mstarManager.reserveMstars(
      user.id,
      aiModelId,
      req.body.num
    );
    transactionId = transaction.id;
  } catch (error) {
    next(error);
    return;
  }

  // Step 4. Check total image to be generated.
  const imagesToBeGenerated = req.body.num;

  // Step 5. Fetch all prompts against the Pack
  const allPrompts = await prisma.packPrompts.findMany({
    where: {
      packId: parsedBody.data.packId,
      type: model.type,
    },
  });

  if (allPrompts.length === 0) {
    res.status(404).json({
      message: "No prompts found for this pack.",
    });
    return;
  }

  // Step 6. Randomly Select {imagesToBeGenerated} Prompts using the new function
  const selectedPrompt = selectRandomPrompt(allPrompts) as { prompt: string };

  if (!selectedPrompt) {
    res.status(404).json({
      message: "Unable to select prompt.",
    });
    return;
  }

  // Step 7. Construct the full prompt.
  // Combine the trigger word, the user's prompt, and other details for best results.
  const fullPrompt = `photo of ${model.triggerWord}, a ${model.age}-year-old ${model.ethnicity}, ${selectedPrompt.prompt}`;

  // Step 8. Send request to fal.ai for image generation
  const generationRequest = await falAiClient.generateImage(
    fullPrompt,
    model.tensorPath,
    imagesToBeGenerated
  );

  // Step 9. Insert response to Database
  // Prepare an array of all the image data objects to be created.
  const imagesData = Array.from({ length: imagesToBeGenerated }).map(() => ({
    prompt: selectedPrompt.prompt, // Using the same selected prompt for the whole batch
    userId: model.userId,
    userModelId: parsedBody.data.modelId,
    imageUrl: "", // To be updated later via webhook or polling
    providerRequestId: generationRequest.request_id,
    transactionId: transactionId,
  }));

  // Use `createMany` for a single, efficient bulk database insert.
  const creationResult = await prisma.generatedImages.createMany({
    data: imagesData,
  });

  // Step 10. Send image Id in response
  res.json({
    status: "success",
    message: `${creationResult.count} image generation tasks have been queued.`,
    jobId: generationRequest.request_id,
  });
});

router.get("/pack/bulk", async (req: Request, res: Response) => {
  // --- Pagination Logic ---
  // Set a default limit for items per page, e.g., 10.
  const limit = parseInt(req.query.limit as string | "10");
  // Get the page number from the query, default to page 1.
  const page = parseInt(req.query.page as string | "1");
  // Calculate the number of items to skip.
  const skip = (page - 1) * limit;

  try {
    // Use a transaction to fetch both the data and the total count efficiently.
    const [packs, totalPacks] = await prisma.$transaction([
      // First query: get the paginated data
      prisma.packs.findMany({
        take: limit, // How many items to retrieve
        skip: skip, // How many items to skip from the start
        orderBy: {
          // It's good practice to have a consistent order for pagination
          createdAt: "asc", // or any other field like 'name'
        },
      }),
      // Second query: get the total count of all packs
      prisma.packs.count(),
    ]);

    // Send the paginated data along with metadata
    res.json({
      status: "success",
      packs: packs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalPacks / limit),
        totalPacks: totalPacks,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An internal server error occurred.",
    });
  }
});

router.get("/image/bulk", async (req, res) => {
  const ids = req.query.images as string[];
  const limit = (req.query.limit as string) || "10";
  const offset = (req.query.offset as string) || "0";

  const imagesData = await prisma.outputImages.findMany({
    where: {
      id: { in: ids },
      userId: USER_ID,
    },
    skip: parseInt(offset),
    take: parseInt(limit),
  });

  res.json({
    images: imagesData,
  });
});

router.post("/fal-ai/webhook/train", async (req, res) => {
  console.log("train webhook called with body:", req.body);
  const requestId = req.body.request_id;

  await prisma.model.updateMany({
    where: {
      falAiRequestId: requestId,
    },
    data: {
      trainingStatus: "GENERATED",
      tensorPath: req.body.diffusers_lora_file.url,
    },
  });

  res.json({
    message: "webhook recieved",
  });
});

router.post("/fal-ai/webhook/image", async (req, res, next) => {
  const requestId = req.body.request_id;
  const images = req.body.payload.images;

  // Basic validation of the incoming webhook payload
  if (!requestId || !Array.isArray(images) || images.length === 0) {
    console.log("invalid webook call");
    res.status(400).json({ message: "Invalid webhook payload" });
    return;
  }

  // Step 1. Fetch all the placeholder records created for this request
  const imageRecordsToUpdate = await prisma.generatedImages.findMany({
    where: {
      providerRequestId: requestId,
      status: { not: "GENERATED" }, // Optional: prevent re-processing a webhook
    },
  });

  // Step 2. Verify that the number of images from the webhook matches our records
  if (imageRecordsToUpdate.length !== images.length) {
    console.error(
      `Webhook image count (${images.length}) does not match DB record count (${imageRecordsToUpdate.length}) for request ID: ${requestId}`
    );
    res.status(409).json({ message: "Image count mismatch" }); // 409 Conflict
    return;
  }

  // Step 3. Process all images concurrently (download from Fal, upload to R2)
  const uploadPromises: Promise<string>[] = images.map((image, index) =>
    downloadAndUploadImage(image.url, requestId, index)
  );

  // This resolves to an array of strings
  const newImageUrls = await Promise.all(uploadPromises);

  // Step 3. Create an array of individual update promises
  const updatePromises = imageRecordsToUpdate.map((record, index) => {
    return prisma.generatedImages.update({
      where: {
        id: record.id, // Update each record by its unique primary key
      },
      data: {
        status: "GENERATED",
        imageUrl: newImageUrls[index], // Assign the correct URL from the array
      },
    });
  });

  // Fetch transaction id and commit it.
  const transaction = await prisma.generatedImages.findFirst({
    where: {
      providerRequestId: requestId,
    },
  });

  if (!transaction) {
    console.error(
      `Transaction id not found in DB record for request ID: ${requestId}`
    );
    res.status(409).json({ message: "Transaction not found" }); // 409 Conflict
    return;
  }

  const transactionId = transaction.transactionId;

  if (!transactionId) {
    console.error(
      `Transaction id not found in DB record for request ID: ${requestId}`
    );
    res.status(409).json({ message: "Transaction not found" }); // 409 Conflict
    return;
  }

  const mstarManager = new MstarManager(prisma);

  try {
    mstarManager.commitTransaction(transactionId);
  } catch (error) {
    next(error);
  }

  // Step 4. Execute all updates together in a single, atomic transaction
  try {
    await prisma.$transaction(updatePromises);
    res.json({ message: "Webhook processed successfully" });
  } catch (error) {
    console.error("Failed to update images in transaction:", error);
    res.status(500).json({ message: "Failed to update database records" });
  }
});

router.get("/pre-signed-url", authMiddleware, async (req, res) => {
  const type = req.query.type;
  const fileType = req.query.fileType;

  try {
    let key;
    if (type == "image") {
      key = `images/${Date.now()}_${Math.random()}.${fileType}`;
    } else {
      key = `models/${Date.now()}_${Math.random()}.zip`;
    }

    const command = new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: key,
      ContentType: "application/zip",
      // ChecksumAlgorithm: "CRC32", // <--- CRUCIAL CHANGE: Specify the expected checksum algorithm
    });

    // When ChecksumAlgorithm is specified in the command, getSignedUrl
    // will generate a URL that correctly anticipates the client sending
    // the 'x-amz-checksum-crc32' header with the actual checksum.
    // The signature will be valid when the client provides this header.
    const url = await getSignedUrl(s3, command, {
      expiresIn: 300, // URL expires in 5 minutes
    });

    console.log("Generated pre-signed URL:", url);
    console.log("Object Key:", key);

    res.json({
      url: url,
      key: key,
    });
  } catch (error) {
    console.error("Error generating pre-signed URL:", error);
    // It's good practice to provide a typed error or check its type
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    res.status(500).json({
      error: "Failed to generate pre-signed URL",
      details: errorMessage,
    });
  }
});

export default router;
