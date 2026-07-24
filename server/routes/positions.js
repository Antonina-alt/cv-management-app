import express from "express";
import { getPositionById, getPositions, patchPosition, postPosition, postPositionDuplicate, removePosition } from "../controllers/positionController.js";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();
const manage = [requireAuth, requireRole("RECRUITER", "ADMIN")];

router.get("/", optionalAuth, getPositions);
router.get("/:id", optionalAuth, getPositionById);
router.post("/", ...manage, postPosition);
router.post("/:id/duplicate", ...manage, postPositionDuplicate);
router.patch("/:id", ...manage, patchPosition);
router.delete("/:id", ...manage, removePosition);

export default router;
