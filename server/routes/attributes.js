import express from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { normalizeName } from "../lib/normalize.js";
import { deleteWithVersion } from "../lib/optimisticLock.js";

const router = express.Router();

const ATTRIBUTE_TYPES = ["STRING", "TEXT", "IMAGE", "NUMBER", "DATE", "DATE_RANGE", "BOOLEAN", "SELECT"];

const include = {
    category: true,
    options: { orderBy: { sortOrder: "asc" } },
};

const validateOptions = (options) => {
    if (!Array.isArray(options) || options.length === 0) {
        return "options must be a non-empty array for a SELECT attribute";
    }
    const labels = options.map((label) => String(label ?? "").trim());
    if (labels.some((label) => label.length === 0)) {
        return "option labels must not be empty";
    }
    const unique = new Set(labels.map((label) => label.toLowerCase()));
    if (unique.size !== labels.length) {
        return "option labels must be unique";
    }
    return null;
};

router.get("/", requireAuth, async (req, res) => {
    const { q, categoryId } = req.query;

    const where = {};
    if (q) {
        where.normalizedName = { startsWith: normalizeName(String(q)) };
    }
    if (categoryId) {
        where.categoryId = String(categoryId);
    }

    const attributes = await prisma.attribute.findMany({
        where,
        include,
        orderBy: { name: "asc" },
    });

    res.status(200).json(attributes);
});

router.post("/", requireAuth, requireRole("RECRUITER", "ADMIN"), async (req, res) => {
    const { name, description, categoryId, type, options } = req.body ?? {};

    if (!name || !categoryId || !type) {
        return res.status(400).json({ message: "name, categoryId and type are required" });
    }

    if (!ATTRIBUTE_TYPES.includes(type)) {
        return res.status(400).json({ message: "invalid attribute type" });
    }

    const category = await prisma.attributeCategory.findUnique({ where: { id: categoryId } });
    if (!category) {
        return res.status(400).json({ message: "unknown categoryId" });
    }

    const normalizedName = normalizeName(name);
    const existing = await prisma.attribute.findUnique({ where: { normalizedName } });
    if (existing) {
        return res.status(400).json({ message: "an attribute with this name already exists" });
    }

    if (type === "SELECT") {
        const optionsError = validateOptions(options);
        if (optionsError) {
            return res.status(400).json({ message: optionsError });
        }
    }

    const attribute = await prisma.attribute.create({
        data: {
            name: name.trim(),
            normalizedName,
            description: description ?? null,
            type,
            categoryId,
            ...(type === "SELECT"
                ? {
                    options: {
                        create: options.map((label, index) => ({ label: String(label).trim(), sortOrder: index })),
                    },
                }
                : {}),
        },
        include,
    });

    res.status(201).json(attribute);
});

router.patch("/:id", requireAuth, requireRole("RECRUITER", "ADMIN"), async (req, res) => {
    const { id } = req.params;
    const { name, description, categoryId, options, version } = req.body ?? {};

    if (version === undefined) {
        return res.status(400).json({ message: "version is required" });
    }

    const current = await prisma.attribute.findUnique({ where: { id } });
    if (!current) {
        return res.status(404).json({ message: "attribute not found" });
    }

    const data = {};

    if (name !== undefined) {
        const normalizedName = normalizeName(name);
        if (normalizedName !== current.normalizedName) {
            const duplicate = await prisma.attribute.findUnique({ where: { normalizedName } });
            if (duplicate) {
                return res.status(400).json({ message: "an attribute with this name already exists" });
            }
        }
        data.name = name.trim();
        data.normalizedName = normalizedName;
    }

    if (description !== undefined) {
        data.description = description;
    }

    if (categoryId !== undefined) {
        const category = await prisma.attributeCategory.findUnique({ where: { id: categoryId } });
        if (!category) {
            return res.status(400).json({ message: "unknown categoryId" });
        }
        data.categoryId = categoryId;
    }

    if (options !== undefined) {
        if (current.type !== "SELECT") {
            return res.status(400).json({ message: "options can only be set on SELECT attributes" });
        }
        const optionsError = validateOptions(options);
        if (optionsError) {
            return res.status(400).json({ message: optionsError });
        }
    }

    try {
        const updated = await prisma.$transaction(async (tx) => {
            const result = await tx.attribute.updateMany({
                where: { id, version },
                data: { ...data, version: { increment: 1 } },
            });

            if (result.count === 0) {
                throw new Error("VERSION_CONFLICT");
            }

            if (options !== undefined) {
                await tx.attributeOption.deleteMany({ where: { attributeId: id } });
                await tx.attributeOption.createMany({
                    data: options.map((label, index) => ({
                        attributeId: id,
                        label: String(label).trim(),
                        sortOrder: index,
                    })),
                });
            }

            return tx.attribute.findUnique({ where: { id }, include });
        });

        res.status(200).json(updated);
    } catch (err) {
        if (err.message === "VERSION_CONFLICT") {
            const latest = await prisma.attribute.findUnique({ where: { id }, include });
            return res.status(409).json({ message: "Version conflict", attribute: latest });
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

    const current = await prisma.attribute.findUnique({ where: { id } });
    if (!current) {
        return res.status(404).json({ message: "attribute not found" });
    }

    if (current.systemKey) {
        return res.status(403).json({ message: "system attributes cannot be deleted" });
    }

    const result = await deleteWithVersion(prisma.attribute, id, version);

    if (result.count === 0) {
        const latest = await prisma.attribute.findUnique({ where: { id }, include });
        return res.status(409).json({ message: "Version conflict", attribute: latest });
    }

    res.status(204).send();
});

export default router;
