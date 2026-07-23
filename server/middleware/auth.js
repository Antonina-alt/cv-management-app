import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const toRequestUser = (user) => ({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    location: user.location,
    imageUrl: user.imageUrl,
    roles: user.roles.map((r) => r.role),
    theme: user.theme,
    language: user.language,
    version: user.version,
});

const findActiveUser = async (token) => {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.id }, include: { roles: true } });
    return user && !user.isBlocked ? user : null;
};

export const requireAuth = async (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    try {
        const user = await findActiveUser(token);
        if (!user) return res.status(401).json({ message: "Not authenticated" });
        req.user = toRequestUser(user);
        next();
    } catch {
        res.status(401).json({ message: "Not authenticated" });
    }
};

export const optionalAuth = async (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) return next();

    try {
        const user = await findActiveUser(token);
        if (user) req.user = toRequestUser(user);
    } catch {
        /* proceed anonymous */
    }
    next();
};

export const requireRole = (...roles) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    if (req.user.roles.includes("ADMIN") || req.user.roles.some((r) => roles.includes(r))) return next();
    res.status(403).json({ message: "Forbidden" });
};

export const requireSelfOrAdmin = (paramName = "candidateId") => (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    if (req.user.id === req.params[paramName] || req.user.roles.includes("ADMIN")) return next();
    res.status(403).json({ message: "Forbidden" });
};
