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

router.patch("/image", requireAuth, async (req, res) => {
    const { imageUrl, version } = req.body ?? {};

    if (!imageUrl || version === undefined) {
        return res.status(400).json({ message: "imageUrl and version are required" });
    }

    const result = await prisma.user.updateMany({
        where: { id: req.user.id, version },
        data: { imageUrl, version: { increment: 1 } },
    });

    if (result.count === 0) {
        const latest = await findWithRoles(req.user.id);
        return res.status(409).json({ message: "Version conflict", user: toPublicUser(latest) });
    }

    const updated = await findWithRoles(req.user.id);
    res.status(200).json(toPublicUser(updated));
});

router.delete("/image", requireAuth, async (req, res) => {
    const { version } = req.body ?? {};

    if (version === undefined) {
        return res.status(400).json({ message: "version is required" });
    }

    const result = await prisma.user.updateMany({
        where: { id: req.user.id, version },
        data: { imageUrl: null, version: { increment: 1 } },
    });

    if (result.count === 0) {
        const latest = await findWithRoles(req.user.id);
        return res.status(409).json({ message: "Version conflict", user: toPublicUser(latest) });
    }

    const updated = await findWithRoles(req.user.id);
    res.status(200).json(toPublicUser(updated));
});

router.get("/:candidateId", requireAuth, requireSelfOrAdmin("candidateId"), async (req, res) => {
    const { candidateId } = req.params;

    const user = await findWithRoles(candidateId);
    if (!user) {
        return res.status(404).json({ message: "candidate not found" });
    }

    const [attributeValues, projects, resumes] = await Promise.all([
        prisma.candidateAttributeValue.findMany({
            where: { candidateId },
            include: attributeValueInclude,
            orderBy: [{ attribute: { category: { sortOrder: "asc" } } }, { attribute: { name: "asc" } }],
        }),
        prisma.project.findMany({
            where: { candidateId },
            include: projectInclude,
            orderBy: { startDate: "desc" },
        }),
        prisma.resume.findMany({
            where: { candidateId },
            include: {
                position: { include: { accessRules: { include: { attribute: true } } } },
                _count: { select: { likes: true } },
            },
            orderBy: { updatedAt: "desc" },
        }),
    ]);

    const valuesByAttributeId = new Map(attributeValues.map((v) => [v.attributeId, v]));
    const visibleResumes = resumes.filter((r) => candidateHasPositionAccess(r.position, valuesByAttributeId));

    res.status(200).json({
        user: toPublicUser(user),
        attributeValues,
        projects,
        resumes: visibleResumes,
    });
});

router.patch("/:candidateId/about", requireAuth, requireSelfOrAdmin("candidateId"), async (req, res) => {
    const { candidateId } = req.params;
    const { firstName, lastName, location, version } = req.body ?? {};

    if (version === undefined) {
        return res.status(400).json({ message: "version is required" });
    }

    const data = {};
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (location !== undefined) data.location = location;

    if (Object.keys(data).length === 0) {
        return res.status(400).json({ message: "at least one of firstName, lastName, location is required" });
    }

    const result = await updateWithVersion(prisma.user, candidateId, version, data);

    if (result.count === 0) {
        const latest = await findWithRoles(candidateId);
        if (!latest) {
            return res.status(404).json({ message: "candidate not found" });
        }
        return res.status(409).json({ message: "Version conflict", user: toPublicUser(latest) });
    }

    const updated = await findWithRoles(candidateId);
    res.status(200).json(toPublicUser(updated));
});

router.post("/:candidateId/attribute-values", requireAuth, requireSelfOrAdmin("candidateId"), async (req, res) => {
    const { candidateId } = req.params;
    const { attributeId, ...fields } = req.body ?? {};

    if (!attributeId) {
        return res.status(400).json({ message: "attributeId is required" });
    }

    const attribute = await prisma.attribute.findUnique({
        where: { id: attributeId },
        include: { options: true },
    });
    if (!attribute) {
        return res.status(404).json({ message: "attribute not found" });
    }
    if (attribute.systemKey) {
        return res.status(400).json({ message: "system attributes cannot be added here" });
    }

    const { data, error } = buildValueData(attribute, fields);
    if (error) {
        return res.status(400).json({ message: error });
    }

    try {
        const value = await prisma.candidateAttributeValue.create({
            data: { candidateId, attributeId, ...data },
            include: attributeValueInclude,
        });
        res.status(201).json(value);
    } catch (err) {
        if (err.code === "P2002") {
            return res.status(400).json({ message: "this candidate already has a value for this attribute" });
        }
        throw err;
    }
});

