import db from "../config/postgresDB.js";

//save prompt
export const savePromptToPromptHistory = async (prompt_data) => {
  const { prompt, ai_type, style, tokens_used, user_id, content_type } =
    prompt_data;
  console.log(prompt_data);
  try {
    const query =
      "INSERT INTO prompt_history (user_id, content_type, prompt, ai_type, selected_style, tokens_used) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *";
    const result = await db.query(query, [
      user_id,
      content_type,
      prompt,
      ai_type,
      style,
      tokens_used,
    ]);
    console.log(result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error("Error saving prompt:", error);
    throw error;
  }
};

//save response
export const saveResponseToPromptHistory = async (response_data) => {
  const { enhanced_prompt, ref_prompt_id, ai_type, user_id, style } =
    response_data;
  const content_type = "response";

  try {
    const query =
      "INSERT INTO prompt_history (user_id, content_type, prompt, ref_prompt_id, ai_type,selected_style) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *";
    const result = await db.query(query, [
      user_id,
      content_type,
      enhanced_prompt,
      ref_prompt_id,
      ai_type,
      style,
    ]);
    console.log(result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error("Error saving response:", error);
    throw error;
  }
};

//get user history
export const getUserHistoryFromDB = async (user_id, limit, page) => {
  const offset = (page - 1) * limit;
  try {
    const query = `SELECT * FROM prompt_history WHERE user_id = $1 AND deleted = false ORDER BY created_at DESC LIMIT $2 OFFSET $3`;

    const countQuery = `SELECT COUNT(*) FROM prompt_history WHERE user_id = $1 AND deleted = false`;

    const result = await db.query(query, [user_id, limit, offset]);
    const countResult = await db.query(countQuery, [user_id]);
    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    return {
      user_prompt_history: result.rows,
      total_pages: totalPages,
      count: total,
    };
  } catch (error) {
    console.error("Error fetching user history:", error);
    throw error;
  }
};

//update prompt history
export const updatePromptHistory = async (data, prompt_id) => {
  const { column, value, user_id } = data;
  try {
    const query = `UPDATE prompt_history SET ${column} = $1 WHERE prompt_id = $2 AND user_id = $3`;
    await db.query(query, [value, prompt_id, user_id]);
  } catch (error) {
    console.error("Error updating prompt history:", error);
    throw error;
  }
};

//save embedding
export const saveEmbedding = async (embedding_data) => {
  const { user_id, prompt_id, embedding } = embedding_data;
  try {
    const query = `INSERT INTO user_context (user_id, prompt_id, embedding) VALUES ($1, $2, $3)`;
    await db.query(query, [user_id, prompt_id, embedding]);
  } catch (error) {
    console.error("Error saving embedding:", error);
    throw error;
  }
};

//save prompt review
export const insertIntoPromptReview = async (data) => {
  const {
    user_id,
    prompt,
    enhanced_prompt,
    llm_used,
    selected_style,
    domain,
    metadata,
    processing_time_ms,
    intent,
    intent_description,
    relevance_analysis,
  } = data;

  try {
    const query = `
      INSERT INTO prompt_review (
        user_id,
        prompt,
        enhanced_prompt,
        llm_used,
        selected_style,
        domain,
        metadata,
        processing_time_ms,
        intent,
        intent_description,
        relevance_analysis
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`;

    const values = [
      user_id,
      prompt,
      enhanced_prompt,
      llm_used,
      selected_style,
      domain,
      metadata,
      processing_time_ms,
      intent,
      intent_description,
      relevance_analysis,
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error("Error saving prompt review:", error);
    throw error;
  }
};

//fetch prompt reviews
export const fetchPromptReviewById = async (user_id, limit, page) => {
  const offset = (page - 1) * limit;
  try {
    const query = `SELECT * FROM prompt_review WHERE user_id = $1 AND deleted = false ORDER BY created_at DESC LIMIT $2 OFFSET $3`;

    const countQuery = `SELECT COUNT(*) FROM prompt_review WHERE user_id = $1 AND deleted = false`;

    const result = await db.query(query, [user_id, limit, offset]);
    const countResult = await db.query(countQuery, [user_id]);
    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    return {
      user_prompt_history: result.rows,
      total_pages: totalPages,
      count: total,
    };
  } catch (error) {
    console.error("Error fetching user history:", error);
    throw error;
  }
};

//update prompt review
export const updatePromptReview = async (prompt_review_data) => {
  const { prompt_review_id, column, value } = prompt_review_data;
  try {
    const query = `UPDATE prompt_review SET ${column} = $1 WHERE id = $2`;
    await db.query(query, [value, prompt_review_id]);
  } catch (error) {
    console.error("Error updating prompt review:", error);
    throw error;
  }
};

//save preference
export const savePreferenceToDB = async (preference_data) => {
  const {
    user_id,
    word_count,
    custom_instructions,
    template,
    language,
    complexity,
    output_format,
  } = preference_data;
  try {
    const query = ` INSERT INTO prompt_preferences (user_id, word_count, custom_instructions, template, language, complexity, output_format) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;
    const result = await db.query(query, [
      user_id,
      word_count,
      custom_instructions,
      template,
      language,
      complexity,
      output_format,
    ]);
    return result.rows[0];
  } catch (error) {
    console.error("Error saving preference:", error);
    throw error;
  }
};

//fetch preference
export const fetchPreferenceFromDB = async (user_id) => {
  try {
    const query = `SELECT id, user_id, word_count, custom_instructions, template, language, complexity, output_format FROM prompt_preferences WHERE user_id = $1`;
    const result = await db.query(query, [user_id]);
    return result.rows.length ? result.rows[0] : null;
  } catch (error) {
    console.error("Error fetching preference:", error);
    throw error;
  }
};

//update preference
export const updatePreferenceByUserId = async (user_id, updatedData) => {
  try {
    const {
      word_count,
      custom_instructions,
      template,
      language,
      complexity,
      output_format,
    } = updatedData;
    const query = `UPDATE prompt_preferences SET word_count = $1, custom_instructions = $2, template = $3, language = $4, complexity = $5, output_format = $6 WHERE user_id = $7 `;
    await db.query(query, [
      word_count,
      custom_instructions,
      template,
      language,
      complexity,
      output_format,
      user_id,
    ]);
  } catch (error) {
    console.error("Error updating preference:", error);
    throw error;
  }
};

// Save suggestion prompt
export const saveSuggestionPrompt = async (promptData) => {
  const { prompt, occupation } = promptData;
  try {
    const query =
      "INSERT INTO suggestion_prompt (prompt, occupation) VALUES ($1, $2) RETURNING *";
    const result = await db.query(query, [prompt, occupation]);
    return result.rows[0];
  } catch (error) {
    console.error("Error saving suggestion prompt:", error);
    throw error;
  }
};

// Fetch random suggestion prompt by occupation
export const fetchSuggestionPromptByOccupation = async (occupation) => {
  try {
    const query =
      "SELECT * FROM suggestion_prompt WHERE occupation = $1 ORDER BY RANDOM() LIMIT 1";
    const result = await db.query(query, [occupation]);
    return result.rows[0];
  } catch (error) {
    console.error("Error fetching suggestion prompt:", error);
    throw error;
  }
};
