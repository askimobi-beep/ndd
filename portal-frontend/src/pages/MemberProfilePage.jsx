import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeftIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  CreditCardIcon,
  BuildingLibraryIcon,
  DocumentTextIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import TopNavbar from "../components/TopNavbar";
import { API_BASE_URL, apiRequest } from "../utils/api";
import { getAuthUser, hasAnyRole } from "../utils/auth";

export default function MemberProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = getAuthUser();
  const isMemberSelfView = hasAnyRole(authUser?.role, ["CUSTOMER"]) && !id;
  const [member, setMember] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTicketsLoading, setIsTicketsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedNoteTicket, setSelectedNoteTicket] = useState(null);

  const memberIdDisplay = new URLSearchParams(location.search).get("memberId") || "";

  useEffect(() => {
    const loadMember = async () => {
      try {
        setIsLoading(true);
        const data = isMemberSelfView ? await apiRequest("/api/auth/me") : await apiRequest(`/api/users/${id}`);
        const resolvedMember = data.user;
        setMember(resolvedMember);

        if (resolvedMember?._id) {
          setIsTicketsLoading(true);
          const ticketData = await apiRequest(`/api/tickets?memberId=${encodeURIComponent(resolvedMember._id)}`);
          setTickets(Array.isArray(ticketData) ? ticketData : ticketData.tickets || []);
        } else {
          setTickets([]);
        }
      } catch (err) {
        setError(err.message || "Unable to load member profile");
      } finally {
        setIsTicketsLoading(false);
        setIsLoading(false);
      }
    };

    if (id || isMemberSelfView) {
      loadMember();
    }
  }, [id, isMemberSelfView]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f0f2f5]">
        <TopNavbar />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-slate-500">Loading member profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f0f2f5]">
        <TopNavbar />
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <UserIcon className="h-7 w-7" />
            </div>
            <p className="font-semibold text-red-700">{error || "Member not found"}</p>
            <button
              type="button"
              onClick={() => navigate(isMemberSelfView ? "/dashboard" : "/members")}
              className="mt-4 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-secondary"
            >
              {isMemberSelfView ? "Back to Profile" : "Back to Members"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const fullName = `${member.firstName || ""} ${member.lastName || ""}`.trim();
  const initials = `${String(member.firstName || "").charAt(0)}${String(member.lastName || "").charAt(0)}`.toUpperCase() || "??";

  const memberSinceDate = member.paymentConfirmedAt || member.subscriptionStartAt || member.createdAt;
  const memberSinceDisplay = memberSinceDate
    ? new Date(memberSinceDate).toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "-";

  const subscriptionStatus = (() => {
    if (!member.isActive) return "INACTIVE";
    const now = new Date();
    if (member.subscriptionEndAt && new Date(member.subscriptionEndAt) < now) return "EXPIRED";
    return "ACTIVE";
  })();

  const planLabel =
    member.customerPlan === "FLEET"
      ? "Fleet CDL Protection MONTHLY"
      : "Individual CDL Protection MONTHLY";

  const nextInvoiceDisplay = member.subscriptionEndAt
    ? new Date(member.subscriptionEndAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

  const paymentCardLabel =
    member.paymentMethod === "CREDIT_CARD"
      ? String(member?.paymentCard?.brand || "CARD").toUpperCase()
      : member.paymentMethod === "BANK_TRANSFER"
        ? "BANK"
        : null;

  const ticketColumns = [
    "T.ID",
    "Image",
    "Created By",
    "Court Date",
    "Court Name",
    "Lawyer",
    "Notes",
    "Case Result",
    "Status",
    "Actions",
  ];

  const formatDate = (value) => {
    if (!value) {
      return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getFileUrl = (filePath) => {
    if (!filePath) {
      return "";
    }

    if (/^https?:\/\//i.test(filePath)) {
      return filePath;
    }

    return `${API_BASE_URL}${String(filePath).startsWith("/") ? filePath : `/${filePath}`}`;
  };

  const getPreviewFile = (ticket) => {
    const candidates = [ticket?.paymentSlipFile, ticket?.caseResultFile, ...(ticket?.ticketDocuments || [])].filter(Boolean);
    return candidates.find((file) => {
      const mimeType = String(file?.mimeType || "").toLowerCase();
      const url = String(file?.url || "");
      return mimeType.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(url);
    }) || null;
  };

  const openFile = (file) => {
    const resolvedUrl = getFileUrl(file?.url);
    if (!resolvedUrl) {
      return;
    }

    window.open(resolvedUrl, "_blank", "noopener,noreferrer");
  };

  const getCreatedByName = (ticket) => {
    return `${ticket?.createdBy?.firstName || ""} ${ticket?.createdBy?.lastName || ""}`.trim() || "-";
  };

  const getLawyerName = (ticket) => {
    return `${ticket?.assignedLawyer?.firstName || ""} ${ticket?.assignedLawyer?.lastName || ""}`.trim() || "-";
  };

  const getCustomerTicketNotes = (ticket) => {
    return ticket?.customerNotes || ticket?.description || "No notes added";
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f2f5]">
      <TopNavbar />

      <div className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-[1600px] space-y-6">

          {/* ── PAGE HEADER ── */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(isMemberSelfView ? "/dashboard" : "/members")}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-primary hover:text-primary"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              {isMemberSelfView ? "Profile" : "Back"}
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Member Profile</h1>
              <p
                className={`mt-0.5 text-xs font-semibold ${
                  subscriptionStatus === "ACTIVE" ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                ●&nbsp;
                {subscriptionStatus === "ACTIVE"
                  ? "Active Member"
                  : subscriptionStatus === "EXPIRED"
                    ? "Subscription Expired"
                    : "Inactive Member"}
              </p>
            </div>
          </div>

          {/* ── MEMBERSHIP CARD ── */}
          <div
            className="relative w-full overflow-hidden rounded-3xl p-6 text-white shadow-2xl lg:p-8"
            style={{
              background: "linear-gradient(135deg, #0f2d7a 0%, #1e4bbd 45%, #2563eb 100%)",
            }}
          >
            {/* decorative circles */}
            <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/5" />
            <div className="absolute -bottom-8 right-20 h-28 w-28 rounded-full bg-white/5" />
            <div className="absolute -left-6 bottom-0 h-20 w-20 rounded-full bg-white/5" />

            {/* row 1 */}
            <div className="relative flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-base font-bold tracking-wide backdrop-blur-sm">
                    {initials}
                  </div>
                  {subscriptionStatus === "ACTIVE" && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-blue-700 bg-emerald-400" />
                  )}
                </div>
                <div>
                  <p className="text-lg font-extrabold tracking-wide">NDD</p>
                  <p className="text-xs font-semibold text-blue-200">
                    {memberIdDisplay || `#${String(member._id).slice(-6).toUpperCase()}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200">
                  Member Since
                </p>
                <p className="text-sm font-semibold leading-tight">{memberSinceDisplay}</p>
              </div>
            </div>

            {/* row 2 */}
            <div className="relative mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
                <div className="flex items-start gap-2">
                  <UserIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-200" />
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-blue-200">
                      Full Name
                    </p>
                    <p className="mt-0.5 text-sm font-semibold">{fullName || "-"}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
                <div className="flex items-start gap-2">
                  <PhoneIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-200" />
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-blue-200">
                      24/7 Support
                    </p>
                    <p className="mt-0.5 text-sm font-semibold">(888) 391-8415</p>
                    <p className="text-[9px] text-blue-300">Always available for assistance</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-blue-200">
                    Current Plan
                  </p>
                  <p className="mt-0.5 text-sm font-semibold">{member.customerPlan || "INDIVIDUAL"}</p>
                </div>
              </div>
              <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-blue-200">
                    Next Invoice
                  </p>
                  <p className="mt-0.5 text-sm font-semibold">{nextInvoiceDisplay}</p>
                </div>
              </div>
            </div>

            {/* row 3: email */}
            {member.email && (
              <div className="relative mt-3 flex items-center gap-2 px-1">
                <EnvelopeIcon className="h-3.5 w-3.5 flex-shrink-0 text-blue-300" />
                <p className="text-xs text-blue-200">{member.email}</p>
              </div>
            )}
          </div>

          {/* ── PAYMENT METHODS ── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-base font-bold text-slate-900">Payment Methods</h2>
            {paymentCardLabel ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div
                  className={`relative min-h-[210px] w-full overflow-hidden rounded-2xl p-5 text-white shadow-lg ${
                    member.paymentMethod === "CREDIT_CARD"
                      ? "bg-gradient-to-br from-[#1a3a8f] to-[#3b82f6]"
                      : "bg-gradient-to-br from-slate-700 to-slate-900"
                  }`}
                >
                  <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
                  <div className="absolute -bottom-3 right-10 h-14 w-14 rounded-full bg-white/10" />

                  <div className="flex items-start justify-between">
                    <p className="text-base font-extrabold tracking-widest">{paymentCardLabel}</p>
                    <div className="flex h-7 w-11 items-center justify-center rounded bg-white/20">
                      {member.paymentMethod === "CREDIT_CARD" ? (
                        <CreditCardIcon className="h-4 w-4 text-white" />
                      ) : (
                        <BuildingLibraryIcon className="h-4 w-4 text-white" />
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/60">
                      Card Number
                    </p>
                    <p className="mt-1 font-mono text-sm font-semibold tracking-[0.18em]">
                      •••• •••• •••• {member?.paymentCard?.last4 || "••••"}
                    </p>
                  </div>

                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-white/60">
                        Card Holder
                      </p>
                      <p className="text-sm font-semibold">{fullName || "-"}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-white/60">
                          Card Type
                      </p>
                        <p className="text-sm font-semibold">{member?.paymentCard?.cardType || "CREDIT"}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No payment method on file.</p>
            )}
          </div>

          {/* ── MEMBERSHIP INFORMATION ── */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-bold text-slate-900">Membership Information</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    {["Plan", "Status", "Frequency", "Next Invoice"].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-100">
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{planLabel}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                          subscriptionStatus === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {subscriptionStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">Billing monthly</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{nextInvoiceDisplay}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── CASES / TICKETS ── */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-bold text-slate-900">Cases / Tickets</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    {ticketColumns.map((h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isTicketsLoading ? (
                    <tr>
                      <td colSpan={ticketColumns.length} className="px-6 py-10 text-center text-sm text-slate-400">
                        Loading tickets...
                      </td>
                    </tr>
                  ) : tickets.length > 0 ? (
                    tickets.map((ticket) => {
                      const previewFile = getPreviewFile(ticket);
                      const caseResultFile = ticket?.caseResultFile?.url ? ticket.caseResultFile : null;
                      const primaryTicketFile = Array.isArray(ticket?.ticketDocuments) && ticket.ticketDocuments.length
                        ? ticket.ticketDocuments[0]
                        : null;

                      return (
                        <tr key={ticket._id} className="border-t border-slate-100 align-top">
                          <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-800">#{ticket.ticketId || "-"}</td>
                          <td className="px-4 py-4">
                            {previewFile ? (
                              <button
                                type="button"
                                onClick={() => openFile(previewFile)}
                                className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition hover:border-primary"
                              >
                                <img
                                  src={getFileUrl(previewFile.url)}
                                  alt={previewFile.originalName || "Ticket preview"}
                                  className="h-full w-full object-cover"
                                />
                              </button>
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
                                <PhotoIcon className="h-5 w-5" />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 text-slate-700">{getCreatedByName(ticket)}</td>
                          <td className="whitespace-nowrap px-4 py-4 text-slate-700">{formatDate(ticket.courtDate)}</td>
                          <td className="px-4 py-4 text-slate-700">{ticket.courtName || "-"}</td>
                          <td className="px-4 py-4 text-slate-700">{getLawyerName(ticket)}</td>
                          <td className="max-w-[220px] px-4 py-4 text-slate-700">
                            <button
                              type="button"
                              onClick={() => setSelectedNoteTicket(ticket)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                            >
                              <DocumentTextIcon className="h-4 w-4" />
                              View Notes
                            </button>
                          </td>
                          <td className="px-4 py-4">
                            {caseResultFile ? (
                              <button
                                type="button"
                                onClick={() => openFile(caseResultFile)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                              >
                                <DocumentTextIcon className="h-4 w-4" />
                                View Result
                              </button>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                                ticket.status === "Closed"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : ticket.status === "Cancelled"
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {ticket.status || "-"}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            {primaryTicketFile ? (
                              <button
                                type="button"
                                onClick={() => openFile(primaryTicketFile)}
                                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-secondary"
                              >
                                <DocumentTextIcon className="h-4 w-4" />
                                Open
                              </button>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr className="border-t border-slate-100">
                      {ticketColumns.map((column) => (
                        <td key={column} className="px-4 py-6 text-slate-300">-</td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {selectedNoteTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-base font-semibold text-slate-900">Ticket Notes #{selectedNoteTicket.ticketId || "-"}</h3>
              <button
                type="button"
                onClick={() => setSelectedNoteTicket(null)}
                className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 p-4 text-sm">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-slate-700">{getCustomerTicketNotes(selectedNoteTicket)}</p>
              </div>
              {!isMemberSelfView && (
                <div className="rounded-xl border border-slate-200 bg-amber-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Team Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-amber-800">{selectedNoteTicket.teamNotes || "No team note"}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
