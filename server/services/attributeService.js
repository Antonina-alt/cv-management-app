import { prisma } from "../lib/prisma.js";
import { attributeInclude } from "../lib/prismaIncludes.js";
import { normalizeName } from "../lib/normalize.js";
import { badRequest, conflict, forbidden, notFound } from "../lib/httpError.js";
import { deleteVersioned, ensureUpdated, updateVersioned, VERSION_CONFLICT } from "../lib/versioning.js";
import { requireNonEmptyString, requireVersion } from "../lib/validation.js";

const ATTRIBUTE_TYPES = ["STRING", "TEXT", "IMAGE", "NUMBER", "DATE", "DATE_RANGE", "BOOLEAN", "SELECT"];

const attributeWhere = ({ q, categoryId }) => ({
    ...(q ? { normalizedName: { startsWith: normalizeName(String(q)) } } : {}),
    ...(categoryId ? { categoryId: String(categoryId) } : {}),
});

export const listAttributes = (query) => prisma.attribute.findMany({
    where: attributeWhere(query),
    include: attributeInclude,
    orderBy: { name: "asc" },
});

const normalizeOptions = (options) => {
    if (!Array.isArray(options) || options.length === 0) badRequest("options must be a non-empty array for a SELECT attribute");
    const labels = options.map((label) => String(label ?? "").trim());
    if (labels.some((label) => !label)) badRequest("option labels must not be empty");
    if (new Set(labels.map((label) => label.toLowerCase())).size !== labels.length) badRequest("option labels must be unique");
    return labels;
};

const ensureCategoryExists = async (categoryId) => {
    const category = await prisma.attributeCategory.findUnique({ where: { id: categoryId } });
    if (!category) badRequest("unknown categoryId");
};

const ensureNameAvailable = async (name, currentId) => {
    const normalizedName = normalizeName(name);
    const existing = await prisma.attribute.findUnique({ where: { normalizedName } });
    if (existing && existing.id !== currentId) badRequest("an attribute with this name already exists");
    return normalizedName;
};

const createOptions = (labels) => ({
    create: labels.map((label, sortOrder) => ({ label, sortOrder })),
});

const validateNewAttribute = async (body) => {
    const name = requireNonEmptyString(body.name, "name, categoryId and type are required");
    if (!body.categoryId || !body.type) badRequest("name, categoryId and type are required");
    if (!ATTRIBUTE_TYPES.includes(body.type)) badRequest("invalid attribute type");
    await ensureCategoryExists(body.categoryId);
    return { name, normalizedName: await ensureNameAvailable(name) };
};

const createData = (body, identity) => {
    const options = body.type === "SELECT" ? normalizeOptions(body.options) : null;
    return {
        ...identity,
        description: body.description ?? null,
        type: body.type,
        categoryId: body.categoryId,
        ...(options ? { options: createOptions(options) } : {}),
    };
};

export const createAttribute = async (body) => {
    const identity = await validateNewAttribute(body);
    return prisma.attribute.create({
        data: createData(body, identity),
        include: attributeInclude,
    });
};

const patchName = async (current, name) => {
    const trimmed = requireNonEmptyString(name, "name must not be empty");
    return { name: trimmed, normalizedName: await ensureNameAvailable(trimmed, current.id) };
};

const patchCategory = async (categoryId) => {
    await ensureCategoryExists(categoryId);
    return { categoryId };
};

const buildPatchData = async (current, body) => ({
    ...(body.name !== undefined ? await patchName(current, body.name) : {}),
    ...(body.description !== undefined ? { description: body.description } : {}),
    ...(body.categoryId !== undefined ? await patchCategory(body.categoryId) : {}),
});

const resolvePatchedOptions = (current, options) => {
    if (options === undefined) return undefined;
    if (current.type !== "SELECT") badRequest("options can only be set on SELECT attributes");
    return normalizeOptions(options);
};

const syncOptions = async (tx, attributeId, labels) => {
    if (labels === undefined) return;
    await tx.attributeOption.deleteMany({ where: { attributeId } });
    await tx.attributeOption.createMany({
        data: labels.map((label, sortOrder) => ({ attributeId, label, sortOrder })),
    });
};

const updateInTransaction = async (tx, current, body, data, labels) => {
    ensureUpdated(await updateVersioned(tx.attribute, current.id, body.version, data));
    await syncOptions(tx, current.id, labels);
    return tx.attribute.findUnique({ where: { id: current.id }, include: attributeInclude });
};

const loadAttribute = async (id) => {
    const attribute = await prisma.attribute.findUnique({ where: { id } });
    if (!attribute) notFound("attribute not found");
    return attribute;
};

const throwAttributeConflict = async (id) => conflict("Version conflict", {
    attribute: await prisma.attribute.findUnique({ where: { id }, include: attributeInclude }),
});

export const updateAttribute = async (id, body) => {
    requireVersion(body);
    const current = await loadAttribute(id);
    const labels = resolvePatchedOptions(current, body.options);
    const data = await buildPatchData(current, body);
    try {
        return await prisma.$transaction((tx) => updateInTransaction(tx, current, body, data, labels));
    } catch (error) {
        if (error.message !== VERSION_CONFLICT) throw error;
        return throwAttributeConflict(id);
    }
};

export const deleteAttribute = async (id, body) => {
    const version = requireVersion(body);
    const current = await loadAttribute(id);
    if (current.systemKey) forbidden("system attributes cannot be deleted");
    const result = await deleteVersioned(prisma.attribute, id, version);
    if (result.count === 0) await throwAttributeConflict(id);
};
