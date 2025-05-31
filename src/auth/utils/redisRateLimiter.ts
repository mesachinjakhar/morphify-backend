// redisRateLimiter.ts
import { RateLimiterRedis } from "rate-limiter-flexible";
import redisClient from "../config/redis";

export const otpRateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "otp_rate_limit",
  points: 5, // 5 requests
  duration: 60 * 60, // per hour
  blockDuration: 300, // block for 5 minute after exceeding
});
