import express from "express";
import { getAttributeCategories } from "../controllers/catalogController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.get("/", requireAuth, getAttributeCategories);

export default router;
