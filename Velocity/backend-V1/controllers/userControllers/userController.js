import db from "../../config/postgresDB.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
import { logger } from "../../utils/winstonLogger.js";
import {
  createUser,
  addEmailInAllEmails,
  createReview,
  getTutorial,
  getEmailVerified,
  getExistingUser,
  updateUserById,
} from "../../models/userModel.js";

export const Register = async (req, res) => {
  const client = await db.connect();
  await client.query("BEGIN");

  try {
    const { name, email, password, confirmPassword, googleId, avatar } =
      req.body;

    if (!email) {
      logger.warn("Registration failed: Email is missing.");
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logger.warn(`Invalid email format: ${email}`);
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // For regular signup, we need password and confirmPassword
    if (!googleId) {
      if (!password) {
        logger.warn(`Missing password for email: ${email}`);
        return res.status(400).json({
          success: false,
          message: "Password is required for regular sign-up",
        });
      }

      if (password !== confirmPassword) {
        logger.warn(`Password mismatch for email: ${email}`);
        return res.status(400).json({
          success: false,
          message: "Passwords do not match",
        });
      }
    }

    // Check if user exists
    const existingUsers = await getExistingUser(email, googleId);

    if (existingUsers) {
      logger.info(`Attempt to register an already existing user: ${email}`);
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    // Only hash password for regular signup
    let hashedPassword = null;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    // Set email_verified to true for Google users, false for regular users
    // const isEmailVerified = !!googleId;

    const newUser = await createUser({
      name,
      email,
      password: hashedPassword,
      googleId: googleId || null,
      email_verified: true,
      used_codes: [],
      profile_img_url: avatar || null,
    });

    await addEmailInAllEmails(email, "usertable");
    const tutorial = await getTutorial(email);
    const email_verified = await getEmailVerified(email);

    const userId = newUser.user_id;
    const authToken = jwt.sign({ userId, email }, process.env.JWT_SECRET, {
      expiresIn: "15d",
    });

    //set cookies
    res.cookie("authToken", authToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax", //production
      // sameSite: "none", //development
      maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
      path: "/",
      domain: process.env.COOKIE_DOMAIN,
    });
    await client.query("COMMIT");

    logger.info(`New user registered: ${email}, user_id: ${userId}`);
    res.status(201).json({
      success: true,
      message: "Registration successful",
      userdata: {
        userId,
        name,
        email,
        avatar,
        googleId: googleId || null,
        tutorial: tutorial.tutorial,
        email_verified: email_verified.email_verified,
        profile_img_url: avatar || null,
      },
      token: authToken,
    });
  } catch (error) {
    logger.error(
      `Registration error for ${req.body?.email || "unknown"}: ${error}`
    );
    await client.query("ROLLBACK");
    res.status(500).json({
      success: false,
      message: "Error during registration",
      error: error.message,
    });
  } finally {
    client.release();
  }
};

export const Login = async (req, res) => {
  const client = await db.connect();
  await client.query("BEGIN");
  try {
    const { email, password, googleId, avatar } = req.body;
    if (!email) {
      logger.warn("Login failed: Email is missing.");
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logger.warn(`Login failed: Invalid email format: ${email}`);
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    const existingUser = await getExistingUser(email, googleId);

    if (!existingUser) {
      logger.warn(`Login failed: User not found for email: ${email}`);
      return res.status(401).json({
        success: false,
        message: "User not available, Register first!!",
      });
    }

    if (!existingUser.profile_img_url && avatar) {
      await updateUserById(existingUser.user_id, {
        column: "profile_img_url",
        value: avatar,
      });
    }

    const userData = {
      userId: existingUser.user_id,
      userName: existingUser.name,
      userEmail: existingUser.email,
      userPassword: existingUser.password,
      userGoogleId: existingUser.google_id,
      userTutorial: existingUser.tutorial,
      userEmailVerified: existingUser.email_verified,
      userUsedCodes: existingUser.used_codes,
      userProfileImgUrl: existingUser.profile_img_url,
    };

    let {
      userId,
      userName,
      userEmail,
      userPassword,
      userGoogleId,
      userTutorial,
      userEmailVerified,
      userUsedCodes,
      userProfileImgUrl,
    } = userData;

    if (googleId) {
      if (!userGoogleId) {
        await updateUserById(userId, { column: "google_id", value: googleId });
        userGoogleId = googleId;
        logger.info(`Google ID updated for user: ${email}`);
      }

      if (googleId !== userGoogleId && userGoogleId !== null) {
        logger.warn(`Login failed: Invalid Google account for email: ${email}`);
        return res.status(401).json({
          success: false,
          message: "Invalid Google account",
        });
      }
    } else {
      if (!password) {
        logger.warn(`Login failed: Missing password for email: ${email}`);
        return res.status(401).json({
          success: false,
          message: "Invalid Credentials",
        });
      }

      const isPasswordMatch = await bcrypt.compare(password, userPassword);
      if (!isPasswordMatch) {
        logger.warn(`Login failed: Incorrect password for email: ${email}`);
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }
    }

    const authToken = jwt.sign({ userId, email }, process.env.JWT_SECRET, {
      expiresIn: "15d",
    });

    //development
    // res.cookie(authToken, authToken);

    //production
    res.cookie("authToken", authToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax", //production
      // sameSite: "none", //development
      maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
      path: "/",
      domain: process.env.COOKIE_DOMAIN,
    });

    await client.query("COMMIT");

    logger.info(`Login successful for user: ${email}, user_id: ${userId}`);
    res.status(200).json({
      success: true,
      message: "Login successful",
      token: authToken,
      userdata: {
        userId,
        userName,
        userEmail,
        userGoogleId,
        userTutorial,
        userEmailVerified,
        userUsedCodes,
        userProfileImgUrl,
      },
    });
  } catch (error) {
    logger.error(`Login error for ${req.body?.email || "unknown"}: ${error}`);
    res.status(500).json({
      success: false,
      message: "Error during login",
      error: error.message,
    });
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
};

export const Reviews = async (req, res) => {
  const client = await db.connect();
  await client.query("BEGIN");
  try {
    const { user_id, selectedReason, feedback } = req.body;

    // Input validation
    if (!selectedReason) {
      logger.warn("Review submission failed: Reason is missing.");
      return res.status(400).json({
        success: false,
        message: "Reason and feedback are required",
      });
    }

    // Handle optional user_id, defaulting to 0 if not provided
    const finalUserId = user_id || 0;

    // Save image URL
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    //create review
    const newReview = await createReview({
      user_id: finalUserId,
      reason: selectedReason,
      feedback,
      image_url: imageUrl,
    });

    await client.query("COMMIT");

    logger.info(`Review submitted: user_id=${finalUserId}`);
    res.status(201).json({
      success: true,
      message: "Review submitted successfully!",
      reviewId: newReview.id,
      reviewData: {
        user_id: finalUserId,
        reason: selectedReason,
        feedback,
        image_url: imageUrl,
      },
    });
  } catch (error) {
    logger.error(
      `Review submission error for user_id=${
        req.body?.user_id || "unknown"
      }: ${error}`
    );
    await client.query("ROLLBACK");
    res.status(500).json({
      success: false,
      message: "Error during review submission",
      error: error.message,
    });
  } finally {
    client.release();
  }
};

export const isExtInstall = async (req, res) => {
  const client = await db.connect();
  await client.query("BEGIN");

  try {
    const { user_id, installed } = req.body;

    if (!user_id) {
      logger.warn("Extension install update failed: user_id is missing.");
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (
      installed === null ||
      installed === undefined ||
      typeof installed !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message: "installed value is required",
      });
    }

    await updateUserById(user_id, { column: "installed", value: installed });

    await client.query("COMMIT");

    logger.info(
      `Extension install status updated: user_id=${user_id}, installed=${installed}`
    );
    res.status(201).json({
      success: true,
      message: "Installed Field Updated successful",
    });
  } catch (error) {
    logger.error(
      `Error updating installed field for user_id=${
        req.body?.user_id || "unknown"
      }: ${error}`
    );
    await client.query("ROLLBACK");
    res.status(500).json({
      success: false,
      message: "Error during Modifying Installed Field",
      error: error.message,
    });
  } finally {
    client.release();
  }
};
