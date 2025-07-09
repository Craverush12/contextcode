import db from "../../config/postgresDB.js";
import crypto from "crypto";
import {
  getExistingReferralCode,
  fetchReferrals,
  createReferralCode,
  updateReferralById,
  findUserById,
  updateUserById,
} from "../../models/userModel.js";
import { logger } from "../../utils/winstonLogger.js";

export const generateReferralCode = async (req, res) => {
  const client = await db.connect();
  await client.query("BEGIN");

  try {
    const user_id = req.userID;

    const existing_referral_code = await getExistingReferralCode(user_id);

    if (existing_referral_code) {
      return res.status(200).json({
        success: true,
        referralCode: existing_referral_code.referral_code,
      });
    }

    const createUniqueCode = () =>
      crypto.randomBytes(5).toString("hex").toUpperCase();

    let code = createUniqueCode();
    let existingCode = await fetchReferrals({
      column: "referral_code",
      value: code,
    });

    while (existingCode && existingCode.length > 0) {
      code = createUniqueCode();
      existingCode = await fetchReferrals({
        column: "referral_code",
        value: code,
      });
    }

    await createReferralCode(user_id, code);

    await client.query("COMMIT");
    logger.info(`Generated new referral code for user_id=${user_id}`);
    return res.status(200).json({ success: true, referralCode: code });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error(
      `Error generating referral code for user_id=${
        req.userID || "unknown"
      }: ${error}`
    );
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

export const applyReferral = async (req, res) => {
  const client = await db.connect();
  await client.query("BEGIN");

  try {
    const { referral_code, user_id } = req.body;

    // Check if the referral code is valid
    const validReferral = await fetchReferrals({
      column: "referral_code",
      value: referral_code,
    });

    if (!validReferral || validReferral.length === 0) {
      await client.query("ROLLBACK");
      logger.warn(`Invalid referral code attempted by user_id=${user_id}`);
      return res.status(400).json({
        success: false,
        message: "Invalid referral code.",
      });
    }

    const referrer = validReferral;
    const referrerId = referrer.user_id;

    // Prevent self-referral
    if (referrerId === user_id) {
      await client.query("ROLLBACK");
      logger.warn(`Self-referral attempt by user_id=${user_id}`);
      return res.status(400).json({
        success: false,
        message: "You cannot use your own referral code.",
      });
    }

    //fetch user token by id
    const userData = await findUserById(user_id, "usertable");
    const userExistingTokens = userData.tokens;

    //fetch referrer token by id
    const referrerData = await findUserById(referrerId, "usertable");
    const referrerExistingTokens = referrerData.tokens;

    //update user tokens
    await updateUserById(user_id, {
      column: "tokens",
      value:
        Number(userExistingTokens) +
        Number(referrer.tokens_awarded_by_referrer),
    });

    //update referrer tokens
    await updateUserById(referrerId, {
      column: "tokens",
      value:
        Number(referrerExistingTokens) +
        Number(referrer.tokens_received_by_referrer),
    });

    //update referred by in user table
    await updateUserById(user_id, {
      column: "referred_by",
      value: Number(referrerId),
    });

    //update times used in referral table
    await updateReferralById(referrerId, {
      column: "times_used",
      value: Number(referrer.times_used) + 1,
    });

    await client.query("COMMIT");

    logger.info(
      `Referral applied: user_id=${user_id} used code=${referral_code} from referrer_id=${referrerId}`
    );
    return res.status(200).json({
      success: true,
      message: "Referral applied successfully.",
    });
  } catch (error) {
    logger.error(
      `Error applying referral for user_id=${
        req.body?.user_id || "unknown"
      }: ${error}`
    );
    await client.query("ROLLBACK");
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};
