export const hasRole = (user, role) => user?.roles.includes(role) ?? false;
export const isAdmin = (user) => hasRole(user, "ADMIN");
export const isRecruiter = (user) => hasRole(user, "RECRUITER");
export const isRecruiterOrAdmin = (user) => isRecruiter(user) || isAdmin(user);
export const isOwnerOrAdmin = (user, ownerId) => user?.id === ownerId || isAdmin(user);
