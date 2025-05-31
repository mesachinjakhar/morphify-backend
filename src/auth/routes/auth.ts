import { Router } from "express";
import passport from "passport";
import socialAuthHandler, { emailAuthHandler } from "../handlers/auth";

const router = Router();

router.post(
  "/google",
  passport.authenticate("google-id-token", { session: false }),
  socialAuthHandler
);

router.post("/email", emailAuthHandler);

export default router;
