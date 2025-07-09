import db from "../../config/postgresDB.js";
import {
  findUserByEmail,
  addEmailInLaunchList,
  addEmailInAllEmails,
} from "../../models/userModel.js";
import { logger } from "../../utils/winstonLogger.js";

export const subscribe = async (req, res) => {
  const client = await db.connect();
  await client.query("BEGIN");

  try {
    const { email } = req.body;

    const existingUser = await findUserByEmail(email, "launchlist");
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered",
      });
    }

    //add to launch list
    await addEmailInLaunchList(email);

    //add to all emails
    await addEmailInAllEmails(email, "launchlist");

    await client.query("COMMIT");

    logger.info(`Email subscribed to launch list: ${email}`);
    res.status(200).json({
      success: true,
      message: "Subscribed to launch list successfully",
    });
  } catch (error) {
    logger.error(
      `Subscribe error for email ${req.body?.email || "unknown"}: ${error}`
    );
    await client.query("ROLLBACK");
    res.status(500).json({
      success: false,
      message: "Error subscribing to launch list",
    });
  } finally {
    client.release();
  }
};
