import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { badRequest, conflict, forbidden, unauthorized } from "../lib/httpError.js";
import { hasOwnFields, mapDefinedFields } from "../lib/objects.js";
import { findUserWithRoles, toPublicUser } from "../lib/users.js";
import { updateVersioned } from "../lib/versioning.js";
import { requireFields, requireVersion } from "../lib/validation.js";

const PREFERENCE_VALUES = {
    theme: ["LIGHT", "DARK"],
    language: ["EN", "RU"],
};

const createUser = (body, passwordHash) => prisma.user.create({
    data: {
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        credential: { create: { passwordHash } },
        roles: { create: { role: "CANDIDATE" } },
    },
    include: { roles: true },
});

const validateRegistration = (body) => requireFields(
    body,
    ["email", "password", "firstName", "lastName"],
    "email, password, firstName, lastName are required",
);

export const registerUser = async (body) => {
    validateRegistration(body);
    if (await prisma.user.findUnique({ where: { email: body.email } })) conflict("Email already registered");
    const passwordHash = await bcrypt.hash(body.password, 10);
    return createUser(body, passwordHash);
};

const findUserForLogin = (email) => prisma.user.findUnique({
    where: { email },
    include: { credential: true, roles: true },
});

const validatePassword = async (user, password) => {
    if (!user?.credential) unauthorized("Invalid email or password");
    if (!await bcrypt.compare(password, user.credential.passwordHash)) unauthorized("Invalid email or password");
};

export const loginUser = async (body) => {
    requireFields(body, ["email", "password"], "email and password are required");
    const user = await findUserForLogin(body.email);
    await validatePassword(user, body.password);
    if (user.isBlocked) forbidden("Your account has been blocked");
    return user;
};

const validatePreference = (name, value) => {
    if (value === undefined || PREFERENCE_VALUES[name].includes(value)) return;
    badRequest(`${name} must be ${PREFERENCE_VALUES[name].join(" or ")}`);
};

const preferenceData = (body) => mapDefinedFields(body, {
    theme: (value) => value,
    language: (value) => value,
});

export const updatePreferences = async (userId, body) => {
    const version = requireVersion(body);
    Object.keys(PREFERENCE_VALUES).forEach((name) => validatePreference(name, body[name]));
    const data = preferenceData(body);
    if (!hasOwnFields(data)) badRequest("theme or language is required");
    const result = await updateVersioned(prisma.user, userId, version, data);
    if (result.count === 0) conflict("Version conflict", { user: toPublicUser(await findUserWithRoles(userId)) });
    return toPublicUser(await findUserWithRoles(userId));
};
