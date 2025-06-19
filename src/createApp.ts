import express from "express";
import dotenv from "dotenv";
import userRouter from "./routes/usersRoutes";
import authRouter from "./auth/routes/auth";
import aiPhotosRouter from "./routes/aiPhotos";
import errorHandler from "./handlers/errorHandler";
import photosRouter from "./routes/photosRoutes";
import rewardsRouter from "./routes/rewardsRoutes";
import passport from "passport";
import "./auth/strategies/google";
import "./instrument.js";
import * as Sentry from "@sentry/node";

dotenv.config();

const app = express();

// Middlewares
app.use(express.json());
app.use(passport.initialize());

// Routes
app.get("/api/v1/ping", (req, res) => {
  console.log("request received");
  res.status(200).send("pong");
});
app.use("/api/users", userRouter);
app.use("/api/auth", authRouter);
app.use("/api/ai-photos", aiPhotosRouter);

app.use("/api/v1/photos", photosRouter);
app.use("/api/v1/rewards", rewardsRouter);

// The error handler must be registered before any other error middleware and after all controllers
Sentry.setupExpressErrorHandler(app);

// Global Error Handler
app.use(errorHandler);

export default app;
