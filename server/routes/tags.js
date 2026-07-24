import express from "express";
import { getTags } from "../controllers/catalogController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.get("/", requireAuth, getTags);

export default router;
