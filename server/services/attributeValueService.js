import { prisma } from "../lib/prisma.js";
import { attributeValueInclude } from "../lib/prismaIncludes.js";
import { buildValueData } from "../lib/attributeValues.js";
import { badRequest, conflict, notFound } from "../lib/httpError.js";
import { deleteVersioned, updateVersioned } from "../lib/versioning.js";
import { requireVersion } from "../lib/validation.js";

const findValueDetail = (id) => prisma.candidateAttributeValue.findUnique({
    where: { id },
    include: attributeValueInclude,
});

const throwValueConflict = async (id) => conflict("Version conflict", {
    attributeValue: await findValueDetail(id),
});

const loadOwnedValue = async (candidateId, valueId, include) => {
    const value = await prisma.candidateAttributeValue.findUnique({ where: { id: valueId }, include });
    if (!value || value.candidateId !== candidateId) notFound("attribute value not found");
    return value;
};

const loadAddableAttribute = async (attributeId) => {
    const attribute = await prisma.attribute.findUnique({ where: { id: attributeId }, include: { options: true } });
    if (!attribute) notFound("attribute not found");
    if (attribute.systemKey) badRequest("system attributes cannot be added here");
    return attribute;
};

const resolveValueData = (attribute, fields) => {
    const result = buildValueData(attribute, fields);
    if (result.error) badRequest(result.error);
    return result.data;
};

export const createAttributeValue = async (candidateId, body) => {
    if (!body.attributeId) badRequest("attributeId is required");
    const attribute = await loadAddableAttribute(body.attributeId);
    const data = resolveValueData(attribute, body);
    try {
        return await prisma.candidateAttributeValue.create({
            data: { candidateId, attributeId: body.attributeId, ...data },
            include: attributeValueInclude,
        });
    } catch (error) {
        if (error.code !== "P2002") throw error;
        badRequest("this candidate already has a value for this attribute");
    }
};

export const updateAttributeValue = async (candidateId, valueId, body) => {
    const version = requireVersion(body);
    const current = await loadOwnedValue(candidateId, valueId, {
        attribute: { include: { options: true } },
    });
    const result = await updateVersioned(prisma.candidateAttributeValue, valueId, version, resolveValueData(current.attribute, body));
    if (result.count === 0) await throwValueConflict(valueId);
    return findValueDetail(valueId);
};

export const deleteAttributeValue = async (candidateId, valueId, body) => {
    const version = requireVersion(body);
    await loadOwnedValue(candidateId, valueId);
    const result = await deleteVersioned(prisma.candidateAttributeValue, valueId, version);
    if (result.count === 0) await throwValueConflict(valueId);
};
