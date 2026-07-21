import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";

const unique = (label) => `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const createdEmails = [];
const createdTagNames = [];

const registerAndLogin = async (roles, label) => {
    const email = `test-projects-${unique(label)}@example.com`;
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

describe("POST /api/profile/:candidateId/projects", () => {
    it("creates a project and reuses an existing tag", async () => {
        const { agent, user } = await registerAndLogin([], "create");
        const sharedTag = `React-${unique("tag")}`;
        createdTagNames.push(sharedTag);

        const first = await agent.post(`/api/profile/${user.id}/projects`).send({
            title: "First project",
            description: "# Hello\n\nSome **markdown**.",
            startDate: "2024-01-01",
            endDate: "2024-06-01",
            tags: [sharedTag, "Node.js"],
        });
        createdTagNames.push("Node.js");

        expect(first.status).toBe(201);
        expect(first.body.tags.map((t) => t.tag.name).sort()).toEqual(["Node.js", sharedTag].sort());

        const second = await agent.post(`/api/profile/${user.id}/projects`).send({
            title: "Second project",
            tags: [sharedTag],
        });

        expect(second.status).toBe(201);
        expect(second.body.tags).toHaveLength(1);
        expect(second.body.tags[0].tag.id).toBe(first.body.tags.find((t) => t.tag.name === sharedTag).tag.id);
    });

    it("forbids a recruiter from creating a project for someone else", async () => {
        const { user } = await registerAndLogin([], "create-owner");
        const { agent: recruiterAgent } = await registerAndLogin(["RECRUITER"], "create-recruiter");

        const res = await recruiterAgent.post(`/api/profile/${user.id}/projects`).send({ title: "Nope" });
        expect(res.status).toBe(403);
    });
});

describe("PATCH /api/profile/:candidateId/projects/:projectId", () => {
    it("updates fields and tags, incrementing version", async () => {
        const { agent, user } = await registerAndLogin([], "update");
        const created = await agent.post(`/api/profile/${user.id}/projects`).send({
            title: "Original title",
            tags: ["Old-Tag"],
        });
        createdTagNames.push("Old-Tag", "New-Tag");

        const res = await agent
            .patch(`/api/profile/${user.id}/projects/${created.body.id}`)
            .send({ title: "Updated title", tags: ["New-Tag"], version: created.body.version });

        expect(res.status).toBe(200);
        expect(res.body.title).toBe("Updated title");
        expect(res.body.version).toBe(created.body.version + 1);
        expect(res.body.tags.map((t) => t.tag.name)).toEqual(["New-Tag"]);
    });

    it("returns 409 on a stale version", async () => {
        const { agent, user } = await registerAndLogin([], "update-conflict");
        const created = await agent.post(`/api/profile/${user.id}/projects`).send({ title: "Conflict me" });

        const res = await agent
            .patch(`/api/profile/${user.id}/projects/${created.body.id}`)
            .send({ title: "Updated", version: created.body.version + 99 });

        expect(res.status).toBe(409);
    });
});

describe("DELETE /api/profile/:candidateId/projects/:projectId", () => {
    it("deletes with a matching version", async () => {
        const { agent, user } = await registerAndLogin([], "delete");
        const created = await agent.post(`/api/profile/${user.id}/projects`).send({ title: "Delete me" });

        const res = await agent
            .delete(`/api/profile/${user.id}/projects/${created.body.id}`)
            .send({ version: created.body.version });

        expect(res.status).toBe(204);
    });

    it("returns 409 on a stale version", async () => {
        const { agent, user } = await registerAndLogin([], "delete-conflict");
        const created = await agent.post(`/api/profile/${user.id}/projects`).send({ title: "Delete me too" });

        const res = await agent
            .delete(`/api/profile/${user.id}/projects/${created.body.id}`)
            .send({ version: created.body.version + 99 });

        expect(res.status).toBe(409);
    });
});

afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    await prisma.tag.deleteMany({ where: { name: { in: createdTagNames } } });
});
