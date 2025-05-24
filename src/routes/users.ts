import { createUser, getUser } from "../handlers/users";
import { Router } from "express";

const router = Router();

router.get("/", getUser);

router.post("/", createUser);

export default router;
