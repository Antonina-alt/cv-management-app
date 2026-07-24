import "dotenv/config";
import jwt from "jsonwebtoken";

export const AUTH_COOKIE_NAME = "token";

export const authCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000,
};

export const createAuthToken = (userId) => jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: "30d" },
);
