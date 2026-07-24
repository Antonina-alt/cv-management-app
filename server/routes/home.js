import express from "express";
import { getRecent, getStats } from "../controllers/homeController.js";
import { optionalAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/stats", getStats);
router.get("/recent-positions", optionalAuth, getRecent);

export default router;
