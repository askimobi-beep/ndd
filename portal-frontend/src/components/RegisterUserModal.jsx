import {
  CheckCircleIcon,
  InformationCircleIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";

function guidelineIcon(type) {
  if (type === "email") {
    return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
  }

  if (type === "lock") {
    return <LockClosedIcon className="h-5 w-5 text-emerald-500" />;
  }

  if (type === "shield") {
    return <ShieldCheckIcon className="h-5 w-5 text-violet-500" />;
  }

  return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
}

export default function RegisterUserModal({
  isOpen,
  title,
  submitLabel,
  formData,
  onClose,
  onChange,
  onGeneratePassword,
  onSubmit,
  isSubmitting = false,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/55 p-3 sm:p-6">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
          <div>
            <h3 className="text-2xl font-bold text-primary">{title}</h3>
          </div>
          <button
            aria-label="Close popup"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
          >
            <XMarkIcon className="h-5 w-5" />
            Back to Dashboard
          </button>
        </div>

        <div className="space-y-4 p-4 sm:p-6">
          <section className="rounded-xl border border-blue-200 bg-blue-50/70 p-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.08em] text-blue-700">Registration Rules</h4>
            <ul className="mt-3 grid gap-2 md:grid-cols-3">
              <li className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-sm text-blue-900">
                {guidelineIcon("email")}
                <span>Email stays fixed after signup</span>
              </li>
              <li className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-sm text-blue-900">
                {guidelineIcon("lock")}
                <span>Login details go by email</span>
              </li>
              <li className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-sm text-blue-900">
                {guidelineIcon("shield")}
                <span>Use Generate for a secure password</span>
              </li>
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-slate-700">First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={onChange}
                    required
                    placeholder="Enter first name"
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={onChange}
                    required
                    placeholder="Enter last name"
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={onChange}
                    required
                    placeholder="Enter email address"
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={onChange}
                    required
                    placeholder="Enter phone number (digits only)"
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Password *</label>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                  <input
                    type="text"
                    name="password"
                    value={formData.password}
                    onChange={onChange}
                    required
                    placeholder="Enter password"
                    className="w-full bg-transparent px-1 py-2 text-sm text-slate-800 outline-none"
                  />
                  <button
                    type="button"
                    onClick={onGeneratePassword}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-secondary"
                  >
                    Generate
                  </button>
                  <UserCircleIcon className="h-5 w-5 text-slate-400" />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Saving..." : submitLabel}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}