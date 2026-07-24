import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { hasRole, isAdmin, isOwnerOrAdmin } from "../lib/roles.js";
import { toPublicUser } from "../lib/users.js";

const findActiveUser = async (token) => {
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id }, include: { roles: true } });
    return user?.isBlocked ? null : user;
};

const authenticate = async (req) => {
    const token = req.cookies?.token;
    if (!token) return null;
    const user = await findActiveUser(token);
    return user ? toPublicUser(user) : null;
};

const rejectAuthentication = (res) => res.status(401).json({ message: "Not authenticated" });

export const requireAuth = async (req, res, next) => {
    try {
        req.user = await authenticate(req);
        return req.user ? next() : rejectAuthentication(res);
    } catch {
        return rejectAuthentication(res);
    }
};

export const optionalAuth = async (req, res, next) => {
    try {
        req.user = await authenticate(req) ?? undefined;
    } catch {
        req.user = undefined;
    }
    next();
};

export const requireRole = (...roles) => (req, res, next) => {
    if (!req.user) return rejectAuthentication(res);
    if (isAdmin(req.user) || roles.some((role) => hasRole(req.user, role))) return next();
    return res.status(403).json({ message: "Forbidden" });
};

export const requireSelfOrAdmin = (paramName = "candidateId") => (req, res, next) => {
    if (!req.user) return rejectAuthentication(res);
    if (isOwnerOrAdmin(req.user, req.params[paramName])) return next();
    return res.status(403).json({ message: "Forbidden" });
};
