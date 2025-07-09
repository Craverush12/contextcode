import {
  getOnboardingData,
  createOnboardingData,
} from "../../models/userModel.js";
import db from "../../config/postgresDB.js";
import { logger } from "../../utils/winstonLogger.js";

export const userOnboarding = async (req, res) => {
  const client = await db.connect();
  await client.query("BEGIN");

  try {
    const {
      userId,
      llmPlatform,
      occupation,
      source,
      problems_faced,
      use_case,
    } = req.body;

    if (!llmPlatform || !occupation || !source) {
      logger.warn("Onboarding failed: Missing required fields.");
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const onboardingData = {
      llm_platform: llmPlatform,
      occupation: occupation,
      source: source,
      user_id: userId,
      problems_faced: problems_faced || null,
      use_case: use_case || null,
    };

    const onboardingResult = await createOnboardingData(onboardingData);
    await client.query("COMMIT");

    logger.info(`User onboarding completed for userId=${userId}`);
    res.status(201).json({
      success: true,
      message: "User onboarding completed",
      onboardingResult,
    });
  } catch (error) {
    logger.error(
      `Onboarding error for userId=${req.body?.userId || "unknown"}: ${error}`
    );
    await client.query("ROLLBACK");
    res.status(500).json({
      success: false,
      message: "Error during onboarding",
      error: error.message,
    });
  } finally {
    client.release();
  }
};

export const fetchUserOnboardingData = async (req, res) => {
  try {
    const userId = req.params.id;
    if (!userId) {
      logger.warn("Fetch onboarding failed: UserID not found in params.");
      return res.status(400).json({
        success: false,
        message: "UserID Not Found",
      });
    }

    const fetchedOnboardingData = await getOnboardingData(userId);
    if (!fetchedOnboardingData) {
      logger.warn(`Onboarding data not found for userId=${userId}`);
      return res.status(404).json({
        success: false,
        message: "User onboarding data not found",
      });
    }

    logger.info(`User onboarding data fetched for userId=${userId}`);
    res.status(201).json({
      success: true,
      message: "User onboarding fetched",
      fetchedOnboardingData,
    });
  } catch (error) {
    logger.error(
      `Onboarding fetch error for userId=${
        req.params?.id || "unknown"
      }: ${error}`
    );
    res.status(500).json({
      success: false,
      message: "Error during onboarding data fetching",
      error: error.message,
    });
  }
};
