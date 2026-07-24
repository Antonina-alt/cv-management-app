import { prisma } from "../lib/prisma.js";
import { projectInclude } from "../lib/prismaIncludes.js";
import { validateProjectDates } from "../lib/projectDates.js";
import { resolveTagIds } from "../lib/tags.js";
import { badRequest, conflict, notFound } from "../lib/httpError.js";
import { mapDefinedFields } from "../lib/objects.js";
import { deleteVersioned, ensureUpdated, updateVersioned, VERSION_CONFLICT } from "../lib/versioning.js";
import { requireNonEmptyString, requireVersion } from "../lib/validation.js";

const projectFields = {
    title: (value) => requireNonEmptyString(value, "title is required"),
    description: (value) => value,
};

const resolveDates = (body, current = {}) => {
    const result = validateProjectDates(body, current);
    if (result.error) badRequest(result.error.message, {
        code: result.error.code,
        field: result.error.field,
    });
    return result.data;
};

const loadProject = async (candidateId, projectId) => {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.candidateId !== candidateId) notFound("project not found");
    return project;
};

const throwProjectConflict = async (projectId) => conflict("Version conflict", {
    project: await prisma.project.findUnique({ where: { id: projectId }, include: projectInclude }),
});

const createData = (candidateId, body, title, tagIds, dates) => ({
    candidateId,
    title,
    description: body.description ?? null,
    ...dates,
    tags: { create: tagIds.map((tagId) => ({ tagId })) },
});

export const createProject = (candidateId, body) => {
    const title = requireNonEmptyString(body.title, "title is required");
    const dates = resolveDates(body);
    return prisma.$transaction(async (tx) => {
        const tagIds = await resolveTagIds(tx, Array.isArray(body.tags) ? body.tags : []);
        return tx.project.create({
            data: createData(candidateId, body, title, tagIds, dates),
            include: projectInclude,
        });
    });
};

const syncTags = async (tx, projectId, tags) => {
    if (tags === undefined) return;
    const tagIds = await resolveTagIds(tx, Array.isArray(tags) ? tags : []);
    await tx.projectTag.deleteMany({ where: { projectId } });
    await tx.projectTag.createMany({ data: tagIds.map((tagId) => ({ projectId, tagId })) });
};

const updateInTransaction = async (tx, projectId, body, data) => {
    ensureUpdated(await updateVersioned(tx.project, projectId, body.version, data));
    await syncTags(tx, projectId, body.tags);
    return tx.project.findUnique({ where: { id: projectId }, include: projectInclude });
};

export const updateProject = async (candidateId, projectId, body) => {
    requireVersion(body);
    const current = await loadProject(candidateId, projectId);
    const data = { ...mapDefinedFields(body, projectFields), ...resolveDates(body, current) };
    try {
        return await prisma.$transaction((tx) => updateInTransaction(tx, projectId, body, data));
    } catch (error) {
        if (error.message !== VERSION_CONFLICT) throw error;
        return throwProjectConflict(projectId);
    }
};

export const deleteProject = async (candidateId, projectId, body) => {
    const version = requireVersion(body);
    await loadProject(candidateId, projectId);
    const result = await deleteVersioned(prisma.project, projectId, version);
    if (result.count === 0) await throwProjectConflict(projectId);
};
