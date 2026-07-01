import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { LockClosedIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { apiRequest } from "../utils/api";

// ─── Fixed pricing constants (mirrors server-side integer cents) ───────────────
const PLAN_NAME = "Individual Protection Plan";
const BASE_PRICE_DISPLAY = "$54.99";
const PROCESSING_FEE_DISPLAY = "$1.11";
const TOTAL_DISPLAY = "$56.10";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function deriveCardBrand(value) {
  const d = String(value || "").replace(/\D/g, "");
  if (/^4/.test(d)) return "VISA";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "MASTERCARD";
  if (/^3[47]/.test(d)) return "AMEX";
  if (/^(6011|65|64[4-9])/.test(d)) return "DISCOVER";
  return "";
}

function formatCardNumber(raw) {
  return raw.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(raw) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

const BRAND_COLORS = {
  VISA: "bg-blue-600",
  MASTERCARD: "bg-red-600",
  AMEX: "bg-emerald-600",
  DISCOVER: "bg-amber-500",
};

function CardBrandBadge({ brand }) {
  if (!brand) return null;
  return (
    <span
      className={`${BRAND_COLORS[brand] ?? "bg-slate-400"} shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white`}
    >
      {brand}
    </span>
  );
}

/**
 * Tokenize card details using the CardFlight client-side SDK.
 * Raw card data (PAN / CVV) never leaves the browser — only the resulting
 * single-use token string is forwarded to our API.
 *
 * @param {{ number: string, expMonth: string, expYear: string, cvv: string, name: string }} cardData
 * @returns {Promise<string>} Single-use CardFlight token
 */
async function tokenizeWithCardFlight(cardData) {
  if (!window.CardFlight) {
    throw new Error(
      "The payment gateway is unavailable. Please refresh the page and try again."
    );
  }
  const result = await window.CardFlight.createToken({
    number: cardData.number,
    exp_month: cardData.expMonth,
    exp_year: `20${cardData.expYear}`,
    cvc: cardData.cvv,
    name: cardData.name,
  });
  if (result?.error) {
    throw new Error(result.error.message || "Card tokenization failed. Please check your card details.");
  }
  if (!result?.token) {
    throw new Error("The payment gateway did not return a valid token. Please try again.");
  }
  return result.token;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PaymentCheckoutPage() {
  const { token } = useParams();

  // Page-level state
  const [pageState, setPageState] = useState("loading"); // loading | ready | success | error | already_paid
  const [member, setMember] = useState(null);
  const [pageError, setPageError] = useState("");

  // Card form state
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  // Submission state
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const cardBrand = deriveCardBrand(cardNumber);

  // ── Load CardFlight SDK + customer data ──────────────────────────────────────
  useEffect(() => {
    // Dynamically inject the CardFlight JS SDK so it only loads on this page
    if (!window.CardFlight) {
      const script = document.createElement("script");
      script.src =
        process.env.REACT_APP_CARDFLIGHT_SDK_URL ||
        "https://cdn.cardflight.com/cardflight.min.js";
      script.async = true;
      script.onload = () => {
        const publishableKey = process.env.REACT_APP_CARDFLIGHT_PUBLISHABLE_KEY;
        if (window.CardFlight && publishableKey) {
          window.CardFlight.init(publishableKey);
        }
      };
      document.head.appendChild(script);
    }

    async function loadCustomer() {
      try {
        const data = await apiRequest(`/api/users/payment-checkout/${token}`);
        const customer = data.customer || null;
        setMember(customer);

        if (customer?.paymentStatus === "PAID_APPROVED") {
          setPageState("already_paid");
        } else {
          setPageState("ready");
        }
      } catch (err) {
        setPageError(err.message || "Unable to load payment details.");
        setPageState("error");
      }
    }

    loadCustomer();
  }, [token]);

  // ── Form validation ──────────────────────────────────────────────────────────
  function validate() {
    if (!cardholderName.trim()) return "Cardholder name is required.";

    const digits = cardNumber.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19)
      return "Please enter a valid card number.";

    const match = cardExpiry.match(/^(\d{2})\/(\d{2})$/);
    if (!match) return "Enter expiry in MM/YY format.";

    const month = parseInt(match[1], 10);
    if (month < 1 || month > 12) return "Invalid expiry month.";

    const expYear = 2000 + parseInt(match[2], 10);
    const lastDayOfExpMonth = new Date(expYear, month, 0);
    if (lastDayOfExpMonth < new Date()) return "Card has expired.";

    if (!cardCvv || cardCvv.length < 3) return "Please enter a valid CVV.";

    return null;
  }

  // ── Submit handler ───────────────────────────────────────────────────────────
  async function handleSubmit() {
    setFormError("");

    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const [expMonth, expYear] = cardExpiry.split("/");

      // Step 1 — tokenize card data client-side (PAN/CVV never leave the browser)
      const cardFlightToken = await tokenizeWithCardFlight({
        number: cardNumber.replace(/\D/g, ""),
        expMonth,
        expYear,
        cvv: cardCvv,
        name: cardholderName.trim(),
      });

      // Step 2 — forward ONLY the token + checkout JWT to our backend
      const result = await apiRequest("/api/payments/charge", {
        method: "POST",
        body: JSON.stringify({ checkoutToken: token, cardFlightToken }),
      });

      setSuccessMessage(result.message || "Payment processed successfully.");
      setPageState("success");
    } catch (err) {
      setFormError(err.message || "Payment failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const fullName = member
    ? `${member.firstName || ""} ${member.lastName || ""}`.trim()
    : "";

  // ── Render states ─────────────────────────────────────────────────────────────
  if (pageState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#0b4c8c] border-t-transparent" />
          <p className="text-sm text-slate-500">Loading secure checkout…</p>
        </div>
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mb-2 text-base font-semibold text-slate-800">Invalid Payment Link</h2>
          <p className="text-sm text-slate-500">{pageError || "This payment link is invalid or has expired."}</p>
        </div>
      </div>
    );
  }

  if (pageState === "already_paid") {
    const end = member?.subscriptionEndAt ? new Date(member.subscriptionEndAt) : null;
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-emerald-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <ShieldCheckIcon className="h-6 w-6 text-emerald-500" />
          </div>
          <h2 className="mb-1 text-base font-semibold text-slate-800">Subscription Active</h2>
          {end && (
            <p className="mt-1 text-sm text-slate-500">
              Valid until{" "}
              <strong>{end.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong>
            </p>
          )}
        </div>
      </div>
    );
  }

  if (pageState === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-emerald-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mb-2 text-lg font-bold text-slate-800">Payment Successful</h2>
          <p className="mb-4 text-sm text-slate-500">{successMessage}</p>
          <p className="text-xs text-slate-400">
            Your Individual Protection Plan is now active for 30 days.
          </p>
        </div>
      </div>
    );
  }

  // ── Checkout form (ready state) ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-[460px]">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="mb-8 flex items-center justify-between">
          <img
            src="/ndd%20logo%20without%20bg.webp"
            alt="Nationwide Driver Defence"
            className="h-10 w-auto object-contain"
          />
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
            <LockClosedIcon className="h-3 w-3 text-emerald-500" />
            <span className="text-[11px] font-medium text-slate-500">SSL Encrypted</span>
          </div>
        </div>

        {/* ── Main card ───────────────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5">

          {/* Order summary header */}
          <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-5">
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Order Summary
            </p>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">{PLAN_NAME}</h1>
            {fullName && (
              <p className="mt-0.5 text-xs text-slate-500">For {fullName}</p>
            )}
          </div>

          {/* Pricing breakdown */}
          <div className="px-6 pb-5 pt-4">
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Base Price</span>
                <span className="font-medium text-slate-800">{BASE_PRICE_DISPLAY}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-slate-500">
                  Processing Fee{" "}
                  <span className="text-[11px] text-slate-400">(2.02%)</span>
                </span>
                <span className="font-medium text-slate-800">{PROCESSING_FEE_DISPLAY}</span>
              </div>
              <div className="pt-2">
                <div className="h-px bg-slate-100" />
              </div>
              <div className="flex items-end justify-between pt-0.5">
                <span className="text-sm font-semibold text-slate-700">Total Due</span>
                <div className="text-right">
                  <p className="text-[28px] font-bold leading-none tracking-tight text-[#0b4c8c]">
                    {TOTAL_DISPLAY}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">30-day subscription</p>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-100" />

          {/* Payment form */}
          <div className="px-6 pb-7 pt-6">
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Card Details
            </p>

            {/* Cardholder Name */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Cardholder Name
              </label>
              <input
                type="text"
                autoComplete="cc-name"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder="Name as it appears on card"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-[#0b4c8c] focus:ring-2 focus:ring-[#0b4c8c]/10"
              />
            </div>

            {/* Card Number */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Card Number
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 transition focus-within:border-[#0b4c8c] focus-within:ring-2 focus-within:ring-[#0b4c8c]/10">
                <input
                  type="text"
                  autoComplete="cc-number"
                  inputMode="numeric"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="1234  5678  9012  3456"
                  maxLength={19}
                  className="min-w-0 flex-1 bg-transparent text-sm tracking-widest text-slate-800 outline-none placeholder:tracking-normal placeholder:text-slate-300"
                />
                <CardBrandBadge brand={cardBrand} />
              </div>
            </div>

            {/* Expiry + CVV */}
            <div className="mb-5 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Expiry Date
                </label>
                <input
                  type="text"
                  autoComplete="cc-exp"
                  inputMode="numeric"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/YY"
                  maxLength={5}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-[#0b4c8c] focus:ring-2 focus:ring-[#0b4c8c]/10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  CVV / CVC
                </label>
                <input
                  type="password"
                  autoComplete="cc-csc"
                  inputMode="numeric"
                  value={cardCvv}
                  onChange={(e) =>
                    setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  placeholder="•••"
                  maxLength={4}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-[#0b4c8c] focus:ring-2 focus:ring-[#0b4c8c]/10"
                />
              </div>
            </div>

            {/* Error notification */}
            {formError && (
              <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-medium leading-relaxed text-red-700">
                {formError}
              </div>
            )}

            {/* Pay button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b4c8c] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0d3d73] focus:outline-none focus:ring-2 focus:ring-[#0b4c8c]/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LockClosedIcon className="h-4 w-4 shrink-0" />
              {isSubmitting ? "Processing…" : `Pay ${TOTAL_DISPLAY} Securely`}
            </button>
          </div>
        </div>

        {/* ── Trust footer ────────────────────────────────────────────────────── */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheckIcon className="h-3.5 w-3.5" />
              PCI-DSS Compliant
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1">
              <LockClosedIcon className="h-3.5 w-3.5" />
              256-bit TLS Encryption
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            © 2026 Nationwide Driver Defence. All rights reserved.
          </p>
        </div>

      </div>
    </div>
  );
}