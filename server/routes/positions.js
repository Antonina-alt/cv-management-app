import express from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole, optionalAuth } from "../middleware/auth.js";
import { deleteWithVersion } from "../lib/optimisticLock.js";
import { resolveTagIds } from "../lib/tags.js";
import { buildAccessRuleData, candidateHasPositionAccess } from "../lib/positionAccess.js";
import { isRecruiterOrAdmin, candidateAccessMap, groupValuesByCandidateId, filterPositionsForUser } from "../lib/positionVisibility.js";
import { filterVisibleResumesByCandidateValues } from "../lib/resumeContent.js";

const router = express.Router();

const POSITION_LEVELS = ["JUNIOR", "MIDDLE", "SENIOR", "LEAD", "C_LEVEL"];

const include = {
    attributes: { include: { attribute: { include: { category: true } } }, orderBy: { sortOrder: "asc" } },
    accessRules: { include: { attribute: { include: { options: true } } } },
    projectTagFilters: { include: { tag: true } },
    _count: { select: { resumes: true } },
};

const includeWithResumes = {
    ...include,
    resumes: { include: { candidate: true, _count: { select: { likes: true } } } },
};

const respondNotFound = (res) => res.status(404).json({ message: "position not found" });

const respondConflict = async (res, id) => {
    const latest = await prisma.position.findUnique({ where: { id }, include });
    res.status(409).json({ message: "Version conflict", position: latest });
};

const validateAccessRule = async (rule) => {
    const { attributeId, operator } = rule ?? {};
    if (!attributeId || !operator) return { error: "each access rule requires attributeId and operator" };
    const attribute = await prisma.attribute.findUnique({ where: { id: attributeId }, include: { options: true } });
    if (!attribute) return { error: "unknown attributeId in accessRules" };
    const { data, error } = buildAccessRuleData(attribute, operator, rule);
    return error ? { error } : { create: { attributeId, operator, ...data } };
};

const validateAccessRules = async (accessRules) => {
    if (!Array.isArray(accessRules)) return { error: "accessRules must be an array" };
    const creates = [];
    for (const rule of accessRules) {
        const result = await validateAccessRule(rule);
        if (result.error) return { error: result.error };
        creates.push(result.create);
    }
    return { creates };
};

const resolveRuleCreates = async (accessRules) => {
    if (accessRules === undefined) return {};
    const { creates, error } = await validateAccessRules(accessRules);
    return error ? { error } : { ruleCreates: creates };
};

const validatePositionFields = (body) => {
    const { level } = body;
    if (level !== undefined && level !== null && !POSITION_LEVELS.includes(level)) {
        return "invalid level";
    }
    if (body.maxProjects !== undefined && body.maxProjects !== null) {
        const n = Number(body.maxProjects);
        if (!Number.isInteger(n) || n < 0) return "maxProjects must be a non-negative integer";
    }
    return null;
};

const buildPositionsWhere = ({ company, level }) => ({
    ...(company ? { company: { contains: String(company), mode: "insensitive" } } : {}),
    ...(level ? { level: String(level) } : {}),
});

router.get("/", optionalAuth, async (req, res) => {
    const positions = await prisma.position.findMany({ where: buildPositionsWhere(req.query), include, orderBy: { updatedAt: "desc" } });
    res.status(200).json(await filterPositionsForUser(positions, req.user));
});

const myResumeFor = (candidateId, positionId) =>
    prisma.resume.findUnique({ where: { candidateId_positionId: { candidateId, positionId } } });

const viewForGuest = (position) =>
    position.isPublic ? { status: 200, body: position } : { status: 403, body: { message: "Forbidden" } };

const viewForCandidate = async (req, position, id) => {
    const values = await candidateAccessMap(req.user.id);
    if (!candidateHasPositionAccess(position, values)) return { status: 403, body: { message: "Forbidden" } };
    const myResume = await myResumeFor(req.user.id, id);
    return { status: 200, body: { ...position, myResume } };
};

