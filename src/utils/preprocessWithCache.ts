import redisClient from "../auth/config/redis";
import { getUrlHash } from "./hashImageUrl";
import { preprocessImage } from "./preprocessImage";

/**
 * Wraps preprocessImage() with Redis caching
 */
export async function preprocessWithCache(
  imageUrl: string,
  supportedFormats: string[]
): Promise<string> {
  const hashKey = `preprocessed:${getUrlHash(imageUrl)}`;

  const cachedUrl = await redisClient.get(hashKey);
  if (cachedUrl) {
    console.log("⚡ Using cached preprocessed image:", cachedUrl);
    return cachedUrl;
  }

  const finalUrl = await preprocessImage(imageUrl, supportedFormats);

  // Cache for 5 mins
  await redisClient.set(hashKey, finalUrl, "EX", 60 * 5);

  console.log("✅ Cached preprocessed image URL:", finalUrl);
  return finalUrl;
}
