export class HttpError extends Error {
    constructor(status, message, details = {}) {
        super(message);
        this.status = status;
        this.details = details;
    }
}

const fail = (status, message, details) => {
    throw new HttpError(status, message, details);
};

export const badRequest = (message, details) => fail(400, message, details);
export const unauthorized = (message = "Not authenticated") => fail(401, message);
export const forbidden = (message = "Forbidden") => fail(403, message);
export const notFound = (message, details) => fail(404, message, details);
export const conflict = (message, details) => fail(409, message, details);

export const errorHandler = (error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof HttpError) {
        return res.status(error.status).json({ message: error.message, ...error.details });
    }
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
};