const visibleResumesForRecruiter = async (position) => {
    const candidateIds = [...new Set(position.resumes.map((r) => r.candidateId))];
    const values = candidateIds.length
        ? await prisma.candidateAttributeValue.findMany({ where: { candidateId: { in: candidateIds } } })
        : [];
    return filterVisibleResumesByCandidateValues(position, position.resumes, groupValuesByCandidateId(values));
};

const viewForRecruiter = async (req, position, id) => {
    const visibleResumes = await visibleResumesForRecruiter(position);
    const myResume = req.user.roles.includes("ADMIN") ? await myResumeFor(req.user.id, id) : undefined;
    return { status: 200, body: { ...position, resumes: visibleResumes, myResume } };
};

router.get("/:id", optionalAuth, async (req, res) => {
    const { id } = req.params;
    const recruiterView = Boolean(req.user) && isRecruiterOrAdmin(req.user);

    const position = await prisma.position.findUnique({ where: { id }, include: recruiterView ? includeWithResumes : include });
    if (!position) return respondNotFound(res);

    const view = !req.user
        ? viewForGuest(position)
        : recruiterView
            ? await viewForRecruiter(req, position, id)
            : await viewForCandidate(req, position, id);

    res.status(view.status).json(view.body);
});

const buildPositionCreateData = (body, tagIds, ruleCreates) => ({
    title: body.title.trim(),
    description: body.description ?? null,
    company: body.company ?? null,
    level: body.level ?? null,
    isPublic: Boolean(body.isPublic),
    maxProjects: body.maxProjects !== undefined ? Number(body.maxProjects) : undefined,
    attributes: Array.isArray(body.attributeIds)
        ? { create: body.attributeIds.map((attributeId, index) => ({ attributeId, sortOrder: index })) }
        : undefined,
    projectTagFilters: tagIds.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
    accessRules: ruleCreates.length ? { create: ruleCreates } : undefined,
});

router.post("/", requireAuth, requireRole("RECRUITER", "ADMIN"), async (req, res) => {
    const body = req.body ?? {};
    if (!body.title) return res.status(400).json({ message: "title is required" });

    const fieldError = validatePositionFields(body);
    if (fieldError) return res.status(400).json({ message: fieldError });

    const { ruleCreates = [], error } = await resolveRuleCreates(body.accessRules);
    if (error) return res.status(400).json({ message: error });

    const position = await prisma.$transaction(async (tx) => {
        const tagIds = body.projectTags !== undefined ? await resolveTagIds(tx, Array.isArray(body.projectTags) ? body.projectTags : []) : [];
        return tx.position.create({ data: buildPositionCreateData(body, tagIds, ruleCreates), include: includeWithResumes });
    });

    res.status(201).json(position);
});

const cloneAccessRule = (rule) => ({
    attributeId: rule.attributeId,
    operator: rule.operator,
    stringValue: rule.stringValue,
    numberValue: rule.numberValue,
    dateValue: rule.dateValue,
    optionId: rule.optionId,
});

const buildDuplicateData = (source) => ({
    title: `${source.title} (copy)`,
    description: source.description,
    company: source.company,
    level: source.level,
    isPublic: source.isPublic,
    maxProjects: source.maxProjects,
    attributes: { create: source.attributes.map((a) => ({ attributeId: a.attributeId, sortOrder: a.sortOrder })) },
    projectTagFilters: { create: source.projectTagFilters.map((t) => ({ tagId: t.tagId })) },
    accessRules: { create: source.accessRules.map(cloneAccessRule) },
});

router.post("/:id/duplicate", requireAuth, requireRole("RECRUITER", "ADMIN"), async (req, res) => {
    const { id } = req.params;
    const source = await prisma.position.findUnique({
        where: { id },
        include: { attributes: true, accessRules: true, projectTagFilters: true },
    });
    if (!source) return respondNotFound(res);

    const copy = await prisma.position.create({ data: buildDuplicateData(source), include: includeWithResumes });
    res.status(201).json(copy);
});

