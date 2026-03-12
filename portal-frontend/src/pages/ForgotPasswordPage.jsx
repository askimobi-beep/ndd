import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { apiRequest } from "../utils/api";

const BG = `${process.env.PUBLIC_URL}/bgimage.jpg`;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(false);
    setMessage("");

    try {
      setIsSubmitting(true);
      const data = await apiRequest("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
      setMessage(data.message || "Reset link sent successfully.");
    } catch (error) {
      setSubmitted(false);
      setMessage(error.message || "Unable to send reset link.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10"
      style={{ backgroundImage: `url(${BG})`, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 bg-slate-950/65" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-primary/20 to-slate-950/70" />

      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-[28px] border border-white/20 bg-white/95 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-10">
        <img
          src={`${process.env.PUBLIC_URL}/ndd logo with bg.jpeg`}
          alt="NDD Logo"
          className="h-20 w-full rounded-2xl border-2 border-slate-200 bg-white p-1.5 object-contain shadow-md"
        />

        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.25em] text-primary">
          Forgot Password
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-slate-900">Reset your password</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Enter your account email and we will send a reset link.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Email address</span>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all duration-300 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10">
              <EnvelopeIcon className="h-5 w-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                className="w-full bg-transparent text-base outline-none placeholder:text-slate-400"
                required
              />
            </div>
          </label>

          {message && (
            <div className={`rounded-2xl p-4 text-sm ${submitted ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-red-200 bg-red-50 text-red-700"}`}>
              <p className="inline-flex items-center gap-2 font-medium">
                <ShieldCheckIcon className="h-5 w-5" />
                {message}
              </p>
            </div>
          )}

          <button
            disabled={isSubmitting}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-base font-semibold text-white transition-all duration-300 hover:bg-secondary hover:shadow-xl hover:shadow-primary/25 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Sending..." : "Send Reset Link"}
            <ArrowRightIcon className="h-5 w-5" />
          </button>
        </form>

        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-secondary"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to login
        </button>
      </div>
    </div>
  );
}
