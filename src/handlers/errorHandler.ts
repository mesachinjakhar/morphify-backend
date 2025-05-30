import { Request, Response, NextFunction } from "express";
import CustomError from "../utils/CustomError";

// Send error
const devErrors = (res: Response, err: CustomError) => {
  return res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    stackTrace: err.stack,
    error: err,
  });
};

// Send error
const prodErrors = (res: Response, err: CustomError) => {
  // For operational error
  if (err.isOperational) {
    return res
      .status(err.statusCode)
      .json({ status: err.status, message: err.message });
  }
  // For non operational error
  else {
    return res.status(500).json({
      status: "error",
      message: "Something went wrong. Please try again later.",
    });
  }
};

// Global error handler
export default function errorHandler(
  err: CustomError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Setup variables
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  // For development errors
  if (process.NODE_ENV === "development") {
    devErrors(res, err);
  }

  // For production errors
  if (process.NODE_ENV === "production") {
    prodErrors(res, err);
  }
}
