import express from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { normalizeName } from "../lib/normalize.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
    const { q } = req.query;

    const where = q ? { normalizedName: { startsWith: normalizeName(String(q)) } } : {};

    const tags = await prisma.tag.findMany({
        where,
        orderBy: { name: "asc" },
        take: 20,
    });

    res.status(200).json(tags);
});

export default router;
