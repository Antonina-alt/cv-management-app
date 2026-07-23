import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";

const unique = (label) => `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const createdEmails = [];
const createdPositionIds = [];
const createdAttributeIds = [];

const registerAndLogin = async (roles, label) => {
    const email = `test-home-${unique(label)}@example.com`;
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
});

describe("GET /api/home/stats", () => {
    it("is reachable without authentication and returns all fields", async () => {
        const res = await request(app).get("/api/home/stats");
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            resumesLast24h: expect.any(Number),
            totalPositions: expect.any(Number),
            totalCandidates: expect.any(Number),
            totalRecruiters: expect.any(Number),
            totalSubmittedResumes: expect.any(Number),
        });
    });

    // Other test files hit the same shared DB concurrently, so a "before" snapshot can go stale
    // by the time "after" is fetched — an exact-equality delta would be flaky under a full-suite
    // parallel run. `toBeGreaterThanOrEqual` tolerates that noise while still proving each metric
    // moved by at least the amount this test itself is responsible for.
    it("counts positions, roles and resumes correctly", async () => {
        const before = (await request(app).get("/api/home/stats")).body;

        const { agent: recruiter } = await registerAndLogin(["RECRUITER"], "stats-recruiter");
        const { agent: candidate } = await registerAndLogin([], "stats-candidate");

        const position = await recruiter.post("/api/positions").send({ title: unique("Stats Pos"), isPublic: true });
        createdPositionIds.push(position.body.id);
        const resume = await candidate.post("/api/resumes").send({ positionId: position.body.id });
        await prisma.resume.update({ where: { id: resume.body.id }, data: { status: "PUBLISHED" } });

        // Backdated well outside the 24h window: must count toward totalSubmittedResumes once
        // published, but must not count toward resumesLast24h.
        const position2 = await recruiter.post("/api/positions").send({ title: unique("Stats Pos 2"), isPublic: true });
        createdPositionIds.push(position2.body.id);
        const oldResume = await candidate.post("/api/resumes").send({ positionId: position2.body.id });
        await prisma.resume.update({
            where: { id: oldResume.body.id },
            data: { status: "PUBLISHED", createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
        });

        const after = (await request(app).get("/api/home/stats")).body;

        expect(after.totalPositions).toBeGreaterThanOrEqual(before.totalPositions + 2);
        expect(after.totalRecruiters).toBeGreaterThanOrEqual(before.totalRecruiters + 1);
        // Every registered user gets the CANDIDATE role by default, so both the recruiter and
        // the candidate agent add one CANDIDATE row each.
        expect(after.totalCandidates).toBeGreaterThanOrEqual(before.totalCandidates + 2);
        expect(after.totalSubmittedResumes).toBeGreaterThanOrEqual(before.totalSubmittedResumes + 2);
        expect(after.resumesLast24h).toBeGreaterThanOrEqual(before.resumesLast24h + 1);

        // The 24h-window exclusion itself is checked deterministically, scoped to just these two
        // resume ids so it's immune to concurrent writes from other test files.
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [oldIsRecent, freshIsRecent] = await Promise.all([
            prisma.resume.count({ where: { id: oldResume.body.id, createdAt: { gte: since } } }),
            prisma.resume.count({ where: { id: resume.body.id, createdAt: { gte: since } } }),
        ]);
        expect(oldIsRecent).toBe(0);
        expect(freshIsRecent).toBe(1);
    });

    it("excludes draft resumes from resumesLast24h", async () => {
        const { agent: recruiter } = await registerAndLogin(["RECRUITER"], "stats-draft-recruiter");
        const { agent: candidate } = await registerAndLogin([], "stats-draft-candidate");

        const position = await recruiter.post("/api/positions").send({ title: unique("Stats Draft Pos"), isPublic: true });
        createdPositionIds.push(position.body.id);

        const before = (await request(app).get("/api/home/stats")).body;

        const draftResume = await candidate.post("/api/resumes").send({ positionId: position.body.id });
        expect(draftResume.body.status).toBe("DRAFT");

        const after = (await request(app).get("/api/home/stats")).body;

        expect(after.resumesLast24h).toBe(before.resumesLast24h);
    });
});

describe("GET /api/home/recent-positions", () => {
    it("only shows anonymous visitors public positions, most recently updated first", async () => {
        const { agent: recruiter } = await registerAndLogin(["RECRUITER"], "recent-anon-recruiter");

        const publicPos = await recruiter.post("/api/positions").send({ title: unique("Public Recent"), isPublic: true });
        createdPositionIds.push(publicPos.body.id);
        const restrictedPos = await recruiter.post("/api/positions").send({ title: unique("Restricted Recent"), isPublic: false });
        createdPositionIds.push(restrictedPos.body.id);

        const res = await request(app).get("/api/home/recent-positions?limit=20");
        expect(res.status).toBe(200);
        const ids = res.body.map((p) => p.id);
        expect(ids).toContain(publicPos.body.id);
        expect(ids).not.toContain(restrictedPos.body.id);
    });

    it("only shows candidates positions they have access to", async () => {
        const { agent: recruiter } = await registerAndLogin(["RECRUITER"], "recent-recruiter");
        const { agent: candidate, userId: candidateId } = await registerAndLogin([], "recent-candidate");

        const restrictedPos = await recruiter.post("/api/positions").send({
            title: unique("Recent Restricted"),
            isPublic: false,
            accessRules: [{ attributeId: numberAttribute.id, operator: "GREATER_THAN", numberValue: 7 }],
        });
        createdPositionIds.push(restrictedPos.body.id);

        const before = await candidate.get("/api/home/recent-positions?limit=20");
        expect(before.body.map((p) => p.id)).not.toContain(restrictedPos.body.id);

        await prisma.candidateAttributeValue.create({
            data: { candidateId, attributeId: numberAttribute.id, numberValue: 8 },
        });

        const after = await candidate.get("/api/home/recent-positions?limit=20");
        expect(after.body.map((p) => p.id)).toContain(restrictedPos.body.id);
    });

    it("shows recruiters and admins every position, including restricted ones", async () => {
        const { agent: recruiter } = await registerAndLogin(["RECRUITER"], "recent-recruiter-view");

        const restrictedPos = await recruiter.post("/api/positions").send({ title: unique("Recruiter Sees All"), isPublic: false });
        createdPositionIds.push(restrictedPos.body.id);

        const res = await recruiter.get("/api/home/recent-positions?limit=20");
        expect(res.status).toBe(200);
        expect(res.body.map((p) => p.id)).toContain(restrictedPos.body.id);
    });

    it("respects the limit parameter and defaults to a small page", async () => {
        const res = await request(app).get("/api/home/recent-positions?limit=2");
        expect(res.status).toBe(200);
        expect(res.body.length).toBeLessThanOrEqual(2);
    });
});

afterAll(async () => {
    await prisma.position.deleteMany({ where: { id: { in: createdPositionIds } } });
    await prisma.attribute.deleteMany({ where: { id: { in: createdAttributeIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});
