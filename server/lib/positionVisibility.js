import { prisma } from "./prisma.js";
import { candidateHasPositionAccess } from "./positionAccess.js";
import { isRecruiterOrAdmin } from "./roles.js";


export const candidateAccessMap = async (candidateId) => {
    const values = await prisma.candidateAttributeValue.findMany({ where: { candidateId } });
    return new Map(values.map((value) => [value.attributeId, value]));
};

export const groupValuesByCandidateId = (values) => values.reduce((grouped, value) => {
    const candidateValues = grouped.get(value.candidateId) ?? new Map();
    candidateValues.set(value.attributeId, value);
    return grouped.set(value.candidateId, candidateValues);
}, new Map());

export const filterPositionsForUser = async (positions, user) => {
    if (!user) return positions.filter(({ isPublic }) => isPublic);
    if (isRecruiterOrAdmin(user)) return positions;
    const values = await candidateAccessMap(user.id);
    return positions.filter((position) => candidateHasPositionAccess(position, values));
};
