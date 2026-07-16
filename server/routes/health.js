import express from "express";
import { prisma } from "../lib/prisma.js";

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: "ok" });
    } catch (err) {
        res.status(500).json({ status: "error" });
    }
});

export default router;
