import express from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { deleteWithVersion } from "../lib/optimisticLock.js";
import { resolveTagIds } from "../lib/tags.js";
import { buildAccessRuleData, candidateHasPositionAccess } from "../lib/positionAccess.js";
import { filterVisibleResumesByCandidateValues } from "../lib/resumeContent.js";

const router = express.Router();

const POSITION_LEVELS = ["JUNIOR", "MIDDLE", "SENIOR", "LEAD", "C_LEVEL"];

const isRecruiterOrAdmin = (user) => user.roles.includes("RECRUITER") || user.roles.includes("ADMIN");

const include = {
    attributes: { include: { attribute: { include: { category: true } } }, orderBy: { sortOrder: "asc" } },
    accessRules: { include: { attribute: { include: { options: true } } } },
    projectTagFilters: { include: { tag: true } },
    _count: { select: { resumes: true } },
};

const includeWithResumes = {
    ...include,
    resumes: { include: { candidate: true } },
};

const candidateAccessMap = async (candidateId) => {
    const values = await prisma.candidateAttributeValue.findMany({ where: { candidateId } });
    return new Map(values.map((v) => [v.attributeId, v]));
};

// Groups a flat list of CandidateAttributeValue rows (already fetched with a single `in` query)
// into Map<candidateId, Map<attributeId, value>>, for filtering resumes across many candidates
// without a query per candidate.
const groupValuesByCandidateId = (values) => {
    const map = new Map();
    for (const v of values) {
        if (!map.has(v.candidateId)) map.set(v.candidateId, new Map());
        map.get(v.candidateId).set(v.attributeId, v);
    }
    return map;
};

// Validates {attributeId, operator, ...valueFields}[] against the attribute library and
// returns Prisma nested-create data, or an error string.
const validateAccessRules = async (accessRules) => {
    if (!Array.isArray(accessRules)) {
        return { error: "accessRules must be an array" };
    }

    const creates = [];
    for (const rule of accessRules) {
        const { attributeId, operator } = rule ?? {};
        if (!attributeId || !operator) {
            return { error: "each access rule requires attributeId and operator" };
        }

        const attribute = await prisma.attribute.findUnique({ where: { id: attributeId }, include: { options: true } });
        if (!attribute) {
            return { error: "unknown attributeId in accessRules" };
        }

        const { data, error } = buildAccessRuleData(attribute, operator, rule);
        if (error) {
            return { error };
        }

        creates.push({ attributeId, operator, ...data });
    }

    return { creates };
};

const validatePositionFields = (body) => {
    const { level } = body;
    if (level !== undefined && level !== null && !POSITION_LEVELS.includes(level)) {
        return "invalid level";
    }
    if (body.maxProjects !== undefined && body.maxProjects !== null) {
        const n = Number(body.maxProjects);
        if (!Number.isInteger(n) || n < 0) {
            return "maxProjects must be a non-negative integer";
        }
    }
    return null;
};

router.get("/", requireAuth, async (req, res) => {
    const { company, level } = req.query;

    const where = {};
    if (company) {
        where.company = { contains: String(company), mode: "insensitive" };
    }
    if (level) {
        where.level = String(level);
    }

    const positions = await prisma.position.findMany({
        where,
        include,
        orderBy: { updatedAt: "desc" },
    });

    if (isRecruiterOrAdmin(req.user)) {
        return res.status(200).json(positions);
    }

    const valuesByAttributeId = await candidateAccessMap(req.user.id);
    const accessible = positions.filter((p) => candidateHasPositionAccess(p, valuesByAttributeId));
    res.status(200).json(accessible);
});

router.get("/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const recruiterView = isRecruiterOrAdmin(req.user);

    const position = await prisma.position.findUnique({
        where: { id },
        include: recruiterView ? includeWithResumes : include,
    });

    if (!position) {
        return res.status(404).json({ message: "position not found" });
    }

    if (!recruiterView) {
        const valuesByAttributeId = await candidateAccessMap(req.user.id);
        if (!candidateHasPositionAccess(position, valuesByAttributeId)) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const myResume = await prisma.resume.findUnique({
            where: { candidateId_positionId: { candidateId: req.user.id, positionId: id } },
        });
        return res.status(200).json({ ...position, myResume });
    }

    const candidateIds = [...new Set(position.resumes.map((r) => r.candidateId))];
    const candidateValues = candidateIds.length
        ? await prisma.candidateAttributeValue.findMany({ where: { candidateId: { in: candidateIds } } })
        : [];
    const valuesByCandidateId = groupValuesByCandidateId(candidateValues);
    const visibleResumes = filterVisibleResumesByCandidateValues(position, position.resumes, valuesByCandidateId);

    res.status(200).json({ ...position, resumes: visibleResumes });
});

