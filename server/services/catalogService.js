import { prisma } from "../lib/prisma.js";
import { normalizeName } from "../lib/normalize.js";

export const listAttributeCategories = () => prisma.attributeCategory.findMany({
    orderBy: { sortOrder: "asc" },
});

export const listTags = (value) => {
    const query = value ? normalizeName(String(value)) : null;
    return prisma.tag.findMany({
        where: query ? { normalizedName: { startsWith: query } } : {},
        orderBy: { name: "asc" },
        take: 20,
    });
};
