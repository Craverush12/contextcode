import db from "../../config/postgresDB.js";
import { getRedeemCoupon } from "../../models/tokenModel.js";
import { findUserById, updateUserById } from "../../models/userModel.js";
import { logger } from "../../utils/winstonLogger.js";

export const redeemCoupon = async (req, res) => {
  const client = await db.connect();
  await client.query("BEGIN");

  try {
    const { couponCode, userId } = req.body;

    if (!couponCode) {
      logger.warn("Redeem coupon failed: Coupon code is missing.");
      return res.status(400).json({
        success: false,
        message: "Coupon code is required",
      });
    }

    const coupon = await getRedeemCoupon(couponCode);

    if (!coupon) {
      logger.warn(`Redeem coupon failed: Invalid coupon code: ${couponCode}`);
      return res.status(404).json({
        success: false,
        message: "Invalid coupon code",
      });
    }

    const { amount } = coupon;

    const user = await findUserById(userId, "usertable");
    const { used_codes, tokens } = user;

    if (used_codes.includes(couponCode)) {
      logger.warn(
        `Redeem coupon failed: Coupon already redeemed by userId=${userId}, code=${couponCode}`
      );
      return res.status(400).json({
        success: false,
        message: "Coupon already redeemed",
      });
    }

    await updateUserById(userId, {
      column: "used_codes",
      value: [...used_codes, couponCode],
    });

    await updateUserById(userId, {
      column: "tokens",
      value: Number(tokens) + Number(amount),
    });

    await client.query("COMMIT");

    logger.info(
      `Coupon redeemed successfully: userId=${userId}, code=${couponCode}, amount=${amount}`
    );
    res.json({
      success: true,
      message: "Coupon redeemed successfully",
      amount: amount,
    });
  } catch (error) {
    logger.error(
      `Error in redeemCoupon for userId=${
        req.body?.userId || "unknown"
      }: ${error}`
    );
    await client.query("ROLLBACK");
    res.status(500).json({
      success: false,
      message: "Error in redeemCoupon",
    });
  } finally {
    client.release();
  }
};
