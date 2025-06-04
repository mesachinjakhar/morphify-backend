import { prisma } from "../lib/prisma";
import { NextFunction, Request, Response } from "express";

export const getUser = (req: Request, res: Response, next: NextFunction) => {
  res.send("Hello");
};

export const createUser = (req: Request, res: Response, next: NextFunction) => {
  res.send("Hello");
};

export const getUserModels = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = (req as any).user?.id;

  if (!userId) {
    return res
      .status(401)
      .json({ status: "fail", message: "Unauthorized: Invalid token" });
  }

  const models = await prisma.model.findMany({
    where: {
      userId: userId,
    },
  });

  return res.status(200).json({
    status: "success",
    message: "User models fetched successfully",
    data: models,
  });
};
