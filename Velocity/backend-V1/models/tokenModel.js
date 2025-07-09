import db from "../config/postgresDB.js";

//fetch all tokens
export const fetchTokensById = async (user_id) => {
  try {
    const query = "SELECT tokens FROM usertable WHERE user_id = $1";
    const result = await db.query(query, [user_id]);
    return result.rows.length ? result.rows[0].tokens : null;
  } catch (error) {
    console.error("Error fetching tokens:", error);
    throw error;
  }
};

//update tokens
export const updateTokens = async (userId, tokens) => {
  try {
    const query = `UPDATE usertable SET tokens = $1 WHERE user_id = $2`;
    await db.query(query, [tokens, userId]);
  } catch (error) {
    console.error("Error updating tokens:", error);
    throw error;
  }
};

//get redeem coupon
export const getRedeemCoupon = async (couponCode) => {
  try {
    const query = "SELECT * FROM coupon_codes WHERE coupon_code = $1";
    const result = await db.query(query, [couponCode]);
    return result.rows.length ? result.rows[0] : null;
  } catch (error) {
    console.error("Error getting redeem coupon:", error);
    throw error;
  }
};

//get all credits
export const getAllCredits = async () => {
  try {
    const query = "SELECT * FROM credits";
    const result = await db.query(query);
    return result.rows;
  } catch (error) {
    console.error("Error getting all credits:", error);
    throw error;
  }
};
