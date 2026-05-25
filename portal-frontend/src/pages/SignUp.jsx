import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightIcon,
  EnvelopeIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  PhoneIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { apiRequest } from "../utils/api";
import {
  getAuthUser,
  getDefaultRouteForRole,
  isAuthenticated,
  saveAuthSession,
} from "../utils/auth";

const BG = `${process.env.PUBLIC_URL}/bgimage.jpg`;

export default function SignUpPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) {
      const sessionUser = getAuthUser();
      navigate(getDefaultRouteForRole(sessionUser?.role), { replace: true });
    }
  }, [navigate]);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      const data = await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          password,
          role: "CUSTOMER",
        }),
      });

      saveAuthSession(data.token, data.user);
      navigate(getDefaultRouteForRole(data.user?.role), { replace: true });
    } catch (error) {
      setErrorMessage(error.message || "Sign up failed");
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

      <div className="relative z-10 w-full max-w-4xl overflow-hidden rounded-[24px] border border-white/20 bg-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.30)] backdrop-blur-md">
        <div className="grid lg:grid-cols-[0.75fr_1.25fr]">
          <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary via-secondary to-[#022a7a] p-8 text-white">
            <div>
              <div className="-mx-8 -mt-2">
                <img
                  src={`${process.env.PUBLIC_URL}/finallogo.webp`}
                  alt="Final Logo"
                  className="block h-32 w-full object-contain drop-shadow-none"
                />
              </div>
              <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-200/90 bg-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-100 shadow-lg shadow-emerald-900/20 backdrop-blur-sm">
                <ShieldCheckIcon className="h-4 w-4 text-emerald-100" />
                Secure signup access
              </p>
            </div>

            <div className="rounded-xl border border-white/15 bg-white/10 p-3 text-xs text-blue-100 backdrop-blur-sm">
              <p className="font-semibold text-white">Support Contacts</p>
              <p className="mt-1.5">
                Phone: <a href="tel:+18883150322" className="font-medium text-white hover:underline">+1 888-315-0322</a>
              </p>
              <p>
                Email: <a href="mailto:contact@ndd-llc.com" className="font-medium text-white hover:underline">contact@ndd-llc.com</a>
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSignUp}
            className="bg-white/95 p-7 sm:p-9 lg:p-12"
          >
            <div className="mx-auto max-w-xl">
              <img
                src={`${process.env.PUBLIC_URL}/finallogo.webp`}
                alt="Final Logo"
                className="h-28 w-full object-contain drop-shadow-none lg:hidden"
              />

              <h1 className="mt-4 text-2xl font-bold text-slate-900">Sign up</h1>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">First name</span>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition-all duration-300 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10">
                    <UserIcon className="h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="First Name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      autoComplete="off"
                      data-lpignore="true"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                      required
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Last name</span>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition-all duration-300 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10">
                    <UserIcon className="h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      autoComplete="off"
                      data-lpignore="true"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                      required
                    />
                  </div>
                </label>
              </div>

              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Email address</span>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition-all duration-300 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10">
                    <EnvelopeIcon className="h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="off"
                      data-lpignore="true"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                      required
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Password</span>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition-all duration-300 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10">
                    <LockClosedIcon className="h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                      required
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Confirm password</span>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition-all duration-300 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10">
                    <LockClosedIcon className="h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                      required
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Phone number</span>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition-all duration-300 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10">
                    <PhoneIcon className="h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="off"
                      data-lpignore="true"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                    />
                  </div>
                </label>
              </div>

              <button
                disabled={isSubmitting}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-secondary hover:shadow-xl hover:shadow-primary/25 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Creating account..." : "Create Account"}
                <ArrowRightIcon className="h-5 w-5" />
              </button>

              {errorMessage && (
                <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  {errorMessage}
                </p>
              )}

              <p className="mt-5 text-center text-sm text-slate-500">
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-semibold text-primary transition hover:text-secondary"
                  onClick={() => navigate("/")}
                >
                  Log In
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}