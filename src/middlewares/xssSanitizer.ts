import { Request, Response, NextFunction } from "express";
import xss from "xss";

function sanitizeObject(obj: any) {
  if (typeof obj !== "object" || obj === null) return obj;

  for (const key in obj) {
    if (typeof obj[key] === "string") {
      obj[key] = xss(obj[key]);
    } else if (typeof obj[key] === "object") {
      sanitizeObject(obj[key]);
    }
  }

  return obj;
}

export function xssSanitizer(req: Request, res: Response, next: NextFunction) {
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.params) req.params = sanitizeObject(req.params);
  if (req.query) req.query = sanitizeObject({ ...req.query }); // clone to avoid setter issue

  next();
}
