import axios from "axios";
import jwt from "jsonwebtoken";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";

// ─── Pricing constants (integer cents for precision) ──────────────────────────
const BASE_AMOUNT_CENTS = 5499; // $54.99
const PROCESSING_FEE_CENTS = Math.round(BASE_AMOUNT_CENTS * 0.0202); // 111 → $1.11
const TOTAL_CHARGED_CENTS = BASE_AMOUNT_CENTS + PROCESSING_FEE_CENTS; // 5610 → $56.10

/**
 * POST /api/payments/charge
 *
 * Accepts:
 *   - checkoutToken  {string}  JWT from the payment link URL (type: "payment_checkout")
 *   - cardFlightToken {string} Single-use token generated client-side by CardFlight SDK
 *
 * Never receives or logs raw card data (PAN / CVV).
 */
export async function chargePayment(req, res, next) {
  try {
    const { checkoutToken, cardFlightToken } = req.body;

    // ── 1. Input guard ────────────────────────────────────────────────────────
    if (
      !checkoutToken ||
      typeof checkoutToken !== "string" ||
      !cardFlightToken ||
      typeof cardFlightToken !== "string" ||
      cardFlightToken.trim().length === 0
    ) {
      res.status(400);
      throw new Error("A valid checkout token and payment token are required.");
    }

    // ── 2. Verify the checkout JWT (identifies the customer) ─────────────────
    let payload;
    try {
      payload = jwt.verify(checkoutToken.trim(), process.env.JWT_SECRET);
    } catch {
      res.status(401);
      throw new Error("Payment link is invalid or has expired.");
    }

    if (payload?.type !== "payment_checkout" || !payload?.customerId) {
      res.status(401);
      throw new Error("Malformed payment token.");
    }

    // ── 3. Load the customer ──────────────────────────────────────────────────
    const customer = await User.findById(payload.customerId);
    if (!customer) {
      res.status(404);
      throw new Error("Customer not found.");
    }

    // Prevent duplicate charges on already-active subscriptions
    if (customer.paymentStatus === "PAID_APPROVED") {
      res.status(409);
      throw new Error("This account already has an active subscription.");
    }

    // ── 4. Persist a pending transaction ledger entry ─────────────────────────
    const transaction = await Transaction.create({
      userId: customer._id,
      planName: "Individual Protection Plan",
      baseAmountInCents: BASE_AMOUNT_CENTS,
      processingFeeInCents: PROCESSING_FEE_CENTS,
      totalChargedInCents: TOTAL_CHARGED_CENTS,
      gatewayStatus: "pending",
    });

    // ── 5. Dispatch server-to-server charge to CardFlight ─────────────────────
    let charge;
    try {
      const cfResponse = await axios.post(
        `${process.env.CARDFLIGHT_API_URL}/charges`,
        {
          amount: TOTAL_CHARGED_CENTS,
          currency: "usd",
          token: cardFlightToken.trim(),
          merchant_account_id: process.env.CARDFLIGHT_MERCHANT_ID,
          description: "Individual Protection Plan – Nationwide Driver Defence",
        },
        {
          headers: {
            "X-CardFlight-API-Key": process.env.CARDFLIGHT_API_KEY,
            "Content-Type": "application/json",
          },
          timeout: 15_000,
        }
      );
      charge = cfResponse.data;
    } catch (gatewayError) {
      // Extract the most useful decline message from CardFlight's error shape
      const declineReason =
        gatewayError.response?.data?.message ||
        gatewayError.response?.data?.error ||
        (gatewayError.code === "ECONNABORTED"
          ? "The payment gateway timed out. Please try again."
          : null) ||
        gatewayError.message ||
        "Payment processing failed. Please try again.";

      // Record the failure in the ledger
      await Transaction.findByIdAndUpdate(transaction._id, {
        gatewayStatus: "failed",
        failReason: declineReason,
      });

      res.status(402);
      throw new Error(declineReason);
    }

    // ── 6. Record the successful charge in the ledger ─────────────────────────
    await Transaction.findByIdAndUpdate(transaction._id, {
      gatewayStatus: "succeeded",
      cardFlightChargeId: charge?.id || "",
      cardBrand: charge?.card?.brand || "",
      cardLast4: charge?.card?.last4 || "",
    });

    // ── 7. Activate the customer's subscription ───────────────────────────────
    const now = new Date();
    customer.paymentStatus = "PAID_APPROVED";
    customer.paymentMethod = "CREDIT_CARD";
    customer.paymentCard = {
      brand: charge?.card?.brand || "",
      cardType: "CREDIT",
      last4: charge?.card?.last4 || "",
    };
    customer.paymentConfirmedAt = now;
    customer.paymentSubmittedAt = now;
    customer.requiresAdminApproval = false;
    customer.isApprovedByAdmin = true;
    customer.subscriptionStartAt = now;
    customer.subscriptionEndAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Mark any open invoices as paid
    if (Array.isArray(customer.invoices)) {
      customer.invoices = customer.invoices.map((inv) =>
        ["UNPAID", "UNDER_REVIEW"].includes(String(inv.status).toUpperCase())
          ? { ...inv.toObject(), status: "PAID", paidAt: now, paymentMethod: "CREDIT_CARD" }
          : inv
      );
    }

    await customer.save();

    return res.status(200).json({
      message: "Payment successful. Your Individual Protection Plan is now active.",
      chargeId: charge?.id || "",
    });
  } catch (error) {
    return next(error);
  }
}
