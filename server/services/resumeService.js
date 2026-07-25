import { ERROR_CODES } from "../lib/errorCodes.js";
import { prisma } from "../lib/prisma.js";
import { positionDetailInclude, projectInclude } from "../lib/prismaIncludes.js";
import { candidateHasPositionAccess } from "../lib/positionAccess.js";
import { buildResumeAttributes, buildResumeProjects, isResumeComplete } from "../lib/resumeContent.js";
import { isAdmin, isOwnerOrAdmin, isRecruiter } from "../lib/roles.js";
import { findUserWithRoles, toPublicUser } from "../lib/users.js";
import { badRequest, conflict, forbidden, notFound } from "../lib/httpError.js";
import { deleteVersioned, updateVersioned } from "../lib/versioning.js";
import { requireVersion } from "../lib/validation.js";

const loadPosition = async (positionId) => {
    const position = await prisma.position.findUnique({
        where: { id: positionId },
        include: positionDetailInclude,
    });
    if (!position) notFound(ERROR_CODES.POSITION_NOT_FOUND);
    return position;
};

const loadResume = async (id) => {
    const resume = await prisma.resume.findUnique({ where: { id } });
    if (!resume) notFound(ERROR_CODES.RESUME_NOT_FOUND);
    return resume;
};

const loadCandidateValues = async (candidateId) => {
    const values = await prisma.candidateAttributeValue.findMany({
        where: { candidateId },
        include: { selectedOption: true },
    });
    return new Map(values.map((value) => [value.attributeId, value]));
};

const loadCandidateProjects = (candidateId) => prisma.project.findMany({
    where: { candidateId },
    include: projectInclude,
    orderBy: { startDate: "desc" },
});

const missingAttributeIds = (position, values) => position.attributes
    .filter(({ attribute, attributeId }) => !attribute.systemKey && !values.has(attributeId))
    .map(({ attributeId }) => attributeId);

const syncMissingValues = async (db, candidateId, position, values) => {
    const attributeIds = missingAttributeIds(position, values);
    if (!attributeIds.length) return;
    await db.candidateAttributeValue.createMany({
        data: attributeIds.map((attributeId) => ({ candidateId, attributeId })),
        skipDuplicates: true,
    });
};

const loadLikeInfo = async (resumeId, userId) => {
    const [likeCount, like] = await Promise.all([
        prisma.resumeLike.count({ where: { resumeId } }),
        userId ? prisma.resumeLike.findUnique({
            where: { resumeId_recruiterId: { resumeId, recruiterId: userId } },
        }) : null,
    ]);
    return { likeCount, likedByMe: Boolean(like) };
};

const resumeIdentity = (resume, position, candidate) => ({
    id: resume.id,
    status: resume.status,
    version: resume.version,
    createdAt: resume.createdAt,
    publishedAt: resume.publishedAt,
    candidateId: resume.candidateId,
    positionId: resume.positionId,
    candidate: toPublicUser(candidate),
    position: { id: position.id, title: position.title, company: position.company, level: position.level },
});

const loadDetailResources = (resume, currentUserId) => Promise.all([
    loadCandidateValues(resume.candidateId),
    loadCandidateProjects(resume.candidateId),
    findUserWithRoles(resume.candidateId),
    loadLikeInfo(resume.id, currentUserId),
]);

const buildDetailResponse = (resume, position, candidate, projects, attributes, canEdit, likes) => ({
    ...resumeIdentity(resume, position, candidate),
    attributes,
    projects: buildResumeProjects(position, projects),
    isComplete: isResumeComplete(attributes),
    canEdit,
    ...likes,
});

const buildDetail = async (resume, position, canEdit, currentUserId) => {
    const [values, projects, candidate, likes] = await loadDetailResources(resume, currentUserId);
    const attributes = buildResumeAttributes(position, values);
    return buildDetailResponse(resume, position, candidate, projects, attributes, canEdit, likes);
};

const ensureCreateAccess = (user, position, values) => {
    if (!isAdmin(user) && !candidateHasPositionAccess(position, values)) forbidden();
};

