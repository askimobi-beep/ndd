import express from "express";
import rateLimit from "express-rate-limit";
import { chargePayment } from "../controllers/paymentController.js";

const router = express.Router();

// Strict rate limiter: max 5 charge attempts per IP per 15 minutes
const chargeRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many payment attempts. Please wait 15 minutes before trying again." },
});

// POST /api/payments/charge
// Authenticated via the payment-link JWT in the request body (checkoutToken).
// Raw card data is never sent here — only a single-use CardFlight token.
router.post("/charge", chargeRateLimit, chargePayment);

export default router;
