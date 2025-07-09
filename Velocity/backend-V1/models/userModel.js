import db from "../config/postgresDB.js";

//add into allemails table
export const addEmailInAllEmails = async (email, ref) => {
  try {
    const query =
      "INSERT INTO all_emails (email, ref) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING";
    const result = await db.query(query, [email, ref]);
    return result.rows[0];
  } catch (error) {
    console.error("Error adding email to all_emails:", error);
    throw error;
  }
};

//add into launch list
export const addEmailInLaunchList = async (email) => {
  try {
    const query = "INSERT INTO launchlist (email) VALUES ($1)";
    const result = await db.query(query, [email]);
    return result.rows[0];
  } catch (error) {
    console.error("Error adding email to launch list:", error);
    throw error;
  }
};

// Create new user
export const createUser = async (user) => {
  try {
    const query =
      "INSERT INTO  usertable (name, email, password, google_id, tokens, tutorial, email_verified,used_codes,profile_img_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *";
    const result = await db.query(query, [
      user.name,
      user.email,
      user.password,
      user.googleId || null,
      user.tokens || 50,
      user.tutorial || false,
      user.email_verified || true,
      user.used_codes || [],
      user.profile_img_url || null,
    ]);
    return result.rows[0];
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

//update user dynamically
export const updateUserById = async (userId, data) => {
  const { column, value } = data;
  // console.log(`column: ${column}, value: ${value}, userId: ${userId}`);
  try {
    const query = `UPDATE usertable SET ${column} = $1 WHERE user_id = $2`;
    await db.query(query, [value, userId]);
  } catch (error) {
    console.error("Error updating user dynamic data:", error);
    throw error;
  }
};

//create review
export const createReview = async (review) => {
  try {
    const query =
      "INSERT INTO reviews (user_id, reason, feedback, image_url) VALUES ($1, $2, $3, $4) RETURNING *";
    const result = await db.query(query, [
      review.user_id,
      review.reason,
      review.feedback,
      review.image_url,
    ]);
    return result.rows[0];
  } catch (error) {
    console.error("Error creating review:", error);
    throw error;
  }
};

// Get user by email
export const findUserByEmail = async (email, table) => {
  try {
    const query = `SELECT * FROM ${table} WHERE email = $1`;
    const result = await db.query(query, [email]);
    return result.rows.length ? result.rows[0] : null;
  } catch (error) {
    console.error("Error finding user by email:", error);
    throw error;
  }
};

// Get user by ID
export const findUserById = async (user_id, table) => {
  try {
    const query = `SELECT * FROM ${table} WHERE user_id = $1`;
    const result = await db.query(query, [user_id]);
    return result.rows.length ? result.rows[0] : null;
  } catch (error) {
    console.error("Error finding user by ID:", error);
    throw error;
  }
};

//get exixting user by email or googleId
export const getExistingUser = async (email, googleId) => {
  try {
    const query = "SELECT * FROM usertable WHERE email = $1 OR google_id = $2";
    const result = await db.query(query, [email, googleId]);
    return result.rows.length ? result.rows[0] : null;
  } catch (error) {
    console.error("Error finding user:", error);
    throw error;
  }
};

//get tutorial result
export const getTutorial = async (email) => {
  try {
    const query = "SELECT tutorial FROM usertable WHERE email = $1";
    const result = await db.query(query, [email]);
    return result.rows.length ? result.rows[0] : null;
  } catch (error) {
    console.error("Error getting tutorial:", error);
    throw error;
  }
};

//get email verified
export const getEmailVerified = async (email) => {
  try {
    const query = "SELECT email_verified FROM usertable WHERE email = $1";
    const result = await db.query(query, [email]);
    return result.rows.length ? result.rows[0] : null;
  } catch (error) {
    console.error("Error getting email verified:", error);
    throw error;
  }
};

//create onboarding data
export const createOnboardingData = async (onboardingData) => {
  try {
    const query =
      "INSERT INTO onboarding_data (llm_platform, occupation, source, user_id, problems_faced, use_case) VALUES ($1, $2, $3, $4, $5, $6)";
    const result = await db.query(query, [
      onboardingData.llm_platform,
      onboardingData.occupation,
      onboardingData.source,
      onboardingData.user_id,
      onboardingData.problems_faced,
      onboardingData.use_case,
    ]);
    return result.rows[0];
  } catch (error) {
    console.error("Error creating onboarding data:", error);
    throw error;
  }
};

//fetch user onboarding data
export const getOnboardingData = async (userId) => {
  try {
    const query = "SELECT * FROM onboarding_data WHERE user_id = $1";
    const result = await db.query(query, [userId]);
    return result.rows.length ? result.rows[0] : null;
  } catch (error) {
    console.error("Error fetching user onboarding data:", error);
    throw error;
  }
};

//store email otp
export const storeEmailOtp = async (email, otp) => {
  try {
    const query = "INSERT INTO otp_verification (email, otp) VALUES ($1, $2) ";
    await db.query(query, [email, otp]);
  } catch (error) {
    console.error("Error storing email otp:", error);
    throw error;
  }
};

//verify email otp
export const verifyEmailOtp = async (email, otp) => {
  try {
    const query =
      "SELECT * FROM otp_verification WHERE email = $1 AND otp = $2 AND expires_at > CURRENT_TIMESTAMP";
    const result = await db.query(query, [email, otp]);
    return result.rows.length ? result.rows[0] : null;
  } catch (error) {
    console.error("Error verifying email otp:", error);
    throw error;
  }
};

//delete email otp
export const deleteEmailOtp = async (email) => {
  try {
    const query = "DELETE FROM otp_verification WHERE email = $1";
    await db.query(query, [email]);
  } catch (error) {
    console.error("Error deleting email otp:", error);
    throw error;
  }
};

//create free trial user availability
export const createTrialUser = async (email) => {
  try {
    const query =
      "INSERT INTO free_trial_user_availability (email) VALUES ($1) ON CONFLICT (email) DO NOTHING";
    await db.query(query, [email]);
  } catch (error) {
    console.error("Error creating free trial user availability:", error);
    throw error;
  }
};

//check free trial user availability
export const checkTrialAvailability = async (email) => {
  try {
    const query = "SELECT * FROM free_trial_user_availability WHERE email = $1";
    const result = await db.query(query, [email]);
    return result.rows.length ? result.rows[0] : null;
  } catch (error) {
    console.error("Error checking trial user availability:", error);
    throw error;
  }
};

//decrement threshold
export const decrementThreshold = async (email) => {
  try {
    const query =
      "UPDATE free_trial_user_availability SET threshold = threshold - 1 WHERE email = $1";
    await db.query(query, [email]);
  } catch (error) {
    console.error("Error decrementing trial:", error);
    throw error;
  }
};

//get existing referral code
export const getExistingReferralCode = async (user_id) => {
  try {
    const query = "SELECT referral_code FROM referrals WHERE user_id = $1";
    const result = await db.query(query, [user_id]);
    return result.rows.length ? result.rows[0] : null;
  } catch (error) {
    console.error("Error getting existing referral code:", error);
    throw error;
  }
};

//fetch referral stats
export const fetchReferrals = async (data) => {
  const { column, value } = data;
  try {
    const query = `SELECT * FROM referrals WHERE ${column} = $1`;
    const result = await db.query(query, [value]);
    return result.rows.length ? result.rows[0] : null;
  } catch (error) {
    console.error("Error fetching referral stats:", error);
    throw error;
  }
};

//create referral code
export const createReferralCode = async (user_id, code) => {
  try {
    const query =
      "INSERT INTO referrals (user_id, referral_code) VALUES ($1, $2)";
    await db.query(query, [user_id, code]);
  } catch (error) {
    console.error("Error creating referral code:", error);
    throw error;
  }
};

//update referral by id
export const updateReferralById = async (user_id, data) => {
  const { column, value } = data;
  try {
    const query = `UPDATE referrals SET ${column} = $1 WHERE user_id = $2`;
    await db.query(query, [value, user_id]);
  } catch (error) {
    console.error("Error updating referral by id:", error);
    throw error;
  }
};

// Store password reset token
export const storePasswordResetToken = async (userId, email, resetToken) => {
  try {
    // First delete any existing tokens for this user
    const deleteQuery = "DELETE FROM password_reset_tokens WHERE user_id = $1";
    await db.query(deleteQuery, [userId]);

    // Then insert the new token
    const insertQuery =
      "INSERT INTO password_reset_tokens (user_id, email, reset_token) VALUES ($1, $2, $3)";
    await db.query(insertQuery, [userId, email, resetToken]);
  } catch (error) {
    console.error("Error storing password reset token:", error);
    throw error;
  }
};

// Verify password reset token
export const verifyPasswordResetToken = async (resetToken) => {
  try {
    const query =
      "SELECT * FROM password_reset_tokens WHERE reset_token = $1 AND expires_at > CURRENT_TIMESTAMP";
    const result = await db.query(query, [resetToken]);
    return result.rows.length ? result.rows[0] : null;
  } catch (error) {
    console.error("Error verifying password reset token:", error);
    throw error;
  }
};

// Delete password reset token
export const deletePasswordResetToken = async (resetToken) => {
  try {
    const query = "DELETE FROM password_reset_tokens WHERE reset_token = $1";
    await db.query(query, [resetToken]);
  } catch (error) {
    console.error("Error deleting password reset token:", error);
    throw error;
  }
};
