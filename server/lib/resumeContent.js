import { candidateHasPositionAccess } from "./positionAccess.js";

// Whether a merged attribute value (typed row from CandidateAttributeValue, or null if the
// candidate never set one) counts as "empty" for the purposes of red-highlighting and the
// Publish gate. Booleans are special: an explicit true/false both count as filled — only the
// absence of a row (or a null column) is empty.
export const isValueEmpty = (type, value) => {
    if (!value) return true;

    switch (type) {
        case "STRING":
        case "TEXT":
            return !value.stringValue;
        case "IMAGE":
            return !value.imageUrl;
        case "NUMBER":
            return value.numberValue === null || value.numberValue === undefined;
        case "DATE":
            return !value.dateValue;
        case "DATE_RANGE":
            return !value.dateFrom && !value.dateTo;
        case "BOOLEAN":
            return value.booleanValue === null || value.booleanValue === undefined;
        case "SELECT":
            return !value.selectedOptionId;
        default:
            return true;
    }
};

// Position attributes, merged with the candidate's current values. System attributes (name,
// location, photo) are rendered separately as the resume's "identity" block, so they're
// excluded here to avoid showing them twice.
export const buildResumeAttributes = (position, valuesByAttributeId) =>
    position.attributes
        .filter((link) => !link.attribute.systemKey)
        .map((link) => {
            const value = valuesByAttributeId.get(link.attributeId) ?? null;
            return {
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
            };
        });

// A project is eligible if the position has no tag filters, or it carries at least one of the
// filtered tags. Eligible projects are capped at maxProjects.
export const buildResumeProjects = (position, projects) => {
    const tagIds = new Set(position.projectTagFilters.map((f) => f.tagId));
    const eligible = tagIds.size === 0
        ? projects
        : projects.filter((p) => p.tags.some((t) => tagIds.has(t.tagId)));
    return eligible.slice(0, position.maxProjects);
};

export const isResumeComplete = (attributes) => attributes.every((a) => !a.isEmpty);

// Hides resumes whose candidate no longer satisfies the position's access rules. Takes an
// already-batched Map<candidateId, Map<attributeId, value>> so callers can fetch it in a single
// query regardless of how many distinct candidates are involved.
export const filterVisibleResumesByCandidateValues = (position, resumes, valuesByCandidateId) =>
    resumes.filter((r) => candidateHasPositionAccess(position, valuesByCandidateId.get(r.candidateId) ?? new Map()));
