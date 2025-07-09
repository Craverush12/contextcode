import db from "../../config/postgresDB.js";
import {
  fetchTokensById,
  updateTokens,
  getAllCredits,
} from "../../models/tokenModel.js";
import { logger } from "../../utils/winstonLogger.js";

export const fetchTokens = async (req, res) => {
  try {
    const user_id = req.params.id;
    const tokens = await fetchTokensById(user_id);
    logger.info(`Fetched tokens for user_id=${user_id}: ${tokens}`);

    if (!tokens) {
      logger.warn(`No tokens found for user_id=${user_id}`);
      return res.status(404).json({
        success: false,
        message: "No Tokens",
      });
    }

    res.status(200).json({
      success: true,
      message: "Tokens fetched successfully",
      tokens,
    });
  } catch (error) {
    logger.error(
      `Error fetching tokens for user_id=${
        req.params?.id || "unknown"
      }: ${error}`
    );
    res.status(500).json({
      success: false,
      message: "Error fetching tokens",
      error: error.message,
    });
  }
};

//get all credits
export const fetchAllCredits = async (req, res) => {
  try {
    const credits = await getAllCredits();

    const creditsMap = credits.reduce((acc, credit) => {
      acc[credit.feature] = credit.credits;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      message: "Credits fetched successfully",
      credits: creditsMap,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching credits",
      error: error.message,
    });
  }
};

//update tokens
export const updateUserTokens = async (req, res) => {
  const client = await db.connect();
  await client.query("BEGIN");
  try {
    const user_id = req.userID;
    const { amount } = req.body;

    if (!user_id) {
      logger.warn("Update tokens failed: User ID is missing.");
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Validate ID
    if (isNaN(user_id)) {
      logger.warn(`Update tokens failed: Invalid user ID: ${user_id}`);
      return res.status(400).json({
        success: false,
        message: "Invalid user ID ",
      });
    }

    // Validate amount
    if (!amount || amount <= 0) {
      logger.warn(`Update tokens failed: Invalid amount: ${amount}`);
      return res.status(400).json({
        success: false,
        message: "Valid Top Up amount is required",
      });
    }

    const fetchTokens = await fetchTokensById(user_id);
    const updatedTokens = Number(fetchTokens) + Number(amount);
    await updateTokens(user_id, updatedTokens);

    await client.query("COMMIT");

    logger.info(
      `Tokens updated for user_id=${user_id}. New total: ${updatedTokens}`
    );
    res.status(200).json({
      success: true,
      message: "Tokens updated successfully",
      currentTokens: updatedTokens,
    });
  } catch (error) {
    logger.error(
      `Update tokens error for user_id=${
        req.body?.userID || "unknown"
      }: ${error}`
    );
    await client.query("ROLLBACK");
    res.status(500).json({
      success: false,
      message: "Error updating tokens",
      error: error.message,
    });
  } finally {
    client.release();
  }
};

//deduct tokens
export const deductTokens = async (req, res) => {
  const client = await db.connect();
  await client.query("BEGIN");

  try {
    const { user_id, amount } = req.body;

    if (!user_id) {
      logger.warn("Deduct tokens failed: User ID is missing.");
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Validate ID
    if (isNaN(user_id)) {
      logger.warn(`Deduct tokens failed: Invalid user ID: ${user_id}`);
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const fetchTokens = await fetchTokensById(user_id);
    const availableTokens = Number(fetchTokens);

    if (availableTokens <= 0) {
      logger.warn(
        `Deduct tokens failed: Insufficient tokens for user_id=${user_id}`
      );
      return res.status(400).json({
        success: false,
        message: "Insufficient tokens",
      });
    }

    const updatedTokens = Math.max(0, availableTokens - Number(amount));

    await updateTokens(user_id, updatedTokens);
    await client.query("COMMIT");

    logger.info(
      `Tokens deducted for user_id=${user_id}. New total: ${updatedTokens}`
    );
    res.status(200).json({
      success: true,
      message: "Tokens deducted successfully",
      currentTokens: updatedTokens,
    });
  } catch (error) {
    logger.error(
      `Deduct tokens error for user_id=${
        req.body?.user_id || "unknown"
      }: ${error}`
    );
    await client.query("ROLLBACK");
    res.status(500).json({
      success: false,
      message: "Error deducting tokens",
      error: error.message,
    });
  } finally {
    client.release();
  }
};
