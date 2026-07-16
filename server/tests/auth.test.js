import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";

const uniqueEmail = (label) => `test-auth-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

const createdEmails = [];

const register = (overrides = {}) => {
    const email = overrides.email ?? uniqueEmail("register");
    createdEmails.push(email);
    return request(app)
        .post("/api/auth/register")
        .send({
            email,
            password: "correct-password",
            firstName: "Ada",
            lastName: "Lovelace",
            ...overrides,
            email,
        });
};

describe("POST /api/auth/register", () => {
    it("creates a user with CANDIDATE role and hashed password", async () => {
        const email = uniqueEmail("full");
        const res = await register({ email });

        expect(res.status).toBe(201);
        expect(res.body.email).toBe(email);
        expect(res.body.roles).toEqual(["CANDIDATE"]);

        const user = await prisma.user.findUnique({
            where: { email },
            include: { credential: true, roles: true },
        });

        expect(user).not.toBeNull();
        expect(user.roles.map((r) => r.role)).toEqual(["CANDIDATE"]);
        expect(user.credential.passwordHash).not.toBe("correct-password");
    });

    it("rejects missing fields with 400", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({ email: uniqueEmail("incomplete") });

        expect(res.status).toBe(400);
    });

    it("rejects a duplicate email with 409", async () => {
        const email = uniqueEmail("dup");
        await register({ email });

        const res = await register({ email });
        expect(res.status).toBe(409);
    });
});

describe("POST /api/auth/login and GET /api/auth/me", () => {
    it("logs in with correct credentials and sets a cookie", async () => {
        const email = uniqueEmail("login");
        await register({ email });

        const res = await request(app)
            .post("/api/auth/login")
            .send({ email, password: "correct-password" });

        expect(res.status).toBe(200);
        expect(res.headers["set-cookie"]?.[0]).toMatch(/^token=/);
    });

    it("rejects an incorrect password with 401", async () => {
        const email = uniqueEmail("wrongpass");
        await register({ email });

        const res = await request(app)
            .post("/api/auth/login")
            .send({ email, password: "wrong-password" });

        expect(res.status).toBe(401);
    });

    it("returns the current user for /me when authenticated", async () => {
        const email = uniqueEmail("me");
        await register({ email });

        const agent = request.agent(app);
        await agent.post("/api/auth/login").send({ email, password: "correct-password" });

        const res = await agent.get("/api/auth/me");
        expect(res.status).toBe(200);
        expect(res.body.email).toBe(email);
        expect(res.body.roles).toEqual(["CANDIDATE"]);
    });

    it("rejects /me without a cookie with 401", async () => {
        const res = await request(app).get("/api/auth/me");
        expect(res.status).toBe(401);
    });

    it("rejects login for a blocked user with 401", async () => {
        const email = uniqueEmail("blocked");
        await register({ email });
        await prisma.user.update({ where: { email }, data: { isBlocked: true } });

        const res = await request(app)
            .post("/api/auth/login")
            .send({ email, password: "correct-password" });

        expect(res.status).toBe(401);
    });
});

describe("POST /api/auth/logout", () => {
    it("clears the auth cookie", async () => {
        const res = await request(app).post("/api/auth/logout");
        expect(res.status).toBe(200);
        expect(res.headers["set-cookie"]?.[0]).toMatch(/^token=;/);
    });
});

afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});
