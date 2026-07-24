import { prisma } from "../lib/prisma.js";
import { normalizeName } from "../lib/normalize.js";

const CATEGORY_NAMES = [
    "Certification",
    "Domain knowledge",
    "Personal info",
    "Soft skills",
    "Other",
];

const SYSTEM_ATTRIBUTES = [
    { name: "First name", systemKey: "FIRST_NAME", type: "STRING", category: "Personal info" },
    { name: "Last name", systemKey: "LAST_NAME", type: "STRING", category: "Personal info" },
    { name: "Location", systemKey: "LOCATION", type: "STRING", category: "Personal info" },
    { name: "Profile image", systemKey: "PROFILE_IMAGE", type: "IMAGE", category: "Personal info" },
];

const categoryRows = () => CATEGORY_NAMES.map((name, sortOrder) => ({
    name,
    normalizedName: normalizeName(name),
    sortOrder,
}));

const categoryId = (idsByName, name) => {
    const id = idsByName.get(normalizeName(name));
    if (!id) throw new Error(`Category not found: ${name}`);
    return id;
};

const attributeRows = (idsByName) => SYSTEM_ATTRIBUTES.map((attribute) => ({
    name: attribute.name,
    normalizedName: normalizeName(attribute.name),
    type: attribute.type,
    systemKey: attribute.systemKey,
    categoryId: categoryId(idsByName, attribute.category),
}));

const seedCategories = async (tx) => {
    const rows = categoryRows();
    await tx.attributeCategory.createMany({ data: rows, skipDuplicates: true });
    const categories = await tx.attributeCategory.findMany({
        where: { normalizedName: { in: rows.map(({ normalizedName }) => normalizedName) } },
        select: { id: true, normalizedName: true },
    });
    return new Map(categories.map(({ id, normalizedName }) => [normalizedName, id]));
};

const ensureSystemAttributes = async (tx) => {
    const keys = SYSTEM_ATTRIBUTES.map(({ systemKey }) => systemKey);
    const attributes = await tx.attribute.findMany({
        where: { systemKey: { in: keys } },
        select: { systemKey: true },
    });
    const savedKeys = new Set(attributes.map(({ systemKey }) => systemKey));
    const missing = keys.filter((key) => !savedKeys.has(key));
    if (missing.length) throw new Error(`Failed to seed system attributes: ${missing.join(", ")}`);
};

const seedSystemAttributes = async (tx, idsByName) => {
    await tx.attribute.createMany({ data: attributeRows(idsByName), skipDuplicates: true });
    await ensureSystemAttributes(tx);
};

const seed = () => prisma.$transaction(async (tx) => {
    const idsByName = await seedCategories(tx);
    await seedSystemAttributes(tx, idsByName);
});

seed()
    .then(() => prisma.$disconnect())
    .catch(async (error) => {
        console.error(error);
        await prisma.$disconnect();
        process.exit(1);
    });
