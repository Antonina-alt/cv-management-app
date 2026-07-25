import { ERROR_CODES } from "../lib/errorCodes.js";
import { prisma } from "../lib/prisma.js";
import { badRequest, conflict, notFound } from "../lib/httpError.js";
import { findUserWithRoles, toAdminUser } from "../lib/users.js";
import { deleteVersioned, updateVersioned } from "../lib/versioning.js";
import { requireVersion } from "../lib/validation.js";

const ROLES = ["CANDIDATE", "RECRUITER", "ADMIN"];

const userSearchWhere = (query) => query ? {
    OR: ["firstName", "lastName", "email"].map((field) => ({
        [field]: { contains: String(query), mode: "insensitive" },
    })),
} : {};

const requireRole = (role) => {
    if (!ROLES.includes(role)) badRequest(ERROR_CODES.ROLE_INVALID, { field: "role" });
    return role;
};

const loadAdminUser = async (id) => {
    const user = await findUserWithRoles(id);
    if (!user) notFound(ERROR_CODES.USER_NOT_FOUND);
    return user;
};

export const listUsers = async (query) => {
    const users = await prisma.user.findMany({
        where: userSearchWhere(query),
        include: { roles: true },
        orderBy: { createdAt: "desc" },
    });
    return users.map(toAdminUser);
};

const validateBlockChange = (actorId, userId, body) => {
    requireVersion(body);
    if (body.isBlocked === undefined) badRequest(ERROR_CODES.BLOCK_STATUS_REQUIRED, { field: "isBlocked" });
    if (actorId === userId && body.isBlocked) badRequest(ERROR_CODES.SELF_BLOCK_FORBIDDEN);
};

export const updateUserBlock = async (actorId, userId, body) => {
    validateBlockChange(actorId, userId, body);
    const result = await updateVersioned(prisma.user, userId, body.version, { isBlocked: body.isBlocked });
    if (result.count === 0) return resolveUserUpdateFailure(userId);
    return toAdminUser(await loadAdminUser(userId));
};

const resolveUserUpdateFailure = async (userId) => {
    const user = await findUserWithRoles(userId);
    if (!user) notFound(ERROR_CODES.USER_NOT_FOUND);
    conflict(ERROR_CODES.VERSION_CONFLICT, { resource: "user", user: toAdminUser(user) });
};

export const deleteUser = async (actorId, userId, body) => {
    const version = requireVersion(body);
    if (actorId === userId) badRequest(ERROR_CODES.SELF_DELETE_FORBIDDEN);
    await loadAdminUser(userId);
    const result = await deleteVersioned(prisma.user, userId, version);
    if (result.count === 0) await resolveUserUpdateFailure(userId);
};

export const addUserRole = async (userId, role) => {
    requireRole(role);
    await loadAdminUser(userId);
    try {
        await prisma.userRole.create({ data: { userId, role } });
    } catch (error) {
        if (error.code !== "P2002") throw error;
        conflict(ERROR_CODES.ROLE_ALREADY_ASSIGNED, { field: "role" });
    }
    return toAdminUser(await loadAdminUser(userId));
};

export const removeUserRole = async (userId, role) => {
    requireRole(role);
    const result = await prisma.userRole.deleteMany({ where: { userId, role } });
    if (result.count === 0) notFound(ERROR_CODES.ROLE_NOT_FOUND);
    return toAdminUser(await loadAdminUser(userId));
};
