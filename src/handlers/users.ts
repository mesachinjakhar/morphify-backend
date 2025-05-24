import { NextFunction, Request, Response } from "express";

export const getUser = (req: Request, res: Response, next: NextFunction) => {
  res.send("Hello");
};

export const createUser = (req: Request, res: Response, next: NextFunction) => {
  res.send("Hello");
};
