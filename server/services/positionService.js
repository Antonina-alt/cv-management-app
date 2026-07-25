import { ERROR_CODES } from "../lib/errorCodes.js";
import { prisma } from "../lib/prisma.js";
import { buildAccessRuleData, candidateHasPositionAccess } from "../lib/positionAccess.js";
import { candidateAccessMap, filterPositionsForUser, groupValuesByCandidateId } from "../lib/positionVisibility.js";
import { filterVisibleResumesByCandidateValues } from "../lib/resumeContent.js";
import { isAdmin, isRecruiterOrAdmin } from "../lib/roles.js";
import { resolveTagIds } from "../lib/tags.js";
import { badRequest, conflict, forbidden, notFound } from "../lib/httpError.js";
import { mapDefinedFields } from "../lib/objects.js";
import { deleteVersioned, ensureUpdated, updateVersioned, VERSION_CONFLICT } from "../lib/versioning.js";
import { requireVersion } from "../lib/validation.js";

const POSITION_LEVELS = ["JUNIOR", "MIDDLE", "SENIOR", "LEAD", "C_LEVEL"];

const positionInclude = {
    attributes: {
        include: { attribute: { include: { category: true } } },
        orderBy: { sortOrder: "asc" },
    },
    accessRules: {
        include: { attribute: { include: { options: true } } },
    },
    projectTagFilters: { include: { tag: true } },
    _count: { select: { resumes: true } },
};

const positionWithResumesInclude = {
    ...positionInclude,
    resumes: { include: { candidate: true, _count: { select: { likes: true } } } },
};

const editFields = {
    title: (value) => value.trim(),
    description: (value) => value,
    company: (value) => value,
    level: (value) => value,
    isPublic: (value) => Boolean(value),
    maxProjects: (value) => Number(value),
};

const positionWhere = ({ company, level }) => ({
    ...(company ? { company: { contains: String(company), mode: "insensitive" } } : {}),
    ...(level ? { level: String(level) } : {}),
});

const validateFields = (body) => {
    if (body.title !== undefined && (typeof body.title !== "string" || !body.title.trim())) badRequest(ERROR_CODES.POSITION_TITLE_REQUIRED, { field: "title" });
    if (body.level != null && !POSITION_LEVELS.includes(body.level)) badRequest(ERROR_CODES.POSITION_LEVEL_INVALID, { field: "level" });
    if (body.maxProjects == null) return;
    const value = Number(body.maxProjects);
    if (!Number.isInteger(value) || value < 0) badRequest(ERROR_CODES.POSITION_MAX_PROJECTS_INVALID, { field: "maxProjects" });
};

const loadRuleAttributes = async (rules) => {
    const ids = [...new Set(rules.map((rule) => rule?.attributeId).filter(Boolean))];
    if (!ids.length) return new Map();
    const attributes = await prisma.attribute.findMany({
        where: { id: { in: ids } },
        select: { id: true, type: true, options: { select: { id: true } } },
    });
    return new Map(attributes.map((attribute) => [attribute.id, attribute]));
};

const validateRule = (rule, attributes) => {
    if (!rule?.attributeId || !rule?.operator) badRequest(ERROR_CODES.POSITION_ACCESS_RULE_FIELDS_REQUIRED);
    const attribute = attributes.get(rule.attributeId);
    if (!attribute) badRequest(ERROR_CODES.POSITION_ACCESS_RULE_ATTRIBUTE_NOT_FOUND, { field: "attributeId" });
    const { data, error } = buildAccessRuleData(attribute, rule.operator, rule);
    if (error) badRequest(error.code, error);
    return { attributeId: rule.attributeId, operator: rule.operator, ...data };
};

const resolveRuleCreates = async (rules) => {
    if (rules === undefined) return null;
    if (!Array.isArray(rules)) badRequest(ERROR_CODES.POSITION_ACCESS_RULES_INVALID, { field: "accessRules" });
    const attributes = await loadRuleAttributes(rules);
    return rules.map((rule) => validateRule(rule, attributes));
};

