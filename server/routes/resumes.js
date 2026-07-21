import express from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { candidateHasPositionAccess } from "../lib/positionAccess.js";
import { buildResumeAttributes, buildResumeProjects, isResumeComplete } from "../lib/resumeContent.js";
import { toPublicUser } from "../lib/publicUser.js";

const router = express.Router();

const positionInclude = {
    attributes: { include: { attribute: { include: { category: true, options: { orderBy: { sortOrder: "asc" } } } } }, orderBy: { sortOrder: "asc" } },
    accessRules: { include: { attribute: true } },
    projectTagFilters: true,
};

const loadCandidateValues = async (candidateId) => {
    const values = await prisma.candidateAttributeValue.findMany({
        where: { candidateId },
        include: { selectedOption: true },
    });
    return new Map(values.map((v) => [v.attributeId, v]));
};

const findWithRoles = (id) => prisma.user.findUnique({ where: { id }, include: { roles: true } });

const isOwnerOrAdmin = (req, candidateId) => req.user.id === candidateId || req.user.roles.includes("ADMIN");

const syncMissingAttributeValues = async (candidateId, position, valuesByAttributeId) => {
    const missingAttributeIds = position.attributes
        .filter((link) => !link.attribute.systemKey && !valuesByAttributeId.has(link.attributeId))
        .map((link) => link.attributeId);

    if (missingAttributeIds.length === 0) return false;

    await prisma.candidateAttributeValue.createMany({
        data: missingAttributeIds.map((attributeId) => ({ candidateId, attributeId })),
        skipDuplicates: true,
    });
    return true;
};

const buildDetail = async (resume, position, candidateUser, canEdit) => {
    const valuesByAttributeId = await loadCandidateValues(resume.candidateId);
    const projects = await prisma.project.findMany({
        where: { candidateId: resume.candidateId },
        include: { tags: { include: { tag: true } } },
        orderBy: { startDate: "desc" },
    });

    const attributes = buildResumeAttributes(position, valuesByAttributeId);
    const resumeProjects = buildResumeProjects(position, projects);

    return {
        id: resume.id,
        status: resume.status,
        version: resume.version,
        createdAt: resume.createdAt,
        publishedAt: resume.publishedAt,
        candidateId: resume.candidateId,
        positionId: resume.positionId,
        candidate: toPublicUser(candidateUser),
        position: { id: position.id, title: position.title, company: position.company, level: position.level },
        attributes,
        projects: resumeProjects,
        isComplete: isResumeComplete(attributes),
        canEdit,
    };
};

router.post("/", requireAuth, async (req, res) => {
    const { positionId } = req.body ?? {};
    if (!positionId) {
        return res.status(400).json({ message: "positionId is required" });
    }

    const position = await prisma.position.findUnique({ where: { id: positionId }, include: positionInclude });
    if (!position) {
        return res.status(404).json({ message: "position not found" });
    }

    const valuesByAttributeId = await loadCandidateValues(req.user.id);
    if (!candidateHasPositionAccess(position, valuesByAttributeId)) {
        return res.status(403).json({ message: "Forbidden" });
    }

    try {
        const resume = await prisma.$transaction(async (tx) => {
            const created = await tx.resume.create({ data: { candidateId: req.user.id, positionId } });

            const missingAttributeIds = position.attributes
                .filter((link) => !link.attribute.systemKey && !valuesByAttributeId.has(link.attributeId))
                .map((link) => link.attributeId);

            if (missingAttributeIds.length > 0) {
                await tx.candidateAttributeValue.createMany({
                    data: missingAttributeIds.map((attributeId) => ({ candidateId: req.user.id, attributeId })),
                    skipDuplicates: true,
                });
            }

            return created;
        });

        const candidateUser = await findWithRoles(req.user.id);
        res.status(201).json(await buildDetail(resume, position, candidateUser, true));
    } catch (err) {
        if (err.code === "P2002") {
            return res.status(409).json({ message: "a resume already exists for this position" });
        }
        throw err;
    }
});

router.get("/:id", requireAuth, async (req, res) => {
    const { id } = req.params;

    const resume = await prisma.resume.findUnique({ where: { id } });
    if (!resume) {
        return res.status(404).json({ message: "resume not found" });
    }

    const position = await prisma.position.findUnique({ where: { id: resume.positionId }, include: positionInclude });

    const owner = isOwnerOrAdmin(req, resume.candidateId);
    const recruiterView = !owner && req.user.roles.includes("RECRUITER");

    if (!owner && !recruiterView) {
        return res.status(403).json({ message: "Forbidden" });
    }
    if (recruiterView && resume.status !== "PUBLISHED") {
        return res.status(403).json({ message: "Forbidden" });
    }

    if (!req.user.roles.includes("ADMIN")) {
        const candidateValues = await loadCandidateValues(resume.candidateId);
        if (!candidateHasPositionAccess(position, candidateValues)) {
            return res.status(403).json({ message: "Forbidden" });
        }
    }

    if (owner) {
        const valuesByAttributeId = await loadCandidateValues(resume.candidateId);
        await syncMissingAttributeValues(resume.candidateId, position, valuesByAttributeId);
    }

    const candidateUser = await findWithRoles(resume.candidateId);
    res.status(200).json(await buildDetail(resume, position, candidateUser, owner));
});

router.patch("/:id/publish", requireAuth, async (req, res) => {
    const { id } = req.params;
    const { version } = req.body ?? {};

    if (version === undefined) {
        return res.status(400).json({ message: "version is required" });
    }

    const resume = await prisma.resume.findUnique({ where: { id } });
    if (!resume) {
        return res.status(404).json({ message: "resume not found" });
    }
    if (!isOwnerOrAdmin(req, resume.candidateId)) {
        return res.status(403).json({ message: "Forbidden" });
    }

    const position = await prisma.position.findUnique({ where: { id: resume.positionId }, include: positionInclude });
    const valuesByAttributeId = await loadCandidateValues(resume.candidateId);
    const attributes = buildResumeAttributes(position, valuesByAttributeId);

    if (!isResumeComplete(attributes)) {
        return res.status(400).json({ message: "all attributes must be filled before publishing" });
    }

    const result = await prisma.resume.updateMany({
        where: { id, version },
        data: { status: "PUBLISHED", publishedAt: new Date(), version: { increment: 1 } },
    });

    if (result.count === 0) {
        const latest = await prisma.resume.findUnique({ where: { id } });
        return res.status(409).json({ message: "Version conflict", resume: latest });
    }

    const updated = await prisma.resume.findUnique({ where: { id } });
    const candidateUser = await findWithRoles(resume.candidateId);
    res.status(200).json(await buildDetail(updated, position, candidateUser, true));
});

export default router;
