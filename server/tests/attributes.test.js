import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";

const unique = (label) => `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const createdEmails = [];
const createdAttributeIds = [];

const registerAndLogin = async (roles, label) => {
    const email = `test-attr-${unique(label)}@example.com`;
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

    // re-login so the JWT/session reflects any role changes made after registration
    await agent.post("/api/auth/login").send({ email, password: "correct-password" });

    return agent;
};

let category;

beforeAll(async () => {
    category = await prisma.attributeCategory.findFirst({ where: { normalizedName: "personal info" } });
    if (!category) {
        category = await prisma.attributeCategory.create({
            data: { name: "Personal info", normalizedName: "personal info", sortOrder: 0 },
        });
    }
});

describe("GET /api/attributes", () => {
    it("rejects unauthenticated requests", async () => {
        const res = await request(app).get("/api/attributes");
        expect(res.status).toBe(401);
    });

    it("supports prefix search and category filter", async () => {
        const agent = await registerAndLogin(["RECRUITER"], "search");
        const name = `Zzz-Searchable-${unique("attr")}`;

        const created = await agent.post("/api/attributes").send({
            name,
            categoryId: category.id,
            type: "STRING",
        });
        createdAttributeIds.push(created.body.id);

        const prefix = name.slice(0, 6);
        const res = await agent.get(`/api/attributes?q=${encodeURIComponent(prefix)}`);
        expect(res.status).toBe(200);
        expect(res.body.some((a) => a.id === created.body.id)).toBe(true);

        const byCategory = await agent.get(`/api/attributes?categoryId=${category.id}`);
        expect(byCategory.status).toBe(200);
        expect(byCategory.body.every((a) => a.categoryId === category.id)).toBe(true);
    });
});

describe("POST /api/attributes", () => {
    it("forbids candidates from creating attributes", async () => {
        const agent = await registerAndLogin([], "candidate-create");
        const res = await agent.post("/api/attributes").send({
            name: unique("Candidate Attr"),
            categoryId: category.id,
            type: "STRING",
        });
        expect(res.status).toBe(403);
    });

    it("creates each attribute type", async () => {
        const agent = await registerAndLogin(["RECRUITER"], "create-types");
        const types = ["STRING", "TEXT", "IMAGE", "NUMBER", "DATE", "DATE_RANGE", "BOOLEAN"];

        for (const type of types) {
            const res = await agent.post("/api/attributes").send({
                name: `${type}-${unique("attr")}`,
                categoryId: category.id,
                type,
            });
            expect(res.status).toBe(201);
            expect(res.body.type).toBe(type);
            createdAttributeIds.push(res.body.id);
        }
    });

    it("creates a SELECT attribute with options", async () => {
        const agent = await registerAndLogin(["RECRUITER"], "create-select");
        const res = await agent.post("/api/attributes").send({
            name: `Select-${unique("attr")}`,
            categoryId: category.id,
            type: "SELECT",
            options: ["Junior", "Middle", "Senior"],
        });

        expect(res.status).toBe(201);
        expect(res.body.options).toHaveLength(3);
        createdAttributeIds.push(res.body.id);
    });

    it("rejects a SELECT attribute without options", async () => {
        const agent = await registerAndLogin(["RECRUITER"], "create-select-invalid");
        const res = await agent.post("/api/attributes").send({
            name: unique("Select Invalid"),
            categoryId: category.id,
            type: "SELECT",
        });
        expect(res.status).toBe(400);
    });

    it("rejects a duplicate name with 400", async () => {
        const agent = await registerAndLogin(["RECRUITER"], "dup");
        const name = `Duplicate-${unique("attr")}`;

        const first = await agent.post("/api/attributes").send({ name, categoryId: category.id, type: "STRING" });
        createdAttributeIds.push(first.body.id);

        const second = await agent
            .post("/api/attributes")
            .send({ name: name.toUpperCase(), categoryId: category.id, type: "STRING" });
        expect(second.status).toBe(400);
    });
});

describe("PATCH /api/attributes/:id", () => {
    it("updates and increments version", async () => {
        const agent = await registerAndLogin(["RECRUITER"], "update");
        const created = await agent
            .post("/api/attributes")
            .send({ name: unique("Update Me"), categoryId: category.id, type: "STRING" });
        createdAttributeIds.push(created.body.id);

        const res = await agent
            .patch(`/api/attributes/${created.body.id}`)
            .send({ description: "updated", version: created.body.version });

        expect(res.status).toBe(200);
        expect(res.body.description).toBe("updated");
        expect(res.body.version).toBe(created.body.version + 1);
    });

    it("returns 409 on a stale version", async () => {
        const agent = await registerAndLogin(["RECRUITER"], "conflict");
        const created = await agent
            .post("/api/attributes")
            .send({ name: unique("Conflict Me"), categoryId: category.id, type: "STRING" });
        createdAttributeIds.push(created.body.id);

        const res = await agent
            .patch(`/api/attributes/${created.body.id}`)
            .send({ description: "updated", version: 99 });

        expect(res.status).toBe(409);
    });
});

describe("DELETE /api/attributes/:id", () => {
    it("deletes with a matching version", async () => {
        const agent = await registerAndLogin(["RECRUITER"], "delete");
        const created = await agent
            .post("/api/attributes")
            .send({ name: unique("Delete Me"), categoryId: category.id, type: "STRING" });

        const res = await agent
            .delete(`/api/attributes/${created.body.id}`)
            .send({ version: created.body.version });

        expect(res.status).toBe(204);
    });

    it("rejects deleting a system attribute with 403", async () => {
        const agent = await registerAndLogin(["RECRUITER"], "delete-system");
        const systemAttribute = await prisma.attribute.findFirst({ where: { systemKey: "FIRST_NAME" } });

        const res = await agent
            .delete(`/api/attributes/${systemAttribute.id}`)
            .send({ version: systemAttribute.version });

        expect(res.status).toBe(403);
    });
});

afterAll(async () => {
    await prisma.attribute.deleteMany({ where: { id: { in: createdAttributeIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});
