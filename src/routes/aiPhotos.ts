import { Router } from "express";
import { prisma } from "../lib/prisma";

import {
  TrainModel,
  GenerateImage,
  GenerateImagesFromPack,
} from "../types/trainModel";

import { FalAIModel } from "../models/FalAIModel";
import s3 from "../config/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const falAiClient = new FalAIModel();

const router = Router();

const USER_ID = "12345678910";

router.post("/training", async (req, res) => {
  const parsedBody = TrainModel.safeParse(req.body);
  const images = req.body.images;

  if (!parsedBody.success) {
    res.status(411).json({
      status: "fail",
      message: "Input is incorrect",
    });
    return;
  }

  const { request_id, response_url } = await falAiClient.trainModel(
    parsedBody.data.zipUrl,
    parsedBody.data.name
  );

  const data = await prisma.model.create({
    data: {
      name: parsedBody.data.name,
      type: parsedBody.data.type,
      age: parsedBody.data.age,
      ethinicity: parsedBody.data.ethinicity,
      eyeColor: parsedBody.data.eyeColor,
      bald: parsedBody.data.bald,
      userId: USER_ID,
      falAiRequestId: request_id,
      zipUrl: parsedBody.data.zipUrl,
    },
  });
  res.json({
    modelId: data.id,
  });
});

router.post("/generate", async (req, res) => {
  const parsedBody = GenerateImage.safeParse(req.body);

  if (!parsedBody.success) {
    res.status(411).json({
      status: "fail",
      message: "Input is incorrect",
    });
    return;
  }

  const model = await prisma.model.findUnique({
    where: {
      id: parsedBody.data.modelId,
    },
  });

  if (!model?.tensorPath) {
    res.status(411).json({
      message: "Model not found",
    });
    return;
  }
  const { request_id, response_url } = await falAiClient.generateImage(
    parsedBody.data.prompt,
    model.tensorPath
  );

  const data = await prisma.outputImages.create({
    data: {
      prompt: parsedBody.data.prompt,
      userId: USER_ID,
      modelId: parsedBody.data.modelId,
      imageUrl: "",
      falAiRequestId: request_id,
    },
  });
  res.json({
    imageId: data.id,
  });
});

router.post("/pack/generate", async (req, res) => {
  const parsedBody = GenerateImagesFromPack.safeParse(req.body);

  if (!parsedBody.success) {
    res.status(411).json({
      status: "fail",
      message: "Input is incorrect",
    });
    return;
  }

  const prompts = await prisma.packPrompts.findMany({
    where: {
      packId: parsedBody.data.packId,
    },
  });

  const images = await prisma.outputImages.createManyAndReturn({
    data: prompts.map((prompt) => ({
      prompt: prompt.prompt,
      userId: USER_ID,
      modelId: parsedBody.data.modelId,
      imageUrl: "",
    })),
  });

  res.json({
    images: images.map((image) => image.id),
  });
});

router.get("/pack/bulk", async (req, res) => {
  const packs = await prisma.packs.findMany({});

  res.json({
    packs: packs,
  });
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
  const requestId = req.body.request_id;

  await prisma.model.updateMany({
    where: {
      falAiRequestId: requestId,
    },
    data: {
      trainingStatus: "GENERATED",
      tensorPath: req.body.tensor_path,
    },
  });

  res.json({
    message: "webhook recieved",
  });
});

router.post("/fal-ai/webhook/image", async (req, res) => {
  const requestId = req.body.request_id;

  await prisma.outputImages.updateMany({
    where: {
      falAiRequestId: requestId,
    },
    data: {
      status: "GENERATED",
      imageUrl: "req.body.image_url",
    },
  });

  res.json({
    message: "webhook recieved",
  });
});

router.get("/pre-signed-url", async (req, res) => {
  const key = `models/${Date.now()}_${Math.random()}.zip`;

  const command = new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: key,
    ContentType: "application/zip",
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 300 });

  // Generate pre-signed URL for PUT

  // const url = await s3.getSignedUrl("putObject", {
  //   Bucket: process.env.BUCKET_NAME,
  //   Key: key,
  //   ContentType: "application/zip",
  //   Expires: 300,
  // });
  res.json({
    url: url,
    key: key,
  });
});

export default router;