router.patch("/:candidateId/attribute-values/:valueId", requireAuth, requireSelfOrAdmin("candidateId"), async (req, res) => {
    const { candidateId, valueId } = req.params;
    const { version, ...fields } = req.body ?? {};

    if (version === undefined) {
        return res.status(400).json({ message: "version is required" });
    }

    const current = await prisma.candidateAttributeValue.findUnique({
        where: { id: valueId },
        include: { attribute: { include: { options: true } } },
    });
    if (!current || current.candidateId !== candidateId) {
        return res.status(404).json({ message: "attribute value not found" });
    }

    const { data, error } = buildValueData(current.attribute, fields);
    if (error) {
        return res.status(400).json({ message: error });
    }

    const result = await updateWithVersion(prisma.candidateAttributeValue, valueId, version, data);

    if (result.count === 0) {
        const latest = await prisma.candidateAttributeValue.findUnique({
            where: { id: valueId },
            include: attributeValueInclude,
        });
        return res.status(409).json({ message: "Version conflict", attributeValue: latest });
    }

    const updated = await prisma.candidateAttributeValue.findUnique({
        where: { id: valueId },
        include: attributeValueInclude,
    });
    res.status(200).json(updated);
});

router.delete("/:candidateId/attribute-values/:valueId", requireAuth, requireSelfOrAdmin("candidateId"), async (req, res) => {
    const { candidateId, valueId } = req.params;
    const { version } = req.body ?? {};

    if (version === undefined) {
        return res.status(400).json({ message: "version is required" });
    }

    const current = await prisma.candidateAttributeValue.findUnique({ where: { id: valueId } });
    if (!current || current.candidateId !== candidateId) {
        return res.status(404).json({ message: "attribute value not found" });
    }

    const result = await deleteWithVersion(prisma.candidateAttributeValue, valueId, version);

    if (result.count === 0) {
        const latest = await prisma.candidateAttributeValue.findUnique({
            where: { id: valueId },
            include: attributeValueInclude,
        });
        return res.status(409).json({ message: "Version conflict", attributeValue: latest });
    }

    res.status(204).send();
});

router.post("/:candidateId/projects", requireAuth, requireSelfOrAdmin("candidateId"), async (req, res) => {
    const { candidateId } = req.params;
    const { title, startDate, endDate, description, tags } = req.body ?? {};

    if (!title) {
        return res.status(400).json({ message: "title is required" });
    }

    const project = await prisma.$transaction(async (tx) => {
        const tagIds = await resolveTagIds(tx, Array.isArray(tags) ? tags : []);
        return tx.project.create({
            data: {
                candidateId,
                title: title.trim(),
                description: description ?? null,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                tags: { create: tagIds.map((tagId) => ({ tagId })) },
            },
            include: projectInclude,
        });
    });

    res.status(201).json(project);
});

router.patch("/:candidateId/projects/:projectId", requireAuth, requireSelfOrAdmin("candidateId"), async (req, res) => {
    const { candidateId, projectId } = req.params;
    const { title, startDate, endDate, description, tags, version } = req.body ?? {};

    if (version === undefined) {
        return res.status(400).json({ message: "version is required" });
    }

    const current = await prisma.project.findUnique({ where: { id: projectId } });
    if (!current || current.candidateId !== candidateId) {
        return res.status(404).json({ message: "project not found" });
    }

    const data = {};
    if (title !== undefined) data.title = title.trim();
    if (description !== undefined) data.description = description;
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;

    try {
        const updated = await prisma.$transaction(async (tx) => {
            const result = await tx.project.updateMany({
                where: { id: projectId, version },
                data: { ...data, version: { increment: 1 } },
            });

            if (result.count === 0) {
                throw new Error("VERSION_CONFLICT");
            }

            if (tags !== undefined) {
                const tagIds = await resolveTagIds(tx, Array.isArray(tags) ? tags : []);
                await tx.projectTag.deleteMany({ where: { projectId } });
                await tx.projectTag.createMany({ data: tagIds.map((tagId) => ({ projectId, tagId })) });
            }

            return tx.project.findUnique({ where: { id: projectId }, include: projectInclude });
        });

        res.status(200).json(updated);
    } catch (err) {
        if (err.message === "VERSION_CONFLICT") {
            const latest = await prisma.project.findUnique({ where: { id: projectId }, include: projectInclude });
            return res.status(409).json({ message: "Version conflict", project: latest });
        }
        throw err;
    }
});

router.delete("/:candidateId/projects/:projectId", requireAuth, requireSelfOrAdmin("candidateId"), async (req, res) => {
    const { candidateId, projectId } = req.params;
    const { version } = req.body ?? {};

    if (version === undefined) {
        return res.status(400).json({ message: "version is required" });
    }

    const current = await prisma.project.findUnique({ where: { id: projectId } });
    if (!current || current.candidateId !== candidateId) {
        return res.status(404).json({ message: "project not found" });
    }

    const result = await deleteWithVersion(prisma.project, projectId, version);

    if (result.count === 0) {
        const latest = await prisma.project.findUnique({ where: { id: projectId }, include: projectInclude });
        return res.status(409).json({ message: "Version conflict", project: latest });
    }

    res.status(204).send();
});

export default router;
