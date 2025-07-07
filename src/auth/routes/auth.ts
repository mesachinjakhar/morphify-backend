import { Router } from "express";
import passport from "passport";
import socialAuthHandler, { emailAuthHandler } from "../handlers/auth";
import rateLimit from "express-rate-limit";

const router = Router();

const verifyOtpLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.body.email || req.ip,
  message: {
    status: 429,
    error: "Too many OTP verification attempts. Try again after 1 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  "/google",
  passport.authenticate("google-id-token", { session: false }),
  socialAuthHandler
);

router.post("/email", emailAuthHandler);

export default router;
