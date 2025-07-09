import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { createClient } from "redis";
import jwt from "jsonwebtoken";

// Connect to Redis
const redisClient = createClient({
  socket: {
    host: "216.10.251.235",
    port: 6379,
  },
  password: "redisThinkVel@2025",
  RESP: 3,
});
redisClient.connect().then(console.log("Redis connected")).catch(console.error);

export const apiLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
    prefix: "rate-limit:",
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Max 5 requests per window per key (IP by default)
  message: "Too many requests. Please try again in a minute.",
  standardHeaders: true, // Adds RateLimit-* headers
  legacyHeaders: false, // Disables X-RateLimit-* headers
});

export const jwtBasedLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
    prefix: "api-limit:",
  }),
  keyGenerator: (req) => {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith("Bearer ")) {
      const token = auth.split(" ")[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded.userId || req.ip; // use unique user ID
      } catch (err) {
        return req.ip; // fallback to IP if token is invalid
      }
    }
    return req.ip; // fallback if no token
  },
  windowMs: 60 * 1000, // 1 minute
  max: 15, // Max 15 requests per window per user
  message: "Too many requests. Please try again later.",
  standardHeaders: true, // Adds RateLimit-* headers
  legacyHeaders: false, // Disables X-RateLimit-* headers
});

export const fetchLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
    prefix: "fetch-limit:",
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Max 10 requests per window per key (IP by default)
  message: "Too many requests. Please try again in a minute.",
  standardHeaders: true, // Adds RateLimit-* headers
  legacyHeaders: false, // Disables X-RateLimit-* headers
});
