import { Router } from "express";
import passport from "passport";
import { socialAuthHandler } from "../handlers/auth";

const router = Router();

router.post(
  "/google",
  passport.authenticate("google-id-token", { session: false }),
  socialAuthHandler
);

export default router;
