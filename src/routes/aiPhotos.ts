import { Router } from "express";
import { prisma } from "../lib/prisma";

import {
  TrainModel,
  GenerateImage,
  GenerateImagesFromPack,
} from "../types/trainModel";

const router = Router();

const USER_ID = "12345678910";

router.post("/training", async (req, res) => {
  const parsedBody = TrainModel.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(411).json({
      status: "fail",
      message: "Input is incorrect",
    });
    return;
  }

  const data = await prisma.model.create({
    data: {
      name: parsedBody.data.name,
      type: parsedBody.data.type,
      age: parsedBody.data.age,
      ethinicity: parsedBody.data.ethinicity,
      eyeColor: parsedBody.data.eyeColor,
      bald: parsedBody.data.bald,
      userId: USER_ID,
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

  const data = await prisma.outputImages.create({
    data: {
      prompt: parsedBody.data.prompt,
      userId: USER_ID,
      modelId: parsedBody.data.modelId,
      imageUrl: "",
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

export default router;
