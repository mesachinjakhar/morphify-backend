import authMiddleware from "../middlewares/authMiddleware";
import { createUser, getUser, getUserModels } from "../handlers/users";
import { Router } from "express";

const router = Router();

router.get("/", getUser);
router.get("/models", authMiddleware, getUserModels);

router.post("/", createUser);

export default router;
