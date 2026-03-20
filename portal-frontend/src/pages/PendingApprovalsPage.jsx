import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ExclamationCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import TopNavbar from "../components/TopNavbar";
import { apiRequest } from "../utils/api";

export default function PendingApprovalsPage() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "cancelled" ? "cancelled" : "pending";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({ text: "", type: "success" });

  const loadCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiRequest("/api/users?role=CUSTOMER");
      setRecords(data.users || []);
    } catch (error) {
      setNotification({ text: error.message || "Unable to load customers", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const pendingCustomers = records.filter((r) => r.requiresAdminApproval && !r.isApprovedByAdmin);
  const cancelledCustomers = records.filter((r) => !r.isActive);

  const approveUser = async (record) => {
    try {
      const data = await apiRequest(`/api/users/${record._id}/approval`, {
        method: "PATCH",
        body: JSON.stringify({ isApprovedByAdmin: true }),
      });

      if (data.user) {
        setRecords((prev) => prev.map((item) => (item._id === data.user._id ? data.user : item)));
      }

      setNotification({ text: data.message || "Customer approved successfully", type: "success" });
    } catch (error) {
      setNotification({ text: error.message || "Unable to approve customer", type: "error" });
    }
  };

  const activateUser = async (record) => {
    try {
      const data = await apiRequest(`/api/users/${record._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: true }),
      });

      if (data.user) {
        setRecords((prev) => prev.map((item) => (item._id === data.user._id ? data.user : item)));
      }

      setNotification({ text: "Customer activated successfully", type: "success" });
    } catch (error) {
      setNotification({ text: error.message || "Unable to activate customer", type: "error" });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-accent">
      <TopNavbar />

      <div className="flex-1 px-6 py-8 lg:px-8">
        <div className="w-full space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Customer Approvals</h2>
              <p className="text-sm text-slate-600 mt-1">Manage pending approvals and cancelled accounts</p>
            </div>
            <a href="/customers" className="text-sm font-semibold text-primary hover:text-secondary transition">
              ← Back to Dashboard
            </a>
          </div>

          {/* Tabs */}
          <div className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
            <div className="flex gap-4 border-b border-slate-200">
              <button
                onClick={() => setActiveTab("pending")}
                className={`px-4 py-3 text-sm font-semibold transition border-b-2 ${
                  activeTab === "pending"
                    ? "border-primary text-primary"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <ExclamationCircleIcon className="h-5 w-5" />
                  Pending Approvals ({pendingCustomers.length})
                </span>
              </button>
              <button
                onClick={() => setActiveTab("cancelled")}
                className={`px-4 py-3 text-sm font-semibold transition border-b-2 ${
                  activeTab === "cancelled"
                    ? "border-primary text-primary"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <XCircleIcon className="h-5 w-5" />
                  Cancelled ({cancelledCustomers.length})
                </span>
              </button>
            </div>

            {/* Pending Approvals Tab */}
            {activeTab === "pending" && (
              <div className="mt-6 space-y-4">
                {isLoading ? (
                  <p className="text-center text-slate-500 py-8">Loading...</p>
                ) : pendingCustomers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-primary/20 bg-slate-50 p-8 text-center">
                    <ExclamationCircleIcon className="h-12 w-12 mx-auto text-primary/30 mb-3" />
                    <p className="text-slate-600">No pending approvals at this time</p>
                  </div>
                ) : (
                  pendingCustomers.map((record) => (
                    <div key={record._id} className="rounded-2xl border border-slate-200 p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-bold text-sm">
                              {record.firstName?.charAt(0)}{record.lastName?.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-900">{record.firstName} {record.lastName}</h4>
                              <p className="text-xs text-slate-500">ID: M-{record._id.substring(0, 6).toUpperCase()}</p>
                            </div>
                          </div>
                          <div className="grid gap-4 md:grid-cols-3 mt-4">
                            <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
                              <p className="text-xs font-medium text-blue-600 mb-1">Email</p>
                              <p className="text-sm font-semibold text-blue-900 break-all">{record.email}</p>
                            </div>
                            <div className="rounded-lg bg-green-50 p-3 border border-green-200">
                              <p className="text-xs font-medium text-green-600 mb-1">Phone</p>
                              <p className="text-sm font-semibold text-green-900">{record.phone || "-"}</p>
                            </div>
                            <div className="rounded-lg bg-purple-50 p-3 border border-purple-200">
                              <p className="text-xs font-medium text-purple-600 mb-1">Agent</p>
                              <p className="text-sm font-semibold text-purple-900">
                                {record.createdBy?.firstName || ""} {record.createdBy?.lastName || ""}
                              </p>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => approveUser(record)}
                          className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 whitespace-nowrap"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Cancelled Tab */}
            {activeTab === "cancelled" && (
              <div className="mt-6 space-y-4">
                {isLoading ? (
                  <p className="text-center text-slate-500 py-8">Loading...</p>
                ) : cancelledCustomers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-primary/20 bg-slate-50 p-8 text-center">
                    <XCircleIcon className="h-12 w-12 mx-auto text-primary/30 mb-3" />
                    <p className="text-slate-600">No cancelled customers at this time</p>
                  </div>
                ) : (
                  cancelledCustomers.map((record) => (
                    <div key={record._id} className="rounded-2xl border border-slate-200 p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white font-bold text-sm">
                              {record.firstName?.charAt(0)}{record.lastName?.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-900">{record.firstName} {record.lastName}</h4>
                              <p className="text-xs text-slate-500">ID: M-{record._id.substring(0, 6).toUpperCase()}</p>
                            </div>
                          </div>
                          <div className="grid gap-4 md:grid-cols-4 mt-4">
                            <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
                              <p className="text-xs font-medium text-blue-600 mb-1">Joined</p>
                              <p className="text-sm font-semibold text-blue-900">
                                {new Date(record.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                            <div className="rounded-lg bg-red-50 p-3 border border-red-200">
                              <p className="text-xs font-medium text-red-600 mb-1">Cancelled</p>
                              <p className="text-sm font-semibold text-red-900">
                                {new Date(record.updatedAt || record.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                            <div className="rounded-lg bg-orange-50 p-3 border border-orange-200">
                              <p className="text-xs font-medium text-orange-600 mb-1">Status</p>
                              <p className="text-sm font-semibold text-orange-900">● Cancelled</p>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                              <p className="text-xs font-medium text-slate-600 mb-1">Phone</p>
                              <p className="text-sm font-semibold text-slate-900">{record.phone || "-"}</p>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => activateUser(record)}
                          className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 whitespace-nowrap"
                        >
                          Reactivate
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {notification.text && (
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
