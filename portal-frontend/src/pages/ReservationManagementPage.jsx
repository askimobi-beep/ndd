import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDaysIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  PaperAirplaneIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import TopNavbar from "../components/TopNavbar";
import { apiRequest } from "../utils/api";
import { getAuthUser, hasAnyRole } from "../utils/auth";

function daysSince(dateValue) {
  const createdAt = new Date(dateValue).getTime();
  return (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
}

function formatDateTime(dateValue) {
  return new Date(dateValue).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMemberId(position) {
  return `M-${String(position).padStart(2, "0")}`;
}

export default function ReservationManagementPage() {
  const user = getAuthUser();
  const canConfirmPayment = hasAnyRole(user?.role, ["ADMIN"]);
  const canClaimMembers = hasAnyRole(user?.role, ["AGENT"]);
  const [records, setRecords] = useState([]);
  const [claimPoolRecords, setClaimPoolRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("RESERVED");
  const [notification, setNotification] = useState({ text: "", type: "success" });
  const [actionUserId, setActionUserId] = useState("");

  const loadMembers = useCallback(async () => {
    try {
      setIsLoading(true);
      const [ownData, claimData] = await Promise.all([
        apiRequest("/api/users?role=CUSTOMER"),
        apiRequest("/api/users?role=CUSTOMER&scope=claim"),
      ]);

      setRecords(ownData.users || []);
      setClaimPoolRecords(claimData.users || []);
    } catch (error) {
      setNotification({ text: error.message || "Unable to load members", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleGetPaymentLink = async (record) => {
    try {
      setActionUserId(record._id);
      const data = await apiRequest(`/api/users/${record._id}/payment-link`);
      const link = data.paymentUrl || "";

      if (link) {
        window.open(link, "_blank", "noopener,noreferrer");
        if (navigator?.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(link);
            setNotification({ text: "Payment link generated and copied to clipboard", type: "success" });
          } catch (_clipboardError) {
            setNotification({ text: "Payment link generated", type: "success" });
          }
        } else {
          setNotification({ text: "Payment link generated", type: "success" });
        }
      }
    } catch (error) {
      setNotification({ text: error.message || "Unable to generate payment link", type: "error" });
    } finally {
      setActionUserId("");
    }
  };

  const handleSendLinkByEmail = async (record) => {
    try {
      setActionUserId(record._id);
      const data = await apiRequest(`/api/users/${record._id}/payment-link/email`, {
        method: "POST",
      });
      setNotification({ text: data.message || "Invoice sent to member email", type: "success" });
    } catch (error) {
      setNotification({ text: error.message || "Unable to send invoice email", type: "error" });
    } finally {
      setActionUserId("");
    }
  };

  const handleConfirmPayment = async (record) => {
    try {
      setActionUserId(record._id);
      const data = await apiRequest(`/api/users/${record._id}/payment-confirmation`, {
        method: "PATCH",
      });

      setNotification({ text: data.message || "Payment confirmed successfully", type: "success" });
      await loadMembers();
    } catch (error) {
      setNotification({ text: error.message || "Unable to confirm payment", type: "error" });
    } finally {
      setActionUserId("");
    }
  };

  const reservedMembers = useMemo(() => {
    return records.filter((record) => {
      const paymentStatus = String(record?.paymentStatus || record?.paymentStage || "").trim().toUpperCase();
      return (
        Boolean(record.isActive) &&
        !record.isApprovedByAdmin &&
        paymentStatus !== "UNDER_REVIEW" &&
        paymentStatus !== "PAID_APPROVED" &&
        paymentStatus !== "PAID_PENDING_APPROVAL"
      );
    });
  }, [records]);

  const isUnderReviewMember = useCallback((record) => {
    const paymentStatus = String(record?.paymentStatus || record?.paymentStage || "")
      .trim()
      .toUpperCase();

    return paymentStatus === "UNDER_REVIEW" || paymentStatus === "PAID_PENDING_APPROVAL";
  }, []);

  const underReviewMembers = useMemo(() => {
    return records.filter((record) => {
      return (
        Boolean(record.isActive) &&
        !record.isApprovedByAdmin &&
        record.requiresAdminApproval &&
        isUnderReviewMember(record)
      );
    });
  }, [isUnderReviewMember, records]);

  const claimableMembers = useMemo(() => {
    return claimPoolRecords.filter((record) => {
      const ageInDays = daysSince(record.createdAt);
      return (
        Boolean(record.isActive) &&
        !record.isApprovedByAdmin &&
        !isUnderReviewMember(record) &&
        ageInDays > 7
      );
    });
  }, [claimPoolRecords, isUnderReviewMember]);

  const memberIdByUserId = useMemo(() => {
    const combinedMap = new Map();

    [...records, ...claimPoolRecords].forEach((record) => {
      if (!combinedMap.has(record._id)) {
        combinedMap.set(record._id, record);
      }
    });

    const sorted = Array.from(combinedMap.values()).sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return aTime - bTime;
    });

    return sorted.reduce((accumulator, record, index) => {
      accumulator[record._id] = formatMemberId(index + 1);
      return accumulator;
    }, {});
  }, [claimPoolRecords, records]);

  const expiringSoonCount = useMemo(() => {
    return reservedMembers.filter((record) => {
      const ageInDays = daysSince(record.createdAt);
      return ageInDays >= 4 && ageInDays <= 7;
    }).length;
  }, [reservedMembers]);

  const currentList =
    activeTab === "RESERVED"
      ? reservedMembers
      : activeTab === "UNDER_REVIEW"
        ? underReviewMembers
        : claimableMembers;

    const handleClaimMember = async (record) => {
      try {
        setActionUserId(record._id);
        const data = await apiRequest(`/api/users/${record._id}/claim`, {
          method: "POST",
        });

        setNotification({ text: data.message || "Member claimed successfully", type: "success" });
        await loadMembers();
        setActiveTab("RESERVED");
      } catch (error) {
        setNotification({ text: error.message || "Unable to claim member", type: "error" });
      } finally {
        setActionUserId("");
      }
    };

  return (
    <div className="flex flex-col min-h-screen bg-accent">
      <TopNavbar />

      <div className="flex-1 px-4 py-4 lg:px-6">
        <div className="w-full max-w-[1400px] mx-auto space-y-5">
          <div className="rounded-[24px] bg-gradient-to-r from-primary via-secondary to-[#1f3c97] p-5 text-white shadow-[0_16px_40px_rgba(0,87,231,0.20)]">
            <div className="flex items-start justify-between">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight">Reserved | Reviewed | Claim</h2>
                <p className="mt-1 text-sm text-blue-100">Manage reservations, reviews, and member claims</p>
            </div>
              <a href="/members" className="rounded-xl border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20">
                × Back to Dashboard
            </a>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/70 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
            <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab("RESERVED")}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                activeTab === "RESERVED"
                    ? "border-primary bg-primary text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary"
              }`}
            >
              Reserved Members ({reservedMembers.length})
            </button>
            <button
              onClick={() => setActiveTab("UNDER_REVIEW")}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                activeTab === "UNDER_REVIEW"
                    ? "border-primary bg-primary text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary"
              }`}
            >
              Payments Under Review ({underReviewMembers.length})
            </button>
            <button
              onClick={() => setActiveTab("CLAIM")}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                activeTab === "CLAIM"
                    ? "border-primary bg-primary text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary"
              }`}
            >
              Available Members for Claim ({claimableMembers.length})
            </button>
            </div>
          </div>

          {activeTab === "RESERVED" && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <p className="text-sm font-semibold inline-flex items-center gap-2">
                <ExclamationTriangleIcon className="h-4 w-4" />
                Payment Reminder
              </p>
              <p className="mt-1 text-xs">
                Complete payment before expiry to secure your reserved members. After expiry, all reserved members
                move to the claim pool.
              </p>
            </div>
          )}

          {activeTab === "UNDER_REVIEW" && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <p className="text-sm font-semibold inline-flex items-center gap-2">
                <ClockIcon className="h-4 w-4" />
                Under Review
              </p>
              <p className="mt-1 text-xs">
                These members have completed payment and are awaiting billing verification and admin approval.
              </p>
            </div>
          )}

          {activeTab === "CLAIM" && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-blue-900">
              <p className="text-sm font-semibold inline-flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Claim Available Members
              </p>
              <p className="mt-1 text-xs">
                {canClaimMembers
                  ? "These members are available for claiming after payment timeout. Claiming updates the member-agent assignment to you."
                  : "These members are visible for review. Only agents can claim them."}
              </p>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-blue-700">
                {activeTab === "RESERVED"
                  ? "Reserved"
                  : activeTab === "UNDER_REVIEW"
                    ? "Under Review"
                    : "Available to Claim"}
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{currentList.length}</p>
            </div>
            {activeTab === "RESERVED" && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700">Expiring Soon</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{expiringSoonCount}</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {isLoading && <p className="text-lg text-slate-500">Loading...</p>}
            {!isLoading && currentList.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                No members in this section right now.
              </div>
            )}

            {!isLoading &&
              currentList.map((record) => {
                const createdDate = new Date(record.createdAt);
                const expiresOn = new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                const daysLeft = Math.max(0, Math.ceil((expiresOn.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

                return (
                  <div key={record._id} className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
                    <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center">
                          <UserIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-base font-semibold text-slate-900">
                            {record.firstName} {record.lastName}
                            <span className="ml-2 rounded-md bg-emerald-500 px-1.5 py-0.5 text-[10px] text-white">LHR</span>
                          </p>
                          <p className="text-xs text-slate-600">ID: {memberIdByUserId[record._id] || formatMemberId(1)}</p>
                          <p className="text-xs text-slate-600">
                            Agent: {record.createdBy?.firstName || ""} {record.createdBy?.lastName || ""}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        {activeTab === "CLAIM" ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Claim</span>
                        ) : activeTab === "UNDER_REVIEW" ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Under Review</span>
                        ) : (
                          <>
                            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700">Reserved</span>
                            <p className="mt-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 inline-flex items-center gap-1">
                              <ClockIcon className="h-3.5 w-3.5" />
                              {daysLeft} days left
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-2 px-3 py-2.5 md:grid-cols-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                        <p className="text-xs text-slate-600">Email</p>
                        <p className="text-sm text-slate-900">{record.email || "-"}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                        <p className="text-xs text-slate-600">Phone</p>
                        <p className="text-sm text-slate-900">{record.phone || "-"}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                        <p className="text-xs text-slate-600">Reserved Date</p>
                        <p className="text-sm text-slate-900 inline-flex items-center gap-1">
                          <CalendarDaysIcon className="h-3.5 w-3.5 text-violet-600" />
                          {formatDateTime(record.createdAt)}
                        </p>
                      </div>
                    </div>

                    {activeTab === "RESERVED" && (
                      <div className="px-3 pb-2.5">
                        <div className="rounded-xl border border-red-200 bg-red-50 p-2 max-w-sm">
                          <p className="text-xs text-red-600">Expires On</p>
                          <p className="text-sm font-semibold text-red-700">{formatDateTime(expiresOn)}</p>
                        </div>
                      </div>
                    )}

                    <div className="border-t border-slate-200 px-3 py-2 flex flex-wrap gap-2">
                      {activeTab === "RESERVED" && (
                        <>
                          <button
                            onClick={() => handleGetPaymentLink(record)}
                            disabled={actionUserId === record._id}
                            className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition hover:bg-secondary disabled:opacity-60"
                          >
                            <LinkIcon className="h-3.5 w-3.5" />
                            {actionUserId === record._id ? "Working..." : "Get Payment Link"}
                          </button>
                          <button
                            onClick={() => handleSendLinkByEmail(record)}
                            disabled={actionUserId === record._id}
                            className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition hover:bg-emerald-700 disabled:opacity-60"
                          >
                            <PaperAirplaneIcon className="h-3.5 w-3.5" />
                            Send Link by Email
                          </button>
                        </>
                      )}

                      {activeTab === "UNDER_REVIEW" && (
                        <>
                          <span className="rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700">
                            Payment Under Review
                          </span>
                          {canConfirmPayment ? (
                            <button
                              onClick={() => handleConfirmPayment(record)}
                              disabled={actionUserId === record._id}
                              className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                            >
                              {actionUserId === record._id ? "Confirming..." : "Confirm Payment"}
                            </button>
                          ) : (
                            <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                              View Only
                            </span>
                          )}
                        </>
                      )}

                      {activeTab === "CLAIM" && canClaimMembers && (
                        <button
                          onClick={() => handleClaimMember(record)}
                          disabled={actionUserId === record._id}
                          className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-secondary disabled:opacity-60"
                        >
                          {actionUserId === record._id ? "Claiming..." : "Claim Member"}
                        </button>
                      )}

                      {activeTab === "CLAIM" && !canClaimMembers && (
                        <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                          View Only
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          {notification.text && (
            <div
              className={`rounded-xl px-4 py-3 text-sm font-medium ${
                notification.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
              }`}
            >
              {notification.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
