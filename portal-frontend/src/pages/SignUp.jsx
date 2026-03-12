import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightIcon,
  EnvelopeIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

const BG = `${process.env.PUBLIC_URL}/bgimage.jpg`;

export default function SignUpPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [invitationCode, setInvitationCode] = useState("");

  const navigate = useNavigate();

  const handleSignUp = (e) => {
    e.preventDefault();
    // TODO: Add sign-up logic
    navigate("/account");
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 py-10"
      style={{ backgroundImage: `url(${BG})`, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-slate-950/65" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-primary/20 to-slate-950/70" />

      <div className="relative z-10 w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/20 bg-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
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
                Create your access in minutes.
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-blue-100">
                Set up your portal account with a modern, secure sign-up flow designed for your future backend integration.
              </p>
            </div>

            <div className="space-y-3 text-sm text-blue-100">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                Frontend-only demo mode is enabled for rapid UI testing.
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                Clean interface, branded visuals, and future-ready authentication flow.
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSignUp}
            className="bg-white/95 p-8 sm:p-10 lg:p-12"
          >
            <div className="mx-auto max-w-xl">
              <img
                src={`${process.env.PUBLIC_URL}/ndd logo with bg.jpeg`}
                alt="NDD Logo"
                className="h-20 w-full rounded-2xl border-2 border-slate-200 bg-white p-1.5 object-contain shadow-md lg:hidden"
              />
              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.25em] text-primary">
                Create Account
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-900">
                Join the NDD portal
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                This sign-up is frontend-only for now. You can continue directly to the account area after submission.
              </p>

              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">First name</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all duration-300 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10">
                    <UserIcon className="h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="First Name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      autoComplete="off"
                      data-lpignore="true"
                      className="w-full bg-transparent text-base outline-none placeholder:text-slate-400"
                      required
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Last name</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all duration-300 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10">
                    <UserIcon className="h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      autoComplete="off"
                      data-lpignore="true"
                      className="w-full bg-transparent text-base outline-none placeholder:text-slate-400"
                      required
                    />
                  </div>
                </label>
              </div>

              <div className="mt-5 space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Email address</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all duration-300 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10">
                    <EnvelopeIcon className="h-5 w-5 text-slate-400" />
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent text-base outline-none placeholder:text-slate-400"
                      required
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Confirm password</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all duration-300 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10">
                    <LockClosedIcon className="h-5 w-5 text-slate-400" />
                    <input
                      type="password"
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-transparent text-base outline-none placeholder:text-slate-400"
                      required
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Invitation code</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all duration-300 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10">
                    <ShieldCheckIcon className="h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Invitation Code"
                      value={invitationCode}
                      onChange={(e) => setInvitationCode(e.target.value)}
                      autoComplete="off"
                      data-lpignore="true"
                      className="w-full bg-transparent text-base outline-none placeholder:text-slate-400"
                    />
                  </div>
                </label>
              </div>

              <button className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-base font-semibold text-white transition-all duration-300 hover:bg-secondary hover:shadow-xl hover:shadow-primary/25">
                Create Account
                <ArrowRightIcon className="h-5 w-5" />
              </button>

              <p className="mt-6 text-center text-sm text-slate-500">
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-semibold text-primary transition hover:text-secondary"
                  onClick={() => navigate("/")}
                >
                  Log In
                </button>
              </p>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-800">Support Contacts</p>
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