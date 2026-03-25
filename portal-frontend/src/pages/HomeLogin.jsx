import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightIcon,
  EnvelopeIcon,
  LockClosedIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { apiRequest } from "../utils/api";
import {
  getAuthUser,
  getDefaultRouteForRole,
  isAuthenticated,
  saveAuthSession,
} from "../utils/auth";

const BG = `${process.env.PUBLIC_URL}/bgimage.jpg`;

export default function HomeLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) {
      const sessionUser = getAuthUser();
      navigate(getDefaultRouteForRole(sessionUser?.role), { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    try {
      setIsSubmitting(true);
      const data = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      saveAuthSession(data.token, data.user);
      const defaultPath = getDefaultRouteForRole(data.user?.role);
      navigate(defaultPath, { replace: true });
    } catch (error) {
      if (error.message === "Failed to fetch") {
        setErrorMessage("Cannot connect to backend API. Start backend server on http://localhost:5000.");
      } else if (String(error.message || "").toLowerCase().includes("payment is under review")) {
        setErrorMessage("Your payment is under review. Please wait for admin payment confirmation.");
      } else if (String(error.message || "").toLowerCase().includes("final admin approval")) {
        setErrorMessage("Payment confirmed. Your account is pending final admin approval.");
      } else if (String(error.message || "").toLowerCase().includes("pending admin approval")) {
        setErrorMessage("Your account is pending admin approval. Please wait for admin confirmation.");
      } else if (String(error.message || "").toLowerCase().includes("pending approval")) {
        setErrorMessage("Your account is pending approval. Kindly complete your payment first.");
      } else if (String(error.message || "").toLowerCase().includes("blocked") || String(error.message || "").toLowerCase().includes("inactive")) {
        setErrorMessage("Your account is blocked. Contact admin.");
      } else {
        setErrorMessage(error.message || "Login failed");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-10"
      style={{ backgroundImage: `url(${BG})`, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 bg-slate-950/65" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-primary/20 to-slate-950/70" />

      <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-[24px] border border-white/20 bg-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.30)] backdrop-blur-md">
        <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
          <div className="flex flex-col justify-between bg-gradient-to-br from-[#0f58e8] via-primary to-[#0a3ca8] p-7 text-white sm:p-8 lg:min-h-[560px]">
            <div className="w-full">
              <div className="-mx-7 -mt-2 sm:-mx-8">
                <img
                  src={`${process.env.PUBLIC_URL}/finallogo.webp`}
                  alt="Final Logo"
                  className="block h-32 w-full object-contain drop-shadow-none"
                />
              </div>
              <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-500/25 px-3 py-1.5 text-xs font-semibold text-emerald-100 shadow-lg shadow-emerald-900/20 backdrop-blur-sm">
                <ShieldCheckIcon className="h-4 w-4" />
                Secure portal access
              </p>
              <h1 className="mt-6 max-w-md text-2xl font-semibold leading-tight sm:text-3xl">
                Welcome back to the NDD portal.
              </h1>
            </div>

            <div className="w-full rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-base font-semibold text-white">Need Help?</p>
              <p className="mt-2 text-sm text-blue-50">
                Support: <span className="font-semibold text-white">+1 844-222-7764</span>
              </p>
              <p className="mt-1 text-sm text-blue-50">
                Emergency: <span className="font-semibold text-white">+1 703-419-5277</span>
              </p>
            </div>
          </div>

          <div className="bg-white px-7 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="mx-auto max-w-md">
              <h2 className="text-3xl font-bold text-slate-900">Sign in to continue</h2>

              <form onSubmit={handleLogin} className="mt-7 space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Email address</span>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition-all duration-300 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10">
                    <EnvelopeIcon className="h-5 w-5 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      autoComplete="off"
                      data-lpignore="true"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                      required
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition-all duration-300 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10">
                    <LockClosedIcon className="h-5 w-5 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                      required
                    />
                  </div>
                </label>

                <div className="flex justify-end text-sm">
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    className="font-medium text-primary transition hover:text-secondary"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-secondary hover:shadow-xl hover:shadow-primary/25 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Signing in..." : "Log In"}
                  <ArrowRightIcon className="h-5 w-5" />
                </button>

                <p className="text-center text-sm text-slate-500">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/signup")}
                    className="font-semibold text-primary transition hover:text-secondary"
                  >
                    Create one
                  </button>
                </p>

                {errorMessage && (
                  <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                    {errorMessage}
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}