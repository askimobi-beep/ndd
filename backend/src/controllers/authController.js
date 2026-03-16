import { createHash } from "node:crypto";
import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";
import { sendEmail } from "../utils/sendEmail.js";

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

export async function register(req, res, next) {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      role = "SUPERVISOR",
      phone = "",
      office = "Lahore Office (LHR)",
    } = req.body;

    if (!firstName || !lastName || !email || !password) {
      res.status(400);
      throw new Error("firstName, lastName, email, and password are required");
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      res.status(409);
      throw new Error("Email already registered");
    }

    const user = await User.create({
      firstName,
      lastName,
      email: normalizedEmail,
      password,
      role,
      phone,
      office,
    });

    return res.status(201).json({
      message: "User registered successfully",
      user,
      token: generateToken(user),
    });
  } catch (error) {
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error("email and password are required");
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail }).select("+password");

    if (!user) {
      res.status(401);
      throw new Error("Invalid credentials");
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      res.status(401);
      throw new Error("Invalid credentials");
    }

    if (user.requiresAdminApproval && !user.isApprovedByAdmin) {
      res.status(403);
      throw new Error("Your account is pending approval. Kindly complete your payment for approval.");
    }

    if (!user.isActive) {
      res.status(403);
      throw new Error("Your account is blocked. Contact admin.");
    }

    return res.json({
      message: "Login successful",
      token: generateToken(user),
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        role: user.role,
        phone: user.phone,
        office: user.office,
        isActive: user.isActive,
        requiresAdminApproval: user.requiresAdminApproval,
        isApprovedByAdmin: user.isApprovedByAdmin,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function getMe(req, res) {
  return res.json({ user: req.user });
}

export async function updateMe(req, res, next) {
  try {
    const { firstName, lastName, phone, office } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    if (typeof firstName !== "undefined") {
      user.firstName = String(firstName).trim();
    }

    if (typeof lastName !== "undefined") {
      user.lastName = String(lastName).trim();
    }

    if (typeof phone !== "undefined") {
      user.phone = String(phone).trim();
    }

    if (typeof office !== "undefined") {
      user.office = String(office).trim();
    }

    await user.save();

    return res.json({
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    return next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400);
      throw new Error("currentPassword and newPassword are required");
    }

    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      res.status(401);
      throw new Error("Current password is incorrect");
    }

    user.password = newPassword;
    await user.save();

    return res.json({ message: "Password changed successfully" });
  } catch (error) {
    return next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400);
      throw new Error("email is required");
    }

    const user = await User.findOne({ email: normalizeEmail(email) });

    if (!user) {
      return res.json({ message: "If this email exists, a reset link has been sent" });
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    try {
      await sendEmail({
        to: user.email,
        subject: "Password Reset Request",
        text: `You requested a password reset. Click the link to reset your password: ${resetUrl}. This link expires in 15 minutes.`,
        html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 15 minutes.</p>`,
      });

      return res.json({ message: "Password reset email sent" });
    } catch (mailError) {
      // Keep forgot-password endpoint resilient even when SMTP provider is unavailable.
      console.error("Forgot password email delivery failed:", mailError?.message || mailError);

      const response = {
        message: "Password reset request accepted. Email delivery is temporarily unavailable.",
      };

      const allowResetLinkFallback =
        process.env.NODE_ENV !== "production" ||
        String(process.env.ALLOW_RESET_LINK_FALLBACK || "").toLowerCase() === "true";

      if (allowResetLinkFallback) {
        response.devResetUrl = resetUrl;
      }

      return res.status(202).json(response);
    }
  } catch (error) {
    return next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400);
      throw new Error("token and newPassword are required");
    }

    const hashedToken = createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: new Date() },
    }).select("+password");

    if (!user) {
      res.status(400);
      throw new Error("Token is invalid or expired");
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    return res.json({ message: "Password reset successful" });
  } catch (error) {
    return next(error);
  }
}
