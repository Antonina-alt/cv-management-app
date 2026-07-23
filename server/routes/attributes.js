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

const nameTaken = (normalizedName) => prisma.attribute.findUnique({ where: { normalizedName } });

const respondConflict = async (res, id) => {
    const latest = await prisma.attribute.findUnique({ where: { id }, include });
    res.status(409).json({ message: "Version conflict", attribute: latest });
};

const validateOptions = (options) => {
    if (!Array.isArray(options) || options.length === 0) {
        return "options must be a non-empty array for a SELECT attribute";
    }
    const labels = options.map((label) => String(label ?? "").trim());
    if (labels.some((label) => label.length === 0)) return "option labels must not be empty";
    const unique = new Set(labels.map((label) => label.toLowerCase()));
    return unique.size === labels.length ? null : "option labels must be unique";
};

const buildAttributesWhere = ({ q, categoryId }) => ({
    ...(q ? { normalizedName: { startsWith: normalizeName(String(q)) } } : {}),
    ...(categoryId ? { categoryId: String(categoryId) } : {}),
});

router.get("/", requireAuth, async (req, res) => {
    const attributes = await prisma.attribute.findMany({ where: buildAttributesWhere(req.query), include, orderBy: { name: "asc" } });
    res.status(200).json(attributes);
});

const validateAttributeShape = (body) => {
    const { name, categoryId, type } = body;
    if (!name || !categoryId || !type) return "name, categoryId and type are required";
    if (!ATTRIBUTE_TYPES.includes(type)) return "invalid attribute type";
    return null;
};

const validateNewAttribute = async (body) => {
    const shapeError = validateAttributeShape(body);
    if (shapeError) return { error: shapeError };

    const category = await prisma.attributeCategory.findUnique({ where: { id: body.categoryId } });
    if (!category) return { error: "unknown categoryId" };

    const normalizedName = normalizeName(body.name);
    if (await nameTaken(normalizedName)) return { error: "an attribute with this name already exists" };

    const optionsError = body.type === "SELECT" ? validateOptions(body.options) : null;
    return optionsError ? { error: optionsError } : { normalizedName };
};

const buildOptionsCreate = (options) => ({
    create: options.map((label, index) => ({ label: String(label).trim(), sortOrder: index })),
});

const buildAttributeCreateData = (body, normalizedName) => ({
    name: body.name.trim(),
    normalizedName,
    description: body.description ?? null,
    type: body.type,
    categoryId: body.categoryId,
    ...(body.type === "SELECT" ? { options: buildOptionsCreate(body.options) } : {}),
});

router.post("/", requireAuth, requireRole("RECRUITER", "ADMIN"), async (req, res) => {
    const body = req.body ?? {};
    const { normalizedName, error } = await validateNewAttribute(body);
    if (error) return res.status(400).json({ message: error });

    const attribute = await prisma.attribute.create({ data: buildAttributeCreateData(body, normalizedName), include });
    res.status(201).json(attribute);
});

const resolveNameUpdate = async (current, name) => {
    const normalizedName = normalizeName(name);
    if (normalizedName !== current.normalizedName && await nameTaken(normalizedName)) {
        return { error: "an attribute with this name already exists" };
    }
    return { name: name.trim(), normalizedName };
};

const resolveCategoryUpdate = async (categoryId) => {
    const category = await prisma.attributeCategory.findUnique({ where: { id: categoryId } });
    return category ? { categoryId } : { error: "unknown categoryId" };
};

const buildAttributePatchData = async (current, body) => {
    const data = {};
    if (body.name !== undefined) {
        const { error, ...fields } = await resolveNameUpdate(current, body.name);
        if (error) return { error };
        Object.assign(data, fields);
    }
    if (body.description !== undefined) data.description = body.description;
    if (body.categoryId !== undefined) {
        const { error, ...fields } = await resolveCategoryUpdate(body.categoryId);
        if (error) return { error };
        Object.assign(data, fields);
    }
    return { data };
};

const validateOptionsPatch = (current, options) => {
    if (options === undefined) return null;
    if (current.type !== "SELECT") return "options can only be set on SELECT attributes";
    return validateOptions(options);
};

const syncAttributeOptions = async (tx, id, options) => {
    if (options === undefined) return;
    await tx.attributeOption.deleteMany({ where: { attributeId: id } });
    await tx.attributeOption.createMany({
        data: options.map((label, index) => ({ attributeId: id, label: String(label).trim(), sortOrder: index })),
    });
};

const applyAttributeUpdate = async (tx, id, version, data, options) => {
    const result = await tx.attribute.updateMany({ where: { id, version }, data: { ...data, version: { increment: 1 } } });
    if (result.count === 0) throw new Error("VERSION_CONFLICT");
    await syncAttributeOptions(tx, id, options);
    return tx.attribute.findUnique({ where: { id }, include });
};

router.patch("/:id", requireAuth, requireRole("RECRUITER", "ADMIN"), async (req, res) => {
    const { id } = req.params;
    const body = req.body ?? {};
    if (body.version === undefined) return res.status(400).json({ message: "version is required" });

    const current = await prisma.attribute.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ message: "attribute not found" });

    const optionsError = validateOptionsPatch(current, body.options);
    if (optionsError) return res.status(400).json({ message: optionsError });

    const { data, error } = await buildAttributePatchData(current, body);
    if (error) return res.status(400).json({ message: error });

    try {
        const updated = await prisma.$transaction((tx) => applyAttributeUpdate(tx, id, body.version, data, body.options));
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

    const current = await prisma.attribute.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ message: "attribute not found" });
    if (current.systemKey) return res.status(403).json({ message: "system attributes cannot be deleted" });

    const result = await deleteWithVersion(prisma.attribute, id, version);
    if (result.count === 0) return respondConflict(res, id);

    res.status(204).send();
});

export default router;
