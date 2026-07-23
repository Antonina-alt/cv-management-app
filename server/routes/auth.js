import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { toPublicUser } from "../lib/publicUser.js";

const router = express.Router();

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
};

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const setAuthCookie = (res, userId) => res.cookie('token', generateToken(userId), cookieOptions);

const findWithRoles = (id) => prisma.user.findUnique({ where: { id }, include: { roles: true } });

const createUser = ({ email, firstName, lastName, passwordHash }) =>
    prisma.user.create({
        data: {
            email,
            firstName,
            lastName,
            credential: { create: { passwordHash } },
            roles: { create: { role: 'CANDIDATE' } },
        },
        include: { roles: true },
    });

router.post('/register', async (req, res) => {
    const { email, password, firstName, lastName } = req.body ?? {};
    if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: 'email, password, firstName, lastName are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({ email, firstName, lastName, passwordHash });

    setAuthCookie(res, user.id);
    res.status(201).json(toPublicUser(user));
});

const findUserForLogin = (email) => prisma.user.findUnique({ where: { email }, include: { credential: true, roles: true } });

router.post('/login', async (req, res) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) return res.status(400).json({ message: 'email and password are required' });

    const user = await findUserForLogin(email);
    if (!user || !user.credential) return res.status(401).json({ message: 'Invalid email or password' });

    const passwordMatches = await bcrypt.compare(password, user.credential.passwordHash);
    if (!passwordMatches) return res.status(401).json({ message: 'Invalid email or password' });
    if (user.isBlocked) return res.status(403).json({ message: 'Your account has been blocked' });

    setAuthCookie(res, user.id);
    res.status(200).json(toPublicUser(user));
});

router.post('/logout', (req, res) => {
    res.clearCookie('token', cookieOptions);
    res.status(200).json({ message: 'Logged out' });
});

router.get('/me', requireAuth, (req, res) => {
    res.status(200).json(req.user);
});

const validatePreferences = ({ theme, language, version }) => {
    if (version === undefined) return 'version is required';
    if (theme !== undefined && !['LIGHT', 'DARK'].includes(theme)) return 'theme must be LIGHT or DARK';
    if (language !== undefined && !['EN', 'RU'].includes(language)) return 'language must be EN or RU';
    return null;
};

const buildPreferencesData = ({ theme, language }) => {
    const data = {};
    if (theme !== undefined) data.theme = theme;
    if (language !== undefined) data.language = language;
    return data;
};

router.patch('/me', requireAuth, async (req, res) => {
    const body = req.body ?? {};
    const error = validatePreferences(body);
    if (error) return res.status(400).json({ message: error });

    const data = buildPreferencesData(body);
    if (Object.keys(data).length === 0) return res.status(400).json({ message: 'theme or language is required' });

    const result = await prisma.user.updateMany({
        where: { id: req.user.id, version: body.version },
        data: { ...data, version: { increment: 1 } },
    });
    if (result.count === 0) {
        const current = await findWithRoles(req.user.id);
        return res.status(409).json({ message: 'Version conflict', user: toPublicUser(current) });
    }

    res.status(200).json(toPublicUser(await findWithRoles(req.user.id)));
});

export default router;
