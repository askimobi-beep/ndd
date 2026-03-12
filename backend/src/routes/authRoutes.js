import express from "express";
import {
	changePassword,
	forgotPassword,
	getMe,
	login,
	register,
	resetPassword,
	updateMe,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.patch("/change-password", protect, changePassword);
router.get("/me", protect, getMe);
router.patch("/me", protect, updateMe);

export default router;
