import { prisma } from "../lib/prisma.js";
import { filterPositionsForUser } from "../lib/positionVisibility.js";
import { isRecruiterOrAdmin } from "../lib/roles.js";

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;
const DAY_MS = 24 * 60 * 60 * 1000;
const recentInclude = { _count: { select: { resumes: true } } };
const recentWithRules = { ...recentInclude, accessRules: { include: { attribute: true } } };

export const normalizeRecentLimit = (value) => Math.min(
    Math.max(Number(value) || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
);

export const getHomeStats = async () => {
    const since = new Date(Date.now() - DAY_MS);
    const results = await Promise.all([
        prisma.resume.count({ where: { createdAt: { gte: since }, status: "PUBLISHED" } }),
        prisma.position.count(),
        prisma.userRole.count({ where: { role: "CANDIDATE" } }),
        prisma.userRole.count({ where: { role: "RECRUITER" } }),
        prisma.resume.count({ where: { status: "PUBLISHED" } }),
    ]);
    return statsFrom(results);
};

const statsFrom = ([resumesLast24h, totalPositions, totalCandidates, totalRecruiters, totalSubmittedResumes]) => ({
    resumesLast24h,
    totalPositions,
    totalCandidates,
    totalRecruiters,
    totalSubmittedResumes,
});

const candidateRecentPositions = async (user, limit) => {
    const positions = await prisma.position.findMany({
        include: recentWithRules,
        orderBy: { updatedAt: "desc" },
    });
    return (await filterPositionsForUser(positions, user)).slice(0, limit);
};

export const getRecentPositions = (user, limit) => {
    if (user && !isRecruiterOrAdmin(user)) return candidateRecentPositions(user, limit);
    return prisma.position.findMany({
        where: user ? undefined : { isPublic: true },
        include: recentInclude,
        orderBy: { updatedAt: "desc" },
        take: limit,
    });
};
