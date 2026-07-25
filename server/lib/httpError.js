import { ERROR_CODES } from "./errorCodes.js";

export class HttpError extends Error {
    constructor(status, code, details = {}) {
        super(code);
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

const fail = (status, code, details) => {
    throw new HttpError(status, code, details);
};

export const badRequest = (code, details) => fail(400, code, details);
export const unauthorized = (code = ERROR_CODES.AUTH_REQUIRED, details) => fail(401, code, details);
export const forbidden = (code = ERROR_CODES.FORBIDDEN, details) => fail(403, code, details);
export const notFound = (code, details) => fail(404, code, details);
export const conflict = (code, details) => fail(409, code, details);

const errorBody = (error) => ({ error: { code: error.code, ...error.details } });

export const errorHandler = (error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof HttpError) return res.status(error.status).json(errorBody(error));
    console.error(error);
    return res.status(500).json(errorBody({ code: ERROR_CODES.INTERNAL_SERVER_ERROR }));
};
