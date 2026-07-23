import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";

const unique = (label) => `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const createdEmails = [];

const registerAndLogin = async (roles, label) => {
    const email = `test-profile-${unique(label)}@example.com`;
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

describe("PATCH /api/profile/:candidateId/image", () => {
    it("rejects unauthenticated requests", async () => {
        const { user } = await registerAndLogin([], "unauth");
        const res = await request(app)
            .patch(`/api/profile/${user.id}/image`)
            .send({ imageUrl: "https://example.com/a.png", version: 1 });
        expect(res.status).toBe(401);
    });

    it("requires imageUrl and version", async () => {
        const { agent, user } = await registerAndLogin([], "missing-fields");
        const res = await agent.patch(`/api/profile/${user.id}/image`).send({});
        expect(res.status).toBe(400);
    });

    it("sets the image url and increments version", async () => {
        const { agent, user } = await registerAndLogin([], "set");
        const res = await agent
            .patch(`/api/profile/${user.id}/image`)
            .send({ imageUrl: "https://example.com/a.png", version: user.version });

        expect(res.status).toBe(200);
        expect(res.body.imageUrl).toBe("https://example.com/a.png");
        expect(res.body.version).toBe(user.version + 1);
    });

    it("returns 409 on a stale version", async () => {
        const { agent, user } = await registerAndLogin([], "conflict");
        const res = await agent
            .patch(`/api/profile/${user.id}/image`)
            .send({ imageUrl: "https://example.com/a.png", version: user.version + 99 });

        expect(res.status).toBe(409);
    });

    it("allows an admin to set another candidate's photo", async () => {
        const { user: target } = await registerAndLogin([], "admin-target");
        const { agent: adminAgent } = await registerAndLogin(["ADMIN"], "admin-actor");

        const res = await adminAgent
            .patch(`/api/profile/${target.id}/image`)
            .send({ imageUrl: "https://example.com/admin.png", version: target.version });

        expect(res.status).toBe(200);
        expect(res.body.imageUrl).toBe("https://example.com/admin.png");
    });

    it("forbids a recruiter from setting another candidate's photo", async () => {
        const { user: target } = await registerAndLogin([], "recruiter-target");
        const { agent: recruiterAgent } = await registerAndLogin(["RECRUITER"], "recruiter-actor");

        const res = await recruiterAgent
            .patch(`/api/profile/${target.id}/image`)
            .send({ imageUrl: "https://example.com/nope.png", version: target.version });

        expect(res.status).toBe(403);
    });
});

describe("DELETE /api/profile/:candidateId/image", () => {
    it("rejects unauthenticated requests", async () => {
        const { user } = await registerAndLogin([], "delete-unauth");
        const res = await request(app).delete(`/api/profile/${user.id}/image`).send({ version: 1 });
        expect(res.status).toBe(401);
    });

    it("clears the image url and increments version", async () => {
        const { agent, user } = await registerAndLogin([], "clear");
        const withImage = await agent
            .patch(`/api/profile/${user.id}/image`)
            .send({ imageUrl: "https://example.com/a.png", version: user.version });

        const res = await agent.delete(`/api/profile/${user.id}/image`).send({ version: withImage.body.version });

        expect(res.status).toBe(200);
        expect(res.body.imageUrl).toBeNull();
        expect(res.body.version).toBe(withImage.body.version + 1);
    });

    it("returns 409 on a stale version", async () => {
        const { agent, user } = await registerAndLogin([], "delete-conflict");
        const res = await agent.delete(`/api/profile/${user.id}/image`).send({ version: user.version + 99 });
        expect(res.status).toBe(409);
    });
});

afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});
