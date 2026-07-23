import express from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireSelfOrAdmin } from "../middleware/auth.js";
import { toPublicUser } from "../lib/publicUser.js";
import { updateWithVersion, deleteWithVersion } from "../lib/optimisticLock.js";
import { buildValueData } from "../lib/attributeValues.js";
import { resolveTagIds } from "../lib/tags.js";
import { candidateHasPositionAccess } from "../lib/positionAccess.js";

const router = express.Router();

const findWithRoles = (id) => prisma.user.findUnique({ where: { id }, include: { roles: true } });

const attributeValueInclude = {
    attribute: { include: { category: true, options: { orderBy: { sortOrder: "asc" } } } },
    selectedOption: true,
};

const projectInclude = { tags: { include: { tag: true } } };

const respondUserConflict = async (res, candidateId) => {
    const latest = await findWithRoles(candidateId);
    res.status(409).json({ message: "Version conflict", user: toPublicUser(latest) });
};

const findValueDetail = (valueId) => prisma.candidateAttributeValue.findUnique({ where: { id: valueId }, include: attributeValueInclude });

const respondValueConflict = async (res, valueId) => {
    res.status(409).json({ message: "Version conflict", attributeValue: await findValueDetail(valueId) });
};

const respondProjectConflict = async (res, projectId) => {
    const latest = await prisma.project.findUnique({ where: { id: projectId }, include: projectInclude });
    res.status(409).json({ message: "Version conflict", project: latest });
};

const updateCandidateImage = (candidateId, version, imageUrl) =>
    prisma.user.updateMany({ where: { id: candidateId, version }, data: { imageUrl, version: { increment: 1 } } });

router.patch("/:candidateId/image", requireAuth, requireSelfOrAdmin("candidateId"), async (req, res) => {
    const { candidateId } = req.params;
    const { imageUrl, version } = req.body ?? {};
    if (!imageUrl || version === undefined) return res.status(400).json({ message: "imageUrl and version are required" });

    const result = await updateCandidateImage(candidateId, version, imageUrl);
    if (result.count === 0) return respondUserConflict(res, candidateId);

    res.status(200).json(toPublicUser(await findWithRoles(candidateId)));
});

router.delete("/:candidateId/image", requireAuth, requireSelfOrAdmin("candidateId"), async (req, res) => {
    const { candidateId } = req.params;
    const { version } = req.body ?? {};
    if (version === undefined) return res.status(400).json({ message: "version is required" });

    const result = await updateCandidateImage(candidateId, version, null);
    if (result.count === 0) return respondUserConflict(res, candidateId);

    res.status(200).json(toPublicUser(await findWithRoles(candidateId)));
});

const loadCandidateAttributeValues = (candidateId) =>
    prisma.candidateAttributeValue.findMany({
        where: { candidateId },
        include: attributeValueInclude,
        orderBy: [{ attribute: { category: { sortOrder: "asc" } } }, { attribute: { name: "asc" } }],
    });

const loadCandidateProjects = (candidateId) =>
    prisma.project.findMany({ where: { candidateId }, include: projectInclude, orderBy: { startDate: "desc" } });

const loadCandidateResumes = (candidateId) =>
    prisma.resume.findMany({
        where: { candidateId },
        include: { position: { include: { accessRules: { include: { attribute: true } } } }, _count: { select: { likes: true } } },
        orderBy: { updatedAt: "desc" },
    });

const visibleResumesFor = (resumes, attributeValues) => {
    const valuesByAttributeId = new Map(attributeValues.map((v) => [v.attributeId, v]));
    return resumes.filter((r) => candidateHasPositionAccess(r.position, valuesByAttributeId));
};

