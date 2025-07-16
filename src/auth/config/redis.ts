// src/utils/redisClient.ts
import Redis from "ioredis";

// Create a Redis client (connects to localhost:6379 by default)
const redisClient = new Redis({
  host: "127.0.0.1", // or your Redis server IP
  port: 6379,
  // password: "your_redis_password", // if needed
});

redisClient.on("connect", () => {
  console.log("✅ Connectedd to Redis");
});

redisClient.on("error", (err) => {
  console.error("❌ Redis error:", err);
});

export default redisClient;
