import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";

const unique = (label) => `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const createdEmails = [];
const createdPositionIds = [];
const createdAttributeIds = [];

const registerAndLogin = async (roles, label) => {
    const email = `test-pos-${unique(label)}@example.com`;
    createdEmails.push(email);

    const agent = request.agent(app);
    await agent.post("/api/auth/register").send({
        email,
        password: "correct-password",
        firstName: "Test",
        lastName: "User",
    });

    if (roles.length > 0) {
        const user = await prisma.user.findUnique({ where: { email } });
        await prisma.userRole.createMany({
            data: roles.map((role) => ({ userId: user.id, role })),
            skipDuplicates: true,
        });
    }

    await agent.post("/api/auth/login").send({ email, password: "correct-password" });

    const user = await prisma.user.findUnique({ where: { email } });
    return { agent, userId: user.id };
};

let category;
let numberAttribute;
let booleanAttribute;

beforeAll(async () => {
    category = await prisma.attributeCategory.findFirst({ where: { normalizedName: "personal info" } });
    if (!category) {
        category = await prisma.attributeCategory.create({
            data: { name: "Personal info", normalizedName: "personal info", sortOrder: 0 },
        });
    }

    numberAttribute = await prisma.attribute.create({
        data: { name: `IELTS-${unique("attr")}`, normalizedName: unique("ielts").toLowerCase(), type: "NUMBER", categoryId: category.id },
    });
    createdAttributeIds.push(numberAttribute.id);

    booleanAttribute = await prisma.attribute.create({
        data: { name: `Remote-${unique("attr")}`, normalizedName: unique("remote").toLowerCase(), type: "BOOLEAN", categoryId: category.id },
    });
    createdAttributeIds.push(booleanAttribute.id);
});

describe("GET /api/positions", () => {
    it("only shows anonymous visitors public positions", async () => {
        const { agent: recruiter } = await registerAndLogin(["RECRUITER"], "list-anon-recruiter");

        const publicPos = await recruiter.post("/api/positions").send({ title: unique("Public Pos"), isPublic: true });
        createdPositionIds.push(publicPos.body.id);

        const restrictedPos = await recruiter.post("/api/positions").send({ title: unique("Restricted Pos"), isPublic: false });
        createdPositionIds.push(restrictedPos.body.id);

        const res = await request(app).get("/api/positions");
        expect(res.status).toBe(200);
        const visibleIds = res.body.map((p) => p.id);
        expect(visibleIds).toContain(publicPos.body.id);
        expect(visibleIds).not.toContain(restrictedPos.body.id);
    });

    it("only shows candidates positions they have access to", async () => {
        const { agent: recruiter } = await registerAndLogin(["RECRUITER"], "list-recruiter");
        const { agent: candidate, userId: candidateId } = await registerAndLogin([], "list-candidate");

        const publicPos = await recruiter.post("/api/positions").send({ title: unique("Public Pos"), isPublic: true });
        createdPositionIds.push(publicPos.body.id);

        const restrictedPos = await recruiter.post("/api/positions").send({
            title: unique("Restricted Pos"),
            isPublic: false,
            accessRules: [{ attributeId: numberAttribute.id, operator: "GREATER_THAN", numberValue: 7 }],
        });
        createdPositionIds.push(restrictedPos.body.id);

        const beforeValue = await candidate.get("/api/positions");
        const visibleIds = beforeValue.body.map((p) => p.id);
        expect(visibleIds).toContain(publicPos.body.id);
        expect(visibleIds).not.toContain(restrictedPos.body.id);

        await prisma.candidateAttributeValue.create({
            data: { candidateId, attributeId: numberAttribute.id, numberValue: 8 },
        });

        const afterValue = await candidate.get("/api/positions");
        expect(afterValue.body.map((p) => p.id)).toContain(restrictedPos.body.id);
    });
});

describe("POST /api/positions", () => {
    it("forbids candidates from creating positions", async () => {
        const { agent } = await registerAndLogin([], "candidate-create");
        const res = await agent.post("/api/positions").send({ title: unique("Candidate Pos") });
        expect(res.status).toBe(403);
    });

    it("creates a position with attributes and access rules", async () => {
        const { agent } = await registerAndLogin(["RECRUITER"], "create");
        const res = await agent.post("/api/positions").send({
            title: unique("Backend Engineer"),
            company: "Acme",
            level: "SENIOR",
            attributeIds: [numberAttribute.id, booleanAttribute.id],
            projectTags: ["react", "node"],
            accessRules: [
                { attributeId: numberAttribute.id, operator: "GREATER_THAN", numberValue: 7 },
                { attributeId: booleanAttribute.id, operator: "IS_TRUE" },
            ],
        });

        expect(res.status).toBe(201);
        expect(res.body.attributes).toHaveLength(2);
        expect(res.body.accessRules).toHaveLength(2);
        expect(res.body.projectTagFilters).toHaveLength(2);
        createdPositionIds.push(res.body.id);
    });

    it("rejects an invalid operator for the attribute type", async () => {
        const { agent } = await registerAndLogin(["RECRUITER"], "invalid-op");
        const res = await agent.post("/api/positions").send({
            title: unique("Bad Rule Pos"),
            accessRules: [{ attributeId: booleanAttribute.id, operator: "GREATER_THAN", numberValue: 1 }],
        });
        expect(res.status).toBe(400);
    });

    it("deduplicates project tags by normalized name", async () => {
        const { agent } = await registerAndLogin(
            ["RECRUITER"],
            "duplicate-tags",
        );
        const tagName = unique("React");
        const res = await agent.post("/api/positions").send({
            title: unique("Position with tags"),
            projectTags: [
                tagName,
                tagName.toUpperCase(),
                `  ${tagName}  `,
            ],
        });
        expect(res.status).toBe(201);
        expect(res.body.projectTagFilters).toHaveLength(1);
        createdPositionIds.push(res.body.id);
    });
});

describe("POST /api/positions/:id/duplicate", () => {
    it("copies attributes, access rules and project tags", async () => {
        const { agent } = await registerAndLogin(["RECRUITER"], "duplicate");
        const source = await agent.post("/api/positions").send({
            title: unique("Source Pos"),
            attributeIds: [numberAttribute.id],
            projectTags: ["vue"],
            accessRules: [{ attributeId: numberAttribute.id, operator: "EQUALS", numberValue: 5 }],
        });
        createdPositionIds.push(source.body.id);

        const dup = await agent.post(`/api/positions/${source.body.id}/duplicate`);
        expect(dup.status).toBe(201);
        expect(dup.body.title).toBe(`${source.body.title} (copy)`);
        expect(dup.body.attributes).toHaveLength(1);
        expect(dup.body.accessRules).toHaveLength(1);
        expect(dup.body.projectTagFilters).toHaveLength(1);
        createdPositionIds.push(dup.body.id);
    });
});

describe("PATCH /api/positions/:id", () => {
    it("updates and increments version", async () => {
        const { agent } = await registerAndLogin(["RECRUITER"], "update");
        const created = await agent.post("/api/positions").send({ title: unique("Update Me") });
        createdPositionIds.push(created.body.id);

        const res = await agent.patch(`/api/positions/${created.body.id}`).send({
            company: "New Co",
            version: created.body.version,
        });

        expect(res.status).toBe(200);
        expect(res.body.company).toBe("New Co");
        expect(res.body.version).toBe(created.body.version + 1);
    });

    it("returns 409 on a stale version", async () => {
        const { agent } = await registerAndLogin(["RECRUITER"], "conflict");
        const created = await agent.post("/api/positions").send({ title: unique("Conflict Me") });
        createdPositionIds.push(created.body.id);

        const res = await agent.patch(`/api/positions/${created.body.id}`).send({ company: "X", version: 99 });
        expect(res.status).toBe(409);
    });
});

describe("DELETE /api/positions/:id", () => {
    it("deletes with a matching version", async () => {
        const { agent } = await registerAndLogin(["RECRUITER"], "delete");
        const created = await agent.post("/api/positions").send({ title: unique("Delete Me") });

        const res = await agent.delete(`/api/positions/${created.body.id}`).send({ version: created.body.version });
        expect(res.status).toBe(204);
    });
});

afterAll(async () => {
    await prisma.position.deleteMany({ where: { id: { in: createdPositionIds } } });
    await prisma.attribute.deleteMany({ where: { id: { in: createdAttributeIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});
