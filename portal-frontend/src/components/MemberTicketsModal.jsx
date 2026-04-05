import {
  CheckCircleIcon,
  EllipsisVerticalIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

function getCreatedByName(ticket) {
  return `${ticket?.createdBy?.firstName || ""} ${ticket?.createdBy?.lastName || ""}`.trim() || "Creator";
}

function getMemberName(member) {
  return `${member?.firstName || ""} ${member?.lastName || ""}`.trim() || "Customer";
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
}) {
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
      getCreatedByName(ticket).toLowerCase(),
    ].some((value) => value.includes(query));
  });

  const memberName = getMemberName(member);
  const memberInitial = memberName.charAt(0).toUpperCase() || "C";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-3 lg:p-6">
      <div className="w-full max-w-6xl overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.2)]">
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

        <div className="max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-[1.2fr_1.4fr_0.9fr_1fr_0.5fr] gap-4 border-b border-slate-200 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 lg:px-6">
            <p>Ticket Id</p>
            <p>Created By</p>
            <p>Type</p>
            <p>Payment Status</p>
            <p className="text-right">Actions</p>
          </div>

          {isLoading ? (
            <div className="px-4 py-12 text-center text-sm text-slate-500 lg:px-6">Loading tickets...</div>
          ) : visibleTickets.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-slate-500 lg:px-6">No tickets found for this customer.</div>
          ) : (
            visibleTickets.map((ticket) => (
              <div
                key={ticket._id}
                className="grid grid-cols-[1.2fr_1.4fr_0.9fr_1fr_0.5fr] items-center gap-4 border-b border-slate-100 px-4 py-4 text-sm last:border-b-0 lg:px-6"
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

                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => onEditTicket?.(ticket)}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <EllipsisVerticalIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
