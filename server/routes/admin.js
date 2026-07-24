import express from "express";
import { createUserRole, deleteUserRole, getUsers, patchUser, removeUser } from "../controllers/adminController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth, requireRole("ADMIN"));
router.get("/", getUsers);
router.patch("/:id", patchUser);
router.delete("/:id", removeUser);
router.post("/:id/roles", createUserRole);
router.delete("/:id/roles/:role", deleteUserRole);

export default router;
