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
      className="min-h-screen flex items-center justify-center lg:justify-start relative overflow-hidden px-4 py-10 lg:pl-16"
      style={{ backgroundImage: `url(${BG})`, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 bg-slate-950/65" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-primary/20 to-slate-950/70" />

      <div className="relative z-10 w-full max-w-md rounded-[28px] bg-white px-8 py-10 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:px-10">
        {/* Logo */}
        <div className="flex flex-col items-center">
          <img
            src={`${process.env.PUBLIC_URL}/ndd logo with bg.jpeg`}
            alt="NDD Logo"
            className="h-20 w-52 object-contain"
          />
          <h2 className="mt-5 text-3xl font-bold text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">Enter your credentials to access your account</p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700">
            <ShieldCheckIcon className="h-4 w-4" />
            Secure login
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Email address</span>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all duration-300 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10">
              <EnvelopeIcon className="h-5 w-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                autoComplete="off"
                data-lpignore="true"
                className="w-full bg-transparent text-base outline-none placeholder:text-slate-400"
                required
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all duration-300 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10">
              <LockClosedIcon className="h-5 w-5 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-transparent text-base outline-none placeholder:text-slate-400"
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
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-base font-semibold text-white transition-all duration-300 hover:bg-secondary hover:shadow-xl hover:shadow-primary/25 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Signing in..." : "Log In"}
            <ArrowRightIcon className="h-5 w-5" />
          </button>

          {errorMessage && (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {errorMessage}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}