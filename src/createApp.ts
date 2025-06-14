import express from "express";
import dotenv from "dotenv";
import userRouter from "./routes/usersRoutes";
import authRouter from "./auth/routes/auth";
import aiPhotosRouter from "./routes/aiPhotos";
import errorHandler from "./handlers/errorHandler";
import photosRouter from "./routes/photosRoutes";
import passport from "passport";
import "./auth/strategies/google";

dotenv.config();

const app = express();

// Middlewares
app.use(express.json());
app.use(passport.initialize());

// Routes
app.get("/ping", (req, res) => {
  console.log("request received");
  res.send("pong");
});
app.use("/api/users", userRouter);
app.use("/api/auth", authRouter);
app.use("/api/ai-photos", aiPhotosRouter);

app.use("/api/v1/photos", photosRouter);

// Global Error Handler
app.use(errorHandler);

export default app;
