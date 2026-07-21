export const toPublicUser = (user) => ({
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
