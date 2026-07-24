import { normalizeName } from "./normalize.js";

const toTag = (value) => {
    const name = String(value).trim();
    return name ? { name, normalizedName: normalizeName(name) } : null;
};

const normalizeTags = (names) => {
    const tags = names.map(toTag).filter(Boolean);
    return [...new Map(tags.map((tag) => [tag.normalizedName, tag])).values()];
};

const saveTags = (tx, tags) => tx.tag.createMany({
    data: tags,
    skipDuplicates: true,
});

const loadTags = (tx, tags) => tx.tag.findMany({
    where: { normalizedName: { in: tags.map(({ normalizedName }) => normalizedName) } },
    select: { id: true, normalizedName: true },
});

const mapTagIds = (requested, saved) => {
    const ids = new Map(saved.map(({ id, normalizedName }) => [normalizedName, id]));
    const resolved = requested.map(({ normalizedName }) => ids.get(normalizedName));
    if (resolved.some((id) => !id)) throw new Error("Failed to resolve tags");
    return resolved;
};

export const resolveTagIds = async (tx, names) => {
    const requested = normalizeTags(names);
    if (!requested.length) return [];
    await saveTags(tx, requested);
    return mapTagIds(requested, await loadTags(tx, requested));
};
