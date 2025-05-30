import express from "express";
import dotenv from "dotenv";
import userRouter from "./routes/users";
import authRouter from "./auth/routes/auth";
import errorHandler from "./handlers/errorHandler";
import passport from "passport";
import "./auth/strategies/google";

dotenv.config();

const app = express();

// Middlewares
app.use(express.json());
app.use(passport.initialize());

// Routes
app.use("/api/users", userRouter);
app.use("/api/auth", authRouter);

// Global Error Handler
app.use(errorHandler);

export default app;
