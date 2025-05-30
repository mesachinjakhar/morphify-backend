import { Request, Response } from "express";
import { handleSocialLogin } from "../services/auth";

export async function socialAuthHandler(req: Request, res: Response) {
  if (req.user) {
    return res
      .status(201)
      .json({ message: "Authentication succeed", user: req.user });
  }
  if (!req.user) {
    return res.status(401).json({ message: "Authentication failed" });
  }

  // return req.user;

  // const user = await handleSocialLogin(req.user);
  // //   return res.json({ user, token: "your-jwt-token-here" }); // Create JWT later
  // return user;
}
