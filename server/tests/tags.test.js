import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";
import { normalizeName } from "../lib/normalize.js";

const unique = (label) => `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const createdEmails = [];
const createdTagIds = [];

const registerAndLogin = async (label) => {
    const email = `test-tags-${unique(label)}@example.com`;
    createdEmails.push(email);

    const agent = request.agent(app);
    await agent.post("/api/auth/register").send({
        email,
        password: "correct-password",
        firstName: "Test",
        lastName: "User",
    });

    return agent;
};

describe("GET /api/tags", () => {
    it("rejects unauthenticated requests", async () => {
        const res = await request(app).get("/api/tags");
        expect(res.status).toBe(401);
    });

    it("supports prefix search over existing tags", async () => {
        const agent = await registerAndLogin("search");
        const name = `Zzz-Kubernetes-${unique("tag")}`;
        const tag = await prisma.tag.create({ data: { name, normalizedName: normalizeName(name) } });
        createdTagIds.push(tag.id);

        const prefix = name.slice(0, 6);
        const res = await agent.get(`/api/tags?q=${encodeURIComponent(prefix)}`);
        expect(res.status).toBe(200);
        expect(res.body.some((t) => t.id === tag.id)).toBe(true);
    });
});

afterAll(async () => {
    await prisma.tag.deleteMany({ where: { id: { in: createdTagIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});
