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
  const [customer, setCustomer] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CREDIT_CARD");

  useEffect(() => {
    async function loadCheckout() {
      try {
        setIsLoading(true);
        setError("");
        const data = await apiRequest(`/api/users/payment-checkout/${token}`);
        setCustomer(data.customer || null);
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
    if (!customer) {
      return "";
    }
    return `${customer.firstName || ""} ${customer.lastName || ""}`.trim();
  }, [customer]);

  const handleSubmitPayment = async () => {
    try {
      setIsSubmitting(true);
      setError("");
      const data = await apiRequest(`/api/users/payment-checkout/${token}/submit`, {
        method: "POST",
        body: JSON.stringify({ paymentMethod }),
      });

      setSuccessMessage(data.message || "Payment submitted successfully");
      setCustomer((prev) =>
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

  if (error || !customer || !invoice) {
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
                  <p className="mt-0.5 text-[11px] text-slate-400">Billed monthly</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-[#f9fafc] p-3">
            <h2 className="mb-2 text-sm font-semibold text-slate-800">Customer Information</h2>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between"><span className="text-slate-500">Name</span><span className="font-semibold text-slate-800">{fullName}</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Email</span><span className="font-semibold text-slate-800">{customer.email || "-"}</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Phone</span><span className="font-semibold text-slate-800">{customer.phone || "-"}</span></div>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-800">Payment Method</h2>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("CREDIT_CARD")}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  paymentMethod === "CREDIT_CARD"
                    ? "border-[#0b4c8c] bg-[#0b4c8c]/10 text-[#0b4c8c]"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                Credit Card
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("BANK_TRANSFER")}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  paymentMethod === "BANK_TRANSFER"
                    ? "border-[#0b4c8c] bg-[#0b4c8c]/10 text-[#0b4c8c]"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                Bank Transfer
              </button>
            </div>

            {paymentMethod === "CREDIT_CARD" ? (
              <>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Enter Card Details</h3>
                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                  <span className="rounded bg-slate-100 px-2 py-1">VISA</span>
                  <span className="rounded bg-slate-100 px-2 py-1">MASTERCARD</span>
                  <span className="rounded bg-slate-100 px-2 py-1">AMEX</span>
                  <span className="rounded bg-slate-100 px-2 py-1">DISCOVER</span>
                </div>
                <input className="mb-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none" placeholder="Cardholder's Name" />
                <div className="rounded-2xl border border-slate-300 bg-white p-2">
                  <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none" placeholder="Card number" />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none" placeholder="MM/YY" />
                    <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none" placeholder="CVV" />
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                Bank transfer selected. After clicking Pay, your payment moves to under review.
              </div>
            )}
          </section>

          <button
            type="button"
            onClick={handleSubmitPayment}
            disabled={isSubmitting || customer?.paymentStatus === "UNDER_REVIEW"}
            className="w-full rounded-xl bg-[#0b4c8c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#094276] disabled:cursor-not-allowed disabled:opacity-65"
          >
            {customer?.paymentStatus === "UNDER_REVIEW"
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
