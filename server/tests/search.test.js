import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";

const unique = (label) => `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const createdEmails = [];
const createdPositionIds = [];
const createdAttributeIds = [];
const createdProjectIds = [];

const registerAndLogin = async (roles, label) => {
    const email = `test-search-${unique(label)}@example.com`;
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
});

describe("GET /api/search", () => {
    it("finds a position by title", async () => {
        const { agent: recruiter } = await registerAndLogin(["RECRUITER"], "pos-title-recruiter");
        const marker = unique("Golang");
        const position = await recruiter.post("/api/positions").send({ title: `${marker} Backend Engineer`, isPublic: true });
        createdPositionIds.push(position.body.id);

        const res = await request(app).get(`/api/search?q=${encodeURIComponent(marker)}`);
        expect(res.status).toBe(200);
        expect(res.body.positions.map((p) => p.id)).toContain(position.body.id);
    });

    it("hides restricted positions from anonymous search", async () => {
        const { agent: recruiter } = await registerAndLogin(["RECRUITER"], "pos-restricted-recruiter");
        const marker = unique("Rustacean");
        const position = await recruiter.post("/api/positions").send({ title: `${marker} Engineer`, isPublic: false });
        createdPositionIds.push(position.body.id);

        const res = await request(app).get(`/api/search?q=${encodeURIComponent(marker)}`);
        expect(res.status).toBe(200);
        expect(res.body.positions.map((p) => p.id)).not.toContain(position.body.id);
    });

    it("finds a candidate's own project by title, but not another candidate's project", async () => {
        const { agent: owner, userId: ownerId } = await registerAndLogin([], "proj-owner");
        const { agent: other } = await registerAndLogin([], "proj-other");
        const marker = unique("Chatbot");

        const project = await owner.post(`/api/profile/${ownerId}/projects`).send({ title: `${marker} Assistant` });
        createdProjectIds.push(project.body.id);

        const ownRes = await owner.get(`/api/search?q=${encodeURIComponent(marker)}`);
        expect(ownRes.body.projects.map((p) => p.id)).toContain(project.body.id);

        const otherRes = await other.get(`/api/search?q=${encodeURIComponent(marker)}`);
        expect(otherRes.body.projects.map((p) => p.id)).not.toContain(project.body.id);
    });

    it("finds a published resume via the candidate's filled attribute value, with like count", async () => {
        const { agent: recruiter } = await registerAndLogin(["RECRUITER"], "resume-search-recruiter");
        const { agent: candidate, userId: candidateId } = await registerAndLogin([], "resume-search-candidate");
        const marker = unique("Kubernetes");

        const position = await recruiter.post("/api/positions").send({
            title: unique("DevOps Pos"),
            isPublic: true,
            attributeIds: [stringAttribute.id],
        });
        createdPositionIds.push(position.body.id);

        const created = await candidate.post("/api/resumes").send({ positionId: position.body.id });
        const valueId = created.body.attributes[0].valueId;
        await candidate.patch(`/api/profile/${candidateId}/attribute-values/${valueId}`).send({
            stringValue: `Expert in ${marker}`,
            version: created.body.attributes[0].version,
        });
        await prisma.resume.update({ where: { id: created.body.id }, data: { status: "PUBLISHED" } });
        await recruiter.put(`/api/resumes/${created.body.id}/like`);

        const res = await recruiter.get(`/api/search?q=${encodeURIComponent(marker)}`);
        expect(res.status).toBe(200);
        const match = res.body.resumes.find((r) => r.id === created.body.id);
        expect(match).toBeDefined();
        expect(match.likeCount).toBe(1);
    });

    it("does not surface draft resumes, and forbids candidates from searching resumes", async () => {
        const { agent: recruiter } = await registerAndLogin(["RECRUITER"], "resume-draft-recruiter");
        const { agent: candidate } = await registerAndLogin([], "resume-draft-candidate");
        const marker = unique("Terraform");

        const position = await recruiter.post("/api/positions").send({
            title: `${marker} SRE Pos`,
            isPublic: true,
        });
        createdPositionIds.push(position.body.id);

        await candidate.post("/api/resumes").send({ positionId: position.body.id });

        const recruiterRes = await recruiter.get(`/api/search?q=${encodeURIComponent(marker)}`);
        expect(recruiterRes.body.resumes).toHaveLength(0);

        const candidateRes = await candidate.get(`/api/search?q=${encodeURIComponent(marker)}`);
        expect(candidateRes.body.resumes).toHaveLength(0);
    });

    it("hides a resume from search once the candidate loses access to the position", async () => {
        const { agent: recruiter } = await registerAndLogin(["RECRUITER"], "resume-hide-recruiter");
        const { agent: candidate } = await registerAndLogin([], "resume-hide-candidate");
        const marker = unique("Ansible");

        const position = await recruiter.post("/api/positions").send({ title: `${marker} Ops Pos`, isPublic: true });
        createdPositionIds.push(position.body.id);

        const created = await candidate.post("/api/resumes").send({ positionId: position.body.id });
        await prisma.resume.update({ where: { id: created.body.id }, data: { status: "PUBLISHED" } });

        await recruiter.patch(`/api/positions/${position.body.id}`).send({
            isPublic: false,
            accessRules: [{ attributeId: stringAttribute.id, operator: "EQUALS", stringValue: "never-matches" }],
            version: position.body.version,
        });

        const res = await recruiter.get(`/api/search?q=${encodeURIComponent(marker)}`);
        expect(res.body.resumes.map((r) => r.id)).not.toContain(created.body.id);
    });

    it("returns empty results for a blank query", async () => {
        const res = await request(app).get("/api/search?q=");
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ positions: [], projects: [], resumes: [] });
    });
});

afterAll(async () => {
    await prisma.resume.deleteMany({ where: { positionId: { in: createdPositionIds } } });
    await prisma.project.deleteMany({ where: { id: { in: createdProjectIds } } });
    await prisma.position.deleteMany({ where: { id: { in: createdPositionIds } } });
    await prisma.attribute.deleteMany({ where: { id: { in: createdAttributeIds } } });
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});
