import { otpRateLimiter } from "./redisRateLimiter";

const isEligibleForOtp = async (email: string) => {
  try {
    await otpRateLimiter.consume(email); // deduct 1 point
    return true;
  } catch (rejRes) {
    return false;
  }
};

export default isEligibleForOtp;
