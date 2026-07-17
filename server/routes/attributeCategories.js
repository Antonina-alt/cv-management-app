import express from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
    const categories = await prisma.attributeCategory.findMany({
        orderBy: { sortOrder: "asc" },
    });
    res.status(200).json(categories);
});

export default router;