const validateAttributeIds = async (attributeIds) => {
    if (attributeIds === undefined) return;
    if (!Array.isArray(attributeIds)) badRequest(ERROR_CODES.POSITION_ATTRIBUTES_INVALID, { field: "attributeIds" });
    const uniqueIds = [...new Set(attributeIds)];
    if (uniqueIds.length !== attributeIds.length) badRequest(ERROR_CODES.POSITION_ATTRIBUTES_DUPLICATED, { field: "attributeIds" });
    const count = await prisma.attribute.count({ where: { id: { in: uniqueIds } } });
    if (count !== uniqueIds.length) badRequest(ERROR_CODES.ATTRIBUTE_NOT_FOUND, { field: "attributeIds" });
};

export const listPositions = async (query, user) => {
    const positions = await prisma.position.findMany({
        where: positionWhere(query),
        include: positionInclude,
        orderBy: { updatedAt: "desc" },
    });
    return filterPositionsForUser(positions, user);
};

const loadPosition = async (id, include = positionInclude) => {
    const position = await prisma.position.findUnique({ where: { id }, include });
    if (!position) notFound(ERROR_CODES.POSITION_NOT_FOUND);
    return position;
};

const loadCandidateResume = (candidateId, positionId) => prisma.resume.findUnique({
    where: { candidateId_positionId: { candidateId, positionId } },
});

const visibleResumes = async (position, user) => {
    if (isAdmin(user)) return position.resumes;
    const resumes = position.resumes.filter(({ status }) => status === "PUBLISHED");
    const candidateIds = [...new Set(resumes.map(({ candidateId }) => candidateId))];
    const values = candidateIds.length ? await prisma.candidateAttributeValue.findMany({
        where: { candidateId: { in: candidateIds } },
    }) : [];
    return filterVisibleResumesByCandidateValues(position, resumes, groupValuesByCandidateId(values));
};

const candidateView = async (position, user) => {
    const values = await candidateAccessMap(user.id);
    if (!candidateHasPositionAccess(position, values)) forbidden();
    return { ...position, myResume: await loadCandidateResume(user.id, position.id) };
};

const recruiterView = async (position, user) => ({
    ...position,
    resumes: await visibleResumes(position, user),
    myResume: isAdmin(user) ? await loadCandidateResume(user.id, position.id) : undefined,
});

export const getPosition = async (id, user) => {
    const recruiter = isRecruiterOrAdmin(user);
    const position = await loadPosition(id, recruiter ? positionWithResumesInclude : positionInclude);
    if (!user) return position.isPublic ? position : forbidden();
    return recruiter ? recruiterView(position, user) : candidateView(position, user);
};

const relationCreates = (body, tagIds, ruleCreates) => ({
    attributes: Array.isArray(body.attributeIds) ? {
        create: body.attributeIds.map((attributeId, sortOrder) => ({ attributeId, sortOrder })),
    } : undefined,
    projectTagFilters: tagIds.length ? {
        create: tagIds.map((tagId) => ({ tagId })),
    } : undefined,
    accessRules: ruleCreates.length ? { create: ruleCreates } : undefined,
});

const createData = (body, tagIds, ruleCreates) => ({
    title: body.title.trim(),
    description: body.description ?? null,
    company: body.company ?? null,
    level: body.level ?? null,
    isPublic: Boolean(body.isPublic),
    maxProjects: body.maxProjects !== undefined ? Number(body.maxProjects) : undefined,
    ...relationCreates(body, tagIds, ruleCreates),
});

export const createPosition = async (body) => {
    if (body.title === undefined) badRequest(ERROR_CODES.POSITION_TITLE_REQUIRED, { field: "title" });
    validateFields(body);
    await validateAttributeIds(body.attributeIds);
    const ruleCreates = await resolveRuleCreates(body.accessRules) ?? [];
    return prisma.$transaction(async (tx) => {
        const tags = Array.isArray(body.projectTags) ? body.projectTags : [];
        const tagIds = body.projectTags === undefined ? [] : await resolveTagIds(tx, tags);
        return tx.position.create({ data: createData(body, tagIds, ruleCreates), include: positionWithResumesInclude });
    });
};

