import db from "../../config/postgresDB.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();
// import { transporter } from "./verifyEmailController.js";
import sgMail from "@sendgrid/mail";
import { passwordResetTemplate } from "../../utils/emailTemplate.js";
import {
  findUserByEmail,
  storePasswordResetToken,
  verifyPasswordResetToken,
  deletePasswordResetToken,
  updateUserById,
} from "../../models/userModel.js";
import { logger } from "../../utils/winstonLogger.js";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Request password reset
export const forgotPassword = async (req, res) => {
  const client = await db.connect();
  await client.query("BEGIN");

  try {
    const { email } = req.body;

    if (!email) {
      logger.warn("Forgot password failed: Email is missing.");
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await findUserByEmail(email, "usertable");

    if (!user) {
      logger.warn(`Forgot password failed: User not found for email: ${email}`);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if the user is registered with Google (has google_id) and no password
    if (user.google_id && !user.password) {
      logger.warn(
        `Forgot password failed: Google Sign-In account for email: ${email}`
      );
      return res.status(400).json({
        success: false,
        message: "This account uses Google Sign-In. Please log in with Google.",
      });
    }

    // Generate a random token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Store the token in the database
    await storePasswordResetToken(user.user_id, user.email, resetToken);

    // Create reset password link
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?resetToken=${resetToken}`;

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Password Reset Request",
      html: passwordResetTemplate(resetLink),
    };

    await sgMail.send(mailOptions);
    await client.query("COMMIT");

    logger.info(`Password reset link sent to email: ${email}`);
    res.json({
      success: true,
      resetLink: resetLink,
      message: "Password reset link sent to your email",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error(
      `Error in forgot password for email ${
        req.body?.email || "unknown"
      }: ${error}`
    );
    res.status(500).json({
      success: false,
      message: "Error processing password reset request",
      error: error.message,
    });
  } finally {
    client.release();
  }
};

// Reset password with token
export const resetPassword = async (req, res) => {
  const client = await db.connect();
  await client.query("BEGIN");

  try {
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (!resetToken || !newPassword || !confirmPassword) {
      logger.warn("Reset password failed: Missing required fields.");
      return res.status(400).json({
        success: false,
        message: "Reset token and new password are required",
      });
    }

    if (newPassword !== confirmPassword) {
      logger.warn("Reset password failed: Passwords do not match.");
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    // Verify token
    const tokenRecord = await verifyPasswordResetToken(resetToken);

    if (!tokenRecord) {
      logger.warn("Reset password failed: Invalid or expired reset token.");
      return res.status(400).json({
        success: false,
        message: "Invalid or expired password reset token",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user password
    await updateUserById(tokenRecord.user_id, {
      column: "password",
      value: hashedPassword,
    });

    // Delete used token
    await deletePasswordResetToken(resetToken);

    await client.query("COMMIT");

    logger.info(
      `Password reset successful for user_id: ${tokenRecord.user_id}`
    );
    res.json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error(`Error in reset password: ${error}`);
    res.status(500).json({
      success: false,
      message: "Error resetting password",
      error: error.message,
    });
  } finally {
    client.release();
  }
};
