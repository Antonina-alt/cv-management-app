import { ERROR_CODES } from "./errorCodes.js";
import { badRequest } from "./httpError.js";

export const requireVersion = (body) => {
    if (body.version === undefined) badRequest(ERROR_CODES.VERSION_REQUIRED, { field: "version" });
    return body.version;
};

export const requireFields = (body, fields, code) => {
    const missingFields = fields.filter((field) => !body[field]);
    if (missingFields.length) badRequest(code, { fields: missingFields });
};

export const requireNonEmptyString = (value, code, field) => {
    if (typeof value !== "string" || !value.trim()) badRequest(code, { field });
    return value.trim();
};
