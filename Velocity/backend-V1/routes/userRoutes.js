import express from "express";
import {
  Register,
  Login,
  Reviews,
  isExtInstall,
} from "../controllers/userControllers/userController.js";
import {
  sendVerificationEmail,
  verifyEmail,
} from "../controllers/userControllers/verifyEmailController.js";
import {
  trialUserEmail,
  checkFreeTrialAvailability,
  decrementTrial,
} from "../controllers/userControllers/trialUserController.js";
import {
  userOnboarding,
  fetchUserOnboardingData,
} from "../controllers/userControllers/onboardingController.js";
import { getProfile } from "../controllers/userControllers/profileController.js";
import { verifyAuthToken } from "../middlewares/auth.js";
import { apiLimiter } from "../middlewares/rateLimit.js";
import { upload, compressImage } from "../config/multer.js";
import { subscribe } from "../controllers/userControllers/launchListConroller.js";
import {
  generateReferralCode,
  applyReferral,
} from "../controllers/userControllers/referralController.js";
import {
  forgotPassword,
  resetPassword,
} from "../controllers/userControllers/passwordResetController.js";

const userRoutes = express.Router();

userRoutes.post("/register", apiLimiter, Register);
userRoutes.post("/login", apiLimiter, Login);
userRoutes.post("/ext-install", isExtInstall);
userRoutes.post("/reviews", upload.single("image"), compressImage, Reviews);
userRoutes.post("/subscribe", subscribe);

// Password reset routes
userRoutes.post("/forgot-password", forgotPassword);
userRoutes.post("/reset-password", resetPassword);

// Email verification routes
userRoutes.post("/send-verification-email", apiLimiter, sendVerificationEmail);
userRoutes.post("/verify-email", apiLimiter, verifyEmail);

//Try for free email verification
userRoutes.post("/SignupVerification", trialUserEmail);
userRoutes.post("/check-free-trial", checkFreeTrialAvailability);
userRoutes.post("/decrement-trial", decrementTrial);

//Onboarding routes
userRoutes.post("/onboarding", verifyAuthToken, userOnboarding);
userRoutes.get("/fetchOnboardingData/:id", fetchUserOnboardingData);

//Profile routes
userRoutes.get("/getProfile/:id", getProfile);
// userRoutes.put("/updateProfile/:id", updateProfile);
// userRoutes.delete("/deleteProfile/:id", deleteProfile);

//Referral routes
userRoutes.post(
  "/generate-referral-code",
  verifyAuthToken,
  generateReferralCode
);
userRoutes.post("/apply-referral", applyReferral);

export default userRoutes;
