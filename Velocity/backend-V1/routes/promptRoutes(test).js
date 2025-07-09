import express from "express";
import { verifyAuthToken } from "../middlewares/auth.js";
import promptController from "../controllers/promptControllers/promptController.js";
// import { createEmbedding } from "../controllers/userContextController/createEmbedding.js";
const promptRoutes = express.Router();

//save input and response in prompt history
promptRoutes.post(
  "/save-prompt",
  verifyAuthToken,
  promptController.savePrompt.bind(promptController)
);
promptRoutes.post(
  "/save-response",
  verifyAuthToken,
  promptController.saveResponse.bind(promptController)
);

//fetch user history
promptRoutes.get(
  "/user-history/:user_id",
  verifyAuthToken,
  promptController.getUserHistory.bind(promptController)
);

//update prompt history
promptRoutes.put(
  "/set-favorite",
  verifyAuthToken,
  promptController.setFavorite.bind(promptController)
);
promptRoutes.put(
  "/delete-prompt",
  verifyAuthToken,
  promptController.setDeleted.bind(promptController)
);

//create embedding
// promptRoutes.post("/create-embedding", createEmbedding);

export default promptRoutes;
