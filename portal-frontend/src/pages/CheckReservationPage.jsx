import { useState } from "react";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  PhoneIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import TopNavbar from "../components/TopNavbar";
import { apiRequest } from "../utils/api";

export default function CheckReservationPage() {
  const [phone, setPhone] = useState("");
  const [customer, setCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [notification, setNotification] = useState({ text: "", type: "success" });

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!phone.trim()) {
      setNotification({ text: "Please enter a phone number", type: "error" });
      return;
    }

    try {
      setIsLoading(true);
      setSearchPerformed(true);
      const data = await apiRequest(`/api/users/search?phone=${phone}`);
      
      if (data.user) {
        setCustomer(data.user);
        setNotification({ text: `Customer is already reserved with agent: ${data.user.createdBy?.firstName || ""} ${data.user.createdBy?.lastName || ""}`, type: "success" });
      } else {
        setCustomer(null);
        setNotification({ text: "No customer found with this phone number", type: "error" });
      }
    } catch (error) {
      setCustomer(null);
      setNotification({ text: error.message || "Unable to search customer", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setPhone("");
    setCustomer(null);
    setSearchPerformed(false);
    setNotification({ text: "", type: "success" });
  };

  return (
    <div className="flex flex-col min-h-screen bg-accent">
      <TopNavbar />

      <div className="flex-1 px-4 py-4 lg:px-6">
        <div className="w-full max-w-[1300px] mx-auto space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MagnifyingGlassIcon className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-base font-bold text-slate-900">Check Customer Registration</h2>
                <p className="text-xs text-slate-600 mt-1">Search and verify customer registration by phone number</p>
              </div>
            </div>
            <a href="/customers" className="text-xs font-semibold text-primary hover:text-secondary transition">
              ← Back to Dashboard
            </a>
          </div>

          {/* Search Section */}
          <div className="rounded-2xl border border-white/70 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Enter Customer Phone Number</label>
                <div className="flex gap-3">
                  <div className="flex-1 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                    <PhoneIcon className="h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="8189844336"
                      className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <MagnifyingGlassIcon className="h-4 w-4" />
                    {isLoading ? "Searching..." : "Search"}
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-700 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                  >
                    <XMarkIcon className="h-4 w-4" />
                    Reset
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Success Message */}
          {searchPerformed && customer && (
            <div className="rounded-xl border-l-4 border-l-emerald-600 bg-emerald-50 p-3">
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-emerald-900">Search Successful</h3>
                  <p className="text-xs text-emerald-700 mt-1">
                    Customer is already reserved with agent: <span className="font-semibold">{customer.createdBy?.firstName || ""} {customer.createdBy?.lastName || ""}</span>
                  </p>
                  <p className="text-xs text-emerald-700">Found 1 customer matching your search</p>
                </div>
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchPerformed && customer && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">Search Results</h3>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">1 RESULT</span>
              </div>

              {/* Customer Card */}
              <div className="rounded-xl border border-slate-200 p-4 space-y-4">
                {/* Header with Avatar and Basic Info */}
                <div className="flex items-start justify-between pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
                      {customer.firstName?.charAt(0)}{customer.lastName?.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{customer.firstName} {customer.lastName}</h4>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
                          LHR
                        </span>
                        <span className="text-xs text-slate-600">Joined Mar 2026</span>
                      </div>
                    </div>
                  </div>
                  <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary">
                    Close
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Contact Information */}
                  <div>
                    <h5 className="text-xs font-semibold uppercase tracking-[0.08em] text-primary mb-4 flex items-center gap-2">
                      <PhoneIcon className="h-4 w-4" />
                      Contact Information
                    </h5>
                    <div className="space-y-3">
                      <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
                        <p className="text-xs font-medium text-blue-600 uppercase tracking-[0.08em] mb-1">Phone Number</p>
                        <p className="text-sm font-bold text-blue-900">{customer.phone || "-"}</p>
                      </div>
                      <div className="rounded-lg bg-green-50 p-3 border border-green-200">
                        <p className="text-xs font-medium text-green-600 uppercase tracking-[0.08em] mb-1">Assigned Agent</p>
                        <p className="text-sm font-bold text-green-900">
                          {customer.createdBy?.firstName || ""} {customer.createdBy?.lastName || ""}
                        </p>
                      </div>
                      <div className="rounded-lg bg-purple-50 p-3 border border-purple-200">
                        <p className="text-xs font-medium text-purple-600 uppercase tracking-[0.08em] mb-1">Office Location</p>
                        <p className="text-sm font-bold text-purple-900">{customer.office || "Lahore Office"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Account Status */}
                  <div>
                    <h5 className="text-xs font-semibold uppercase tracking-[0.08em] text-primary mb-4 flex items-center gap-2">
                      <CheckCircleIcon className="h-4 w-4" />
                      Account Status
                    </h5>
                    <div className="space-y-3">
                      <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
                        <p className="text-xs font-medium text-blue-600 uppercase tracking-[0.08em] mb-1">Registration Date</p>
                        <p className="text-sm font-bold text-blue-900">{new Date(customer.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        <p className="text-xs text-blue-700 mt-1">a day ago</p>
                      </div>
                      <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-200">
                        <p className="text-xs font-medium text-emerald-600 uppercase tracking-[0.08em] mb-1">Payment Status</p>
                        <p className="text-sm font-bold text-emerald-900">✓ PAID CUSTOMER</p>
                      </div>
                      <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-200 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-emerald-600 uppercase tracking-[0.08em] mb-1">Profile Status</p>
                          <p className="text-sm font-bold text-emerald-900">✓ ACCOUNT ACTIVE</p>
                        </div>
                        <button className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">Manage</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No Results */}
          {searchPerformed && !customer && (
            <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
              <div className="flex items-center gap-3">
                <XCircleIcon className="h-6 w-6 text-red-600" />
                <div>
                  <h3 className="text-sm font-semibold text-red-900">No Results Found</h3>
                  <p className="text-xs text-red-700 mt-1">No customer found with the phone number you searched for.</p>
                </div>
              </div>
            </div>
          )}

          {notification.text && !searchPerformed && (
            <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${
              notification.type === "success"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-600"
            }`}>
              {notification.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
