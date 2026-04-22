import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { LockClosedIcon } from "@heroicons/react/24/outline";
import { apiRequest } from "../utils/api";

function formatCurrency(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default function PaymentCheckoutPage() {
  const { token } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [member, setMember] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CREDIT_CARD");
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardType, setCardType] = useState("CREDIT");

  const deriveCardBrand = (value) => {
    const digits = String(value || "").replace(/\D/g, "");
    if (/^4/.test(digits)) return "VISA";
    if (/^(5[1-5]|2[2-7])/.test(digits)) return "MASTERCARD";
    if (/^3[47]/.test(digits)) return "AMEX";
    if (/^(6011|65|64[4-9])/.test(digits)) return "DISCOVER";
    return "";
  };

  useEffect(() => {
    async function loadCheckout() {
      try {
        setIsLoading(true);
        setError("");
        const data = await apiRequest(`/api/users/payment-checkout/${token}`);
        setMember(data.customer || null);
        setInvoice(data.invoice || null);
      } catch (loadError) {
        setError(loadError.message || "Unable to load payment details");
      } finally {
        setIsLoading(false);
      }
    }

    loadCheckout();
  }, [token]);

  const fullName = useMemo(() => {
    if (!member) {
      return "";
    }
    return `${member.firstName || ""} ${member.lastName || ""}`.trim();
  }, [member]);

  const handleSubmitPayment = async () => {
    try {
      setIsSubmitting(true);
      setError("");

      if (paymentMethod === "CREDIT_CARD") {
        const cardDigits = cardNumber.replace(/\D/g, "");
        if (!cardholderName.trim() || cardDigits.length < 12 || !cardExpiry.trim() || !cardCvv.trim()) {
          setError("Please enter complete card details before submitting payment.");
          setIsSubmitting(false);
          return;
        }
      }

      const cardBrand = deriveCardBrand(cardNumber);
      const cardLast4 = cardNumber.replace(/\D/g, "").slice(-4);

      const data = await apiRequest(`/api/users/payment-checkout/${token}/submit`, {
        method: "POST",
        body: JSON.stringify({
          paymentMethod,
          paymentCard:
            paymentMethod === "CREDIT_CARD"
              ? {
                  brand: cardBrand,
                  cardType,
                  last4: cardLast4,
                  cardNumber,
                }
              : {
                  brand: "",
                  cardType: "",
                  last4: "",
                },
        }),
      });

      setSuccessMessage(data.message || "Payment submitted successfully");
      setMember((prev) =>
        prev
          ? {
              ...prev,
              paymentStatus: "UNDER_REVIEW",
            }
          : prev
      );
    } catch (submitError) {
      setError(submitError.message || "Unable to submit payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f6f7fb] flex items-center justify-center text-slate-500 text-sm">
        Loading checkout...
      </div>
    );
  }

  if (error || !member || !invoice) {
    // If admin confirmed payment directly, show 30 days subscription, no invoice
    if (member && member.paymentStatus === 'PAID_APPROVED' && (!invoice || !invoice.status)) {
      const start = member.subscriptionStartAt ? new Date(member.subscriptionStartAt) : new Date();
      const end = member.subscriptionEndAt ? new Date(member.subscriptionEndAt) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
      return (
        <div className="min-h-screen bg-[#f6f7fb] flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-xl border border-emerald-200 bg-white p-5 text-center">
            <h2 className="text-xl font-bold text-emerald-700 mb-2">30 Days Subscription Active</h2>
            <p className="text-sm text-slate-700 mb-2">Your subscription is active for 30 days.</p>
            <div className="mb-2 text-xs text-slate-500">From: <b>{start.toLocaleDateString()}</b> To: <b>{end.toLocaleDateString()}</b></div>
            <div className="mt-4 text-xs text-slate-400">No invoice is generated for admin-confirmed payment.</div>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#f6f7fb] flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-5 text-center">
          <p className="text-sm font-semibold text-red-700">{error || "Invalid payment link"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <div className="mx-auto max-w-xl px-4 py-4">
        <header className="flex items-center justify-between py-1">
          <img
            src="/ndd%20logo%20without%20bg.webp"
            alt="NDD"
            className="h-12 w-auto object-contain"
          />
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
            <LockClosedIcon className="h-3.5 w-3.5" />
            Secure Checkout
          </div>
        </header>

        <main className="mt-2 space-y-4 pb-8">
          {successMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          <section>
            <p className="text-[11px] text-slate-500">Order for {fullName}</p>
            <h1 className="text-[30px] font-bold leading-tight text-slate-900">{invoice.planName || "Individual Protection Plan"}</h1>
            <p className="mt-1 text-xs text-slate-500">Full coverage protection with 24/7 support for USA</p>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-[#f9fafc] p-3">
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Invoice #</span>
                <span className="font-semibold text-slate-800">{invoice.invoiceNumber || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Plan</span>
                <span className="font-semibold text-slate-800">{invoice.planName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Plan Price</span>
                <span className="font-semibold text-slate-800">{formatCurrency(invoice.planPrice)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Processing Fee</span>
                <span className="font-semibold text-slate-800">{formatCurrency(invoice.processingFee)}</span>
              </div>
              <div className="my-2 h-px bg-slate-200" />
              <div className="flex items-end justify-between">
                <span className="font-semibold text-slate-800">Total Amount</span>
                <div className="text-right">
                  <p className="text-[34px] font-bold leading-none text-[#0b4c8c]">{formatCurrency(invoice.totalAmount)}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">30 days subscription</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-[#f9fafc] p-3">
            <h2 className="mb-2 text-sm font-semibold text-slate-800">Member Information</h2>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between"><span className="text-slate-500">Name</span><span className="font-semibold text-slate-800">{fullName}</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Email</span><span className="font-semibold text-slate-800">{member.email || "-"}</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Phone</span><span className="font-semibold text-slate-800">{member.phone || "-"}</span></div>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-800">Payment Method</h2>
            <div className="mb-3">
              <span className="rounded-xl border border-[#0b4c8c] bg-[#0b4c8c]/10 text-[#0b4c8c] px-3 py-2 text-xs font-semibold">Credit/Debit Card</span>
            </div>
            <div>
              <input
                value={cardholderName}
                onChange={(event) => setCardholderName(event.target.value)}
                className="mb-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
                placeholder="Cardholder's Name"
              />
              <div className="rounded-2xl border border-slate-300 bg-white p-2">
                <div className="flex items-center gap-2">
                  <input
                    value={cardNumber}
                    onChange={(event) => setCardNumber(event.target.value.replace(/[^0-9]/g, '').replace(/(.{4})/g, '$1 ').trim())}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none tracking-widest"
                    placeholder="Card number"
                    maxLength={19}
                  />
                  {/* Card brand color box */}
                  {cardNumber.replace(/\D/g, '').length >= 4 && (
                    <span className={`text-xs font-semibold px-3 py-1 rounded-lg min-w-[60px] text-white text-center ${(() => {
                      const brand = deriveCardBrand(cardNumber);
                      if (brand === 'VISA') return 'bg-blue-600';
                      if (brand === 'MASTERCARD') return 'bg-red-600';
                      if (brand === 'AMEX') return 'bg-green-600';
                      if (brand === 'DISCOVER') return 'bg-yellow-600';
                      return 'bg-slate-400';
                    })()}`}>{deriveCardBrand(cardNumber) || 'CARD'}</span>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input
                    value={cardExpiry}
                    onChange={(event) => setCardExpiry(event.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
                    placeholder="MM/YY"
                    maxLength={5}
                  />
                  <input
                    value={cardCvv}
                    onChange={(event) => setCardCvv(event.target.value.replace(/[^0-9]/g, ''))}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
                    placeholder="CVV"
                    maxLength={4}
                  />
                </div>
              </div>
            </div>
          </section>

          <button
            type="button"
            onClick={handleSubmitPayment}
            disabled={isSubmitting || member?.paymentStatus === "UNDER_REVIEW"}
            className="w-full rounded-xl bg-[#0b4c8c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#094276] disabled:cursor-not-allowed disabled:opacity-65"
          >
            {member?.paymentStatus === "UNDER_REVIEW"
              ? "Submitted - Under Review"
              : isSubmitting
                ? "Submitting..."
                : `Pay ${formatCurrency(invoice.totalAmount)}`}
          </button>

          <p className="pt-4 text-center text-[10px] text-slate-400">© 2026 NDD. All rights reserved.</p>
        </main>
      </div>
    </div>
  );
}
