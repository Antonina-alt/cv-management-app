import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";
import { ensureContainer, deleteImageByUrl } from "../lib/blobStorage.js";

beforeAll(async () => {
    await ensureContainer();
});

const unique = (label) => `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Smallest valid 1x1 transparent PNG.
const PNG_BUFFER = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
);

const createdEmails = [];
const uploadedUrls = [];

const registerAndLogin = async (label) => {
    const email = `test-images-${unique(label)}@example.com`;
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

describe("POST /api/images", () => {
    it("rejects unauthenticated requests", async () => {
        const res = await request(app).post("/api/images").attach("image", PNG_BUFFER, "photo.png");
        expect(res.status).toBe(401);
    });

    it("uploads a valid image and returns its url", async () => {
        const agent = await registerAndLogin("upload");
        const res = await agent.post("/api/images").attach("image", PNG_BUFFER, "photo.png");

        expect(res.status).toBe(201);
        expect(typeof res.body.url).toBe("string");
        expect(res.body.url.length).toBeGreaterThan(0);
        uploadedUrls.push(res.body.url);
    });

    it("rejects a disallowed file type", async () => {
        const agent = await registerAndLogin("bad-type");
        const res = await agent
            .post("/api/images")
            .attach("image", Buffer.from("not an image"), { filename: "note.txt", contentType: "text/plain" });

        expect(res.status).toBe(400);
    });

    it("rejects a missing file", async () => {
        const agent = await registerAndLogin("missing-file");
        const res = await agent.post("/api/images");
        expect(res.status).toBe(400);
    });
});

describe("DELETE /api/images", () => {
    it("rejects unauthenticated requests", async () => {
        const res = await request(app).delete("/api/images").send({ url: "https://example.com/x.png" });
        expect(res.status).toBe(401);
    });

    it("removes an uploaded blob", async () => {
        const agent = await registerAndLogin("delete");
        const uploaded = await agent.post("/api/images").attach("image", PNG_BUFFER, "photo.png");

        const res = await agent.delete("/api/images").send({ url: uploaded.body.url });
        expect(res.status).toBe(204);
    });

    it("is a no-op for an already-missing blob (orphans are acceptable)", async () => {
        const agent = await registerAndLogin("delete-missing");
        const res = await agent.delete("/api/images").send({ url: "https://example.com/nonexistent.png" });
        expect(res.status).toBe(204);
    });
});

afterAll(async () => {
    await Promise.all(uploadedUrls.map((url) => deleteImageByUrl(url)));
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
});
