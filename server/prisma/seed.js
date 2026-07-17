import { prisma } from "../lib/prisma.js";
import { normalizeName } from "../lib/normalize.js";

const categories = ["Certification", "Domain knowledge", "Personal info", "Soft skills"];

const systemAttributes = [
    { name: "First name", systemKey: "FIRST_NAME", type: "STRING", category: "Personal info" },
    { name: "Last name", systemKey: "LAST_NAME", type: "STRING", category: "Personal info" },
    { name: "Location", systemKey: "LOCATION", type: "STRING", category: "Personal info" },
    { name: "Profile image", systemKey: "PROFILE_IMAGE", type: "IMAGE", category: "Personal info" },
];

async function main() {
    const categoryByName = {};
    for (const [index, name] of categories.entries()) {
        const category = await prisma.attributeCategory.upsert({
            where: { normalizedName: normalizeName(name) },
            update: {},
            create: { name, normalizedName: normalizeName(name), sortOrder: index },
        });
        categoryByName[name] = category;
    }

    for (const attr of systemAttributes) {
        await prisma.attribute.upsert({
            where: { systemKey: attr.systemKey },
            update: {},
            create: {
                name: attr.name,
                normalizedName: normalizeName(attr.name),
                type: attr.type,
                systemKey: attr.systemKey,
                categoryId: categoryByName[attr.category].id,
            },
        });
    }
}

main()
    .then(() => prisma.$disconnect())
    .catch(async (err) => {
        console.error(err);
        await prisma.$disconnect();
        process.exit(1);
    });
