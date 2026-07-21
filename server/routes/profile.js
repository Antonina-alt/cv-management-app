import express from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { toPublicUser } from "../lib/publicUser.js";

const router = express.Router();

const findWithRoles = (id) => prisma.user.findUnique({ where: { id }, include: { roles: true } });

router.patch("/image", requireAuth, async (req, res) => {
    const { imageUrl, version } = req.body ?? {};

    if (!imageUrl || version === undefined) {
        return res.status(400).json({ message: "imageUrl and version are required" });
    }

    const result = await prisma.user.updateMany({
        where: { id: req.user.id, version },
        data: { imageUrl, version: { increment: 1 } },
    });

    if (result.count === 0) {
        const latest = await findWithRoles(req.user.id);
        return res.status(409).json({ message: "Version conflict", user: toPublicUser(latest) });
    }

    const updated = await findWithRoles(req.user.id);
    res.status(200).json(toPublicUser(updated));
});

router.delete("/image", requireAuth, async (req, res) => {
    const { version } = req.body ?? {};

    if (version === undefined) {
        return res.status(400).json({ message: "version is required" });
    }

    const result = await prisma.user.updateMany({
        where: { id: req.user.id, version },
        data: { imageUrl: null, version: { increment: 1 } },
    });

    if (result.count === 0) {
        const latest = await findWithRoles(req.user.id);
        return res.status(409).json({ message: "Version conflict", user: toPublicUser(latest) });
    }

    const updated = await findWithRoles(req.user.id);
    res.status(200).json(toPublicUser(updated));
});

export default router;
