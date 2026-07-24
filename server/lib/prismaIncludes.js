export const attributeInclude = {
    category: true,
    options: { orderBy: { sortOrder: "asc" } },
};

export const attributeValueInclude = {
    attribute: { include: attributeInclude },
    selectedOption: true,
};

export const projectInclude = {
    tags: { include: { tag: true } },
};

const positionAccessInclude = {
    accessRules: { include: { attribute: true } },
};

export const positionDetailInclude = {
    attributes: {
        include: { attribute: { include: attributeInclude } },
        orderBy: { sortOrder: "asc" },
    },
    ...positionAccessInclude,
    projectTagFilters: true,
};
