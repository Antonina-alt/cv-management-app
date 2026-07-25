import multer from "multer";
import { ERROR_CODES } from "../lib/errorCodes.js";
import { HttpError } from "../lib/httpError.js";

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const validateFileType = (req, file, done) => ALLOWED_MIME_TYPES.includes(file.mimetype)
    ? done(null, true)
    : done(new HttpError(400, ERROR_CODES.IMAGE_TYPE_INVALID, { field: "image" }));

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
    fileFilter: validateFileType,
});

const normalizeUploadError = (error) => {
    if (error instanceof HttpError) return error;
    if (error?.code === "LIMIT_FILE_SIZE") return new HttpError(400, ERROR_CODES.IMAGE_TOO_LARGE, { field: "image" });
    return new HttpError(400, ERROR_CODES.IMAGE_UPLOAD_INVALID, { field: "image" });
};

const missingFileError = () => new HttpError(400, ERROR_CODES.IMAGE_FILE_REQUIRED, { field: "image" });

export const parseImageUpload = (req, res, next) => upload.single("image")(req, res, (error) => {
    if (error) return next(normalizeUploadError(error));
    if (!req.file) return next(missingFileError());
    return next();
});
