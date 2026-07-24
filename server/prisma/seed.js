import { prisma } from "../lib/prisma.js";
import { normalizeName } from "../lib/normalize.js";

const categories = ["Certification", "Domain knowledge", "Personal info", "Soft skills", "Other",];

const systemAttributes = [
    {
        name: "First name",
        systemKey: "FIRST_NAME",
        type: "STRING",
        category: "Personal info",
    },
    {
        name: "Last name",
        systemKey: "LAST_NAME",
        type: "STRING",
        category: "Personal info",
    },
    {
        name: "Location",
        systemKey: "LOCATION",
        type: "STRING",
        category: "Personal info",
    },
    {
        name: "Profile image",
        systemKey: "PROFILE_IMAGE",
        type: "IMAGE",
        category: "Personal info",
    },
];

const buildCategoryData = () =>
    categories.map((name, sortOrder) => ({name, normalizedName: normalizeName(name), sortOrder,}));

const getCategoryId = (categoryIdByName, categoryName) => {
    const normalizedName = normalizeName(categoryName);
    const categoryId = categoryIdByName.get(normalizedName);
    if (!categoryId) {
        throw new Error(`Category not found: ${categoryName}`);
    }
    return categoryId;
};

const buildSystemAttributeData = (categoryIdByName) =>
    systemAttributes.map((attribute) => ({
        name: attribute.name,
        normalizedName: normalizeName(attribute.name),
        type: attribute.type,
        systemKey: attribute.systemKey,
        categoryId: getCategoryId(
            categoryIdByName,
            attribute.category,
        ),
    }));

const seedCategories = async (tx) => {
    const categoryData = buildCategoryData();
    await tx.attributeCategory.createMany({
        data: categoryData,
        skipDuplicates: true,
    });
    const savedCategories = await tx.attributeCategory.findMany({
        where: {
            normalizedName: {
                in: categoryData.map(
                    (category) => category.normalizedName,
                ),
            },
        },
        select: {
            id: true,
            normalizedName: true,
        },
    });
    return new Map(savedCategories.map((category) => [category.normalizedName, category.id,]),);
};

const validateSystemAttributes = async (tx) => {
    const expectedKeys = systemAttributes.map((attribute) => attribute.systemKey,);

    const savedAttributes = await tx.attribute.findMany({
        where: {
            systemKey: {
                in: expectedKeys,
            },
        },
        select: {
            systemKey: true,
        },
    });

    const existingKeys = new Set(savedAttributes.map((attribute) => attribute.systemKey),);

    const missingKeys = expectedKeys.filter((key) => !existingKeys.has(key),);

    if (missingKeys.length) {
        throw new Error(
            `Failed to seed system attributes: ${missingKeys.join(", ")}`,
        );
    }
};

const seedSystemAttributes = async (tx, categoryIdByName) => {
    await tx.attribute.createMany({
        data: buildSystemAttributeData(categoryIdByName),
        skipDuplicates: true,
    });
    await validateSystemAttributes(tx);
};

async function main() {
    await prisma.$transaction(async (tx) => {
        const categoryIdByName = await seedCategories(tx);
        await seedSystemAttributes(tx, categoryIdByName,);
    });
}

main()
    .then(() => prisma.$disconnect())
    .catch(async (err) => {
        console.error(err);
        await prisma.$disconnect();
        process.exit(1);
    });