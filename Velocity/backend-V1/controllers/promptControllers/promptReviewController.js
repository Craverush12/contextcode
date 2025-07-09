import db from "../../config/postgresDB.js";
import {
  insertIntoPromptReview,
  updatePromptReview,
  fetchPromptReviewById,
} from "../../models/promptModel.js";
import { logger } from "../../utils/winstonLogger.js";

export const insertPromptData = async (req, res) => {
  const client = await db.connect();
  await client.query("BEGIN");

  try {
    const userIp = req.ip;
    const {
      user_id,
      prompt,
      ai_type,
      style,
      domain,
      processing_time_ms,
      intent,
      intent_description,
      relevance_analysis,
    } = req.body;

    if (!user_id) {
      logger.warn("Insert prompt data failed: UserId not Found.");
      return res.status(400).json({
        success: false,
        message: "Login to continue",
      });
    }

    if (!prompt) {
      logger.warn("Insert prompt data failed: Prompt is required.");
      return res.status(400).json({
        success: false,
        message: "Prompt is required",
      });
    }

    const metadata = await getMetadata(userIp);

    const prompt_data = {
      user_id,
      prompt,
      llm_used: ai_type,
      selected_style: style,
      domain,
      metadata: metadata || userIp || null,
      processing_time_ms,
      intent,
      intent_description,
      relevance_analysis,
    };

    const result = await insertIntoPromptReview(prompt_data);
    await client.query("COMMIT");

    logger.info(`Prompt data saved successfully for user_id=${user_id}`);
    return res.status(200).json({
      success: true,
      message: "Prompt saved successfully",
      promptData: {
        prompt_review_id: result.id,
        user_id,
        prompt,
        llm_used: ai_type,
        selected_style: style,
        domain,
        processing_time_ms,
        intent,
        intent_description,
        relevance_analysis,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error(
      `Error saving prompt for user_id=${
        req.body?.user_id || "unknown"
      }: ${error}`
    );
    return res.status(500).json({
      success: false,
      message: "Error saving prompt",
    });
  } finally {
    client.release();
  }
};

export const insertEnhancedPrompt = async (req, res) => {
  const client = await db.connect();
  await client.query("BEGIN");

  try {
    const { prompt_review_id, enhanced_prompt } = req.body;

    if (!prompt_review_id) {
      logger.warn(
        "Insert enhanced prompt failed: Prompt review ID is required."
      );
      return res.status(400).json({
        success: false,
        message: "Prompt review ID is required",
      });
    }

    if (!enhanced_prompt) {
      logger.warn(
        "Insert enhanced prompt failed: Enhanced prompt is required."
      );
      return res.status(400).json({
        success: false,
        message: "Enhanced prompt is required",
      });
    }

    const prompt_review_data = {
      prompt_review_id,
      column: "enhanced_prompt",
      value: enhanced_prompt,
    };

    await updatePromptReview(prompt_review_data);
    await client.query("COMMIT");
    logger.info(
      `Enhanced prompt saved successfully for prompt_review_id=${prompt_review_id}`
    );
    return res.status(200).json({
      success: true,
      message: "Enhanced prompt saved successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error(
      `Error saving enhanced prompt for prompt_review_id=${
        req.body?.prompt_review_id || "unknown"
      }: ${error}`
    );
    return res.status(500).json({
      success: false,
      message: "Error saving enhanced prompt",
    });
  } finally {
    client.release();
  }
};

export const insertFeedback = async (req, res) => {
  const client = await db.connect();
  await client.query("BEGIN");

  try {
    const { prompt_review_id, feedback } = req.body;

    if (!prompt_review_id) {
      logger.warn("Insert feedback failed: Prompt review ID is required.");
      return res.status(400).json({
        success: false,
        message: "Prompt review ID is required",
      });
    }

    if (
      feedback === undefined ||
      feedback === null ||
      typeof feedback !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message: "Feedback value is required",
      });
    }

    const feedbackValue = feedback ? 1 : -1;

    const prompt_review_data = {
      prompt_review_id,
      column: "feedback",
      value: feedbackValue,
    };

    await updatePromptReview(prompt_review_data);
    await client.query("COMMIT");
    logger.info(
      `Feedback saved successfully for prompt_review_id=${prompt_review_id}`
    );
    return res.status(200).json({
      success: true,
      message: "Feedback saved successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error(
      `Error saving feedback for prompt_review_id=${
        req.body?.prompt_review_id || "unknown"
      }: ${error}`
    );
    return res.status(500).json({
      success: false,
      message: "Error saving feedback",
    });
  } finally {
    client.release();
  }
};

export const insertRefinedPrompt = async (req, res) => {
  const client = await db.connect();
  await client.query("BEGIN");

  try {
    const { prompt_review_id, refined_prompt } = req.body;

    if (!prompt_review_id) {
      logger.warn(
        "Insert refined prompt failed: Prompt review ID is required."
      );
      return res.status(400).json({
        success: false,
        message: "Prompt review ID is required",
      });
    }

    if (!refined_prompt) {
      logger.warn("Insert refined prompt failed: Refined prompt is required.");
      return res.status(400).json({
        success: false,
        message: "Refined prompt is required",
      });
    }

    const prompt_review_data = {
      prompt_review_id,
      column: "refined_prompt",
      value: refined_prompt,
    };

    await updatePromptReview(prompt_review_data);
    await client.query("COMMIT");
    logger.info(
      `Refined prompt saved successfully for prompt_review_id=${prompt_review_id}`
    );
    return res.status(200).json({
      success: true,
      message: "Refined Prompt Saved Successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error(
      `Error saving refined prompt for prompt_review_id=${
        req.body?.prompt_review_id || "unknown"
      }: ${error}`
    );
    return res.status(500).json({
      success: false,
      message: "Error saving refined prompt",
    });
  } finally {
    client.release();
  }
};

export const insertRefinedQueAns = async (req, res) => {
  const client = await db.connect();
  await client.query("BEGIN");

  try {
    const { prompt_review_id, refined_que_ans } = req.body;

    if (!prompt_review_id) {
      logger.warn("Insert refined Q&A failed: Prompt review ID is required.");
      return res.status(400).json({
        success: false,
        message: "Prompt review ID is required",
      });
    }

    if (!refined_que_ans || typeof refined_que_ans !== "object") {
      logger.warn(
        "Insert refined Q&A failed: Valid refined Q&A object is required."
      );
      return res.status(400).json({
        success: false,
        message: "Valid refined Q&A object is required",
      });
    }

    const prompt_review_data = {
      prompt_review_id,
      column: "refined_que_ans",
      value: refined_que_ans,
    };

    await updatePromptReview(prompt_review_data);
    await client.query("COMMIT");
    logger.info(
      `Refined Q&A saved successfully for prompt_review_id=${prompt_review_id}`
    );
    return res.status(200).json({
      success: true,
      message: "Refined Q&A saved successfully",
      data: {
        prompt_review_id,
        refined_que_ans,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error(
      `Error saving refined Q&A for prompt_review_id=${
        req.body?.prompt_review_id || "unknown"
      }: ${error}`
    );
    return res.status(500).json({
      success: false,
      message: "Error saving refined Q&A",
    });
  } finally {
    client.release();
  }
};

export const fetchUserHistory = async (req, res) => {
  try {
    const { user_id } = req.params;

    //Get limit and page from query params for pagination
    const limit = req.query.limit || 10;
    const page = req.query.page || 1;

    //Fetch user history from DB
    const history = await fetchPromptReviewById(user_id, limit, page);

    logger.info(`User history fetched successfully for user_id=${user_id}`);
    return res.status(200).json({
      success: true,
      message: "User history fetched successfully",
      history,
    });
  } catch (error) {
    logger.error(
      `Error fetching user history for user_id=${
        req.params?.user_id || "unknown"
      }: ${error}`
    );
    return res.status(500).json({
      success: false,
      message: "Error fetching user history",
    });
  }
};

export async function getMetadata(userIp) {
  try {
    const ipInfo = await fetch(`http://ipwho.is/${userIp}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const ipData = await ipInfo.json();
    const metadata = { userIp, ipData: ipData || null };
    return metadata || null;
  } catch (error) {
    logger.error(`Error fetching metadata for IP ${userIp}: ${error}`);
    return null;
  }
}
