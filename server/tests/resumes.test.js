import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";

const unique = (label) => `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const createdEmails = [];
const createdPositionIds = [];
const createdAttributeIds = [];

const registerAndLogin = async (roles, label) => {
    const email = `test-resume-${unique(label)}@example.com`;
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
let stringAttribute;
let numberAttribute;

beforeAll(async () => {
    category = await prisma.attributeCategory.findFirst({ where: { normalizedName: "personal info" } });
    if (!category) {
        category = await prisma.attributeCategory.create({
            data: { name: "Personal info", normalizedName: "personal info", sortOrder: 0 },
        });
    }

    stringAttribute = await prisma.attribute.create({
        data: { name: `English Level-${unique("attr")}`, normalizedName: unique("english").toLowerCase(), type: "STRING", categoryId: category.id },
    });
    createdAttributeIds.push(stringAttribute.id);

    numberAttribute = await prisma.attribute.create({
        data: { name: `IELTS-${unique("attr")}`, normalizedName: unique("ielts").toLowerCase(), type: "NUMBER", categoryId: category.id },
    });
    createdAttributeIds.push(numberAttribute.id);
});

describe("POST /api/resumes", () => {
    it("creates a resume for an accessible position and backfills missing attributes as empty", async () => {
        const { agent: recruiter } = await registerAndLogin(["RECRUITER"], "create-recruiter");
        const { agent: candidate, userId: candidateId } = await registerAndLogin([], "create-candidate");

        const position = await recruiter.post("/api/positions").send({
            title: unique("Junior Data Engineer"),
            isPublic: true,
            attributeIds: [stringAttribute.id, numberAttribute.id],
        });
        createdPositionIds.push(position.body.id);

        const res = await candidate.post("/api/resumes").send({ positionId: position.body.id });

        expect(res.status).toBe(201);
        expect(res.body.status).toBe("DRAFT");
        expect(res.body.attributes).toHaveLength(2);
        expect(res.body.attributes.every((a) => a.isEmpty)).toBe(true);
        expect(res.body.isComplete).toBe(false);

        const values = await prisma.candidateAttributeValue.findMany({ where: { candidateId } });
        expect(values.map((v) => v.attributeId).sort()).toEqual([stringAttribute.id, numberAttribute.id].sort());
    });

    it("forbids creating a resume for an inaccessible (restricted) position", async () => {
        const { agent: recruiter } = await registerAndLogin(["RECRUITER"], "restricted-recruiter");
        const { agent: candidate } = await registerAndLogin([], "restricted-candidate");

        const position = await recruiter.post("/api/positions").send({
            title: unique("Restricted Pos"),
            isPublic: false,
            accessRules: [{ attributeId: numberAttribute.id, operator: "GREATER_THAN", numberValue: 7 }],
        });
        createdPositionIds.push(position.body.id);

        const res = await candidate.post("/api/resumes").send({ positionId: position.body.id });
        expect(res.status).toBe(403);
    });

    it("rejects a duplicate resume for the same position", async () => {
        const { agent: recruiter } = await registerAndLogin(["RECRUITER"], "dup-recruiter");
        const { agent: candidate } = await registerAndLogin([], "dup-candidate");

        const position = await recruiter.post("/api/positions").send({ title: unique("Dup Pos"), isPublic: true });
        createdPositionIds.push(position.body.id);

        const first = await candidate.post("/api/resumes").send({ positionId: position.body.id });
        expect(first.status).toBe(201);

        const second = await candidate.post("/api/resumes").send({ positionId: position.body.id });
        expect(second.status).toBe(409);
    });
});

describe("GET /api/resumes/:id", () => {
    it("returns generated attributes/projects for the owner, and inline profile edits are reflected", async () => {
        const { agent: recruiter } = await registerAndLogin(["RECRUITER"], "get-recruiter");
        const { agent: candidate, userId: candidateId } = await registerAndLogin([], "get-candidate");

        const position = await recruiter.post("/api/positions").send({
            title: unique("Get Pos"),
            isPublic: true,
            attributeIds: [stringAttribute.id],
        });
        createdPositionIds.push(position.body.id);

        const created = await candidate.post("/api/resumes").send({ positionId: position.body.id });
        const valueId = created.body.attributes[0].valueId;

        await candidate.patch(`/api/profile/${candidateId}/attribute-values/${valueId}`).send({
            stringValue: "Fluent",
            version: created.body.attributes[0].version,
        });

        const res = await candidate.get(`/api/resumes/${created.body.id}`);
        expect(res.status).toBe(200);
        expect(res.body.attributes[0].stringValue).toBe("Fluent");
        expect(res.body.attributes[0].isEmpty).toBe(false);
        expect(res.body.canEdit).toBe(true);
    });

    it("forbids a different candidate from viewing someone else's resume", async () => {
        const { agent: recruiter } = await registerAndLogin(["RECRUITER"], "other-recruiter");
        const { agent: owner } = await registerAndLogin([], "other-owner");
        const { agent: intruder } = await registerAndLogin([], "other-intruder");

        const position = await recruiter.post("/api/positions").send({ title: unique("Other Pos"), isPublic: true });
        createdPositionIds.push(position.body.id);

        const created = await owner.post("/api/resumes").send({ positionId: position.body.id });

        const res = await intruder.get(`/api/resumes/${created.body.id}`);
        expect(res.status).toBe(403);
    });

    it("forbids recruiters from viewing a draft, but allows a published resume read-only", async () => {
        const { agent: recruiter } = await registerAndLogin(["RECRUITER"], "pub-recruiter");
        const { agent: candidate, userId: candidateId } = await registerAndLogin([], "pub-candidate");

        const position = await recruiter.post("/api/positions").send({ title: unique("Pub Pos"), isPublic: true });
        createdPositionIds.push(position.body.id);

        const created = await candidate.post("/api/resumes").send({ positionId: position.body.id });

        const draftAttempt = await recruiter.get(`/api/resumes/${created.body.id}`);
        expect(draftAttempt.status).toBe(403);

        await prisma.resume.update({ where: { id: created.body.id }, data: { status: "PUBLISHED" } });

        const publishedAttempt = await recruiter.get(`/api/resumes/${created.body.id}`);
        expect(publishedAttempt.status).toBe(200);
        expect(publishedAttempt.body.canEdit).toBe(false);

        void candidateId;
    });
});

describe("PATCH /api/resumes/:id/publish", () => {
    it("blocks publishing while attributes are empty, then succeeds once filled", async () => {
        const { agent: recruiter } = await registerAndLogin(["RECRUITER"], "publish-recruiter");
        const { agent: candidate, userId: candidateId } = await registerAndLogin([], "publish-candidate");

        const position = await recruiter.post("/api/positions").send({
            title: unique("Publish Pos"),
            isPublic: true,
            attributeIds: [stringAttribute.id],
        });
        createdPositionIds.push(position.body.id);

        const created = await candidate.post("/api/resumes").send({ positionId: position.body.id });

        const blocked = await candidate.patch(`/api/resumes/${created.body.id}/publish`).send({ version: created.body.version });
        expect(blocked.status).toBe(400);

        const valueId = created.body.attributes[0].valueId;
        await candidate.patch(`/api/profile/${candidateId}/attribute-values/${valueId}`).send({
            stringValue: "Fluent",
            version: created.body.attributes[0].version,
        });

        const published = await candidate.patch(`/api/resumes/${created.body.id}/publish`).send({ version: created.body.version });
        expect(published.status).toBe(200);
        expect(published.body.status).toBe("PUBLISHED");
    });

    it("returns 409 on a stale version", async () => {
        const { agent: recruiter } = await registerAndLogin(["RECRUITER"], "stale-recruiter");
        const { agent: candidate } = await registerAndLogin([], "stale-candidate");

        const position = await recruiter.post("/api/positions").send({ title: unique("Stale Pos"), isPublic: true });
        createdPositionIds.push(position.body.id);

        const created = await candidate.post("/api/resumes").send({ positionId: position.body.id });

        const res = await candidate.patch(`/api/resumes/${created.body.id}/publish`).send({ version: 99 });
        expect(res.status).toBe(409);
    });
});

describe("hiding resumes when access is lost", () => {
    it("hides a resume from GET /:id, the position's resume list, and the candidate's profile once access rules tighten", async () => {
        const { agent: recruiter } = await registerAndLogin(["RECRUITER"], "hide-recruiter");
        const { agent: candidate, userId: candidateId } = await registerAndLogin([], "hide-candidate");

        const position = await recruiter.post("/api/positions").send({ title: unique("Hide Pos"), isPublic: true });
        createdPositionIds.push(position.body.id);

        const created = await candidate.post("/api/resumes").send({ positionId: position.body.id });
        await prisma.resume.update({ where: { id: created.body.id }, data: { status: "PUBLISHED" } });

        await recruiter.patch(`/api/positions/${position.body.id}`).send({
            isPublic: false,
            accessRules: [{ attributeId: numberAttribute.id, operator: "GREATER_THAN", numberValue: 7 }],
            version: position.body.version,
        });

        const directGet = await candidate.get(`/api/resumes/${created.body.id}`);
        expect(directGet.status).toBe(403);

        const positionDetail = await recruiter.get(`/api/positions/${position.body.id}`);
        expect(positionDetail.body.resumes.map((r) => r.id)).not.toContain(created.body.id);

        const profile = await candidate.get(`/api/profile/${candidateId}`);
        expect(profile.body.resumes.map((r) => r.id)).not.toContain(created.body.id);
    });
});

describe("resume likes", () => {
    it("lets a recruiter like and unlike, without creating duplicates on repeat likes", async () => {
        const { agent: recruiter } = await registerAndLogin(["RECRUITER"], "like-recruiter");
        const { agent: candidate } = await registerAndLogin([], "like-candidate");

        const position = await recruiter.post("/api/positions").send({ title: unique("Like Pos"), isPublic: true });
        createdPositionIds.push(position.body.id);

        const created = await candidate.post("/api/resumes").send({ positionId: position.body.id });
        await prisma.resume.update({ where: { id: created.body.id }, data: { status: "PUBLISHED" } });

        const firstLike = await recruiter.put(`/api/resumes/${created.body.id}/like`);
        expect(firstLike.status).toBe(200);
        expect(firstLike.body).toEqual({ likeCount: 1, likedByMe: true });

        const secondLike = await recruiter.put(`/api/resumes/${created.body.id}/like`);
        expect(secondLike.status).toBe(200);
        expect(secondLike.body).toEqual({ likeCount: 1, likedByMe: true });

        const likeRows = await prisma.resumeLike.count({ where: { resumeId: created.body.id } });
        expect(likeRows).toBe(1);

        const unlike = await recruiter.delete(`/api/resumes/${created.body.id}/like`);
        expect(unlike.status).toBe(200);
        expect(unlike.body).toEqual({ likeCount: 0, likedByMe: false });
    });

    it("forbids a candidate from liking a resume", async () => {
        const { agent: recruiter } = await registerAndLogin(["RECRUITER"], "like-forbid-recruiter");
        const { agent: candidate } = await registerAndLogin([], "like-forbid-candidate");

        const position = await recruiter.post("/api/positions").send({ title: unique("Like Forbid Pos"), isPublic: true });
        createdPositionIds.push(position.body.id);

        const created = await candidate.post("/api/resumes").send({ positionId: position.body.id });
        await prisma.resume.update({ where: { id: created.body.id }, data: { status: "PUBLISHED" } });

        const res = await candidate.put(`/api/resumes/${created.body.id}/like`);
        expect(res.status).toBe(403);
    });
});

afterAll(async () => {
    await prisma.resume.deleteMany({ where: { positionId: { in: createdPositionIds } } });
    await prisma.position.deleteMany({ where: { id: { in: createdPositionIds } } });
    await prisma.attribute.deleteMany({ where: { id: { in: createdAttributeIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});
