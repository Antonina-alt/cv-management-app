import { candidateHasPositionAccess } from "./positionAccess.js";

const EMPTINESS_CHECKS = {
    STRING: (v) => !v.stringValue,
    TEXT: (v) => !v.stringValue,
    IMAGE: (v) => !v.imageUrl,
    NUMBER: (v) => v.numberValue === null || v.numberValue === undefined,
    DATE: (v) => !v.dateValue,
    DATE_RANGE: (v) => !v.dateFrom && !v.dateTo,
    BOOLEAN: (v) => v.booleanValue === null || v.booleanValue === undefined,
    SELECT: (v) => !v.selectedOptionId,
};

export const isValueEmpty = (type, value) => {
    if (!value) return true;
    const check = EMPTINESS_CHECKS[type];
    return check ? check(value) : true;
};

const mergeAttributeValue = (link, value) => ({
    attributeId: link.attributeId,
    attribute: link.attribute,
    valueId: value?.id ?? null,
    version: value?.version ?? null,
    stringValue: value?.stringValue ?? null,
    numberValue: value?.numberValue ?? null,
    booleanValue: value?.booleanValue ?? null,
    dateValue: value?.dateValue ?? null,
    dateFrom: value?.dateFrom ?? null,
    dateTo: value?.dateTo ?? null,
    imageUrl: value?.imageUrl ?? null,
    selectedOptionId: value?.selectedOptionId ?? null,
    selectedOption: value?.selectedOption ?? null,
    isEmpty: isValueEmpty(link.attribute.type, value),
});

export const buildResumeAttributes = (position, valuesByAttributeId) =>
    position.attributes
        .filter((link) => !link.attribute.systemKey)
        .map((link) => mergeAttributeValue(link, valuesByAttributeId.get(link.attributeId) ?? null));

export const buildResumeProjects = (position, projects) => {
    const tagIds = new Set(position.projectTagFilters.map((f) => f.tagId));
    const eligible = tagIds.size === 0 ? projects : projects.filter((p) => p.tags.some((t) => tagIds.has(t.tagId)));
    return eligible.slice(0, position.maxProjects);
};

export const isResumeComplete = (attributes) => attributes.every((a) => !a.isEmpty);

export const filterVisibleResumesByCandidateValues = (position, resumes, valuesByCandidateId) =>
    resumes.filter((r) => candidateHasPositionAccess(position, valuesByCandidateId.get(r.candidateId) ?? new Map()));
