import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000
}

const generateToken = (id) => {
    return jwt.sign({id}, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
}

const toPublicUser = (user) => ({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.roles.map((r) => r.role),
    theme: user.theme,
    language: user.language,
    version: user.version,
});

router.post('/register', async (req, res) => {
    const { email, password, firstName, lastName } = req.body ?? {};

    if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: 'email, password, firstName, lastName are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        return res.status(409).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
        return tx.user.create({
            data: {
                email,
                firstName,
                lastName,
                credential: {create: {passwordHash}},
                roles: {create: {role: 'CANDIDATE'}},
            },
            include: {roles: true},
        });
    });

    const token = generateToken(user.id);
    res.cookie('token', token, cookieOptions);
    res.status(201).json(toPublicUser(user));
})

router.post('/login', async (req, res) => {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
        return res.status(400).json({ message: 'email and password are required' });
    }

    const user = await prisma.user.findUnique({
        where: { email },
        include: { credential: true, roles: true },
    });

    if (!user || !user.credential || user.isBlocked) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    const passwordMatches = await bcrypt.compare(password, user.credential.passwordHash);
    if (!passwordMatches) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user.id);
    res.cookie('token', token, cookieOptions);
    res.status(200).json(toPublicUser(user));
})

router.post('/logout', (req, res) => {
    res.clearCookie('token', cookieOptions);
    res.status(200).json({ message: 'Logged out' });
})

router.get('/me', requireAuth, (req, res) => {
    res.status(200).json(req.user);
})

router.patch('/me', requireAuth, async (req, res) => {
    const { theme, language, version } = req.body ?? {};

    if (version === undefined) {
        return res.status(400).json({ message: 'version is required' });
    }

    if (theme !== undefined && !['LIGHT', 'DARK'].includes(theme)) {
        return res.status(400).json({ message: 'theme must be LIGHT or DARK' });
    }

    if (language !== undefined && !['EN', 'RU'].includes(language)) {
        return res.status(400).json({ message: 'language must be EN or RU' });
    }

    const data = {};
    if (theme !== undefined) data.theme = theme;
    if (language !== undefined) data.language = language;

    if (Object.keys(data).length === 0) {
        return res.status(400).json({ message: 'theme or language is required' });
    }

    const result = await prisma.user.updateMany({
        where: { id: req.user.id, version },
        data: { ...data, version: { increment: 1 } },
    });

    if (result.count === 0) {
        const current = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { roles: true },
        });
        return res.status(409).json({ message: 'Version conflict', user: toPublicUser(current) });
    }

    const updated = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { roles: true },
    });

    res.status(200).json(toPublicUser(updated));
})

export default router;
