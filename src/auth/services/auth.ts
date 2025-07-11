import { prisma } from "../../lib/prisma"; // adjust based on your path
import { Provider } from "@prisma/client";
import CustomError from "../../utils/CustomError";
import { validateEmail } from "../utils/validateEmail";
import isEligibleForOtp from "../utils/isEligibleForOtp";
import generateOtp from "../utils/generateOtp";
import { isBefore } from "date-fns"; // for checking expiry
import jwt from "jsonwebtoken";
import { sendBrevoEmail, sendOtpEmail } from "../utils/brevoClient";
import redisClient from "../config/redis";

const JWT_SECRET = process.env.JWT_SECRET;

const redis = redisClient;

const VERIFY_ATTEMPT_LIMIT = 5;
const VERIFY_ATTEMPT_WINDOW_SEC = 60; // 1 minute window

export async function handleSocialLogin(profile: any) {
  if (!JWT_SECRET) {
    // This stops the app from crashing and gives a clear error
    throw new Error("JWT_SECRET is not defined in the environment variables.");
  }
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

    const jwtToken = jwt.sign(existingUser, JWT_SECRET);
    console.log("JWT TOKEN: ", jwtToken);
    // User exists and provider matches
    return {
      status: "success",
      message: "authentication succed",
      data: existingUser,
      jwtToken: jwtToken,
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

  const jwtToken = jwt.sign(newUser, JWT_SECRET);

  return {
    status: "success",
    message: "authentication succed",
    data: newUser,
    jwtToken: jwtToken,
  };
}

export async function sendEmailOtp(email: string) {
  // Dont send otp if google is testing
  if (
    email === "googletesting@morphify.botcmd.com" ||
    email === "googletest@morphify.botcmd.com" ||
    email === "rahul802018@gmail.com"
  ) {
    let user = await prisma.user.findUnique({ where: { email } });
    // Generate OTP and expiry
    const { otp, otpExpiresAt } = generateOtp();

    // Update user with OTP and expiry
    await prisma.user.update({
      where: { email },
      data: {
        otp: "010722",
        otpExpiresAt,
      },
    });

    return {
      status: "success",
      type: "login",
      message: "OTP sent successfully",
    };
  }

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

  sendOtpEmail({
    toEmail: email,
    subject: `Morphify AI: Your OTP is ${otp}`,
    parameter: otp, // This is your OTP or dynamic content
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

  sendOtpEmail({
    toEmail: email,
    subject: `Morphify AI: Your OTP is ${otp}`,
    parameter: otp, // This is your OTP or dynamic content
  });

  return {
    status: "success",
    type: "resend",
    message: "OTP re-sent successfully",
  };
}

export async function verifyEmailOtp(email: string, otp: string) {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in the environment variables.");
  }
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

  // rate limiting via Redis
  const key = `verify_attempts:${email}`;
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, VERIFY_ATTEMPT_WINDOW_SEC);
  }
  if (current > VERIFY_ATTEMPT_LIMIT) {
    return {
      status: "fail",
      type: "verify",
      message: "Too many verification attempts. Please try again later.",
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.provider !== "EMAIL") {
    return { status: "fail", type: "verify", message: "Invalid OTP" };
  }

  if (!user.otp || !user.otpExpiresAt) {
    return { status: "fail", type: "verify", message: "Invalid OTP" };
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

  // ✅ clear OTP after success
  await prisma.user.update({
    where: { email },
    data: {
      otp: null,
      otpExpiresAt: null,
    },
  });

  // Optionally: reset rate limiter after success
  await redis.del(key);

  const jwtToken = jwt.sign(user, JWT_SECRET);

  return {
    status: "success",
    type: "verify",
    message: "OTP verified successfully",
    data: user,
    jwtToken,
  };
}
