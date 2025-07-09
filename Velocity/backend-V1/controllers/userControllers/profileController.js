import db from "../../config/postgresDB.js";
import { findUserById } from "../../models/userModel.js";

export const getProfile = async (req, res) => {
  const client = await db.connect();
  await client.query("BEGIN");

  try {
    const id = req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const user = await findUserById(id, "usertable");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await client.query("COMMIT");

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error in getProfile:", error);
    await client.query("ROLLBACK");
    res.status(500).json({
      success: false,
      message: "Error in getProfile",
      error: error.message,
    });
  } finally {
    client.release();
  }
};

export const updateProfile = async (req, res) => {};

export const deleteProfile = async (req, res) => {};