const cloneRule = ({ attributeId, operator, stringValue, numberValue, dateValue, optionId }) => ({
    attributeId,
    operator,
    stringValue,
    numberValue,
    dateValue,
    optionId,
});

const duplicateData = (source) => ({
    title: `${source.title} (copy)`,
    description: source.description,
    company: source.company,
    level: source.level,
    isPublic: source.isPublic,
    maxProjects: source.maxProjects,
    attributes: { create: source.attributes.map(({ attributeId, sortOrder }) => ({ attributeId, sortOrder })) },
    projectTagFilters: { create: source.projectTagFilters.map(({ tagId }) => ({ tagId })) },
    accessRules: { create: source.accessRules.map(cloneRule) },
});

export const duplicatePosition = async (id) => {
    const source = await loadPosition(id, { attributes: true, accessRules: true, projectTagFilters: true });
    return prisma.position.create({ data: duplicateData(source), include: positionWithResumesInclude });
};

const syncAttributes = async (tx, positionId, attributeIds) => {
    if (!Array.isArray(attributeIds)) return;
    await tx.positionAttribute.deleteMany({ where: { positionId } });
    await tx.positionAttribute.createMany({
        data: attributeIds.map((attributeId, sortOrder) => ({ positionId, attributeId, sortOrder })),
    });
};

const syncProjectTags = async (tx, positionId, projectTags) => {
    if (projectTags === undefined) return;
    const tagIds = await resolveTagIds(tx, Array.isArray(projectTags) ? projectTags : []);
    await tx.positionProjectTag.deleteMany({ where: { positionId } });
    await tx.positionProjectTag.createMany({ data: tagIds.map((tagId) => ({ positionId, tagId })) });
};

const syncAccessRules = async (tx, positionId, rules) => {
    if (rules === null) return;
    await tx.positionAccessRule.deleteMany({ where: { positionId } });
    if (rules.length) await tx.positionAccessRule.createMany({
        data: rules.map((rule) => ({ positionId, ...rule })),
    });
};

const updateRelations = async (tx, id, body, ruleCreates) => {
    await syncAttributes(tx, id, body.attributeIds);
    await syncProjectTags(tx, id, body.projectTags);
    await syncAccessRules(tx, id, ruleCreates);
};

const updateInTransaction = async (tx, id, body, ruleCreates) => {
    ensureUpdated(await updateVersioned(tx.position, id, body.version, mapDefinedFields(body, editFields)));
    await updateRelations(tx, id, body, ruleCreates);
    return tx.position.findUnique({ where: { id }, include: positionWithResumesInclude });
};

const throwPositionConflict = async (id) => {
    const position = await prisma.position.findUnique({ where: { id }, include: positionInclude });
    if (!position) notFound(ERROR_CODES.POSITION_NOT_FOUND);
    conflict(ERROR_CODES.VERSION_CONFLICT, { resource: "position", position });
};

export const updatePosition = async (id, body) => {
    requireVersion(body);
    await loadPosition(id, undefined);
    validateFields(body);
    await validateAttributeIds(body.attributeIds);
    const ruleCreates = await resolveRuleCreates(body.accessRules);
    try {
        return await prisma.$transaction((tx) => updateInTransaction(tx, id, body, ruleCreates));
    } catch (error) {
        if (error.message !== VERSION_CONFLICT) throw error;
        return throwPositionConflict(id);
    }
};

export const deletePosition = async (id, body) => {
    const version = requireVersion(body);
    await loadPosition(id, undefined);
    const result = await deleteVersioned(prisma.position, id, version);
    if (result.count === 0) await throwPositionConflict(id);
};
