import { useState } from "react";
import {
  CheckCircleIcon,
  EllipsisVerticalIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  EyeIcon,
  PencilIcon,
  ArrowLeftIcon,
  PhotoIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

function getCreatedByName(ticket) {
  return `${ticket?.createdBy?.firstName || ""} ${ticket?.createdBy?.lastName || ""}`.trim() || "Creator";
}

function getMemberName(member) {
  return `${member?.firstName || ""} ${member?.lastName || ""}`.trim() || "Customer";
}

function getLawyerName(ticket) {
  return `${ticket?.assignedLawyer?.firstName || ""} ${ticket?.assignedLawyer?.lastName || ""}`.trim() || "-";
}

function getCustomerTicketNotes(ticket) {
  return ticket?.customerNotes || ticket?.description || "No notes added";
}

function getFileUrl(filePath) {
  if (!filePath) {
    return "";
  }

  if (/^https?:\/\//i.test(filePath)) {
    return filePath;
  }

  const baseURL = window.location.origin;
  return `${baseURL}${String(filePath).startsWith("/") ? filePath : `/${filePath}`}`;
}

function formatDate(value) {
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
}

function getPreviewFile(ticket) {
  const candidates = [ticket?.paymentSlipFile, ticket?.caseResultFile, ...(ticket?.ticketDocuments || [])].filter(Boolean);
  return candidates.find((file) => {
    const mimeType = String(file?.mimeType || "").toLowerCase();
    const url = String(file?.url || "");
    return mimeType.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(url);
  }) || null;
}

export default function MemberTicketsModal({
  isOpen,
  onClose,
  member,
  tickets,
  search,
  onSearchChange,
  isLoading,
  onEditTicket,
  onNavigateToEditTicket,
  userRole,
}) {
  const [activeActionTicketId, setActiveActionTicketId] = useState("");
  const [selectedTeamNoteTicket, setSelectedTeamNoteTicket] = useState(null);
  const [selectedNoteType, setSelectedNoteType] = useState("team");
  const [viewingTicket, setViewingTicket] = useState(null);
  const isTicketChecker = userRole === "TICKET CHECKER";

  if (!isOpen) {
    return null;
  }

  const query = String(search || "").trim().toLowerCase();
  const visibleTickets = tickets.filter((ticket) => {
    if (!query) {
      return true;
    }

    return [
      String(ticket.ticketId || "").toLowerCase(),
      String(ticket.ticketType || "").toLowerCase(),
      String(ticket.paymentStatus || "").toLowerCase(),
      String(ticket.teamNotes || "").toLowerCase(),
      getCreatedByName(ticket).toLowerCase(),
    ].some((value) => value.includes(query));
  });

  const memberName = getMemberName(member);
  const memberInitial = memberName.charAt(0).toUpperCase() || "C";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-3 lg:p-6">
      <div className="w-full max-w-[88vw] overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.2)]">
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-4 py-4 lg:flex-row lg:items-start lg:justify-between lg:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {memberInitial}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Tickets: {memberName}</h3>
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>{tickets.length} tickets</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full min-w-0 lg:w-80">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search tickets..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[78vh] overflow-y-auto">
          <div className={`grid ${isTicketChecker ? 'grid-cols-[1.1fr_1.3fr_0.8fr_0.9fr_0.8fr_0.7fr]' : 'grid-cols-[1.1fr_1.3fr_0.8fr_0.9fr_0.8fr]'} gap-4 border-b border-slate-200 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 lg:px-6`}>
            <p>Ticket Id</p>
            <p>Created By</p>
            <p>Type</p>
            <p>Payment Status</p>
            <p>View</p>
            {isTicketChecker && <p className="text-right">Actions</p>}
          </div>

          {isLoading ? (
            <div className="px-4 py-12 text-center text-sm text-slate-500 lg:px-6">Loading tickets...</div>
          ) : visibleTickets.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-slate-500 lg:px-6">No tickets found for this customer.</div>
          ) : (
            visibleTickets.map((ticket) => (
              <div
                key={ticket._id}
                className={`grid ${isTicketChecker ? 'grid-cols-[1.1fr_1.3fr_0.8fr_0.9fr_0.8fr_0.7fr]' : 'grid-cols-[1.1fr_1.3fr_0.8fr_0.9fr_0.8fr]'} items-center gap-4 border-b border-slate-100 px-4 py-4 text-sm last:border-b-0 lg:px-6`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">⌄</span>
                  <button
                    type="button"
                    onClick={() => onEditTicket?.(ticket)}
                    className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 font-semibold text-slate-800 transition hover:border-primary hover:text-primary"
                  >
                    #{ticket.ticketId || "-"}
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                    {(getCreatedByName(ticket).charAt(0) || "C").toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{getCreatedByName(ticket)}</p>
                    <p className="text-xs text-slate-500">Creator</p>
                  </div>
                </div>

                <div>
                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {ticket.ticketType || "Ticket"}
                  </span>
                </div>

                <div>
                  <span className={`inline-flex items-center gap-2 text-sm font-semibold ${ticket.paymentStatus === "Paid" ? "text-emerald-600" : "text-amber-600"}`}>
                    <CheckCircleIcon className="h-5 w-5" />
                    {ticket.paymentStatus || "Unpaid"}
                  </span>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setViewingTicket(ticket)}
                    className="flex items-center gap-1 rounded-lg bg-blue-500 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-600"
                  >
                    <EyeIcon className="h-3.5 w-3.5" />
                    View
                  </button>
                </div>

                {isTicketChecker && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        if (onNavigateToEditTicket) {
                          onNavigateToEditTicket(ticket);
                        } else {
                          onEditTicket?.(ticket);
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-secondary"
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {selectedTeamNoteTicket && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/65 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h4 className="text-sm font-semibold text-slate-900">
                {selectedNoteType === "customer" ? "Customer Note" : "Team Note"} - Ticket #{selectedTeamNoteTicket.ticketId || "-"}
              </h4>
              <button
                type="button"
                onClick={() => {
                  setSelectedTeamNoteTicket(null);
                  setSelectedNoteType("team");
                }}
                className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              <p className="whitespace-pre-wrap text-sm text-slate-700">
                {selectedNoteType === "customer"
                  ? getCustomerTicketNotes(selectedTeamNoteTicket)
                  : (selectedTeamNoteTicket.teamNotes || "No team note")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── TICKET VIEWING MODAL ── */}
      {viewingTicket && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/65 p-5 overflow-y-auto">
          <div className="w-full max-w-7xl rounded-3xl border border-slate-200 bg-white shadow-2xl my-8">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-10 py-7">
              <div>
                <h3 className="text-3xl font-bold text-slate-900">Ticket #{viewingTicket.ticketId || "-"}</h3>
                <p className="mt-1.5 text-base font-medium text-slate-600">{getCreatedByName(viewingTicket)}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingTicket(null)}
                className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-10">
              {/* 3-Column Grid Layout */}
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Left Column: Images & Files */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm">
                  <h4 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                    <PhotoIcon className="h-5 w-5 text-blue-600" />
                    Images & Files
                    {(() => {
                      const files = [
                        getPreviewFile(viewingTicket),
                        viewingTicket?.caseResultFile,
                        ...(viewingTicket?.ticketDocuments || [])
                      ].filter(Boolean);
                      return files.length > 0 ? (
                        <span className="ml-2 inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          {files.length} file{files.length !== 1 ? 's' : ''}
                        </span>
                      ) : null;
                    })()}
                  </h4>
                  <div className="space-y-3">
                    {(() => {
                      const previewFile = getPreviewFile(viewingTicket);
                      return previewFile ? (
                        <button
                          type="button"
                          onClick={() => window.open(getFileUrl(previewFile.url), "_blank")}
                          className="group relative w-full overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-primary"
                        >
                          <img
                            src={getFileUrl(previewFile.url)}
                            alt={previewFile.originalName || "Ticket preview"}
                            className="h-56 w-full object-cover transition group-hover:opacity-75"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/0 transition group-hover:bg-slate-900/50 group-hover:opacity-100">
                            <span className="text-white text-xs font-semibold opacity-0 group-hover:opacity-100">View</span>
                          </div>
                        </button>
                      ) : (
                        <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-slate-400">
                          <PhotoIcon className="h-7 w-7" />
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Middle Column: Court Details */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm">
                  <h4 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                    <DocumentTextIcon className="h-5 w-5 text-violet-600" />
                    Court Details
                  </h4>
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-100 bg-white p-4 text-sm shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Court Date</p>
                      <p className="mt-1.5 text-base font-semibold text-slate-900">{formatDate(viewingTicket.courtDate)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white p-4 text-sm shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Court Name</p>
                      <p className="mt-1.5 text-base font-semibold text-slate-900">{viewingTicket.courtName || "-"}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white p-4 text-sm shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned Lawyer</p>
                      <p className="mt-1.5 text-base font-semibold text-slate-900">{getLawyerName(viewingTicket)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white p-4 text-sm shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                      <div className="mt-1.5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${
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

                {/* Right Column: Notes & Documents */}
                <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm">
                  {/* Customer Notes */}
                  <div>
                    <h4 className="mb-2 text-sm font-bold text-slate-900">Customer Notes</h4>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedNoteType("customer");
                        setSelectedTeamNoteTicket(viewingTicket);
                      }}
                      className="w-full flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:bg-slate-100"
                    >
                      <p className="text-sm text-slate-600 flex-1">{getCustomerTicketNotes(viewingTicket)}</p>
                      <span className="flex-shrink-0 ml-2">
                        <DocumentTextIcon className="h-4 w-4 text-slate-400" />
                      </span>
                    </button>
                  </div>

                  {/* Team Notes */}
                  <div>
                    <h4 className="mb-2 text-sm font-bold text-slate-900">Team Notes</h4>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:bg-slate-100"
                      onClick={() => {
                        setSelectedNoteType("team");
                        setSelectedTeamNoteTicket(viewingTicket);
                      }}
                    >
                      <p className="text-sm text-slate-600 flex-1">{viewingTicket.teamNotes || "No notes available"}</p>
                      <span className="flex-shrink-0 ml-2">
                        <DocumentTextIcon className="h-4 w-4 text-slate-400" />
                      </span>
                    </button>
                  </div>

                  {/* Case Documents */}
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                    <h4 className="flex items-center gap-2 text-base font-bold text-orange-900 mb-4">
                      <DocumentTextIcon className="h-5 w-5" />
                      Case Documents
                    </h4>
                    {(() => {
                      const caseResultFile = viewingTicket?.caseResultFile?.url ? viewingTicket.caseResultFile : null;
                      const documents = Array.isArray(viewingTicket?.ticketDocuments) ? viewingTicket.ticketDocuments : [];
                      
                      if (!caseResultFile && documents.length === 0) {
                        return (
                          <div className="rounded-lg border border-dashed border-orange-200 bg-white p-4 text-center">
                              <p className="text-xs text-slate-600">N/A</p>
                              <p className="text-xs text-slate-500">Upload a PDF file</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2">
                          {caseResultFile && (
                            <button
                              type="button"
                              onClick={() => window.open(getFileUrl(caseResultFile.url), "_blank")}
                              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-primary hover:bg-slate-50"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <DocumentTextIcon className="h-4 w-4 text-slate-400" />
                                  <div className="text-xs">
                                    <p className="font-medium text-slate-700">{caseResultFile.originalName || "Case Result"}</p>
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
                              onClick={() => window.open(getFileUrl(doc.url), "_blank")}
                              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-primary hover:bg-slate-50"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <DocumentTextIcon className="h-4 w-4 text-slate-400" />
                                  <div className="text-xs">
                                    <p className="font-medium text-slate-700">{doc.originalName || `Document ${idx + 1}`}</p>
                                  </div>
                                </div>
                                <span className="text-xs font-semibold text-primary">View</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
