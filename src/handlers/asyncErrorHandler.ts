import { NextFunction, Request, Response } from "express";

const asyncErrorHandler = (func: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    func(req, res, next).catch((err: Error) => next(err));
  };
};

export default asyncErrorHandler;
