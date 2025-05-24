import express from "express";
import dotenv from "dotenv";
import userRouter from "./routes/users";
import errorHandler from "./handlers/errorHandler";

dotenv.config();

const app = express();

// Middlewares
app.use(express.json());

// Routes
app.use("/api/users", userRouter);

// Global Error Handler
app.use(errorHandler);

export default app;
