import { prisma } from "../../lib/prisma"; // adjust based on your path
import { Provider } from "@prisma/client";
import CustomError from "../../utils/CustomError";
import { validateEmail } from "../utils/validateEmail";
import isEligibleForOtp from "../utils/isEligibleForOtp";

export async function handleSocialLogin(profile: any) {
  console.log("profile recieved : ", profile);

  const email = profile.email;
  if (!email) {
    throw new CustomError("Email not found in profile", 400);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  const normalizedProvider = profile.provider.toUpperCase() as Provider;

  if (existingUser) {
    if (existingUser.provider !== normalizedProvider) {
      throw new CustomError(
        `Account exists with ${existingUser.provider} login. Please use that method to sign in.`,
        400
      );
    }

    // User exists and provider matches
    return existingUser;
  }

  // Create new user if not found
  const newUser = await prisma.user.create({
    data: {
      email,
      name: profile.name || "",
      provider: normalizedProvider,
      providerId: profile.id,
    },
  });

  return newUser;
}

export async function sendEmailOtp(email: string) {
  const isEmail = validateEmail(email);
  if (!isEmail) {
    return {
      status: "fail",
      type: "login",
      message: "invalid email address",
    };
  }

  const response = await isEligibleForOtp(email);
  if (response) {
    return {
      status: "success",
      type: "login",
      message: "otp sent successfully",
    };
  } else {
    return {
      status: "fail",
      type: "login",
      message: "Too many OTP requests. Please try again later.",
    };
  }
}

export async function resendEmailOtp(email: string) {
  return {
    status: "success",
    type: "resend",
    message: "otp re-sent successfully",
  };
}

export async function verifyEmailOtp(email: string, otp: string) {
  return {
    status: "success",
    type: "verify",
    message: "user verified successfully",
  };
}