router.get("/:candidateId", requireAuth, requireSelfOrAdmin("candidateId"), async (req, res) => {
    const { candidateId } = req.params;
    const user = await findWithRoles(candidateId);
    if (!user) return res.status(404).json({ message: "candidate not found" });

    const [attributeValues, projects, resumes] = await Promise.all([
        loadCandidateAttributeValues(candidateId),
        loadCandidateProjects(candidateId),
        loadCandidateResumes(candidateId),
    ]);

    res.status(200).json({
        user: toPublicUser(user),
        attributeValues,
        projects,
        resumes: visibleResumesFor(resumes, attributeValues),
    });
});

const ABOUT_FIELDS = ["firstName", "lastName", "location"];

const buildAboutData = (body) => {
    const data = {};
    for (const key of ABOUT_FIELDS) if (body[key] !== undefined) data[key] = body[key];
    return data;
};

router.patch("/:candidateId/about", requireAuth, requireSelfOrAdmin("candidateId"), async (req, res) => {
    const { candidateId } = req.params;
    const body = req.body ?? {};
    if (body.version === undefined) return res.status(400).json({ message: "version is required" });

    const data = buildAboutData(body);
    if (Object.keys(data).length === 0) {
        return res.status(400).json({ message: "at least one of firstName, lastName, location is required" });
    }

    const result = await updateWithVersion(prisma.user, candidateId, body.version, data);
    if (result.count === 0) {
        const latest = await findWithRoles(candidateId);
        if (!latest) return res.status(404).json({ message: "candidate not found" });
        return res.status(409).json({ message: "Version conflict", user: toPublicUser(latest) });
    }

    res.status(200).json(toPublicUser(await findWithRoles(candidateId)));
});

const loadAddableAttribute = async (attributeId) => {
    const attribute = await prisma.attribute.findUnique({ where: { id: attributeId }, include: { options: true } });
    if (!attribute) return { error: "attribute not found", status: 404 };
    if (attribute.systemKey) return { error: "system attributes cannot be added here", status: 400 };
    return { attribute };
};

router.post("/:candidateId/attribute-values", requireAuth, requireSelfOrAdmin("candidateId"), async (req, res) => {
    const { candidateId } = req.params;
    const { attributeId, ...fields } = req.body ?? {};
    if (!attributeId) return res.status(400).json({ message: "attributeId is required" });

    const { attribute, error, status } = await loadAddableAttribute(attributeId);
    if (error) return res.status(status).json({ message: error });

    const { data, error: valueError } = buildValueData(attribute, fields);
    if (valueError) return res.status(400).json({ message: valueError });

    try {
        const value = await prisma.candidateAttributeValue.create({
            data: { candidateId, attributeId, ...data },
            include: attributeValueInclude,
        });
        res.status(201).json(value);
    } catch (err) {
        if (err.code !== "P2002") throw err;
        res.status(400).json({ message: "this candidate already has a value for this attribute" });
    }
});

router.patch("/:candidateId/attribute-values/:valueId", requireAuth, requireSelfOrAdmin("candidateId"), async (req, res) => {
    const { candidateId, valueId } = req.params;
    const { version, ...fields } = req.body ?? {};
    if (version === undefined) return res.status(400).json({ message: "version is required" });

    const current = await prisma.candidateAttributeValue.findUnique({
        where: { id: valueId },
        include: { attribute: { include: { options: true } } },
    });
    if (!current || current.candidateId !== candidateId) return res.status(404).json({ message: "attribute value not found" });

    const { data, error } = buildValueData(current.attribute, fields);
    if (error) return res.status(400).json({ message: error });

    const result = await updateWithVersion(prisma.candidateAttributeValue, valueId, version, data);
    if (result.count === 0) return respondValueConflict(res, valueId);

    res.status(200).json(await findValueDetail(valueId));
});

router.delete("/:candidateId/attribute-values/:valueId", requireAuth, requireSelfOrAdmin("candidateId"), async (req, res) => {
    const { candidateId, valueId } = req.params;
    const { version } = req.body ?? {};
    if (version === undefined) return res.status(400).json({ message: "version is required" });

    const current = await prisma.candidateAttributeValue.findUnique({ where: { id: valueId } });
    if (!current || current.candidateId !== candidateId) return res.status(404).json({ message: "attribute value not found" });

    const result = await deleteWithVersion(prisma.candidateAttributeValue, valueId, version);
    if (result.count === 0) return respondValueConflict(res, valueId);

    res.status(204).send();
});

