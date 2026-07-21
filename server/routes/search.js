import express from "express";
import { optionalAuth } from "../middleware/auth.js";
import { runSearch } from "../lib/search.js";

const router = express.Router();

router.get("/", optionalAuth, async (req, res) => {
    const query = String(req.query.q ?? "").trim();
    if (!query) {
        return res.status(200).json({ positions: [], projects: [], resumes: [] });
    }

    const results = await runSearch(query, req.user ?? null);
    res.status(200).json(results);
});

export default router;
