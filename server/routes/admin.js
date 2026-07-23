import express from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { updateWithVersion, deleteWithVersion } from "../lib/optimisticLock.js";

const router = express.Router();

const ROLES = ["CANDIDATE", "RECRUITER", "ADMIN"];

const toAdminUser = (user) => ({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isBlocked: user.isBlocked,
    createdAt: user.createdAt,
    version: user.version,
    roles: user.roles.map((r) => r.role),
});

const findWithRoles = (id) => prisma.user.findUnique({ where: { id }, include: { roles: true } });

const respondUserConflict = async (res, id) => {
    const latest = await findWithRoles(id);
    res.status(409).json({ message: "Version conflict", user: latest ? toAdminUser(latest) : null });
};

router.use(requireAuth, requireRole("ADMIN"));

const buildUserSearchWhere = (q) => (q ? {
    OR: [
        { firstName: { contains: String(q), mode: "insensitive" } },
        { lastName: { contains: String(q), mode: "insensitive" } },
        { email: { contains: String(q), mode: "insensitive" } },
    ],
} : {});

router.get("/", async (req, res) => {
    const users = await prisma.user.findMany({ where: buildUserSearchWhere(req.query.q), include: { roles: true }, orderBy: { createdAt: "desc" } });
    res.status(200).json(users.map(toAdminUser));
});

const validateBlockPatch = (req, id, isBlocked, version) => {
    if (version === undefined) return "version is required";
    if (isBlocked === undefined) return "isBlocked is required";
    if (id === req.user.id && isBlocked) return "cannot block your own account";
    return null;
};

router.patch("/:id", async (req, res) => {
    const { id } = req.params;
    const { isBlocked, version } = req.body ?? {};
    const error = validateBlockPatch(req, id, isBlocked, version);
    if (error) return res.status(400).json({ message: error });

    const result = await updateWithVersion(prisma.user, id, version, { isBlocked });
    if (result.count === 0) {
        const latest = await findWithRoles(id);
        if (!latest) return res.status(404).json({ message: "user not found" });
        return res.status(409).json({ message: "Version conflict", user: toAdminUser(latest) });
    }

    res.status(200).json(toAdminUser(await findWithRoles(id)));
});

router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    const { version } = req.body ?? {};
    if (version === undefined) return res.status(400).json({ message: "version is required" });
    if (id === req.user.id) return res.status(400).json({ message: "cannot delete your own account" });

    const current = await prisma.user.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ message: "user not found" });

    const result = await deleteWithVersion(prisma.user, id, version);
    if (result.count === 0) return respondUserConflict(res, id);

    res.status(204).send();
});

router.post("/:id/roles", async (req, res) => {
    const { id } = req.params;
    const { role } = req.body ?? {};
    if (!ROLES.includes(role)) return res.status(400).json({ message: "invalid role" });

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ message: "user not found" });

    try {
        await prisma.userRole.create({ data: { userId: id, role } });
    } catch (err) {
        if (err.code !== "P2002") throw err;
        return res.status(400).json({ message: "user already has this role" });
    }

    res.status(200).json(toAdminUser(await findWithRoles(id)));
});

router.delete("/:id/roles/:role", async (req, res) => {
    const { id, role } = req.params;
    if (!ROLES.includes(role)) return res.status(400).json({ message: "invalid role" });

    const result = await prisma.userRole.deleteMany({ where: { userId: id, role } });
    if (result.count === 0) return res.status(404).json({ message: "role not found for user" });

    res.status(200).json(toAdminUser(await findWithRoles(id)));
});

export default router;
