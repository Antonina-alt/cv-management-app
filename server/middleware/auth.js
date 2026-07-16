import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

export const requireAuth = async (req, res, next) => {
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).json({ message: "Not authenticated" });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        const user = await prisma.user.findUnique({
            where: { id: payload.id },
            include: { roles: true },
        });

        if (!user || user.isBlocked) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        req.user = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            roles: user.roles.map((r) => r.role),
        };

        next();
    } catch {
        return res.status(401).json({ message: "Not authenticated" });
    }
};

export const requireRole = (...roles) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
    }

    if (req.user.roles.includes("ADMIN") || req.user.roles.some((r) => roles.includes(r))) {
        return next();
    }

    return res.status(403).json({ message: "Forbidden" });
};
