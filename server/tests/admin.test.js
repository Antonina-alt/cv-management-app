import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";

const unique = (label) => `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const createdEmails = [];
const createdPositionIds = [];

const registerAndLogin = async (roles, label) => {
    const email = `test-admin-${unique(label)}@example.com`;
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

    const user = await prisma.user.findUnique({ where: { email }, include: { roles: true } });
    return { agent, user: { ...registered.body, ...user, roles: user.roles.map((r) => r.role) } };
};

describe("GET /api/admin/users", () => {
    it("forbids non-admins", async () => {
        const { agent } = await registerAndLogin([], "list-forbidden");
        const res = await agent.get("/api/admin/users");
        expect(res.status).toBe(403);
    });

    it("rejects unauthenticated requests", async () => {
        const res = await request(app).get("/api/admin/users");
        expect(res.status).toBe(401);
    });

    it("lists users and supports a name/email filter", async () => {
        const { agent } = await registerAndLogin(["ADMIN"], "list-admin");
        const { user: target } = await registerAndLogin([], "list-target");

        const res = await agent.get(`/api/admin/users?q=${encodeURIComponent(target.email)}`);
        expect(res.status).toBe(200);
        expect(res.body.map((u) => u.id)).toContain(target.id);
    });
});

describe("PATCH /api/admin/users/:id", () => {
    it("blocks and unblocks a user, incrementing version", async () => {
        const { agent } = await registerAndLogin(["ADMIN"], "block-admin");
        const { user: target } = await registerAndLogin([], "block-target");

        const blocked = await agent
            .patch(`/api/admin/users/${target.id}`)
            .send({ isBlocked: true, version: target.version });
        expect(blocked.status).toBe(200);
        expect(blocked.body.isBlocked).toBe(true);
        expect(blocked.body.version).toBe(target.version + 1);

        const unblocked = await agent
            .patch(`/api/admin/users/${target.id}`)
            .send({ isBlocked: false, version: blocked.body.version });
        expect(unblocked.status).toBe(200);
        expect(unblocked.body.isBlocked).toBe(false);
    });

    it("returns 409 on a stale version", async () => {
        const { agent } = await registerAndLogin(["ADMIN"], "block-conflict-admin");
        const { user: target } = await registerAndLogin([], "block-conflict-target");

        const res = await agent
            .patch(`/api/admin/users/${target.id}`)
            .send({ isBlocked: true, version: target.version + 99 });
        expect(res.status).toBe(409);
    });

    it("forbids blocking your own account", async () => {
        const { agent, user } = await registerAndLogin(["ADMIN"], "block-self");

        const res = await agent
            .patch(`/api/admin/users/${user.id}`)
            .send({ isBlocked: true, version: user.version });
        expect(res.status).toBe(400);
    });

    it("forbids non-admins", async () => {
        const { agent } = await registerAndLogin([], "block-nonadmin");
        const { user: target } = await registerAndLogin([], "block-nonadmin-target");

        const res = await agent
            .patch(`/api/admin/users/${target.id}`)
            .send({ isBlocked: true, version: target.version });
        expect(res.status).toBe(403);
    });
});

describe("DELETE /api/admin/users/:id", () => {
    it("deletes a user and cascades their data", async () => {
        const { agent } = await registerAndLogin(["ADMIN"], "delete-admin");
        const { agent: targetAgent, user: target } = await registerAndLogin([], "delete-target");

        const project = await targetAgent.post(`/api/profile/${target.id}/projects`).send({ title: unique("Proj") });
        expect(project.status).toBe(201);

        const res = await agent.delete(`/api/admin/users/${target.id}`).send({ version: target.version });
        expect(res.status).toBe(204);

        const remainingUser = await prisma.user.findUnique({ where: { id: target.id } });
        expect(remainingUser).toBeNull();
        const remainingProject = await prisma.project.findUnique({ where: { id: project.body.id } });
        expect(remainingProject).toBeNull();
    });

    it("forbids deleting your own account", async () => {
        const { agent, user } = await registerAndLogin(["ADMIN"], "delete-self");

        const res = await agent.delete(`/api/admin/users/${user.id}`).send({ version: user.version });
        expect(res.status).toBe(400);
    });

    it("returns 409 on a stale version", async () => {
        const { agent } = await registerAndLogin(["ADMIN"], "delete-conflict-admin");
        const { user: target } = await registerAndLogin([], "delete-conflict-target");

        const res = await agent.delete(`/api/admin/users/${target.id}`).send({ version: target.version + 99 });
        expect(res.status).toBe(409);
    });
});

describe("POST/DELETE /api/admin/users/:id/roles/:role", () => {
    it("assigns and removes a role", async () => {
        const { agent } = await registerAndLogin(["ADMIN"], "roles-admin");
        const { user: target } = await registerAndLogin([], "roles-target");

        const assigned = await agent.post(`/api/admin/users/${target.id}/roles`).send({ role: "RECRUITER" });
        expect(assigned.status).toBe(200);
        expect(assigned.body.roles).toContain("RECRUITER");

        const removed = await agent.delete(`/api/admin/users/${target.id}/roles/RECRUITER`);
        expect(removed.status).toBe(200);
        expect(removed.body.roles).not.toContain("RECRUITER");
    });

    it("rejects assigning a duplicate role", async () => {
        const { agent } = await registerAndLogin(["ADMIN"], "roles-dup-admin");
        const { user: target } = await registerAndLogin(["RECRUITER"], "roles-dup-target");

        const res = await agent.post(`/api/admin/users/${target.id}/roles`).send({ role: "RECRUITER" });
        expect(res.status).toBe(400);
    });

    it("rejects an unknown role", async () => {
        const { agent } = await registerAndLogin(["ADMIN"], "roles-unknown-admin");
        const { user: target } = await registerAndLogin([], "roles-unknown-target");

        const res = await agent.post(`/api/admin/users/${target.id}/roles`).send({ role: "SUPERUSER" });
        expect(res.status).toBe(400);
    });

    it("returns 404 removing a role the user doesn't have", async () => {
        const { agent } = await registerAndLogin(["ADMIN"], "roles-404-admin");
        const { user: target } = await registerAndLogin([], "roles-404-target");

        const res = await agent.delete(`/api/admin/users/${target.id}/roles/RECRUITER`);
        expect(res.status).toBe(404);
    });

    it("allows an admin to remove their own ADMIN role", async () => {
        const { agent, user } = await registerAndLogin(["ADMIN"], "roles-self-remove");

        const res = await agent.delete(`/api/admin/users/${user.id}/roles/ADMIN`);
        expect(res.status).toBe(200);
        expect(res.body.roles).not.toContain("ADMIN");

        const followUp = await agent.get("/api/admin/users");
        expect(followUp.status).toBe(403);
    });
});

describe("admin acts as owner of profile, resume and position", () => {
    it("edits another candidate's about section and photo", async () => {
        const { agent } = await registerAndLogin(["ADMIN"], "owner-profile-admin");
        const { user: target } = await registerAndLogin([], "owner-profile-target");

        const about = await agent
            .patch(`/api/profile/${target.id}/about`)
            .send({ location: "Edited by admin", version: target.version });
        expect(about.status).toBe(200);
        expect(about.body.location).toBe("Edited by admin");

        const photo = await agent
            .patch(`/api/profile/${target.id}/image`)
            .send({ imageUrl: "https://example.com/admin-edit.png", version: about.body.version });
        expect(photo.status).toBe(200);
        expect(photo.body.imageUrl).toBe("https://example.com/admin-edit.png");
    });

    it("publishes another candidate's resume", async () => {
        const { agent: recruiterAgent } = await registerAndLogin(["RECRUITER"], "owner-resume-recruiter");
        const { agent: candidateAgent } = await registerAndLogin([], "owner-resume-candidate");
        const { agent: adminAgent } = await registerAndLogin(["ADMIN"], "owner-resume-admin");

        const position = await recruiterAgent.post("/api/positions").send({ title: unique("Admin Owns Pos"), isPublic: true });
        expect(position.status).toBe(201);
        createdPositionIds.push(position.body.id);

        const resume = await candidateAgent.post("/api/resumes").send({ positionId: position.body.id });
        expect(resume.status).toBe(201);

        const published = await adminAgent
            .patch(`/api/resumes/${resume.body.id}/publish`)
            .send({ version: resume.body.version });
        expect(published.status).toBe(200);
        expect(published.body.status).toBe("PUBLISHED");
    });

    it("edits a position it did not create", async () => {
        const { agent: recruiterAgent } = await registerAndLogin(["RECRUITER"], "owner-position-recruiter");
        const { agent: adminAgent } = await registerAndLogin(["ADMIN"], "owner-position-admin");

        const position = await recruiterAgent.post("/api/positions").send({ title: unique("Recruiter Owned") });
        expect(position.status).toBe(201);
        createdPositionIds.push(position.body.id);

        const res = await adminAgent
            .patch(`/api/positions/${position.body.id}`)
            .send({ company: "Admin Edited Co", version: position.body.version });
        expect(res.status).toBe(200);
        expect(res.body.company).toBe("Admin Edited Co");
    });
});

afterAll(async () => {
    await prisma.position.deleteMany({ where: { id: { in: createdPositionIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});
