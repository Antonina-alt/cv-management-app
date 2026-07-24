import { prisma } from "./prisma.js";

const roleNames = (user) => user.roles.map(({ role }) => role);

export const toPublicUser = (user) => ({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    location: user.location,
    imageUrl: user.imageUrl,
    roles: roleNames(user),
    theme: user.theme,
    language: user.language,
    version: user.version,
});

export const toAdminUser = (user) => ({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isBlocked: user.isBlocked,
    createdAt: user.createdAt,
    version: user.version,
    roles: roleNames(user),
});

export const findUserWithRoles = (id) => prisma.user.findUnique({
    where: { id },
    include: { roles: true },
});