const buildProjectCreateData = (candidateId, body, tagIds) => ({
    candidateId,
    title: body.title.trim(),
    description: body.description ?? null,
    startDate: body.startDate ? new Date(body.startDate) : null,
    endDate: body.endDate ? new Date(body.endDate) : null,
    tags: { create: tagIds.map((tagId) => ({ tagId })) },
});

router.post("/:candidateId/projects", requireAuth, requireSelfOrAdmin("candidateId"), async (req, res) => {
    const { candidateId } = req.params;
    const body = req.body ?? {};
    if (!body.title) return res.status(400).json({ message: "title is required" });

    const project = await prisma.$transaction(async (tx) => {
        const tagIds = await resolveTagIds(tx, Array.isArray(body.tags) ? body.tags : []);
        return tx.project.create({ data: buildProjectCreateData(candidateId, body, tagIds), include: projectInclude });
    });

    res.status(201).json(project);
});

const PROJECT_FIELDS = {
    title: (v) => v.trim(),
    description: (v) => v,
    startDate: (v) => (v ? new Date(v) : null),
    endDate: (v) => (v ? new Date(v) : null),
};

const buildProjectUpdateData = (body) => {
    const data = {};
    for (const [key, transform] of Object.entries(PROJECT_FIELDS)) {
        if (body[key] !== undefined) data[key] = transform(body[key]);
    }
    return data;
};

const syncProjectTags = async (tx, projectId, tags) => {
    if (tags === undefined) return;
    const tagIds = await resolveTagIds(tx, Array.isArray(tags) ? tags : []);
    await tx.projectTag.deleteMany({ where: { projectId } });
    await tx.projectTag.createMany({ data: tagIds.map((tagId) => ({ projectId, tagId })) });
};

const applyProjectUpdate = async (tx, projectId, version, data, tags) => {
    const result = await tx.project.updateMany({ where: { id: projectId, version }, data: { ...data, version: { increment: 1 } } });
    if (result.count === 0) throw new Error("VERSION_CONFLICT");
    await syncProjectTags(tx, projectId, tags);
    return tx.project.findUnique({ where: { id: projectId }, include: projectInclude });
};

router.patch("/:candidateId/projects/:projectId", requireAuth, requireSelfOrAdmin("candidateId"), async (req, res) => {
    const { candidateId, projectId } = req.params;
    const body = req.body ?? {};
    if (body.version === undefined) return res.status(400).json({ message: "version is required" });

    const current = await prisma.project.findUnique({ where: { id: projectId } });
    if (!current || current.candidateId !== candidateId) return res.status(404).json({ message: "project not found" });

    try {
        const data = buildProjectUpdateData(body);
        const updated = await prisma.$transaction((tx) => applyProjectUpdate(tx, projectId, body.version, data, body.tags));
        res.status(200).json(updated);
    } catch (err) {
        if (err.message !== "VERSION_CONFLICT") throw err;
        await respondProjectConflict(res, projectId);
    }
});

router.delete("/:candidateId/projects/:projectId", requireAuth, requireSelfOrAdmin("candidateId"), async (req, res) => {
    const { candidateId, projectId } = req.params;
    const { version } = req.body ?? {};
    if (version === undefined) return res.status(400).json({ message: "version is required" });

    const current = await prisma.project.findUnique({ where: { id: projectId } });
    if (!current || current.candidateId !== candidateId) return res.status(404).json({ message: "project not found" });

    const result = await deleteWithVersion(prisma.project, projectId, version);
    if (result.count === 0) return respondProjectConflict(res, projectId);

    res.status(204).send();
});

export default router;
