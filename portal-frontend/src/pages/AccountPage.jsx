import { useEffect, useMemo, useState } from "react";
import TopNavbar from "../components/TopNavbar";
import { Link } from "react-router-dom";
import { apiRequest } from "../utils/api";
import { getAuthUser, updateAuthUser } from "../utils/auth";
import {
  EnvelopeIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export default function AccountPage() {
  const [user, setUser] = useState(getAuthUser());
  const [notification, setNotification] = useState({ text: "", type: "success" });
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    office: "",
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await apiRequest("/api/auth/me");
        if (data?.user) {
          setUser(data.user);
        }
      } catch (error) {
        setNotification({ text: error.message || "Unable to load profile details", type: "error" });
      }
    }

    fetchProfile();
  }, []);

  const fullName = useMemo(() => {
    if (!user) {
      return "User";
    }
    return user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User";
  }, [user]);

  const openEditModal = () => {
    setFormData({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      phone: user?.phone || "",
      office: user?.office || "",
    });
    setNotification({ text: "", type: "success" });
    setIsEditOpen(true);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileUpdate = async (event) => {
    event.preventDefault();

    try {
      setIsSaving(true);
      const data = await apiRequest("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify(formData),
      });

      if (data?.user) {
        setUser(data.user);
        updateAuthUser(data.user);
      }

      setNotification({ text: data.message || "Profile updated successfully", type: "success" });
      setIsEditOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setNotification({ text: error.message || "Unable to update profile", type: "error" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-accent">
      <TopNavbar />

      <div className="flex-1 px-6 py-8 lg:px-8">
        <div className="w-full space-y-8">
          {notification.text && (
            <div className={`rounded-2xl px-5 py-4 text-sm font-medium ${notification.type === "success" ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-red-200 bg-red-50 text-red-700"}`}>
              {notification.text}
            </div>
          )}

          <div className="rounded-[28px] bg-gradient-to-r from-primary via-secondary to-[#1e3a8a] p-5 text-white shadow-[0_16px_40px_rgba(0,87,231,0.20)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold lg:text-3xl">Account Overview</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
                  Review profile details and account access.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.25em] text-blue-100">Department</p>
                  <p className="mt-2 text-lg font-semibold">{user?.office || "Operations"}</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.25em] text-blue-100">Status</p>
                  <p className="mt-2 text-lg font-semibold">{user?.isActive ? "Active Access" : "Inactive"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-8 xl:grid-cols-[340px_1fr]">
            <div className="rounded-[28px] border border-white/60 bg-white p-8 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col items-center text-center">
                <img
                  src={`${process.env.PUBLIC_URL}/avatar.jpg`}
                  alt="profile"
                  className="h-28 w-28 rounded-3xl object-cover shadow-lg ring-4 ring-primary/10"
                />

                <h3 className="mt-6 text-2xl font-semibold text-slate-900">{fullName}</h3>
                <p className="mt-1 text-sm text-slate-500">{user?.email || "-"}</p>
              </div>

              <div className="mt-8 space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheckIcon className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Access Control</p>
                      <p className="text-xs text-slate-500">Verified internal profile</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <EnvelopeIcon className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Contact</p>
                      <p className="text-xs text-slate-500">{user?.phone || "No phone added"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/60 bg-white p-8 shadow-[0_14px_40px_rgba(15,23,42,0.08)] lg:p-10">
              <div className="flex flex-col gap-3 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-2xl font-semibold text-slate-900">Manage account profile</h3>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Last updated: Today
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">First Name</label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10">
                    <UserIcon className="h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      value={user?.firstName || ""}
                      readOnly
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                      className="w-full bg-transparent text-base font-medium text-slate-800 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Last Name</label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10">
                    <UserIcon className="h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      value={user?.lastName || ""}
                      readOnly
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                      className="w-full bg-transparent text-base font-medium text-slate-800 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Email Address</label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10">
                    <EnvelopeIcon className="h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      value={user?.email || ""}
                      readOnly
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                      className="w-full bg-transparent text-base font-medium text-slate-800 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <button
                  onClick={openEditModal}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-3.5 text-base font-semibold text-white transition-all duration-300 hover:bg-secondary hover:shadow-xl hover:shadow-primary/20"
                >
                  <PencilSquareIcon className="h-5 w-5" />
                  Edit Profile
                </button>
                <Link
                  to="/change-password"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-8 py-3.5 text-base font-semibold text-slate-700 transition-all duration-300 hover:border-primary hover:text-primary hover:shadow-lg"
                >
                  <ShieldCheckIcon className="h-5 w-5" />
                  Change Password
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Profile</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">Edit Profile</h3>
              </div>
              <button
                aria-label="Close popup"
                onClick={() => setIsEditOpen(false)}
                className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:border-primary hover:text-primary"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleProfileUpdate} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">First Name</span>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleFormChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                    required
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Last Name</span>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleFormChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                    required
                  />
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Phone</span>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleFormChange}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Office</span>
                <input
                  type="text"
                  name="office"
                  value={formData.office}
                  onChange={handleFormChange}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                />
              </label>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}