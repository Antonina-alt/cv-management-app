import { prisma } from "./prisma.js";
import { candidateHasPositionAccess } from "./positionAccess.js";

export const isRecruiterOrAdmin = (user) =>
    Boolean(user) && (user.roles.includes("RECRUITER") || user.roles.includes("ADMIN"));

export const candidateAccessMap = async (candidateId) => {
    const values = await prisma.candidateAttributeValue.findMany({ where: { candidateId } });
    return new Map(values.map((value) => [value.attributeId, value]));
};

export const groupValuesByCandidateId = (values) => {
    const byCandidate = new Map();
    for (const value of values) {
        if (!byCandidate.has(value.candidateId)) byCandidate.set(value.candidateId, new Map());
        byCandidate.get(value.candidateId).set(value.attributeId, value);
    }
    return byCandidate;
};

export const filterPositionsForUser = async (positions, user) => {
    if (!user) return positions.filter((position) => position.isPublic);
    if (isRecruiterOrAdmin(user)) return positions;
    const values = await candidateAccessMap(user.id);
    return positions.filter((position) => candidateHasPositionAccess(position, values));
};
