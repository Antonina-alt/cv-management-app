import express from "express";
import { search } from "../controllers/searchController.js";
import { optionalAuth } from "../middleware/auth.js";

const router = express.Router();
router.get("/", optionalAuth, search);

export default router;
