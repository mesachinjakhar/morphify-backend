import { prisma } from "../../lib/prisma"; // adjust based on your path
import { Provider } from "@prisma/client";
import CustomError from "../../utils/CustomError";
import { validateEmail } from "../utils/validateEmail";
import isEligibleForOtp from "../utils/isEligibleForOtp";
import generateOtp from "../utils/generateOtp";
import { isBefore } from "date-fns"; // for checking expiry

export async function handleSocialLogin(profile: any) {
  console.log("profile recieved : ", profile);

  const email = profile.email;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  const normalizedProvider = profile.provider.toUpperCase() as Provider;

  if (existingUser) {
    if (existingUser.provider !== normalizedProvider) {
      return {
        status: "fail",
        message: `Account already registered via ${existingUser.provider}. Use that login method.`,
      };
    }

    // User exists and provider matches
    return {
      status: "success",
      message: "authentication succed",
      data: existingUser,
    };
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

  return {
    status: "success",
    message: "authentication succed",
    data: newUser,
  };
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

  const eligible = await isEligibleForOtp(email);
  if (!eligible) {
    return {
      status: "fail",
      type: "login",
      message: "Too many OTP requests. Please try again later.",
    };
  }

  let user = await prisma.user.findUnique({ where: { email } });

  if (user && user.provider !== Provider.EMAIL) {
    return {
      status: "fail",
      type: "login",
      message: `Account already registered via ${user.provider.toUpperCase()}. Use that login method.`,
    };
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        provider: "EMAIL",
      },
    });
  }

  // Generate OTP and expiry
  const { otp, otpExpiresAt } = generateOtp();

  // Update user with OTP and expiry
  await prisma.user.update({
    where: { email },
    data: {
      otp,
      otpExpiresAt,
    },
  });

  return {
    status: "success",
    type: "login",
    message: "OTP sent successfully",
  };
}

export async function resendEmailOtp(email: string) {
  const isEmail = validateEmail(email);
  if (!isEmail) {
    return {
      status: "fail",
      type: "resend",
      message: "invalid email address",
    };
  }

  const eligible = await isEligibleForOtp(email);
  if (!eligible) {
    return {
      status: "fail",
      type: "resend",
      message: "Too many OTP requests. Please try again later.",
    };
  }

  let user = await prisma.user.findUnique({ where: { email } });

  if (user && user.provider !== Provider.EMAIL) {
    return {
      status: "fail",
      type: "resend",
      message: `Account already registered via ${user.provider.toUpperCase()}. Use that login method.`,
    };
  }

  if (!user) {
    return {
      status: "fail",
      type: "resend",
      message: "No user found with that email",
    };
  }

  // Generate OTP and expiry
  const { otp, otpExpiresAt } = generateOtp();

  // Update user with OTP and expiry
  await prisma.user.update({
    where: { email },
    data: {
      otp,
      otpExpiresAt,
    },
  });

  return {
    status: "success",
    type: "resend",
    message: "OTP re-sent successfully",
  };
}

export async function verifyEmailOtp(email: string, otp: string) {
  if (!email) {
    return {
      status: "fail",
      type: "verify",
      message: "Email address not provided in body",
    };
  }

  if (!otp) {
    return {
      status: "fail",
      type: "verify",
      message: "OTP not provided in body",
    };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return {
      status: "fail",
      type: "verify",
      message: "Invalid OTP",
    };
  }

  if (user.provider !== "EMAIL") {
    return {
      status: "fail",
      type: "verify",
      message: `Invalid OTP`,
    };
  }

  if (!user.otp || !user.otpExpiresAt) {
    return {
      status: "fail",
      type: "verify",
      message: "Invalid OTP",
    };
  }

  const now = new Date();
  if (isBefore(user.otpExpiresAt, now)) {
    return {
      status: "fail",
      type: "verify",
      message: "OTP has expired. Please request a new one.",
    };
  }

  if (user.otp != otp) {
    return { status: "fail", type: "verify", message: "Invalid OTP" };
  }

  // ✅ OTP is valid — clear OTP from DB (optional but recommended)
  await prisma.user.update({
    where: { email },
    data: {
      otp: null,
      otpExpiresAt: null,
    },
  });

  // You might also generate a session/token here

  return {
    status: "success",
    type: "verify",
    message: "OTP verified successfully",
    data: user,
  };
}
