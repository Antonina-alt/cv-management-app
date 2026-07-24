import { AUTH_COOKIE_NAME, authCookieOptions, createAuthToken } from "../config/auth.js";
import { loginUser, registerUser, updatePreferences } from "../services/authService.js";
import { toPublicUser } from "../lib/users.js";

const setAuthCookie = (res, userId) => res.cookie(
    AUTH_COOKIE_NAME,
    createAuthToken(userId),
    authCookieOptions,
);

export const register = async (req, res) => {
    const user = await registerUser(req.body ?? {});
    setAuthCookie(res, user.id);
    res.status(201).json(toPublicUser(user));
};

export const login = async (req, res) => {
    const user = await loginUser(req.body ?? {});
    setAuthCookie(res, user.id);
    res.status(200).json(toPublicUser(user));
};

export const logout = (req, res) => {
    res.clearCookie(AUTH_COOKIE_NAME, authCookieOptions);
    res.status(200).json({ message: "Logged out" });
};

export const getCurrentUser = (req, res) => res.status(200).json(req.user);

export const patchPreferences = async (req, res) => {
    const user = await updatePreferences(req.user.id, req.body ?? {});
    res.status(200).json(user);
};
