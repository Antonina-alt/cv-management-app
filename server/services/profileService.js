import { ERROR_CODES } from "../lib/errorCodes.js";
import { prisma } from "../lib/prisma.js";
import { attributeValueInclude, projectInclude } from "../lib/prismaIncludes.js";
import { candidateHasPositionAccess } from "../lib/positionAccess.js";
import { badRequest, conflict, notFound } from "../lib/httpError.js";
import { findUserWithRoles, toPublicUser } from "../lib/users.js";
import { hasOwnFields, mapDefinedFields } from "../lib/objects.js";
import { updateVersioned } from "../lib/versioning.js";
import { requireVersion } from "../lib/validation.js";
import { isAdmin } from "../lib/roles.js";

const aboutFields = {
    firstName: (value) => value,
    lastName: (value) => value,
    location: (value) => value,
};

const loadCandidate = async (candidateId) => {
    const user = await findUserWithRoles(candidateId);
    if (!user) notFound(ERROR_CODES.PROFILE_NOT_FOUND);
    return user;
};

const throwUserConflict = async (candidateId) => conflict(ERROR_CODES.VERSION_CONFLICT, {
    resource: "profile",
    user: toPublicUser(await loadCandidate(candidateId)),
});

const updateCandidate = async (candidateId, version, data) => {
    const result = await updateVersioned(prisma.user, candidateId, version, data);
    if (result.count === 0) await throwUserConflict(candidateId);
    return toPublicUser(await loadCandidate(candidateId));
};

export const setCandidateImage = (candidateId, body) => {
    if (!body.imageUrl || body.version === undefined) badRequest(ERROR_CODES.PROFILE_IMAGE_FIELDS_REQUIRED);
    return updateCandidate(candidateId, body.version, { imageUrl: body.imageUrl });
};

export const removeCandidateImage = (candidateId, body) => updateCandidate(
    candidateId,
    requireVersion(body),
    { imageUrl: null },
);

const loadAttributeValues = (candidateId) => prisma.candidateAttributeValue.findMany({
    where: { candidateId },
    include: attributeValueInclude,
    orderBy: [{ attribute: { category: { sortOrder: "asc" } } }, { attribute: { name: "asc" } }],
});

const loadProjects = (candidateId) => prisma.project.findMany({
    where: { candidateId },
    include: projectInclude,
    orderBy: { startDate: "desc" },
});

const loadResumes = (candidateId) => prisma.resume.findMany({
    where: { candidateId },
    include: {
        position: { include: { accessRules: { include: { attribute: true } } } },
        _count: { select: { likes: true } },
    },
    orderBy: { updatedAt: "desc" },
});

const visibleResumes = (resumes, attributeValues, viewer) => {
    if (isAdmin(viewer)) return resumes;
    const values = new Map(attributeValues.map((value) => [value.attributeId, value]));
    return resumes.filter(({ position }) => candidateHasPositionAccess(position, values));
};

export const getProfile = async (candidateId, viewer) => {
    const user = await loadCandidate(candidateId);
    const [attributeValues, projects, resumes] = await Promise.all([
        loadAttributeValues(candidateId),
        loadProjects(candidateId),
        loadResumes(candidateId),
    ]);
    return {
        user: toPublicUser(user),
        attributeValues,
        projects,
        resumes: visibleResumes(resumes, attributeValues, viewer),
    };
};

export const updateAbout = async (candidateId, body) => {
    const version = requireVersion(body);
    const data = mapDefinedFields(body, aboutFields);
    if (!hasOwnFields(data)) badRequest(ERROR_CODES.PROFILE_FIELDS_REQUIRED);
    return updateCandidate(candidateId, version, data);
};
