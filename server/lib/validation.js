import { badRequest } from "./httpError.js";

export const requireVersion = (body) => {
    if (body.version === undefined) badRequest("version is required");
    return body.version;
};

export const requireFields = (body, fields, message) => {
    if (fields.some((field) => !body[field])) badRequest(message);
};

export const requireNonEmptyString = (value, message) => {
    if (typeof value !== "string" || !value.trim()) badRequest(message);
    return value.trim();
};
