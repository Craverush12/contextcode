import db from "../../config/postgresDB.js";
import {
  savePreferenceToDB,
  fetchPreferenceFromDB,
  updatePreferenceByUserId,
} from "../../models/promptModel.js";
import { logger } from "../../utils/winstonLogger.js";

export const savePreference = async (req, res) => {
  const client = await db.connect();
  await client.query("BEGIN");

  try {
    const {
      user_id,
      word_count,
      custom_instructions,
      template,
      language,
      complexity,
      output_format,
    } = req.body;

    if (!user_id) {
      logger.warn("Save preference failed: UserID not Found.");
      return res.status(400).json({
        success: false,
        message: "Login to continue",
      });
    }

    const existingPreference = await fetchPreferenceFromDB(user_id);

    if (existingPreference) {
      let mergedTemplate;

      if (template) {
        if (Array.isArray(existingPreference.template)) {
          if (
            template.some((tem) => {
              const temKey = Object.keys(tem)[0];
              return existingPreference.template.find((existingTemp) => {
                const existingKey = Object.keys(existingTemp)[0];
                return existingKey === temKey;
              });
            })
          ) {
            // At least one new template key exists in existing templates — keep existing templates
            mergedTemplate = existingPreference.template;
          } else {
            // Merge existing with new templates whose keys don't exist in existing
            mergedTemplate = [
              ...existingPreference.template,
              ...template.filter((tem) => {
                const temKey = Object.keys(tem)[0];
                return !existingPreference.template.find((existingTemp) => {
                  const existingKey = Object.keys(existingTemp)[0];
                  return existingKey === temKey;
                });
              }),
            ];
          }
        } else {
          mergedTemplate = template;
        }
      } else {
        mergedTemplate = existingPreference.template;
      }

      // Now stringify mergedTemplate before passing to DB
      const updatedData = {
        user_id,
        word_count: word_count || existingPreference.word_count,
        custom_instructions:
          custom_instructions || existingPreference.custom_instructions,
        template: JSON.stringify(mergedTemplate), // stringify here
        language: language || existingPreference.language,
        complexity: complexity || existingPreference.complexity,
        output_format: output_format || existingPreference.output_format,
      };

      await updatePreferenceByUserId(user_id, updatedData);
      await client.query("COMMIT");
      logger.info(`Preference updated successfully for user_id=${user_id}`);
      return res.status(200).json({
        success: true,
        message: "Preference updated successfully",
        preference_id: existingPreference.id,
      });
    }

    const preference_data = {
      user_id,
      word_count: word_count || 150,
      custom_instructions,
      template: JSON.stringify(template),
      language: language || "english",
      complexity: complexity || "simple",
      output_format: output_format || "paragraphs",
    };

    const result = await savePreferenceToDB(preference_data);
    await client.query("COMMIT");
    logger.info(`New preference saved successfully for user_id=${user_id}`);
    return res.status(200).json({
      success: true,
      message: "Preference saved successfully",
      preference_id: result.id,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error(
      `Error saving preference for user_id=${
        req.body?.user_id || "unknown"
      }: ${error}`
    );
    return res.status(500).json({
      success: false,
      message: "Error saving preference",
    });
  } finally {
    client.release();
  }
};

export const fetchPreference = async (req, res) => {
  const client = await db.connect();
  await client.query("BEGIN");

  try {
    const user_id = req.params.id;

    if (!user_id) {
      logger.warn("Fetch preference failed: UserID not found.");
      return res.status(400).json({
        success: false,
        message: "Login to continue",
      });
    }

    const preference = await fetchPreferenceFromDB(user_id);

    if (!preference) {
      logger.warn(`Preference not found for user_id=${user_id}`);
      return res.status(404).json({
        success: false,
        message: "Preference not found",
      });
    }

    await client.query("COMMIT");
    logger.info(`Preference fetched successfully for user_id=${user_id}`);
    return res.status(200).json({
      success: true,
      message: "Preference fetched successfully",
      preference,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error(
      `Error fetching preference for user_id=${
        req.params?.id || "unknown"
      }: ${error}`
    );
    return res.status(500).json({
      success: false,
      message: "Error fetching preference",
    });
  } finally {
    client.release();
  }
};
