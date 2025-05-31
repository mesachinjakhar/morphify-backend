import { NextFunction, Request, Response } from "express";
import {
  handleSocialLogin,
  resendEmailOtp,
  sendEmailOtp,
  verifyEmailOtp,
} from "../services/auth";
import asyncErrorHandler from "../../handlers/asyncErrorHandler";

async function socialAuthHandler(req: Request, res: Response) {
  if (req.user) {
    const response = await handleSocialLogin(req.user);
    return res.status(201).json({
      status: "success",
      message: "authentication succeed",
      data: response,
    });
  } else {
    return res.status(400).json({
      status: "fail",
      message: "authentication failed. no user profile found",
    });
  }
}

export const emailAuthHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const type = req.body.type;
  const email = req.body.email;

  if (type === "login") {
    const response = await sendEmailOtp(email);
    res.status(200).json(response);
  } else if (type === "resend") {
    const response = await resendEmailOtp(email);
    res.status(200).json(response);
  } else if (type === "verify") {
    const response = await verifyEmailOtp(email, req.body.otp);
    res.status(200).json(response);
  } else {
    res.status(400).json({
      status: "fail",
      type: "unknown",
      message: "Request type not defined",
    });
  }
};

export default asyncErrorHandler(socialAuthHandler);