router.post("/", requireAuth, requireRole("RECRUITER", "ADMIN"), async (req, res) => {
    const { title, description, company, level, isPublic, maxProjects, attributeIds, projectTags, accessRules } = req.body ?? {};

    if (!title) {
        return res.status(400).json({ message: "title is required" });
    }

    const fieldError = validatePositionFields(req.body ?? {});
    if (fieldError) {
        return res.status(400).json({ message: fieldError });
    }

    let ruleCreates = [];
    if (accessRules !== undefined) {
        const { creates, error } = await validateAccessRules(accessRules);
        if (error) {
            return res.status(400).json({ message: error });
        }
        ruleCreates = creates;
    }

    const position = await prisma.$transaction(async (tx) => {
        const tagIds = projectTags !== undefined ? await resolveTagIds(tx, Array.isArray(projectTags) ? projectTags : []) : [];

        return tx.position.create({
            data: {
                title: title.trim(),
                description: description ?? null,
                company: company ?? null,
                level: level ?? null,
                isPublic: Boolean(isPublic),
                maxProjects: maxProjects !== undefined ? Number(maxProjects) : undefined,
                attributes: Array.isArray(attributeIds)
                    ? { create: attributeIds.map((attributeId, index) => ({ attributeId, sortOrder: index })) }
                    : undefined,
                projectTagFilters: tagIds.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
                accessRules: ruleCreates.length ? { create: ruleCreates } : undefined,
            },
            include: includeWithResumes,
        });
    });

    res.status(201).json(position);
});

router.post("/:id/duplicate", requireAuth, requireRole("RECRUITER", "ADMIN"), async (req, res) => {
    const { id } = req.params;

    const source = await prisma.position.findUnique({
        where: { id },
        include: {
            attributes: true,
            accessRules: true,
            projectTagFilters: true,
        },
    });

    if (!source) {
        return res.status(404).json({ message: "position not found" });
    }

    const copy = await prisma.position.create({
        data: {
            title: `${source.title} (copy)`,
            description: source.description,
            company: source.company,
            level: source.level,
            isPublic: source.isPublic,
            maxProjects: source.maxProjects,
            attributes: {
                create: source.attributes.map((a) => ({ attributeId: a.attributeId, sortOrder: a.sortOrder })),
            },
            projectTagFilters: {
                create: source.projectTagFilters.map((t) => ({ tagId: t.tagId })),
            },
            accessRules: {
                create: source.accessRules.map((r) => ({
                    attributeId: r.attributeId,
                    operator: r.operator,
                    stringValue: r.stringValue,
                    numberValue: r.numberValue,
                    dateValue: r.dateValue,
                    optionId: r.optionId,
                })),
            },
        },
        include: includeWithResumes,
    });

    res.status(201).json(copy);
});

router.patch("/:id", requireAuth, requireRole("RECRUITER", "ADMIN"), async (req, res) => {
    const { id } = req.params;
    const {
        title, description, company, level, isPublic, maxProjects,
        attributeIds, projectTags, accessRules, version,
    } = req.body ?? {};

    if (version === undefined) {
        return res.status(400).json({ message: "version is required" });
    }

    const current = await prisma.position.findUnique({ where: { id } });
    if (!current) {
        return res.status(404).json({ message: "position not found" });
    }

    const fieldError = validatePositionFields(req.body ?? {});
    if (fieldError) {
        return res.status(400).json({ message: fieldError });
    }

    let ruleCreates = null;
    if (accessRules !== undefined) {
        const { creates, error } = await validateAccessRules(accessRules);
        if (error) {
            return res.status(400).json({ message: error });
        }
        ruleCreates = creates;
    }

    const data = {};
    if (title !== undefined) data.title = title.trim();
    if (description !== undefined) data.description = description;
    if (company !== undefined) data.company = company;
    if (level !== undefined) data.level = level;
    if (isPublic !== undefined) data.isPublic = Boolean(isPublic);
    if (maxProjects !== undefined) data.maxProjects = Number(maxProjects);

    try {
        const updated = await prisma.$transaction(async (tx) => {
            const result = await tx.position.updateMany({
                where: { id, version },
                data: { ...data, version: { increment: 1 } },
            });

            if (result.count === 0) {
                throw new Error("VERSION_CONFLICT");
            }

            if (Array.isArray(attributeIds)) {
                await tx.positionAttribute.deleteMany({ where: { positionId: id } });
                await tx.positionAttribute.createMany({
                    data: attributeIds.map((attributeId, index) => ({ positionId: id, attributeId, sortOrder: index })),
                });
            }

            if (projectTags !== undefined) {
                const tagIds = await resolveTagIds(tx, Array.isArray(projectTags) ? projectTags : []);
                await tx.positionProjectTag.deleteMany({ where: { positionId: id } });
                await tx.positionProjectTag.createMany({ data: tagIds.map((tagId) => ({ positionId: id, tagId })) });
            }

            if (ruleCreates !== null) {
                await tx.positionAccessRule.deleteMany({ where: { positionId: id } });
                if (ruleCreates.length) {
                    await tx.positionAccessRule.createMany({
                        data: ruleCreates.map((rule) => ({ positionId: id, ...rule })),
                    });
                }
            }

            return tx.position.findUnique({ where: { id }, include: includeWithResumes });
        });

        res.status(200).json(updated);
    } catch (err) {
        if (err.message === "VERSION_CONFLICT") {
            const latest = await prisma.position.findUnique({ where: { id }, include });
            return res.status(409).json({ message: "Version conflict", position: latest });
        }
        throw err;
    }
});

router.delete("/:id", requireAuth, requireRole("RECRUITER", "ADMIN"), async (req, res) => {
    const { id } = req.params;
    const { version } = req.body ?? {};

    if (version === undefined) {
        return res.status(400).json({ message: "version is required" });
    }

    const current = await prisma.position.findUnique({ where: { id } });
    if (!current) {
        return res.status(404).json({ message: "position not found" });
    }

    const result = await deleteWithVersion(prisma.position, id, version);

    if (result.count === 0) {
        const latest = await prisma.position.findUnique({ where: { id }, include });
        return res.status(409).json({ message: "Version conflict", position: latest });
    }

    res.status(204).send();
});

export default router;
