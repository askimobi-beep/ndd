import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeftIcon, ArrowRightIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { apiRequest } from "../utils/api";

const BG = `${process.env.PUBLIC_URL}/bgimage.jpg`;

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token") || "";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    if (!token) {
      setMessage("Reset token is missing from URL.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("New password and confirm password must match.");
      return;
    }

    try {
      setIsSubmitting(true);
      const data = await apiRequest(`/api/auth/reset-password/${token}`, {
        method: "POST",
        body: JSON.stringify({ newPassword }),
      });

      setMessage(data.message || "Password reset successful.");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => navigate("/"), 1300);
    } catch (error) {
      setMessage(error.message || "Unable to reset password.");
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
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Reset Password</p>
        <h2 className="mt-3 text-3xl font-semibold text-slate-900">Set a new password</h2>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">New Password</span>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all duration-300 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10">
              <LockClosedIcon className="h-5 w-5 text-slate-400" />
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Enter new password"
                className="w-full bg-transparent text-base outline-none placeholder:text-slate-400"
                required
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Confirm Password</span>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all duration-300 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10">
              <LockClosedIcon className="h-5 w-5 text-slate-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm password"
                className="w-full bg-transparent text-base outline-none placeholder:text-slate-400"
                required
              />
            </div>
          </label>

          {message && (
            <p className={`rounded-2xl px-4 py-3 text-sm font-medium ${message.toLowerCase().includes("success") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
              {message}
            </p>
          )}

          <button
            disabled={isSubmitting}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-base font-semibold text-white transition-all duration-300 hover:bg-secondary hover:shadow-xl hover:shadow-primary/25 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Updating..." : "Update Password"}
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
