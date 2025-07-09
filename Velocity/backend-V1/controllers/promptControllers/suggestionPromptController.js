import {
  saveSuggestionPrompt,
  fetchSuggestionPromptByOccupation,
} from "../../models/promptModel.js";
import { logger } from "../../utils/winstonLogger.js";

// Create a new suggestion prompt
export const createSuggestionPrompt = async (req, res) => {
  try {
    const { prompt, occupation } = req.body;

    // Validate input
    if (!prompt || !Array.isArray(prompt) || !occupation) {
      logger.warn(
        `Invalid input for suggestion prompt creation: ${JSON.stringify(
          req.body
        )}`
      );
      return res.status(400).json({
        success: false,
        message: "Please provide both prompt array and occupation",
      });
    }

    const savedPrompt = await saveSuggestionPrompt({
      prompt,
      occupation,
    });

    logger.info("Suggestion prompt created successfully");

    return res.status(201).json({
      success: true,
      message: "Suggestion prompt created successfully",
      data: savedPrompt,
    });
  } catch (error) {
    logger.error(`Error in createSuggestionPrompt: ${error}`);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Fetch a random suggestion prompt by occupation
export const getSuggestionPrompt = async (req, res) => {
  try {
    const { occupation } = req.params;

    if (!occupation) {
      logger.warn(
        `Missing occupation parameter in getSuggestionPrompt: ${JSON.stringify(
          req.params
        )}`
      );
      return res.status(400).json({
        success: false,
        message: "Please provide an occupation",
      });
    }

    const prompt = await fetchSuggestionPromptByOccupation(occupation);

    if (!prompt) {
      logger.info(`No suggestion prompts found for occupation: ${occupation}`);
      return res.status(404).json({
        success: false,
        message: "No suggestion prompts found for this occupation",
      });
    }

    logger.info(
      `Successfully fetched suggestion prompt for occupation: ${occupation}`
    );

    return res.status(200).json({
      success: true,
      data: prompt,
    });
  } catch (error) {
    logger.error(`Error in getSuggestionPrompt: ${error}`);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
