import { normalizeName } from "./normalize.js";

const normalizeTags = (names) => {
    const tagsByNormalizedName = new Map();

    for (const value of names) {
        const name = String(value).trim();
        if (!name) continue;

        const normalizedName = normalizeName(name);

        if (!tagsByNormalizedName.has(normalizedName)) {
            tagsByNormalizedName.set(normalizedName, {
                name,
                normalizedName,
            });
        }
    }

    return [...tagsByNormalizedName.values()];
};

const mapTagIds = (requestedTags, savedTags) => {
    const idByNormalizedName = new Map(
        savedTags.map((tag) => [tag.normalizedName, tag.id]),
    );

    const ids = requestedTags.map((tag) =>
        idByNormalizedName.get(tag.normalizedName),
    );

    if (ids.some((id) => !id)) {
        throw new Error("Failed to resolve tags");
    }

    return ids;
};

export const resolveTagIds = async (tx, names) => {
    const requestedTags = normalizeTags(names);

    if (!requestedTags.length) {
        return [];
    }

    await tx.tag.createMany({
        data: requestedTags,
        skipDuplicates: true,
    });

    const savedTags = await tx.tag.findMany({
        where: {
            normalizedName: {
                in: requestedTags.map((tag) => tag.normalizedName),
            },
        },
        select: {
            id: true,
            normalizedName: true,
        },
    });

    return mapTagIds(requestedTags, savedTags);
};