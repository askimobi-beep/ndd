import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ExclamationCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  EllipsisHorizontalIcon,
} from "@heroicons/react/24/outline";
import TopNavbar from "../components/TopNavbar";
import { apiRequest } from "../utils/api";
import { getAuthUser, hasAnyRole } from "../utils/auth";

export default function PendingApprovalsPage() {
  const user = getAuthUser();
  const canApproveRecords = hasAnyRole(user?.role, ["ADMIN"]);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({ text: "", type: "success" });

  const loadMembers = useCallback(async () => {
    try {
      setIsLoading(true);
      const requests = [apiRequest("/api/users?role=CUSTOMER")];

      if (canApproveRecords) {
        requests.push(apiRequest("/api/users?role=LAWYER"));
      }

      const [customerData, lawyerData] = await Promise.all(requests);
      const customers = customerData?.users || [];
      const lawyers = canApproveRecords ? lawyerData?.users || [] : [];
      setRecords([...customers, ...lawyers]);
    } catch (error) {
      setNotification({ text: error.message || "Unable to load members", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [canApproveRecords]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const formatDateTime = (value) => {
    if (!value) {
      return "-";
    }

    return new Date(value).toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const formatMemberId = (position) => {
    return `M-${String(position).padStart(2, "0")}`;
  };

  const getPaymentStatusLabel = (value) => {
    if (value === "UNDER_REVIEW") {
      return "Payment Under Review";
    }

    if (value === "PAID_APPROVED") {
      return "Payment Confirmed";
    }

    return "Payment Pending";
  };

  const pendingMembers = records.filter((record) => {
    if (!record?.requiresAdminApproval || record?.isApprovedByAdmin) {
      return false;
    }

    if (String(record.role || "").toUpperCase() === "CUSTOMER") {
      return record.paymentStatus === "PAID_APPROVED";
    }

    return true;
  });

  const memberIdByUserId = useMemo(() => {
    const sorted = [...records].sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return aTime - bTime;
    });

    return sorted.reduce((accumulator, record, index) => {
      accumulator[record._id] = formatMemberId(index + 1);
      return accumulator;
    }, {});
  }, [records]);

  const approveUser = async (record) => {
    if (!canApproveRecords) {
      return;
    }

    try {
      const data = await apiRequest(`/api/users/${record._id}/approval`, {
        method: "PATCH",
        body: JSON.stringify({ isApprovedByAdmin: true }),
      });

      if (data.user) {
        setRecords((prev) => prev.map((item) => (item._id === data.user._id ? data.user : item)));
      }

      setNotification({ text: data.message || "User approved successfully", type: "success" });
    } catch (error) {
      setNotification({ text: error.message || "Unable to approve user", type: "error" });
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
              <h2 className="text-3xl font-bold text-slate-900">Pending Approvals</h2>
              <p className="text-sm text-slate-600 mt-1">All users waiting for final admin approval</p>
            </div>
            <a href="/members" className="text-sm font-semibold text-primary hover:text-secondary transition">
              ← Back to Dashboard
            </a>
          </div>

          <div className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
            <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary">
              <ExclamationCircleIcon className="h-4 w-4" />
              Pending Approvals ({pendingMembers.length})
            </div>

            <div className="mt-2 space-y-4">
              {isLoading ? (
                <p className="text-center text-slate-500 py-8">Loading...</p>
              ) : pendingMembers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-primary/20 bg-slate-50 p-8 text-center">
                  <ExclamationCircleIcon className="h-12 w-12 mx-auto text-primary/30 mb-3" />
                  <p className="text-slate-600">No pending approvals at this time</p>
                </div>
              ) : (
                pendingMembers.map((record) => (
                  <div key={record._id} className="rounded-2xl border border-slate-200 p-6 hover:border-primary/50 transition">
                    <div className="grid gap-6 lg:grid-cols-5">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary mb-3">Member Information</p>
                          <div className="space-y-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{`${record.firstName || ""} ${record.lastName || ""}`.trim()}</p>
                                <p className="text-xs text-slate-500">ID: {memberIdByUserId[record._id] || formatMemberId(1)}</p>
                            </div>
                            <div>
                              <span className="inline-block rounded-full bg-emerald-50 text-emerald-700 px-2 py-1 text-xs font-semibold">{record.customerPlan || "INDIVIDUAL"}</span>
                            </div>
                            <div>
                              <p className="text-xs text-slate-600">Joined: {new Date(record.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                            </div>
                            {record.createdBy && (
                              <div>
                                <p className="text-xs font-semibold text-slate-600">Agent: {`${record.createdBy.firstName || ""} ${record.createdBy.lastName || ""}`.trim() || record.createdBy.email || "-"}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-green-700 mb-3">Contact Details</p>
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <EnvelopeIcon className="h-4 w-4 flex-shrink-0 text-slate-500 mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-slate-600">Email</p>
                                <p className="text-xs text-slate-800 break-all">{record.email || "-"}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <PhoneIcon className="h-4 w-4 flex-shrink-0 text-slate-500 mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-slate-600">Phone</p>
                                <p className="text-xs text-slate-800">{record.phone || "-"}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-600">Office</p>
                              <span className="inline-block rounded-full bg-blue-50 text-blue-700 px-2 py-1 text-xs font-medium">{record.office || "-"}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-violet-700 mb-3">Documents</p>
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs font-medium text-slate-600">License</p>
                              <span className="inline-block rounded-full bg-purple-50 text-purple-700 px-2 py-1 text-xs font-medium">{record.licenseNo || "NO"}</span>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-600">DOT</p>
                              <span className="inline-block rounded-full bg-purple-50 text-purple-700 px-2 py-1 text-xs font-medium">{record.dot || "NO"}</span>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-600">State</p>
                              <span className="inline-block rounded-full bg-purple-50 text-purple-700 px-2 py-1 text-xs font-medium">{record.state || "-"}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700 mb-3">Status</p>
                          <div className="flex flex-col gap-2">
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-slate-600">Approval</p>
                              <span className="inline-block rounded-full px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700">Pending</span>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-slate-600">Payment</p>
                              <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${record.paymentStatus === "PAID_APPROVED" ? "bg-emerald-50 text-emerald-700" : record.paymentStatus === "UNDER_REVIEW" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-700"}`}>
                                {getPaymentStatusLabel(record.paymentStatus)}
                              </span>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-slate-500">Subscription Start: {formatDateTime(record.subscriptionStartAt)}</p>
                              <p className="text-xs text-slate-500">Subscription End: {formatDateTime(record.subscriptionEndAt)}</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-700 mb-3">Actions</p>
                          <div className="flex flex-col gap-2">
                            {canApproveRecords ? (
                              <button
                                onClick={() => approveUser(record)}
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                              >
                                Approve
                              </button>
                            ) : (
                              <span className="rounded-lg bg-slate-100 px-3 py-2 text-center text-xs font-semibold text-slate-700">
                                View Only
                              </span>
                            )}
                            <button className="rounded-lg border border-slate-300 text-slate-700 px-3 py-2 text-xs font-semibold transition hover:border-primary hover:text-primary flex items-center justify-center gap-1">
                              <EllipsisHorizontalIcon className="h-4 w-4" />
                              View Details
                            </button>
                            <span className="rounded-lg bg-slate-100 px-3 py-2 text-center text-xs font-semibold text-slate-700">
                              {String(record.role || "").toUpperCase() === "LAWYER" ? "Role: Lawyer" : "Role: Member"}
                            </span>
                          </div>
                        </div>
                    </div>
                  </div>
                ))
              )}
            </div>
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