const PATCHABLE_FIELDS = {
    title: (v) => v.trim(),
    description: (v) => v,
    company: (v) => v,
    level: (v) => v,
    isPublic: (v) => Boolean(v),
    maxProjects: (v) => Number(v),
};

const buildPositionUpdateData = (body) => {
    const data = {};
    for (const [key, transform] of Object.entries(PATCHABLE_FIELDS)) {
        if (body[key] !== undefined) data[key] = transform(body[key]);
    }
    return data;
};

const syncPositionAttributes = async (tx, positionId, attributeIds) => {
    if (!Array.isArray(attributeIds)) return;
    await tx.positionAttribute.deleteMany({ where: { positionId } });
    await tx.positionAttribute.createMany({
        data: attributeIds.map((attributeId, index) => ({ positionId, attributeId, sortOrder: index })),
    });
};

const syncPositionProjectTags = async (tx, positionId, projectTags) => {
    if (projectTags === undefined) return;
    const tagIds = await resolveTagIds(tx, Array.isArray(projectTags) ? projectTags : []);
    await tx.positionProjectTag.deleteMany({ where: { positionId } });
    await tx.positionProjectTag.createMany({ data: tagIds.map((tagId) => ({ positionId, tagId })) });
};

const syncPositionAccessRules = async (tx, positionId, ruleCreates) => {
    if (ruleCreates === null) return;
    await tx.positionAccessRule.deleteMany({ where: { positionId } });
    if (ruleCreates.length) {
        await tx.positionAccessRule.createMany({ data: ruleCreates.map((rule) => ({ positionId, ...rule })) });
    }
};

const applyPositionUpdate = async (tx, id, version, data, body, ruleCreates) => {
    const result = await tx.position.updateMany({ where: { id, version }, data: { ...data, version: { increment: 1 } } });
    if (result.count === 0) throw new Error("VERSION_CONFLICT");
    await syncPositionAttributes(tx, id, body.attributeIds);
    await syncPositionProjectTags(tx, id, body.projectTags);
    await syncPositionAccessRules(tx, id, ruleCreates);
    return tx.position.findUnique({ where: { id }, include: includeWithResumes });
};

const validatePositionPatch = async (id, body) => {
    if (body.version === undefined) return { error: "version is required", status: 400 };
    const current = await prisma.position.findUnique({ where: { id } });
    if (!current) return { error: "position not found", status: 404 };
    const fieldError = validatePositionFields(body);
    if (fieldError) return { error: fieldError, status: 400 };
    const { ruleCreates = null, error } = await resolveRuleCreates(body.accessRules);
    if (error) return { error, status: 400 };
    return { ruleCreates };
};

router.patch("/:id", requireAuth, requireRole("RECRUITER", "ADMIN"), async (req, res) => {
    const { id } = req.params;
    const body = req.body ?? {};
    const { error, status, ruleCreates } = await validatePositionPatch(id, body);
    if (error) return res.status(status).json({ message: error });

    try {
        const data = buildPositionUpdateData(body);
        const updated = await prisma.$transaction((tx) => applyPositionUpdate(tx, id, body.version, data, body, ruleCreates));
        res.status(200).json(updated);
    } catch (err) {
        if (err.message !== "VERSION_CONFLICT") throw err;
        await respondConflict(res, id);
    }
});

router.delete("/:id", requireAuth, requireRole("RECRUITER", "ADMIN"), async (req, res) => {
    const { id } = req.params;
    const { version } = req.body ?? {};
    if (version === undefined) return res.status(400).json({ message: "version is required" });

    const current = await prisma.position.findUnique({ where: { id } });
    if (!current) return respondNotFound(res);

    const result = await deleteWithVersion(prisma.position, id, version);
    if (result.count === 0) return respondConflict(res, id);

    res.status(204).send();
});

export default router;
