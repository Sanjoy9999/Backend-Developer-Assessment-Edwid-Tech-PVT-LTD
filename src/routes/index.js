import express from "express";
import { ingestNews } from "../controllers/ingestController.js";
import { chat } from "../controllers/chatController.js";
import { getHistory, clearHistory } from "../controllers/historyController.js";
import { validateRequest, schemas } from "../middleware/validation.js";

const router = express.Router();

// Ingest Route
router.post("/ingest", validateRequest(schemas.ingest), ingestNews);

// Chat Route
router.post("/chat", validateRequest(schemas.chat), chat);

// History Routes
router.get("/history/:sessionId", getHistory);
router.delete("/history/:sessionId", clearHistory);

export default router;
