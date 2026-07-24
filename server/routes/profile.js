import express from "express";
import {
    deleteCandidateImage,
    getCandidateProfile,
    patchAttributeValue,
    patchCandidateAbout,
    patchCandidateImage,
    patchProject,
    postAttributeValue,
    postProject,
    removeAttributeValue,
    removeProject,
} from "../controllers/profileController.js";
import { requireAuth, requireSelfOrAdmin } from "../middleware/auth.js";

const router = express.Router();
const protect = [requireAuth, requireSelfOrAdmin("candidateId")];

router.get("/:candidateId", ...protect, getCandidateProfile);
router.patch("/:candidateId/image", ...protect, patchCandidateImage);
router.delete("/:candidateId/image", ...protect, deleteCandidateImage);
router.patch("/:candidateId/about", ...protect, patchCandidateAbout);
router.post("/:candidateId/attribute-values", ...protect, postAttributeValue);
router.patch("/:candidateId/attribute-values/:valueId", ...protect, patchAttributeValue);
router.delete("/:candidateId/attribute-values/:valueId", ...protect, removeAttributeValue);
router.post("/:candidateId/projects", ...protect, postProject);
router.patch("/:candidateId/projects/:projectId", ...protect, patchProject);
router.delete("/:candidateId/projects/:projectId", ...protect, removeProject);

export default router;
