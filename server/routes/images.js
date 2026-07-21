import express from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import { uploadImage, deleteImageByUrl } from "../lib/blobStorage.js";

const router = express.Router();

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
    fileFilter: (req, file, cb) => {
        cb(null, ALLOWED_MIME_TYPES.includes(file.mimetype));
    },
});

router.post("/", requireAuth, (req, res) => {
    upload.single("image")(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: "invalid image upload" });
        }
        if (!req.file) {
            return res.status(400).json({ message: "image file is required and must be png/jpeg/webp/gif up to 5MB" });
        }

        const url = await uploadImage(req.file.buffer, req.file.mimetype);
        res.status(201).json({ url });
    });
});

router.delete("/", requireAuth, async (req, res) => {
    const { url } = req.body ?? {};

    if (!url) {
        return res.status(400).json({ message: "url is required" });
    }

    await deleteImageByUrl(url);
    res.status(204).send();
});

export default router;
