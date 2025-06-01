import { Router } from "express";

import {
  TrainModel,
  GenerateImage,
  GenerateImagesFromPack,
} from "@/types/trainModel";

const router = Router();

router.post("/training");

router.post("/generate");

router.post("/pack/generate");

router.get("/pack/bulk");

router.get("/image");

export default router;
