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
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 py-10"
      style={{ backgroundImage: `url(${BG})`, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-slate-950/65" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-primary/20 to-slate-950/70" />

      <div className="relative z-10 w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/20 bg-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary via-secondary to-[#022a7a] p-10 text-white">
            <div>
              <img
                src={`${process.env.PUBLIC_URL}/ndd logo with bg.jpeg`}
                alt="NDD Logo"
                className="block h-20 w-full rounded-2xl border-2 border-white bg-white/95 p-1.5 object-contain ring-4 ring-white/20"
              />
              <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-emerald-200/90 bg-emerald-500/40 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-900/25 backdrop-blur-sm">
                <ShieldCheckIcon className="h-5 w-5 text-emerald-100" />
                Secure login access
              </p>
              <h1 className="mt-6 text-4xl font-semibold leading-tight">
                Welcome back to the NDD portal.
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-blue-100">
                Access account details, ticket workflows, and supervisor tools from one professional dashboard.
              </p>
            </div>

            <div className="space-y-3 text-sm text-blue-100">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                Fast frontend access for demo login.
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                Support: +1 844-222-7764 · Emergency: +1 703-419-5277
              </div>
            </div>
          </div>

          <form
            onSubmit={handleLogin}
            className="bg-white/95 p-8 sm:p-10 lg:p-12"
          >
            <div className="mx-auto max-w-md">
              <img
                src={`${process.env.PUBLIC_URL}/ndd logo with bg.jpeg`}
                alt="NDD Logo"
                className="h-20 w-full rounded-2xl border-2 border-slate-200 bg-white p-1.5 object-contain shadow-md lg:hidden"
              />
              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.25em] text-primary">
                Home Login
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-900">
                Sign in to continue
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Enter your credentials to access your dashboard based on role.
              </p>

              <div className="mt-8 space-y-5">
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
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-slate-400">Demo access enabled</span>
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
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-base font-semibold text-white transition-all duration-300 hover:bg-secondary hover:shadow-xl hover:shadow-primary/25 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Signing in..." : "Log In"}
                <ArrowRightIcon className="h-5 w-5" />
              </button>

              {errorMessage && (
                <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  {errorMessage}
                </p>
              )}

              <p className="mt-6 text-center text-sm text-slate-500">Login supports all active users. Page access is controlled by role.</p>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-800">Need Help?</p>
                <p className="mt-2">
                  Support: <span className="font-medium text-primary">+1 844-222-7764</span>
                </p>
                <p>
                  Emergency: <span className="font-medium text-primary">+1 703-419-5277</span>
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}