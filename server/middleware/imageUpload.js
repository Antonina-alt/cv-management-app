import multer from "multer";
import { HttpError } from "../lib/httpError.js";

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
    fileFilter: (req, file, done) => done(null, ALLOWED_MIME_TYPES.includes(file.mimetype)),
});

const uploadError = () => new HttpError(400, "invalid image upload");
const missingFileError = () => new HttpError(400, "image file is required and must be png/jpeg/webp/gif up to 5MB");

export const parseImageUpload = (req, res, next) => upload.single("image")(req, res, (error) => {
    if (error) return next(uploadError());
    if (!req.file) return next(missingFileError());
    return next();
});
