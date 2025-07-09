import express from "express";
import { verifyAuthToken } from "../middlewares/auth.js";
import {
  savePrompt,
  saveResponse,
  getUserHistory,
  setFavorite,
  setDeleted,
} from "../controllers/promptControllers/promptController.js";
import {
  insertPromptData,
  insertFeedback,
  insertRefinedPrompt,
  fetchUserHistory,
  insertRefinedQueAns,
} from "../controllers/promptControllers/promptReviewController.js";
import { jwtBasedLimiter } from "../middlewares/rateLimit.js";
import {
  savePreference,
  fetchPreference,
} from "../controllers/promptControllers/preferenceController.js";
import {
  createSuggestionPrompt,
  getSuggestionPrompt,
} from "../controllers/promptControllers/suggestionPromptController.js";
// import { createEmbedding } from "../controllers/userContextController/createEmbedding.js";
const promptRoutes = express.Router();

//save input and response in prompt history
promptRoutes.post("/save-prompt", verifyAuthToken, jwtBasedLimiter, savePrompt);
promptRoutes.post(
  "/save-response",
  verifyAuthToken,
  jwtBasedLimiter,
  saveResponse
);

//prompt review routes
promptRoutes.post(
  "/save-prompt-review",
  verifyAuthToken,
  jwtBasedLimiter,
  insertPromptData
);
promptRoutes.post(
  "/insert-feedback",
  verifyAuthToken,
  jwtBasedLimiter,
  insertFeedback
);
promptRoutes.post(
  "/insert-refined-prompt",
  verifyAuthToken,
  jwtBasedLimiter,
  insertRefinedPrompt
);
promptRoutes.post(
  "/insert-refined-qa",
  verifyAuthToken,
  jwtBasedLimiter,
  insertRefinedQueAns
);

//fetch user history
promptRoutes.get("/user-history/:user_id", verifyAuthToken, getUserHistory);

//update prompt history
promptRoutes.put("/set-favorite", verifyAuthToken, setFavorite);
promptRoutes.put("/delete-prompt", verifyAuthToken, setDeleted);

//preference routes

promptRoutes.post(
  "/save-preference",
  verifyAuthToken,
  jwtBasedLimiter,
  savePreference
);
promptRoutes.get(
  "/fetch-user-history/:user_id",
  verifyAuthToken,
  jwtBasedLimiter,
  fetchUserHistory
);
promptRoutes.get("/fetch-preference/:id", fetchPreference);

//create embedding
// promptRoutes.post("/create-embedding", createEmbedding);

//suggestion prompt routes
promptRoutes.post("/suggestion-prompt", createSuggestionPrompt);
promptRoutes.get("/suggestion-prompt/:occupation", getSuggestionPrompt);

export default promptRoutes;
