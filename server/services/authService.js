import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { ERROR_CODES } from "../lib/errorCodes.js";
import { badRequest, conflict, forbidden, notFound, unauthorized } from "../lib/httpError.js";
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
    ERROR_CODES.REGISTRATION_FIELDS_REQUIRED,
);

export const registerUser = async (body) => {
    validateRegistration(body);
    if (await prisma.user.findUnique({ where: { email: body.email } })) conflict(ERROR_CODES.EMAIL_ALREADY_REGISTERED, { field: "email" });
    const passwordHash = await bcrypt.hash(body.password, 10);
    try {
        return await createUser(body, passwordHash);
    } catch (error) {
        if (error.code !== "P2002") throw error;
        conflict(ERROR_CODES.EMAIL_ALREADY_REGISTERED, { field: "email" });
    }
};

const findUserForLogin = (email) => prisma.user.findUnique({
    where: { email },
    include: { credential: true, roles: true },
});

const validatePassword = async (user, password) => {
    if (!user?.credential) unauthorized(ERROR_CODES.INVALID_CREDENTIALS);
    if (!await bcrypt.compare(password, user.credential.passwordHash)) unauthorized(ERROR_CODES.INVALID_CREDENTIALS);
};

export const loginUser = async (body) => {
    requireFields(body, ["email", "password"], ERROR_CODES.INVALID_CREDENTIALS);
    const user = await findUserForLogin(body.email);
    await validatePassword(user, body.password);
    if (user.isBlocked) forbidden(ERROR_CODES.ACCOUNT_BLOCKED);
    return user;
};

const validatePreference = (name, value) => {
    if (value === undefined || PREFERENCE_VALUES[name].includes(value)) return;
    badRequest(ERROR_CODES.INVALID_PREFERENCE, { field: name, params: { values: PREFERENCE_VALUES[name].join(", ") } });
};

const preferenceData = (body) => mapDefinedFields(body, {
    theme: (value) => value,
    language: (value) => value,
});

const loadPublicUser = async (userId) => {
    const user = await findUserWithRoles(userId);
    if (!user) notFound(ERROR_CODES.USER_NOT_FOUND);
    return toPublicUser(user);
};

export const updatePreferences = async (userId, body) => {
    const version = requireVersion(body);
    Object.keys(PREFERENCE_VALUES).forEach((name) => validatePreference(name, body[name]));
    const data = preferenceData(body);
    if (!hasOwnFields(data)) badRequest(ERROR_CODES.PREFERENCES_REQUIRED);
    const result = await updateVersioned(prisma.user, userId, version, data);
    if (result.count === 0) conflict(ERROR_CODES.VERSION_CONFLICT, { resource: "user", user: await loadPublicUser(userId) });
    return loadPublicUser(userId);
};
