import authMiddleware from "../middlewares/authMiddleware";
import {
  createUser,
  getUser,
  getUserModels,
  getImageStatus,
  getGeneratedImages,
  getMstarBalance,
} from "../handlers/users";
import { Router } from "express";

const router = Router();

// router.get("/", getUser);
// router.post("/", createUser);

router.get("/models", authMiddleware, getUserModels);
router.get("/generated-images/", authMiddleware, getGeneratedImages);
router.get("/generated-images/status", authMiddleware, getImageStatus);
router.get("/mstars/balance", authMiddleware, getMstarBalance);

export default router;
