import { normalizeName } from "./normalize.js";

export const resolveTagIds = async (tx, names) => {
    const unique = [...new Set(names.map((name) => String(name).trim()).filter(Boolean))];

    const ids = [];
    for (const name of unique) {
        const normalizedName = normalizeName(name);
        const tag = await tx.tag.upsert({
            where: { normalizedName },
            update: {},
            create: { name, normalizedName },
        });
        ids.push(tag.id);
    }
    return ids;
};
