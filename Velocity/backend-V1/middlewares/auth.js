import jwt from "jsonwebtoken";
import { findUserById } from "../models/userModel.js";
import dotenv from "dotenv";
dotenv.config();
import { logger } from "../utils/winstonLogger.js";

export const verifyAuthToken = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    // Try to get token from Authorization header
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    // If no token in header, try to get from cookies
    if (!token && req.cookies.authToken) {
      token = req.cookies.authToken;
    }

    if (!token || token === "null") {
      logger.warn("Authentication required: No token provided.");
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    try {
      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if user exists in database
      const user = await findUserById(decoded.userId, "usertable");
      if (!user) {
        logger.warn(
          `Authentication failed: User not found for userId=${decoded.userId}`
        );
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      req.userID = decoded.userId;
      req.token = token;
      logger.info(`User authenticated successfully: userId=${decoded.userId}`);
      next();
    } catch (jwtError) {
      logger.error(`JWT error: ${jwtError.name} - ${jwtError.message}`);
      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token has expired. Please login again.",
          expiredAt: jwtError.expiredAt,
          currentTime: new Date(),
        });
      }
      throw jwtError; // Re-throw for the outer catch
    }
  } catch (error) {
    logger.error(`Token verification error: ${error}`);
    return res.status(401).json({
      success: false,
      message: error.message || "Invalid token",
    });
  }
};