const createResumeRecord = async (candidateId, position, values) => prisma.$transaction(async (tx) => {
    const resume = await tx.resume.create({ data: { candidateId, positionId: position.id } });
    await syncMissingValues(tx, candidateId, position, values);
    return resume;
});

export const createResume = async (user, body) => {
    if (!body.positionId) badRequest(ERROR_CODES.RESUME_POSITION_REQUIRED, { field: "positionId" });
    const position = await loadPosition(body.positionId);
    const values = await loadCandidateValues(user.id);
    ensureCreateAccess(user, position, values);
    try {
        const resume = await createResumeRecord(user.id, position, values);
        return buildDetail(resume, position, true, user.id);
    } catch (error) {
        if (error.code !== "P2002") throw error;
        conflict(ERROR_CODES.RESUME_ALREADY_EXISTS);
    }
};

const resolveReadAccess = (user, resume, position, values) => {
    const owner = isOwnerOrAdmin(user, resume.candidateId);
    const recruiterView = !owner && isRecruiter(user);
    const visibleStatus = !recruiterView || resume.status === "PUBLISHED";
    const visiblePosition = isAdmin(user) || candidateHasPositionAccess(position, values);
    return { owner, allowed: (owner || recruiterView) && visibleStatus && visiblePosition };
};

export const getResume = async (user, id) => {
    const resume = await loadResume(id);
    const position = await loadPosition(resume.positionId);
    const values = await loadCandidateValues(resume.candidateId);
    const access = resolveReadAccess(user, resume, position, values);
    if (!access.allowed) forbidden();
    if (access.owner) await syncMissingValues(prisma, resume.candidateId, position, values);
    return buildDetail(resume, position, access.owner, user.id);
};

const throwResumeConflict = async (id) => {
    const resume = await prisma.resume.findUnique({ where: { id } });
    if (!resume) notFound(ERROR_CODES.RESUME_NOT_FOUND);
    conflict(ERROR_CODES.VERSION_CONFLICT, { resource: "resume", resume });
};

const ensurePublishable = (user, resume, attributes) => {
    if (!isOwnerOrAdmin(user, resume.candidateId)) forbidden();
    if (!isResumeComplete(attributes)) badRequest(ERROR_CODES.RESUME_INCOMPLETE);
};

export const publishResume = async (user, id, body) => {
    const version = requireVersion(body);
    const resume = await loadResume(id);
    const position = await loadPosition(resume.positionId);
    const values = await loadCandidateValues(resume.candidateId);
    ensurePublishable(user, resume, buildResumeAttributes(position, values));
    const result = await updateVersioned(prisma.resume, id, version, {
        status: "PUBLISHED",
        publishedAt: new Date(),
    });
    if (result.count === 0) await throwResumeConflict(id);
    return buildDetail(await loadResume(id), position, true, user.id);
};

export const deleteResume = async (user, id, body) => {
    const version = requireVersion(body);
    const resume = await loadResume(id);
    if (!isOwnerOrAdmin(user, resume.candidateId)) forbidden();
    const result = await deleteVersioned(prisma.resume, id, version);
    if (result.count === 0) await throwResumeConflict(id);
};

const loadPublishedResume = async (id) => {
    const resume = await prisma.resume.findUnique({ where: { id } });
    if (!resume || resume.status !== "PUBLISHED") notFound(ERROR_CODES.RESUME_NOT_FOUND);
    return resume;
};

export const likeResume = async (userId, id) => {
    await loadPublishedResume(id);
    await prisma.resumeLike.upsert({
        where: { resumeId_recruiterId: { resumeId: id, recruiterId: userId } },
        update: {},
        create: { resumeId: id, recruiterId: userId },
    });
    return loadLikeInfo(id, userId);
};

export const unlikeResume = async (userId, id) => {
    await prisma.resumeLike.deleteMany({ where: { resumeId: id, recruiterId: userId } });
    return loadLikeInfo(id, userId);
};
