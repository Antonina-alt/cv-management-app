import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";
import { normalizeName } from "../lib/normalize.js";

const unique = (label) => `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const createdEmails = [];
const createdAttributeIds = [];

const registerAndLogin = async (roles, label) => {
    const email = `test-profile-cand-${unique(label)}@example.com`;
    createdEmails.push(email);

    const agent = request.agent(app);
    const registered = await agent.post("/api/auth/register").send({
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

    return { agent, user: registered.body };
};

let category;
let stringAttribute;
let selectAttribute;

beforeAll(async () => {
    category = await prisma.attributeCategory.findFirst({ where: { normalizedName: "personal info" } });
    if (!category) {
        category = await prisma.attributeCategory.create({
            data: { name: "Personal info", normalizedName: "personal info", sortOrder: 0 },
        });
    }

    const stringName = `English level ${unique("attr")}`;
    stringAttribute = await prisma.attribute.create({
        data: { name: stringName, normalizedName: normalizeName(stringName), type: "STRING", categoryId: category.id },
    });
    createdAttributeIds.push(stringAttribute.id);

    const selectName = `Seniority ${unique("attr")}`;
    selectAttribute = await prisma.attribute.create({
        data: {
            name: selectName,
            normalizedName: normalizeName(selectName),
            type: "SELECT",
            categoryId: category.id,
            options: { create: [{ label: "Junior", sortOrder: 0 }, { label: "Senior", sortOrder: 1 }] },
        },
        include: { options: true },
    });
    createdAttributeIds.push(selectAttribute.id);
});

describe("GET /api/profile/:candidateId", () => {
    it("rejects unauthenticated requests", async () => {
        const { user } = await registerAndLogin([], "unauth");
        const res = await request(app).get(`/api/profile/${user.id}`);
        expect(res.status).toBe(401);
    });

    it("allows the owner", async () => {
        const { agent, user } = await registerAndLogin([], "owner");
        const res = await agent.get(`/api/profile/${user.id}`);
        expect(res.status).toBe(200);
        expect(res.body.user.id).toBe(user.id);
        expect(res.body.attributeValues).toEqual([]);
        expect(res.body.projects).toEqual([]);
    });

    it("allows an admin viewing someone else's profile", async () => {
        const { user } = await registerAndLogin([], "target");
        const { agent: adminAgent } = await registerAndLogin(["ADMIN"], "admin");

        const res = await adminAgent.get(`/api/profile/${user.id}`);
        expect(res.status).toBe(200);
        expect(res.body.user.id).toBe(user.id);
    });

    it("forbids a recruiter viewing another candidate's profile", async () => {
        const { user } = await registerAndLogin([], "target2");
        const { agent: recruiterAgent } = await registerAndLogin(["RECRUITER"], "recruiter");

        const res = await recruiterAgent.get(`/api/profile/${user.id}`);
        expect(res.status).toBe(403);
    });
});

describe("PATCH /api/profile/:candidateId/about", () => {
    it("updates fields and increments version", async () => {
        const { agent, user } = await registerAndLogin([], "about");
        const res = await agent
            .patch(`/api/profile/${user.id}/about`)
            .send({ location: "Remote", version: user.version });

        expect(res.status).toBe(200);
        expect(res.body.location).toBe("Remote");
        expect(res.body.version).toBe(user.version + 1);
    });

    it("returns 409 on a stale version", async () => {
        const { agent, user } = await registerAndLogin([], "about-conflict");
        const res = await agent
            .patch(`/api/profile/${user.id}/about`)
            .send({ location: "Remote", version: user.version + 99 });

        expect(res.status).toBe(409);
    });

    it("forbids another candidate from editing", async () => {
        const { user } = await registerAndLogin([], "about-owner");
        const { agent: otherAgent } = await registerAndLogin([], "about-other");

        const res = await otherAgent
            .patch(`/api/profile/${user.id}/about`)
            .send({ location: "Nowhere", version: user.version });

        expect(res.status).toBe(403);
    });
});

describe("POST /api/profile/:candidateId/attribute-values", () => {
    it("creates a STRING value", async () => {
        const { agent, user } = await registerAndLogin([], "create-string");
        const res = await agent
            .post(`/api/profile/${user.id}/attribute-values`)
            .send({ attributeId: stringAttribute.id, stringValue: "Upper-Intermediate" });

        expect(res.status).toBe(201);
        expect(res.body.stringValue).toBe("Upper-Intermediate");
        expect(res.body.attribute.id).toBe(stringAttribute.id);
    });

    it("creates a SELECT value referencing a valid option", async () => {
        const { agent, user } = await registerAndLogin([], "create-select");
        const res = await agent
            .post(`/api/profile/${user.id}/attribute-values`)
            .send({ attributeId: selectAttribute.id, selectedOptionId: selectAttribute.options[0].id });

        expect(res.status).toBe(201);
        expect(res.body.selectedOptionId).toBe(selectAttribute.options[0].id);
    });

    it("rejects a SELECT value with an unknown option", async () => {
        const { agent, user } = await registerAndLogin([], "create-select-bad");
        const res = await agent
            .post(`/api/profile/${user.id}/attribute-values`)
            .send({ attributeId: selectAttribute.id, selectedOptionId: "00000000-0000-0000-0000-000000000000" });

        expect(res.status).toBe(400);
    });

    it("rejects a duplicate value for the same attribute", async () => {
        const { agent, user } = await registerAndLogin([], "create-dup");
        const first = await agent
            .post(`/api/profile/${user.id}/attribute-values`)
            .send({ attributeId: stringAttribute.id, stringValue: "Fluent" });
        expect(first.status).toBe(201);

        const second = await agent
            .post(`/api/profile/${user.id}/attribute-values`)
            .send({ attributeId: stringAttribute.id, stringValue: "Native" });
        expect(second.status).toBe(400);
    });

    it("rejects adding a system attribute", async () => {
        const { agent, user } = await registerAndLogin([], "create-system");
        const systemAttribute = await prisma.attribute.findFirst({ where: { systemKey: "FIRST_NAME" } });

        const res = await agent
            .post(`/api/profile/${user.id}/attribute-values`)
            .send({ attributeId: systemAttribute.id, stringValue: "Ignored" });

        expect(res.status).toBe(400);
    });

    it("forbids a recruiter from adding a value to someone else's profile", async () => {
        const { user } = await registerAndLogin([], "create-owner");
        const { agent: recruiterAgent } = await registerAndLogin(["RECRUITER"], "create-recruiter");

        const res = await recruiterAgent
            .post(`/api/profile/${user.id}/attribute-values`)
            .send({ attributeId: stringAttribute.id, stringValue: "Nope" });

        expect(res.status).toBe(403);
    });
});

describe("PATCH/DELETE /api/profile/:candidateId/attribute-values/:valueId", () => {
    it("updates the value and increments version", async () => {
        const { agent, user } = await registerAndLogin([], "update");
        const created = await agent
            .post(`/api/profile/${user.id}/attribute-values`)
            .send({ attributeId: stringAttribute.id, stringValue: "Beginner" });

        const res = await agent
            .patch(`/api/profile/${user.id}/attribute-values/${created.body.id}`)
            .send({ stringValue: "Advanced", version: created.body.version });

        expect(res.status).toBe(200);
        expect(res.body.stringValue).toBe("Advanced");
        expect(res.body.version).toBe(created.body.version + 1);
    });

    it("returns 409 on a stale version", async () => {
        const { agent, user } = await registerAndLogin([], "update-conflict");
        const created = await agent
            .post(`/api/profile/${user.id}/attribute-values`)
            .send({ attributeId: stringAttribute.id, stringValue: "Beginner" });

        const res = await agent
            .patch(`/api/profile/${user.id}/attribute-values/${created.body.id}`)
            .send({ stringValue: "Advanced", version: created.body.version + 99 });

        expect(res.status).toBe(409);
    });

    it("deletes the value with a matching version", async () => {
        const { agent, user } = await registerAndLogin([], "delete");
        const created = await agent
            .post(`/api/profile/${user.id}/attribute-values`)
            .send({ attributeId: stringAttribute.id, stringValue: "Beginner" });

        const res = await agent
            .delete(`/api/profile/${user.id}/attribute-values/${created.body.id}`)
            .send({ version: created.body.version });

        expect(res.status).toBe(204);
    });

    it("returns 409 deleting with a stale version", async () => {
        const { agent, user } = await registerAndLogin([], "delete-conflict");
        const created = await agent
            .post(`/api/profile/${user.id}/attribute-values`)
            .send({ attributeId: stringAttribute.id, stringValue: "Beginner" });

        const res = await agent
            .delete(`/api/profile/${user.id}/attribute-values/${created.body.id}`)
            .send({ version: created.body.version + 99 });

        expect(res.status).toBe(409);
    });
});

afterAll(async () => {
    await prisma.attribute.deleteMany({ where: { id: { in: createdAttributeIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});
