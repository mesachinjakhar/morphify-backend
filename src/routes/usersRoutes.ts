import authMiddleware from "../middlewares/authMiddleware";
import {
  createUser,
  getUser,
  getUserModels,
  getImageStatus,
  getGeneratedImages,
  getMstarBalance,
  updateProfile,
  deleteAccount,
  updateLocation,
  showAds,
} from "../handlers/users";
import { Router } from "express";
import passport from "passport";

const router = Router();

// router.get("/", getUser);
// router.post("/", createUser);

router.get("/models", authMiddleware, getUserModels);
router.get("/generated-images/", authMiddleware, getGeneratedImages);
router.get("/generated-images/status", authMiddleware, getImageStatus);
router.get("/mstars/balance", authMiddleware, getMstarBalance);
router.patch("/profile", authMiddleware, updateProfile);
router.get("/profile", authMiddleware, getUser);
router.delete(
  "/delete",
  passport.authenticate("google-id-token", { session: false }),
  deleteAccount
);
router.post("/location", authMiddleware, updateLocation);
router.get("/showads", authMiddleware, showAds);

export default router;
