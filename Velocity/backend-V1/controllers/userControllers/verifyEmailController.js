// import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";
import db from "../../config/postgresDB.js";
import dotenv from "dotenv";
dotenv.config();
import { emailVerificationTemplate } from "../../utils/emailTemplate.js";
import {
  findUserByEmail,
  deleteEmailOtp,
  storeEmailOtp,
  verifyEmailOtp,
  updateUserById,
} from "../../models/userModel.js";
import { logger } from "../../utils/winstonLogger.js";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendVerificationEmail = async (req, res) => {
  const client = await db.connect();
  await client.query("BEGIN");
  try {
    // const userId = req.userID; //from auth middleware
    const { email } = req.body;

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete any existing OTP for this user
    await deleteEmailOtp(email);

    // Store new OTP
    await storeEmailOtp(email, otp);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Verify Your Email",
      html: emailVerificationTemplate(otp),
    };

    // await transporter.sendMail(mailOptions);
    await sgMail.send(mailOptions);
    await client.query("COMMIT");

    logger.info(`Verification email sent to: ${email}`);
    res.json({
      success: true,
      message: "Verification email sent successfully",
      otp,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error(
      `Error sending verification email to ${
        req.body?.email || "unknown"
      }: ${error}`
    );
    res.status(500).json({
      success: false,
      message: "Error sending verification email",
    });
  } finally {
    client.release();
  }
};

export const verifyEmail = async (req, res) => {
  const client = await db.connect();
  await client.query("BEGIN");
  try {
    const { otp, email } = req.body;

    // Verify OTP
    const otpRecord = await verifyEmailOtp(email, otp);

    if (!otpRecord) {
      logger.warn(`Invalid or expired verification code for email: ${email}`);
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code",
      });
    }

    // Delete used OTP
    await deleteEmailOtp(email);

    await client.query("COMMIT");

    logger.info(`Email verified successfully for: ${email}`);
    res.json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error(
      `Email verification error for ${req.body?.email || "unknown"}: ${error}`
    );
    res.status(500).json({
      success: false,
      message: "Error during email verification",
    });
  } finally {
    client.release();
  }
};
