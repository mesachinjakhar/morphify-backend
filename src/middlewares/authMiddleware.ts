import CustomError from "../utils/CustomError";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!JWT_SECRET) {
    return next("JWT secret not configured");
  }

  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(
      new CustomError("Authorization header missing or invalid", 411)
    );
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // @ts-ignore: Add custom type for decoded if needed
    req.user = decoded;
    return next();
  } catch (error) {
    return next(new CustomError("Invalid or expired token", 411));
  }
};

export default authMiddleware;
