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
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
  PencilIcon,
  TicketIcon,
  CheckBadgeIcon,
  XMarkIcon,
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
  const isTicketChecker = hasAnyRole(authUser?.role, ["TICKET CHECKER"]);
  const [member, setMember] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTicketsLoading, setIsTicketsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedNoteTicket, setSelectedNoteTicket] = useState(null);
  const [expandedTicketId, setExpandedTicketId] = useState(null);
  const [viewingTicket, setViewingTicket] = useState(null);

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
                    <p className="mt-0.5 text-sm font-semibold">
                      <a href="tel:+18883150322" className="hover:underline">+1 888-315-0322</a>
                    </p>
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
            <h2 className="mb-5 flex items-center gap-2 text-base font-bold text-slate-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <CreditCardIcon className="h-5 w-5" />
              </span>
              Payment Methods
            </h2>
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
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <CheckBadgeIcon className="h-5 w-5" />
                </span>
                Membership &amp; Subscription
              </h2>
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
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                    <TicketIcon className="h-5 w-5" />
                  </span>
                  Cases / Tickets
                </h2>
              </div>
              {isTicketsLoading ? (
                <div className="px-6 py-10 text-center text-sm text-slate-400">
                  Loading tickets...
                </div>
              ) : tickets.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {tickets.map((ticket) => (
                    <div key={ticket._id}>
                      {/* ── TICKET LIST ITEM (COLLAPSED VIEW) ── */}
                      <div className="flex items-center justify-between px-6 py-4 transition hover:bg-slate-50">
                        <div className="flex flex-1 items-center gap-4">
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-900"># {ticket.ticketId || "-"}</p>
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Created By</p>
                            <p className="text-sm font-medium text-slate-700">{getCreatedByName(ticket)}</p>
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Type</p>
                            <p className="text-sm font-medium text-slate-700">Ticket</p>
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Payment Status</p>
                            <div className="mt-0.5">
                              <span className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">
                                Unpaid
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="ml-4 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingTicket(ticket)}
                            className="flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-600"
                          >
                            <EyeIcon className="h-4 w-4" />
                            View
                          </button>
                          {isTicketChecker && (
                            <button
                              type="button"
                            onClick={() => navigate(`/ticket-board?ticketId=${viewingTicket._id}`)}
                              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-secondary"
                            >
                              <PencilIcon className="h-4 w-4" />
                              Edit
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setExpandedTicketId(expandedTicketId === ticket._id ? null : ticket._id)}
                            className="ml-2 flex items-center"
                          >
                            {expandedTicketId === ticket._id ? (
                              <ChevronUpIcon className="h-5 w-5 text-slate-400" />
                            ) : (
                              <ChevronDownIcon className="h-5 w-5 text-slate-400" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* ── TICKET DETAILS (EXPANDED VIEW) ── */}
                      {expandedTicketId === ticket._id && (
                        <div className="border-t border-slate-100 px-6 py-6">
                          <div className="space-y-6">
                            {/* Images & Files */}
                            <div>
                              <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 mb-4">
                                <PhotoIcon className="h-5 w-5" />
                                Images & Files
                              </h3>
                              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                {(() => {
                                  const previewFile = getPreviewFile(ticket);
                                  return previewFile ? (
                                    <button
                                      type="button"
                                      onClick={() => openFile(previewFile)}
                                      className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 hover:border-primary"
                                    >
                                      <img
                                        src={getFileUrl(previewFile.url)}
                                        alt={previewFile.originalName || "Ticket preview"}
                                        className="h-32 w-full object-cover transition group-hover:opacity-75"
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/0 transition group-hover:bg-slate-900/50 group-hover:opacity-100">
                                        <span className="text-white text-xs font-semibold opacity-0 group-hover:opacity-100">View</span>
                                      </div>
                                    </button>
                                  ) : (
                                    <div className="flex h-32 items-center justify-center rounded-xl border border-slate-200 border-dashed bg-slate-50 text-slate-400">
                                      <PhotoIcon className="h-6 w-6" />
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Court Details */}
                            <div>
                              <h3 className="text-base font-bold text-slate-900 mb-4">Court Details</h3>
                              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Court Date</p>
                                  <p className="mt-1 text-sm font-medium text-slate-700">{formatDate(ticket.courtDate)}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Court Name</p>
                                  <p className="mt-1 text-sm font-medium text-slate-700">{ticket.courtName || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned Lawyer</p>
                                  <p className="mt-1 text-sm font-medium text-slate-700">{getLawyerName(ticket)}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                                  <div className="mt-1">
                                    <span
                                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                                        ticket.status === "Closed"
                                          ? "bg-emerald-100 text-emerald-700"
                                          : ticket.status === "Cancelled"
                                            ? "bg-rose-100 text-rose-700"
                                            : "bg-yellow-100 text-yellow-700"
                                      }`}
                                    >
                                      {ticket.status || "PENDING"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Notes & Documents */}
                            <div>
                              <h3 className="text-base font-bold text-slate-900 mb-4">Notes & Documents</h3>
                              <div className="space-y-3">
                                <div className="rounded-xl border border-slate-200 bg-blue-50 p-4">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Customer Notes</p>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedNoteTicket(ticket)}
                                    className="mt-2 inline-flex items-center gap-2 rounded-lg border border-blue-300 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                                  >
                                    <DocumentTextIcon className="h-4 w-4" />
                                    Click to view notes
                                  </button>
                                </div>
                                {!isMemberSelfView && (
                                  <div className="rounded-xl border border-slate-200 bg-amber-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Team Notes</p>
                                    <p className="mt-2 text-sm text-amber-800">{ticket.teamNotes || "No notes available"}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Case Documents */}
                            <div>
                              <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 mb-4">
                                <DocumentTextIcon className="h-5 w-5" />
                                Case Documents
                              </h3>
                              <div className="space-y-2">
                                {(() => {
                                  const caseResultFile = ticket?.caseResultFile?.url ? ticket.caseResultFile : null;
                                  const documents = Array.isArray(ticket?.ticketDocuments) ? ticket.ticketDocuments : [];
                                  
                                  if (!caseResultFile && documents.length === 0) {
                                    return (
                                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                                        <p className="text-sm text-slate-500">Upload a PDF file</p>
                                      </div>
                                    );
                                  }

                                  return (
                                    <>
                                      {caseResultFile && (
                                        <button
                                          type="button"
                                          onClick={() => openFile(caseResultFile)}
                                          className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-primary hover:bg-slate-50"
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                              <DocumentTextIcon className="h-5 w-5 text-slate-400" />
                                              <div>
                                                <p className="text-sm font-semibold text-slate-700">{caseResultFile.originalName || "Case Result"}</p>
                                                <p className="text-xs text-slate-500">PDF Document</p>
                                              </div>
                                            </div>
                                            <span className="text-xs font-semibold text-primary">View</span>
                                          </div>
                                        </button>
                                      )}
                                      {documents.map((doc, idx) => (
                                        <button
                                          key={idx}
                                          type="button"
                                          onClick={() => openFile(doc)}
                                          className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-primary hover:bg-slate-50"
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                              <DocumentTextIcon className="h-5 w-5 text-slate-400" />
                                              <div>
                                                <p className="text-sm font-semibold text-slate-700">{doc.originalName || `Document ${idx + 1}`}</p>
                                                <p className="text-xs text-slate-500">{doc.mimeType || "Document"}</p>
                                              </div>
                                            </div>
                                            <span className="text-xs font-semibold text-primary">View</span>
                                          </div>
                                        </button>
                                      ))}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm text-slate-400">No tickets found</p>
                </div>
              )}
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

      {/* ── TICKET VIEWING MODAL ── */}
      {viewingTicket && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 lg:p-6">
          <div className="my-6 w-full max-w-7xl rounded-2xl border border-slate-200 bg-white shadow-2xl">

            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 px-8 py-6">
              <div>
                <h3 className="text-3xl font-bold text-slate-900">Ticket #{viewingTicket.ticketId || "-"}</h3>
                <p className="mt-1 text-sm text-slate-400">{getCreatedByName(viewingTicket)}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingTicket(null)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* 3-column body */}
            <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-3">

              {/* ── Col 1: Images & Files ── */}
              {(() => {
                const allFiles = [
                  viewingTicket?.paymentSlipFile,
                  viewingTicket?.caseResultFile,
                  ...(Array.isArray(viewingTicket?.ticketDocuments) ? viewingTicket.ticketDocuments : []),
                ].filter((f) => f?.url);
                const previewFile = getPreviewFile(viewingTicket);
                return (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                      <PhotoIcon className="h-5 w-5 text-slate-500" />
                      <h4 className="text-base font-bold text-slate-900">Images &amp; Files</h4>
                      {allFiles.length > 0 && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                          {allFiles.length} {allFiles.length === 1 ? "file" : "files"}
                        </span>
                      )}
                    </div>
                    {previewFile ? (
                      <button
                        type="button"
                        onClick={() => openFile(previewFile)}
                        className="group relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 hover:border-primary"
                      >
                        <img
                          src={getFileUrl(previewFile.url)}
                          alt={previewFile.originalName || "Ticket preview"}
                          className="h-72 w-full object-cover transition group-hover:opacity-80"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/0 transition group-hover:bg-slate-900/40">
                          <EyeIcon className="h-6 w-6 text-white opacity-0 transition group-hover:opacity-100" />
                        </div>
                        <p className="py-2 text-center text-xs text-slate-500">
                          {previewFile.originalName || "ticket file"}
                        </p>
                      </button>
                    ) : (
                      <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                        <PhotoIcon className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── Col 2: Court Details ── */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <DocumentTextIcon className="h-5 w-5 text-violet-500" />
                  <h4 className="text-base font-bold text-slate-900">Court Details</h4>
                </div>
                <div className="divide-y divide-slate-100">
                  <div className="py-3 first:pt-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Court Date</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{formatDate(viewingTicket.courtDate)}</p>
                  </div>
                  <div className="py-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Court Name</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{viewingTicket.courtName || "-"}</p>
                  </div>
                  <div className="py-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Assigned Lawyer</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{getLawyerName(viewingTicket)}</p>
                  </div>
                  <div className="py-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Status</p>
                    <div className="mt-1">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          viewingTicket.status === "Closed"
                            ? "bg-emerald-100 text-emerald-700"
                            : viewingTicket.status === "Cancelled"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {viewingTicket.status || "PENDING"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Col 3: Notes + Case Documents ── */}
              <div className="flex flex-col gap-4">

                {/* Customer Notes */}
                <div>
                  <p className="mb-1.5 text-sm font-bold text-slate-800">Customer Notes</p>
                  <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="flex-1 whitespace-pre-wrap text-sm text-slate-700">
                      {getCustomerTicketNotes(viewingTicket)}
                    </p>
                    <DocumentTextIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                  </div>
                </div>

                {/* Team Notes — hidden for customer self-view */}
                {!isMemberSelfView && (
                  <div>
                    <p className="mb-1.5 text-sm font-bold text-slate-800">Team Notes</p>
                    <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="flex-1 whitespace-pre-wrap text-sm text-slate-700">
                        {viewingTicket.teamNotes || "No notes available"}
                      </p>
                      <DocumentTextIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                    </div>
                  </div>
                )}

                {/* Case Documents */}
                {(() => {
                  const caseResultFile = viewingTicket?.caseResultFile?.url ? viewingTicket.caseResultFile : null;
                  const documents = Array.isArray(viewingTicket?.ticketDocuments) ? viewingTicket.ticketDocuments : [];
                  if (!caseResultFile && documents.length === 0) return null;
                  return (
                    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <DocumentTextIcon className="h-5 w-5 text-orange-600" />
                        <h4 className="text-sm font-bold text-orange-700">Case Documents</h4>
                      </div>
                      <div className="space-y-2">
                        {caseResultFile && (
                          <button
                            type="button"
                            onClick={() => openFile(caseResultFile)}
                            className="flex w-full items-center justify-between rounded-lg border border-orange-100 bg-white px-3 py-2 text-left transition hover:border-orange-300"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <DocumentTextIcon className="h-4 w-4 flex-shrink-0 text-slate-400" />
                              <p className="truncate text-xs font-semibold text-slate-700">
                                {caseResultFile.originalName || "Case Result"}
                              </p>
                            </div>
                            <span className="ml-2 flex-shrink-0 text-xs font-bold text-primary">View</span>
                          </button>
                        )}
                        {documents.map((doc, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => openFile(doc)}
                            className="flex w-full items-center justify-between rounded-lg border border-orange-100 bg-white px-3 py-2 text-left transition hover:border-orange-300"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <DocumentTextIcon className="h-4 w-4 flex-shrink-0 text-slate-400" />
                              <p className="truncate text-xs font-semibold text-slate-700">
                                {doc.originalName || `Document ${idx + 1}`}
                              </p>
                            </div>
                            <span className="ml-2 flex-shrink-0 text-xs font-bold text-primary">View</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
