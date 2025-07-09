import db from "../../config/postgresDB.js";
import jwt from "jsonwebtoken";
import {
  findUserByEmail,
  addEmailInAllEmails,
  createTrialUser,
  checkTrialAvailability,
  decrementThreshold,
} from "../../models/userModel.js";

export const trialUserEmail = async (req, res) => {
  const client = await db.connect();
  await client.query("BEGIN");

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    const existingUser = await findUserByEmail(email, "usertable");

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }
    //add email in allEmails table
    await addEmailInAllEmails(email, "trynow");

    //create free trial user availability
    await createTrialUser(email);

    //generate JWT token for free trial user
    const ftToken = jwt.sign(
      { email },
      process.env.JWT_SECRET || "your_jwt_secret_key",
      { expiresIn: "365d" }
    );

    //for development
    // res.cookie("ftToken", ftToken);

    //production
    res.cookie("ftToken", ftToken, {
      httpOnly: true,
      secure: true,
      // sameSite: "lax", //production
      sameSite: "none", //development
      maxAge: 365 * 24 * 60 * 60 * 1000, // 365 days
      path: "/",
      domain: process.env.COOKIE_DOMAIN,
    });

    console.log("ftToken", ftToken);

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Email submitted",
      email,
      ftToken,
    });
  } catch (error) {
    console.error("Error in trialUserEmail:", error);
    await client.query("ROLLBACK");
    res.status(500).json({
      success: false,
      message: "Error in trialUserEmail",
    });
  } finally {
    client.release();
  }
};

export const checkFreeTrialAvailability = async (req, res) => {
  const client = await db.connect();
  await client.query("BEGIN");

  try {
    const { ftToken } = req.cookies;

    if (!ftToken) {
      return res.status(400).json({
        success: false,
        message: "No free trial token found.",
      });
    }

    const decodedUser = jwt.verify(ftToken, process.env.JWT_SECRET);
    const { email } = decodedUser;

    const TrialAvailability = await checkTrialAvailability(email);

    if (!TrialAvailability) {
      return res.status(400).json({
        success: false,
        message: "User not found.",
      });
    }

    const { threshold } = TrialAvailability;

    return res.status(200).json({
      success: true,
      threshold,
    });
  } catch (error) {
    console.error("Error in checkFreeTrialAvailability:", error);
    await client.query("ROLLBACK");
    res.status(500).json({
      success: false,
      message: "Error in checkFreeTrialAvailability",
    });
  } finally {
    client.release();
  }
};

export const decrementTrial = async (req, res) => {
  const client = await db.connect();
  await client.query("BEGIN");

  try {
    const { ftToken } = req.cookies;

    if (!ftToken) {
      return res.status(400).json({
        success: false,
        message: "No free trial token found.",
      });
    }

    const decodedUser = jwt.verify(ftToken, process.env.JWT_SECRET);
    const { email } = decodedUser;

    await decrementThreshold(email);

    await client.query("COMMIT");

    res.status(200).json({
      success: true,
      message: "Trial count decremented successfully.",
    });
  } catch (error) {
    console.error("Error in decrementTrial:", error);
    await client.query("ROLLBACK");
    res.status(500).json({
      success: false,
      message: "Error in decrementTrial",
    });
  } finally {
    client.release();
  }
};
