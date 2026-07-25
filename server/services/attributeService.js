import { prisma } from "../lib/prisma.js";
import { attributeInclude } from "../lib/prismaIncludes.js";
import { ERROR_CODES } from "../lib/errorCodes.js";
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
    if (!Array.isArray(options) || options.length === 0) badRequest(ERROR_CODES.ATTRIBUTE_OPTIONS_REQUIRED, { field: "options" });
    const labels = options.map((label) => String(label ?? "").trim());
    if (labels.some((label) => !label)) badRequest(ERROR_CODES.ATTRIBUTE_OPTION_EMPTY, { field: "options" });
    if (new Set(labels.map((label) => label.toLowerCase())).size !== labels.length) badRequest(ERROR_CODES.ATTRIBUTE_OPTIONS_DUPLICATED, { field: "options" });
    return labels;
};

const ensureCategoryExists = async (categoryId) => {
    const category = await prisma.attributeCategory.findUnique({ where: { id: categoryId } });
    if (!category) badRequest(ERROR_CODES.ATTRIBUTE_CATEGORY_NOT_FOUND, { field: "categoryId" });
};

const ensureNameAvailable = async (name, currentId) => {
    const normalizedName = normalizeName(name);
    const existing = await prisma.attribute.findUnique({ where: { normalizedName } });
    if (existing && existing.id !== currentId) conflict(ERROR_CODES.ATTRIBUTE_NAME_ALREADY_EXISTS, { field: "name", params: { name } });
    return normalizedName;
};

const createOptions = (labels) => ({
    create: labels.map((label, sortOrder) => ({ label, sortOrder })),
});

const validateNewAttribute = async (body) => {
    const name = requireNonEmptyString(body.name, ERROR_CODES.ATTRIBUTE_FIELDS_REQUIRED, "name");
    if (!body.categoryId || !body.type) badRequest(ERROR_CODES.ATTRIBUTE_FIELDS_REQUIRED);
    if (!ATTRIBUTE_TYPES.includes(body.type)) badRequest(ERROR_CODES.ATTRIBUTE_TYPE_INVALID, { field: "type" });
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
    try {
        return await prisma.attribute.create({ data: createData(body, identity), include: attributeInclude });
    } catch (error) {
        if (error.code !== "P2002") throw error;
        conflict(ERROR_CODES.ATTRIBUTE_NAME_ALREADY_EXISTS, { field: "name", params: { name: identity.name } });
    }
};

const patchName = async (current, name) => {
    const trimmed = requireNonEmptyString(name, ERROR_CODES.ATTRIBUTE_NAME_REQUIRED, "name");
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
    if (current.type !== "SELECT") badRequest(ERROR_CODES.ATTRIBUTE_OPTIONS_NOT_ALLOWED, { field: "options" });
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
    if (!attribute) notFound(ERROR_CODES.ATTRIBUTE_NOT_FOUND);
    return attribute;
};

const throwAttributeConflict = async (id) => {
    const attribute = await prisma.attribute.findUnique({ where: { id }, include: attributeInclude });
    if (!attribute) notFound(ERROR_CODES.ATTRIBUTE_NOT_FOUND);
    conflict(ERROR_CODES.VERSION_CONFLICT, { resource: "attribute", attribute });
};

export const updateAttribute = async (id, body) => {
    requireVersion(body);
    const current = await loadAttribute(id);
    const labels = resolvePatchedOptions(current, body.options);
    const data = await buildPatchData(current, body);
    try {
        return await prisma.$transaction((tx) => updateInTransaction(tx, current, body, data, labels));
    } catch (error) {
        if (error.code === "P2002") conflict(ERROR_CODES.ATTRIBUTE_NAME_ALREADY_EXISTS, { field: "name", params: { name: body.name ?? current.name } });
        if (error.message !== VERSION_CONFLICT) throw error;
        return throwAttributeConflict(id);
    }
};

export const deleteAttribute = async (id, body) => {
    const version = requireVersion(body);
    const current = await loadAttribute(id);
    if (current.systemKey) forbidden(ERROR_CODES.SYSTEM_ATTRIBUTE_DELETE_FORBIDDEN);
    const result = await deleteVersioned(prisma.attribute, id, version);
    if (result.count === 0) await throwAttributeConflict(id);
};
