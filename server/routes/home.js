import express from "express";
import { prisma } from "../lib/prisma.js";
import { optionalAuth } from "../middleware/auth.js";
import { isRecruiterOrAdmin, filterPositionsForUser } from "../lib/positionVisibility.js";

const router = express.Router();

const RECENT_DEFAULT_LIMIT = 5;
const RECENT_MAX_LIMIT = 20;
const recentInclude = { _count: { select: { resumes: true } } };
const recentIncludeWithRules = { ...recentInclude, accessRules: { include: { attribute: true } } };

const clampLimit = (raw) => Math.min(Math.max(Number(raw) || RECENT_DEFAULT_LIMIT, 1), RECENT_MAX_LIMIT);

const countStats = () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return Promise.all([
        prisma.resume.count({ where: { createdAt: { gte: since }, status: "PUBLISHED" } }),
        prisma.position.count(),
        prisma.userRole.count({ where: { role: "CANDIDATE" } }),
        prisma.userRole.count({ where: { role: "RECRUITER" } }),
        prisma.resume.count({ where: { status: "PUBLISHED" } }),
    ]);
};

const recentPositionsFor = async (user, limit) => {
    if (user && !isRecruiterOrAdmin(user)) {
        const positions = await prisma.position.findMany({ include: recentIncludeWithRules, orderBy: { updatedAt: "desc" } });
        return (await filterPositionsForUser(positions, user)).slice(0, limit);
    }
    return prisma.position.findMany({
        where: user ? undefined : { isPublic: true },
        include: recentInclude,
        orderBy: { updatedAt: "desc" },
        take: limit,
    });
};

router.get("/stats", async (req, res) => {
    const [resumesLast24h, totalPositions, totalCandidates, totalRecruiters, totalSubmittedResumes] = await countStats();
    res.status(200).json({ resumesLast24h, totalPositions, totalCandidates, totalRecruiters, totalSubmittedResumes });
});

router.get("/recent-positions", optionalAuth, async (req, res) => {
    const positions = await recentPositionsFor(req.user, clampLimit(req.query.limit));
    res.status(200).json(positions);
});

export default router;
