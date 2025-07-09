import db from "../../config/postgresDB.js";
import {
  savePromptToPromptHistory,
  saveResponseToPromptHistory,
  getUserHistoryFromDB,
  updatePromptHistory,
} from "../../models/promptModel.js";

class PromptController {
  constructor() {
    // Initialize any class-level properties if needed
  }

  async savePrompt(req, res) {
    const client = await db.connect();
    await client.query("BEGIN");

    try {
      const { user_id, prompt, ai_type, style, tokens_used } = req.body;
      const content_type = "input";

      if (!prompt) {
        return res.status(400).json({
          success: false,
          message: "Enter the prompt",
        });
      }

      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: "Login to continue",
        });
      }

      const prompt_data = {
        user_id,
        content_type,
        prompt,
        ai_type: ai_type || null,
        style,
        tokens_used: tokens_used || null,
      };

      const result = await savePromptToPromptHistory(prompt_data);
      await client.query("COMMIT");
      return res.status(200).json({
        success: true,
        message: "Prompt saved successfully",
        data: {
          prompt_id: result.prompt_id,
          user_id,
          prompt,
          ai_type: ai_type || null,
          style,
          tokens_used: tokens_used || null,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error saving prompt:", error);
      return res.status(500).json({
        success: false,
        message: "Error saving prompt",
      });
    } finally {
      client.release();
    }
  }

  async saveResponse(req, res) {
    const client = await db.connect();
    await client.query("BEGIN");

    try {
      const { user_id, enhanced_prompt, input_prompt_id, ai_type, style } =
        req.body;
      const content_type = "response";

      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: "Login to continue",
        });
      }

      if (!enhanced_prompt) {
        return res.status(400).json({
          success: false,
          message: "Enhanced prompt not received",
        });
      }

      const response_data = {
        user_id,
        content_type,
        enhanced_prompt,
        ref_prompt_id: input_prompt_id,
        ai_type,
        style,
      };

      const result = await saveResponseToPromptHistory(response_data);
      await client.query("COMMIT");
      return res.status(200).json({
        success: true,
        message: "Response saved successfully",
        data: {
          response_id: result.prompt_id,
          user_id,
          enhanced_prompt,
          ref_prompt_id: input_prompt_id,
          ai_type,
          style,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error saving response:", error);
      return res.status(500).json({
        success: false,
        message: "Error saving response",
      });
    } finally {
      client.release();
    }
  }

  //Fetch user history
  async getUserHistory(req, res) {
    try {
      const { user_id } = req.params;

      //Get limit and page from query params for pagination
      const limit = req.query.limit || 10;
      const page = req.query.page || 1;

      //Fetch user history from DB
      const history = await getUserHistoryFromDB(user_id, limit, page);

      return res.status(200).json({
        success: true,
        message: "User history fetched successfully",
        history,
      });
    } catch (error) {
      console.error("Error fetching user history:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching user history",
      });
    }
  }

  //Update prompt history

  //Set favorite
  async setFavorite(req, res) {
    const client = await db.connect();
    await client.query("BEGIN");

    try {
      const { prompt_id, user_id } = req.body;
      const data = {
        user_id,
        column: "is_favourited",
        value: true,
      };

      await updatePromptHistory(data, prompt_id);
      await client.query("COMMIT");

      return res.status(200).json({
        success: true,
        message: "Favorite set successfully",
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error setting favorite:", error);
      return res.status(500).json({
        success: false,
        message: "Error setting favorite",
      });
    } finally {
      client.release();
    }
  }

  //Set deleted
  async setDeleted(req, res) {
    const client = await db.connect();
    await client.query("BEGIN");

    try {
      const { prompt_id, user_id } = req.body;
      const data = {
        user_id,
        column: "deleted",
        value: true,
      };

      await updatePromptHistory(data, prompt_id);
      await client.query("COMMIT");

      return res.status(200).json({
        success: true,
        message: "Prompt deleted successfully",
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error setting deleted:", error);
      return res.status(500).json({
        success: false,
        message: "Error setting deleted",
      });
    } finally {
      client.release();
    }
  }
}

// Create and export a single instance (Singleton pattern)
const promptController = new PromptController();
export default promptController;
