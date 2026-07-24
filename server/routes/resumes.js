import express from "express";
import { deleteResumeLike, getResumeById, patchResumePublish, postResume, putResumeLike, removeResume } from "../controllers/resumeController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();
const recruiter = [requireAuth, requireRole("RECRUITER", "ADMIN")];

router.post("/", requireAuth, postResume);
router.get("/:id", requireAuth, getResumeById);
router.patch("/:id/publish", requireAuth, patchResumePublish);
router.delete("/:id", requireAuth, removeResume);
router.put("/:id/like", ...recruiter, putResumeLike);
router.delete("/:id/like", ...recruiter, deleteResumeLike);

export default router;
