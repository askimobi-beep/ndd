import express from "express";
import rateLimit from "express-rate-limit";
import {
	changePassword,
	forgotPassword,
	getMe,
	login,
	resetPassword,
	updateMe,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

const loginLimiter = rateLimit({
	windowMs: 60 * 1000,
	limit: 5,
	standardHeaders: "draft-7",
	legacyHeaders: false,
	message: { message: "Too many login attempts. Try again in a minute." },
});

const forgotPasswordLimiter = rateLimit({
	windowMs: 60 * 60 * 1000,
	limit: 3,
	standardHeaders: "draft-7",
	legacyHeaders: false,
	message: { message: "Too many password reset requests. Try again later." },
});

const resetPasswordLimiter = rateLimit({
	windowMs: 60 * 60 * 1000,
	limit: 10,
	standardHeaders: "draft-7",
	legacyHeaders: false,
	message: { message: "Too many reset attempts. Try again later." },
});

router.post("/login", loginLimiter, login);
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/reset-password/:token", resetPasswordLimiter, resetPassword);
router.patch("/change-password", protect, changePassword);
router.get("/me", protect, getMe);
router.patch("/me", protect, updateMe);

export default router;
