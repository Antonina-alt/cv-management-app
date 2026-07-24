import express from "express";
import { getAttributes, patchAttribute, postAttribute, removeAttribute } from "../controllers/attributeController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();
const manage = [requireAuth, requireRole("RECRUITER", "ADMIN")];

router.get("/", requireAuth, getAttributes);
router.post("/", ...manage, postAttribute);
router.patch("/:id", ...manage, patchAttribute);
router.delete("/:id", ...manage, removeAttribute);

export default router;
