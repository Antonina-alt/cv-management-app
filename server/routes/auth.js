import express from "express";
import { getCurrentUser, login, logout, patchPreferences, register } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", requireAuth, getCurrentUser);
router.patch("/me", requireAuth, patchPreferences);

export default router;
