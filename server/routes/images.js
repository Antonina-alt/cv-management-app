import express from "express";
import { postImage, removeImage } from "../controllers/imageController.js";
import { requireAuth } from "../middleware/auth.js";
import { parseImageUpload } from "../middleware/imageUpload.js";

const router = express.Router();

router.post("/", requireAuth, parseImageUpload, postImage);
router.delete("/", requireAuth, removeImage);

export default router;
