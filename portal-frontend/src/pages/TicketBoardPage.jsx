import { useEffect, useMemo, useState } from "react";
import TopNavbar from "../components/TopNavbar";
import { API_BASE_URL, apiRequest } from "../utils/api";
import CreateTicketModal from "../components/CreateTicketModal";
import MemberTicketsModal from "../components/MemberTicketsModal";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  EnvelopeIcon,
  XMarkIcon,
  CalendarDaysIcon,
  UserIcon,
  BuildingOffice2Icon,
  PhoneIcon,
  CheckCircleIcon,
  PaperClipIcon,
  ClockIcon,
  DocumentIcon,
  PencilSquareIcon,
  ClipboardDocumentListIcon,
  TagIcon,
} from "@heroicons/react/24/outline";

export default function TicketBoardPage() {
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All Tickets");
  const [selectedOffice, setSelectedOffice] = useState("Lahore");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [memberEmail, setMemberEmail] = useState("");
  const [showLookupModal, setShowLookupModal] = useState(false);
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
  const [showMemberTicketsModal, setShowMemberTicketsModal] = useState(false);
  const [memberTicketSearch, setMemberTicketSearch] = useState("");
  const [memberTicketsSubject, setMemberTicketsSubject] = useState(null);
  const [isMemberTicketsLoading, setIsMemberTicketsLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [lookupSuccess, setLookupSuccess] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [searchedMember, setSearchedMember] = useState(null);
  const [memberInvoices, setMemberInvoices] = useState([]);
  const [isInvoicesLoading, setIsInvoicesLoading] = useState(false);
  const [courtDate, setCourtDate] = useState("");
  const [ticketFiles, setTicketFiles] = useState([]);
  const [isTicketSubmitting, setIsTicketSubmitting] = useState(false);
  const [isTicketUpdating, setIsTicketUpdating] = useState(false);
  const [boardNotification, setBoardNotification] = useState({ text: "", type: "success" });
  const [lawyers, setLawyers] = useState([]);
  const [editFormData, setEditFormData] = useState({
    courtDate: "",
    courtName: "",
    status: "Pending",
    paymentStatus: "Unpaid",
    courtDateType: "",
    ticketType: "Ticket",
    assignedLawyer: "",
    customerNotes: "",
    teamNotes: "",
  });
  const [editFiles, setEditFiles] = useState({
    caseResultPdf: null,
    paymentSlip: null,
  });
  const [previewFile, setPreviewFile] = useState(null);
  const [showCustomerProfileModal, setShowCustomerProfileModal] = useState(false);
  const [customerProfileData, setCustomerProfileData] = useState(null);
  const [customerProfileLoading, setCustomerProfileLoading] = useState(false);

  const filterOptions = [
    "All Tickets",
    "New",
    "Pending",
    "In Progress",
    "Self Pay",
    "Closed",
    "Cancelled",
    "Next 15 Days",
    "Custom Range",
  ];

  const offices = ["Lahore"];

  useEffect(() => {
    loadTickets();
    loadLawyers();
  }, []);

  const loadTickets = async () => {
    try {
      setIsLoading(true);
      const data = await apiRequest("/api/tickets", {
        method: "GET",
      });
      setTickets(Array.isArray(data) ? data : data.tickets || []);
    } catch (error) {
      console.error("Error loading tickets:", error);
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLawyers = async () => {
    try {
      const data = await apiRequest("/api/users?role=LAWYER");
      setLawyers(Array.isArray(data.users) ? data.users : []);
    } catch {
      setLawyers([]);
    }
  };

  const getEntityId = (value) => {
    if (!value) {
      return "";
    }

    if (typeof value === "object") {
      return String(value._id || value.id || "");
    }

    return String(value);
  };

  const getTicketCustomerName = (ticket) => {
    const member = ticket?.memberId && typeof ticket.memberId === "object" ? ticket.memberId : null;
    const fallbackName = `${member?.firstName || ""} ${member?.lastName || ""}`.trim();
    return ticket?.customerName || fallbackName || "-";
  };

  const getTicketCustomerPhone = (ticket) => {
    const member = ticket?.memberId && typeof ticket.memberId === "object" ? ticket.memberId : null;
    return ticket?.customerPhone || member?.phone || "-";
  };

  const filteredTickets = tickets.filter((ticket) => {
    const searchTerm = search.toLowerCase();
    const matchesSearch =
      (ticket.ticketId?.toString().includes(searchTerm) || false) ||
      (getTicketCustomerName(ticket).toLowerCase().includes(searchTerm) || false) ||
      (ticket.customerEmail?.toLowerCase().includes(searchTerm) || false);

    let matchesFilter = true;
    if (selectedFilter !== "All Tickets") {
      matchesFilter = ticket.status === selectedFilter;
    }

    const matchesOffice = ticket.office === selectedOffice || selectedOffice === "Lahore";

    return matchesSearch && matchesFilter && matchesOffice;
  });

  const memberTickets = useMemo(() => {
    if (!searchedMember) {
      return [];
    }

    const memberId = String(searchedMember._id || "");
    const memberMail = String(searchedMember.email || "").toLowerCase();

    return tickets.filter((ticket) => {
      const ticketMemberId = getEntityId(ticket.memberId || ticket.customerId);
      const ticketMail = String(
        ticket.customerEmail ||
          (ticket.memberId && typeof ticket.memberId === "object" ? ticket.memberId.email : "")
      ).toLowerCase();
      return (memberId && ticketMemberId === memberId) || (memberMail && ticketMail === memberMail);
    });
  }, [searchedMember, tickets]);

  const visibleMemberTickets = useMemo(() => {
    if (!memberTicketsSubject) {
      return [];
    }

    const memberId = getEntityId(memberTicketsSubject);
    const memberMail = String(memberTicketsSubject.email || "").toLowerCase();

    return tickets.filter((ticket) => {
      const ticketMemberId = getEntityId(ticket.memberId || ticket.customerId);
      const ticketMail = String(
        ticket.customerEmail ||
          (ticket.memberId && typeof ticket.memberId === "object" ? ticket.memberId.email : "")
      ).toLowerCase();
      return (memberId && ticketMemberId === memberId) || (memberMail && ticketMail === memberMail);
    });
  }, [memberTicketsSubject, tickets]);

  const handleAddTicket = () => {
    setShowLookupModal(true);
    setMemberEmail("");
    setSearchedMember(null);
    setMemberInvoices([]);
    setLookupError("");
    setLookupSuccess("");
  };

  const handleSearchMember = async () => {
    if (!memberEmail.trim()) {
      setLookupError("Please enter a member email");
      setLookupSuccess("");
      return;
    }

    try {
      setLookupLoading(true);
      setLookupError("");
      setLookupSuccess("");

      const response = await apiRequest(
        `/api/users/search?email=${encodeURIComponent(memberEmail.trim())}`
      );

      if (response.user) {
        setSearchedMember(response.user);
        setLookupSuccess("Customer data retrieved successfully. No previous ticket available.");

        try {
          setIsInvoicesLoading(true);
          const invoiceData = await apiRequest(`/api/users/${response.user._id}/invoices`);
          setMemberInvoices(Array.isArray(invoiceData.invoices) ? invoiceData.invoices : []);
        } catch {
          setMemberInvoices([]);
        } finally {
          setIsInvoicesLoading(false);
        }
      } else {
        setSearchedMember(null);
        setMemberInvoices([]);
        setLookupError("Member not found");
      }
    } catch (error) {
      setSearchedMember(null);
      setMemberInvoices([]);
      setLookupError(error.message || "Error finding member");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleOpenCreateTicketModal = () => {
    if (!searchedMember) {
      setLookupError("Search a member first");
      return;
    }
    setShowCreateTicketModal(true);
    setCourtDate("");
    setTicketFiles([]);
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    const supportedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];

    const valid = files.filter(
      (file) => file.size <= 10 * 1024 * 1024 && supportedTypes.includes(file.type)
    );

    setTicketFiles(valid.slice(0, 7));
  };

  const handleSubmitTicket = async () => {
    if (!searchedMember || !courtDate || ticketFiles.length === 0) {
      return;
    }

    try {
      setIsTicketSubmitting(true);

      const formData = new FormData();
      formData.append("customerEmail", searchedMember.email || "");
      formData.append("memberId", searchedMember._id || "");
      formData.append(
        "customerName",
        `${searchedMember.firstName || ""} ${searchedMember.lastName || ""}`.trim()
      );
      formData.append("customerPhone", searchedMember.phone || "");
      formData.append("office", searchedMember.office || "Lahore");
      formData.append("courtDate", courtDate);
      formData.append("courtName", "");
      formData.append("caseType", "");
      formData.append("description", "");
      formData.append("status", "Pending");
      formData.append("paymentStatus", "Unpaid");

      ticketFiles.forEach((file) => {
        formData.append("ticketDocuments", file);
      });

      const response = await apiRequest("/api/tickets", {
        method: "POST",
        body: formData,
      });

      setBoardNotification({ text: "Ticket submitted successfully.", type: "success" });
      setShowCreateTicketModal(false);
      setShowLookupModal(false);
      setSearchedMember(null);
      setMemberEmail("");
      setTicketFiles([]);
      setCourtDate("");
      if (response?.ticket) {
        setTickets((prev) => [response.ticket, ...prev]);
      } else {
        await loadTickets();
      }
    } catch (error) {
      setBoardNotification({ text: error.message || "Unable to submit ticket", type: "error" });
    } finally {
      setIsTicketSubmitting(false);
    }
  };

  const resolveMemberRecord = async (source) => {
    if (!source) {
      return null;
    }

    if (!source.ticketId && source._id && source.email) {
      return source;
    }

    const sourceMember = source.memberId;
    if (sourceMember && typeof sourceMember === "object" && sourceMember._id) {
      return sourceMember;
    }

    const sourceMemberId = getEntityId(sourceMember || source._id);
    if (sourceMemberId && source.ticketId) {
      const response = await apiRequest(`/api/users/${sourceMemberId}`);
      if (response.user) {
        return response.user;
      }
    }

    const email = source.customerEmail || source.email;
    if (email) {
      const response = await apiRequest(`/api/users/search?email=${encodeURIComponent(email)}`);
      return response.user || null;
    }

    return null;
  };

  const openMemberTicketsModal = async (source) => {
    try {
      setIsMemberTicketsLoading(true);
      const userData = await resolveMemberRecord(source);

      if (!userData) {
        setBoardNotification({ text: "Customer not found", type: "error" });
        return;
      }

      setMemberTicketsSubject(userData);
      setMemberTicketSearch("");
      setShowMemberTicketsModal(true);
    } catch (error) {
      setBoardNotification({ text: error.message || "Unable to load customer tickets", type: "error" });
    } finally {
      setIsMemberTicketsLoading(false);
    }
  };

  const openCreateTicketForSource = async (source) => {
    try {
      const userData = await resolveMemberRecord(source);

      if (!userData) {
        setBoardNotification({ text: "Customer not found", type: "error" });
        return;
      }

      setSearchedMember(userData);
      setMemberEmail(userData.email || "");
      setCourtDate("");
      setTicketFiles([]);
      setShowCreateTicketModal(true);
    } catch (error) {
      setBoardNotification({ text: error.message || "Unable to prepare ticket creation", type: "error" });
    }
  };

  const handleEditTicket = (ticket) => {
    const formattedDate = ticket?.courtDate
      ? new Date(ticket.courtDate).toISOString().slice(0, 10)
      : "";

    setEditFormData({
      courtDate: formattedDate,
      courtName: ticket?.courtName || "",
      status: ticket?.status || "Pending",
      paymentStatus: ticket?.paymentStatus === "Paid" ? "Paid" : "Unpaid",
      courtDateType: ["Response", "Trial", "Appearance", "Timing"].includes(ticket?.courtDateType)
        ? ticket.courtDateType
        : "",
      ticketType: ticket?.ticketType === "Violation" ? "Violation" : "Ticket",
      assignedLawyer: ticket?.assignedLawyer?._id || ticket?.assignedLawyer || "",
      customerNotes: ticket?.customerNotes || "",
      teamNotes: ticket?.teamNotes || "",
    });
    setEditFiles({ caseResultPdf: null, paymentSlip: null });
    setSelectedTicket(ticket);
    setShowEditModal(true);
  };

  const handleEditInputChange = (event) => {
    const { name, value } = event.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditFileChange = (event, fieldName) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setEditFiles((prev) => ({ ...prev, [fieldName]: null }));
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const isTypeAllowed = allowedTypes.includes(file.type);
    const isSizeAllowed = file.size <= 10 * 1024 * 1024;

    if (!isTypeAllowed || !isSizeAllowed) {
      setBoardNotification({
        text: "Only image files (JPG, JPEG, PNG, WEBP) up to 10MB are allowed.",
        type: "error",
      });
      event.target.value = "";
      return;
    }

    setEditFiles((prev) => ({ ...prev, [fieldName]: file }));
  };

  const handleUpdateTicket = async () => {
    if (!selectedTicket?._id) {
      return;
    }

    try {
      setIsTicketUpdating(true);

      const formData = new FormData();
      formData.append("courtDate", editFormData.courtDate || "");
      formData.append("courtName", editFormData.courtName || "");
      formData.append("status", editFormData.status || "Pending");
      formData.append("paymentStatus", editFormData.paymentStatus === "Paid" ? "Paid" : "Unpaid");
      formData.append("courtDateType", editFormData.courtDateType || "");
      formData.append("ticketType", editFormData.ticketType === "Violation" ? "Violation" : "Ticket");
      formData.append("assignedLawyer", editFormData.assignedLawyer || "");
      formData.append("customerNotes", editFormData.customerNotes || "");
      formData.append("teamNotes", editFormData.teamNotes || "");

      if (editFiles.caseResultPdf) {
        formData.append("caseResultPdf", editFiles.caseResultPdf);
      }

      if (editFiles.paymentSlip) {
        formData.append("paymentSlip", editFiles.paymentSlip);
      }

      const response = await apiRequest(`/api/tickets/${selectedTicket._id}`, {
        method: "PATCH",
        body: formData,
      });

      if (response?.ticket) {
        setTickets((prev) =>
          prev.map((ticket) => (ticket._id === response.ticket._id ? response.ticket : ticket))
        );
      }

      setBoardNotification({ text: "Ticket updated successfully.", type: "success" });
      setShowEditModal(false);
      setSelectedTicket(null);
    } catch (error) {
      setBoardNotification({ text: error.message || "Unable to update ticket", type: "error" });
    } finally {
      setIsTicketUpdating(false);
    }
  };

  const handleDeleteTicket = async () => {
    try {
      await apiRequest(`/api/tickets/${selectedTicket._id}`, {
        method: "DELETE",
      });
      setTickets(tickets.filter((t) => t._id !== selectedTicket._id));
      setShowDeleteModal(false);
      setSelectedTicket(null);
    } catch (error) {
      alert("Error deleting ticket: " + error.message);
    }
  };

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

  const getRelativeLabel = (value) => {
    if (!value) {
      return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(Math.abs(diffMs) / 60000);
    if (minutes < 60) {
      return `${minutes || 1} minute${minutes === 1 ? "" : "s"} ${diffMs >= 0 ? "ago" : "left"}`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} hour${hours === 1 ? "" : "s"} ${diffMs >= 0 ? "ago" : "left"}`;
    }

    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ${diffMs >= 0 ? "ago" : "left"}`;
  };

  const isSoonDate = (value) => {
    if (!value) {
      return false;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return false;
    }

    const diff = date.getTime() - Date.now();
    return diff > 0 && diff <= 3 * 24 * 60 * 60 * 1000;
  };

  const getStatusTone = (status) => {
    if (status === "Closed") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (status === "Cancelled") {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    if (status === "In Progress") {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }
    return "bg-amber-50 text-amber-700 border-amber-200";
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

  const openFilePreview = (file) => {
    if (!file?.url) {
      return;
    }

    const resolvedUrl = getFileUrl(file.url);
    const mimeType = String(file.mimeType || "").toLowerCase();
    const isImage = mimeType.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(resolvedUrl);

    if (!isImage) {
      window.open(resolvedUrl, "_blank", "noopener,noreferrer");
      return;
    }

    setPreviewFile({
      url: resolvedUrl,
      name: file.originalName || file.fileName || "Image preview",
    });
  };

  const openCustomerOverlay = async (ticket) => {
    try {
      setCustomerProfileLoading(true);
      setCustomerProfileData(null);
      setShowCustomerProfileModal(true);

      let userData = null;
      if (ticket?.memberId) {
        const response = await apiRequest(`/api/users/${ticket.memberId}`);
        userData = response.user || null;
      }

      if (!userData && ticket?.customerEmail) {
        const response = await apiRequest(`/api/users/search?email=${encodeURIComponent(ticket.customerEmail)}`);
        userData = response.user || null;
      }

      if (!userData) {
        setBoardNotification({ text: "Customer not found", type: "error" });
        setShowCustomerProfileModal(false);
        return;
      }

      setCustomerProfileData(userData);
    } catch (error) {
      setBoardNotification({ text: error.message || "Unable to load customer details", type: "error" });
      setShowCustomerProfileModal(false);
    } finally {
      setCustomerProfileLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <TopNavbar />

      <div className="px-4 py-4 lg:px-6">
        {boardNotification.text && (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-xs font-semibold lg:text-sm ${
              boardNotification.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {boardNotification.text}
          </div>
        )}

        {/* Header */}
        <div className="mb-5 rounded-2xl border border-white/20 bg-gradient-to-r from-blue-600 to-blue-800 p-4 text-white lg:p-6">
          <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-xl font-semibold lg:text-2xl">Ticket Board</h2>
              <p className="mt-1 text-xs text-blue-100 lg:text-sm">
                Manage all tickets and track their status
              </p>
            </div>

            <button
              onClick={handleAddTicket}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-slate-100 lg:px-5 lg:py-3"
            >
              <PlusIcon className="h-4 w-4" />
              New Ticket
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="mb-4 rounded-xl border border-white/70 bg-white p-4 shadow-lg lg:p-5">
          <div className="space-y-3">
            {/* Status Filters */}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary lg:text-sm">
                Filter by Status
              </h3>
              <div className="flex flex-wrap gap-1.5 lg:gap-2">
                {filterOptions.map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setSelectedFilter(filter)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition lg:px-3 lg:py-2 lg:text-sm ${
                      selectedFilter === filter
                        ? "border border-primary bg-primary/10 text-primary"
                        : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-primary hover:bg-primary/5"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Office and Search Row */}
            <div className="grid gap-3 lg:grid-cols-2">
              {/* Office Location */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary lg:text-sm">
                  Office
                </h3>
                <div className="flex gap-2">
                  {offices.map((office) => (
                    <button
                      key={office}
                      onClick={() => setSelectedOffice(office)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition lg:px-4 lg:py-2 lg:text-sm ${
                        selectedOffice === office
                          ? "border border-primary bg-primary/10 text-primary"
                          : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-primary hover:bg-primary/5"
                      }`}
                    >
                      {office}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary lg:text-sm">
                  Search
                </h3>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Customer name…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 lg:py-2 lg:text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tickets */}
        <div className="space-y-4">
          <div className="rounded-xl border border-white/70 bg-white px-4 py-3 shadow-lg lg:px-5">
            <h3 className="text-xl font-semibold text-slate-900">Tickets</h3>
            <p className="text-xs text-slate-500">{filteredTickets.length} total tickets</p>
          </div>

          {filteredTickets.length > 0 ? (
            filteredTickets.map((ticket) => {
              const docs = Array.isArray(ticket.ticketDocuments) ? ticket.ticketDocuments : [];
              const createdByName =
                `${ticket?.createdBy?.firstName || ""} ${ticket?.createdBy?.lastName || ""}`.trim() ||
                "-";
              const assignedLawyerName =
                `${ticket?.assignedLawyer?.firstName || ""} ${ticket?.assignedLawyer?.lastName || ""}`.trim() ||
                "Not assigned";
              const courtDateSoon = isSoonDate(ticket.courtDate);

              return (
                <div
                  key={ticket._id}
                  className="overflow-hidden rounded-xl border border-white/70 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
                >
                  <div className="grid gap-2 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white p-2 lg:grid-cols-[1fr_0.95fr_0.75fr_1.05fr]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-extrabold tracking-tight text-slate-900">#{ticket.ticketId || "-"}</span>
                        <span className="rounded-md bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">LHR</span>
                      </div>
                      <div className="mt-1.5 space-y-1 text-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Customer</p>
                        <p className="text-[15px] font-semibold text-slate-900">{getTicketCustomerName(ticket)}</p>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Phone</p>
                        <p className="text-sm font-semibold text-slate-800">{getTicketCustomerPhone(ticket)}</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Court Name</p>
                      <p className="text-sm font-semibold text-slate-900">{ticket.courtName || "-"}</p>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Court Date</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{formatDate(ticket.courtDate)}</p>
                          {courtDateSoon && (
                            <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">Soon</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Court Date Type</p>
                        <p className="text-sm font-semibold uppercase text-slate-800">{ticket.courtDateType || "-"}</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</p>
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase ${getStatusTone(ticket.status)}`}>
                          {ticket.status || "Pending"}
                        </span>
                        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase text-emerald-700">
                          {ticket.paymentStatus || "Unpaid"}
                        </span>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Created By</p>
                        <p className="text-sm font-semibold text-slate-900">{createdByName}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1"><TagIcon className="h-3.5 w-3.5" />{ticket.ticketType || "Ticket"}</span>
                        <span className="font-semibold text-blue-600">{docs.length} files</span>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Actions</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => openMemberTicketsModal(ticket)}
                          className="rounded-xl border border-primary/20 bg-primary/10 px-2.5 py-2 text-[11px] font-semibold text-primary transition hover:bg-primary/15"
                        >
                          View Customer Tickets
                        </button>
                        <button
                          onClick={() => openCreateTicketForSource(ticket)}
                          className="rounded-xl border border-primary/20 bg-primary/10 px-2.5 py-2 text-[11px] font-semibold text-primary transition hover:bg-primary/15"
                        >
                          Add New Ticket
                        </button>
                        <button
                          onClick={() => {
                            if (ticket?.paymentSlipFile?.url) {
                              openFilePreview(ticket.paymentSlipFile);
                              return;
                            }
                            setBoardNotification({ text: "No payment slip uploaded", type: "error" });
                          }}
                          className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                        >
                          Slip
                        </button>
                        <button
                          onClick={() => openCustomerOverlay(ticket)}
                          className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                        >
                          View Customer Profile
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleEditTicket(ticket)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-3 py-2 text-[11px] font-semibold text-white transition hover:opacity-95"
                        >
                          <PencilSquareIcon className="h-3.5 w-3.5" />
                          Update Ticket
                        </button>
                        <button
                          onClick={() => { setSelectedTicket(ticket); setShowDeleteModal(true); }}
                          className="inline-flex items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          Delete Ticket
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2 p-2 lg:grid-cols-[0.95fr_1.1fr_0.95fr]">
                    <div className="rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
                        <DocumentIcon className="h-4 w-4 text-blue-600" />
                        <p className="text-sm font-semibold text-slate-800">Files & Documents</p>
                      </div>
                      <div className="space-y-2 p-3">
                        <p className="text-xs text-slate-500">{docs.length} file{docs.length === 1 ? "" : "s"}</p>
                        {docs.length ? (
                          docs.map((doc, index) => (
                            <a
                              key={`${doc.fileName || doc.originalName}-${index}`}
                              href={getFileUrl(doc.url) || "#"}
                              onClick={(event) => {
                                event.preventDefault();
                                openFilePreview(doc);
                              }}
                              className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:border-primary hover:text-primary"
                            >
                              <span className="truncate">{doc.originalName || `Doc ${index + 1}`}</span>
                              <span className="text-xs">Open</span>
                            </a>
                          ))
                        ) : (
                          <p className="rounded border border-dashed border-slate-300 px-3 py-8 text-center text-sm text-slate-400">
                            No files uploaded
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
                        <ClipboardDocumentListIcon className="h-4 w-4 text-violet-600" />
                        <p className="text-sm font-semibold text-slate-800">Ticket Summary</p>
                      </div>
                      <div className="space-y-3 p-3 text-sm">
                        <div>
                          <p className="text-[11px] uppercase text-slate-500">Ticket Type</p>
                          <p className="font-semibold text-slate-900">{ticket.ticketType || "Ticket"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase text-slate-500">Assigned Lawyer</p>
                          <p className="font-semibold text-teal-700">{assignedLawyerName}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase text-slate-500">Customer Notes</p>
                          <p className="line-clamp-3 text-sm text-slate-600">{ticket.customerNotes || "No customer notes added"}</p>
                        </div>
                        <button
                          onClick={() => handleEditTicket(ticket)}
                          className="w-full rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
                        >
                          Upload Case Result
                        </button>
                        <div>
                          <p className="text-[11px] uppercase text-slate-500">Payment</p>
                          <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase text-emerald-700">
                            {ticket.paymentStatus || "Unpaid"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
                        <ClockIcon className="h-4 w-4 text-emerald-600" />
                        <p className="text-sm font-semibold text-slate-800">Timeline & Activity</p>
                      </div>
                      <div className="space-y-2 p-3">
                        <div className="rounded border border-slate-200 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold uppercase text-slate-700">Created</p>
                            <p className="text-xs font-semibold text-blue-600">{getRelativeLabel(ticket.createdAt)}</p>
                          </div>
                          <p className="text-sm font-semibold text-slate-800">{formatDate(ticket.createdAt)}</p>
                          <p className="text-xs text-slate-500">By: {createdByName}</p>
                        </div>

                        <div className="rounded border border-slate-200 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold uppercase text-slate-700">Court Date</p>
                            {courtDateSoon && <p className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">Soon</p>}
                          </div>
                          <p className="text-sm font-semibold text-slate-800">{formatDate(ticket.courtDate)}</p>
                          <p className="text-xs text-amber-600">{ticket.courtDate ? getRelativeLabel(ticket.courtDate) : "-"}</p>
                        </div>

                        <div className="rounded border border-slate-200 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold uppercase text-slate-700">Last Updated</p>
                            <p className="text-xs font-semibold text-emerald-600">{getRelativeLabel(ticket.updatedAt)}</p>
                          </div>
                          <p className="text-sm font-semibold text-slate-800">{formatDate(ticket.updatedAt)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-lg border border-white/70 bg-white px-4 py-8 text-center shadow-lg">
              <p className="text-sm text-slate-600">{isLoading ? "Loading tickets..." : "No tickets found"}</p>
            </div>
          )}
        </div>
      </div>

      {/* Member Search + Summary Modal (Image 1 style) */}
      {showLookupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 lg:p-6">
          <div className="max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3 lg:px-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 lg:text-2xl">Create New Ticket</h3>
                <p className="text-xs text-slate-500 lg:text-sm">Search customer then create ticket</p>
              </div>
              <button
                onClick={() => setShowLookupModal(false)}
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-4 lg:space-y-5 lg:p-6">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <EnvelopeIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={memberEmail}
                    onChange={(event) => setMemberEmail(event.target.value)}
                    placeholder="member@email.com"
                    className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <button
                  onClick={handleSearchMember}
                  disabled={lookupLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <MagnifyingGlassIcon className="h-4 w-4" />
                  {lookupLoading ? "Searching..." : "Search"}
                </button>
              </div>

              {lookupError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {lookupError}
                </div>
              )}

              {lookupSuccess && (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  <CheckCircleIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{lookupSuccess}</span>
                </div>
              )}

              {searchedMember && (
                <>
                  <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
                    <div className="rounded-lg border border-slate-200">
                      <div className="rounded-t-lg bg-primary px-3 py-2 text-sm font-semibold text-white">
                        Customer Information
                      </div>
                      <div className="space-y-3 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h4 className="text-xl font-bold uppercase text-slate-900">
                              {`${searchedMember.firstName || ""} ${searchedMember.lastName || ""}`.trim() || "N/A"}
                            </h4>
                            <p className="text-xs text-slate-500">Member ID: {searchedMember.memberId || searchedMember._id?.slice(-5) || "N/A"}</p>
                          </div>
                          <span className="inline-flex items-center rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Active Member
                          </span>
                        </div>

                        <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                          <div className="space-y-2">
                            <p className="flex items-center gap-2"><EnvelopeIcon className="h-4 w-4 text-slate-400" />{searchedMember.email || "N/A"}</p>
                            <p className="flex items-center gap-2"><PhoneIcon className="h-4 w-4 text-slate-400" />{searchedMember.phone || "N/A"}</p>
                            <p className="flex items-center gap-2"><BuildingOffice2Icon className="h-4 w-4 text-slate-400" />{searchedMember.office || "Lahore"}</p>
                          </div>
                          <div className="space-y-2">
                            <p className="flex items-center gap-2"><UserIcon className="h-4 w-4 text-slate-400" />Agent: {searchedMember.createdBy?.firstName || "N/A"} {searchedMember.createdBy?.lastName || ""}</p>
                            <p className="flex items-center gap-2"><CalendarDaysIcon className="h-4 w-4 text-slate-400" />Member Since: {searchedMember.createdAt ? new Date(searchedMember.createdAt).toLocaleString() : "N/A"}</p>
                          </div>
                        </div>

                        <div className="border-t border-slate-200 pt-3 text-sm text-slate-700">
                          <p className="font-semibold">Current Plan</p>
                          <p className="capitalize">{searchedMember.planType || "individual"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-lg border border-slate-200 p-3">
                        <p className="text-xs font-semibold text-slate-500">Total Tickets</p>
                        <p className="mt-1 text-3xl font-bold text-slate-900">{memberTickets.length}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-3">
                        <p className="text-xs font-semibold text-slate-500">Total Invoices</p>
                        <p className="mt-1 text-3xl font-bold text-slate-900">{memberInvoices.length}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                        <p className="text-sm font-semibold text-slate-700">Previous Tickets ({memberTickets.length})</p>
                      </div>
                      <div className="p-4">
                        {memberTickets.length === 0 ? (
                          <p className="text-center text-sm text-slate-400">No previous tickets found</p>
                        ) : (
                          <div className="space-y-2">
                            {memberTickets.slice(0, 3).map((ticket) => (
                              <div key={ticket._id} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                                <p className="font-semibold text-slate-800">{ticket.ticketId || "N/A"}</p>
                                <p className="text-xs text-slate-500">{ticket.status || "Pending"}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                        <p className="text-sm font-semibold text-slate-700">Billing History ({memberInvoices.length})</p>
                      </div>
                      <div className="p-4">
                        {isInvoicesLoading ? (
                          <p className="text-sm text-slate-400">Loading invoices...</p>
                        ) : memberInvoices.length === 0 ? (
                          <p className="text-sm text-slate-400">No billing records found</p>
                        ) : (
                          <div className="space-y-2">
                            {memberInvoices.slice(0, 2).map((invoice) => (
                              <div key={invoice._id || invoice.invoiceNumber} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-semibold text-slate-800">{invoice.invoiceNumber || "Invoice"}</p>
                                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                    {String(invoice.status || "PAID").toUpperCase()}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500">Amount: {invoice.totalAmount || invoice.amount || "-"}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                      <PlusIcon className="h-6 w-6" />
                    </div>
                    <h4 className="text-lg font-semibold text-slate-800">Ready to Create Ticket?</h4>
                    <p className="text-sm text-slate-500">
                      Create a new ticket for {`${searchedMember.firstName || ""} ${searchedMember.lastName || ""}`.trim() || "this member"}
                    </p>
                    <button
                      onClick={handleOpenCreateTicketModal}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-secondary"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Create New Ticket
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <CreateTicketModal
        isOpen={showCreateTicketModal}
        onClose={() => setShowCreateTicketModal(false)}
        member={searchedMember}
        courtDate={courtDate}
        onCourtDateChange={setCourtDate}
        ticketFiles={ticketFiles}
        onFileChange={handleFileChange}
        onSubmit={handleSubmitTicket}
        isSubmitting={isTicketSubmitting}
      />

      <MemberTicketsModal
        isOpen={showMemberTicketsModal}
        onClose={() => setShowMemberTicketsModal(false)}
        member={memberTicketsSubject}
        tickets={visibleMemberTickets}
        search={memberTicketSearch}
        onSearchChange={setMemberTicketSearch}
        isLoading={isMemberTicketsLoading}
        onEditTicket={handleEditTicket}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="border-b border-slate-200 px-4 py-3 lg:px-5 lg:py-4">
              <h3 className="text-base font-semibold text-slate-900 lg:text-lg">
                Delete Ticket?
              </h3>
            </div>

            <div className="p-4 lg:p-5">
              <p className="text-xs text-slate-600 lg:text-sm">
                Delete ticket <strong>{selectedTicket?.ticketId}</strong>? This action cannot be undone.
              </p>

              <div className="mt-4 flex gap-2 lg:mt-5 lg:gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 lg:text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteTicket}
                  className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 lg:text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Profile Modal */}
      {showCustomerProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 lg:p-6">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3 lg:px-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 lg:text-xl">Customer Profile</h3>
                <p className="text-xs text-slate-500">Member account information</p>
              </div>
              <button
                onClick={() => { setShowCustomerProfileModal(false); setCustomerProfileData(null); }}
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 lg:p-6">
              {customerProfileLoading && (
                <p className="py-10 text-center text-sm text-slate-500">Loading customer profile...</p>
              )}
              {!customerProfileLoading && customerProfileData && (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <h4 className="text-2xl font-bold uppercase text-slate-900">
                        {`${customerProfileData.firstName || ""} ${customerProfileData.lastName || ""}`.trim() || "N/A"}
                      </h4>
                      <p className="text-xs text-slate-500">Member ID: {customerProfileData.memberId || customerProfileData._id?.slice(-6) || "N/A"}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${customerProfileData.isActive ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-rose-300 bg-rose-50 text-rose-700"}`}>
                      {customerProfileData.isActive ? "Active Member" : "Inactive Member"}
                    </span>
                  </div>

                  {/* Details Grid */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Contact</p>
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <EnvelopeIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <span className="break-all">{customerProfileData.email || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <PhoneIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <span>{customerProfileData.phone || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <BuildingOffice2Icon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <span>{customerProfileData.office || "Lahore"}</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Account Details</p>
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <UserIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <span>Agent: {customerProfileData.createdBy?.firstName || "N/A"} {customerProfileData.createdBy?.lastName || ""}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <CalendarDaysIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <span>Joined: {customerProfileData.createdAt ? new Date(customerProfileData.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A"}</span>
                      </div>
                      <div className="text-sm text-slate-700">
                        <span className="font-medium">Plan: </span>
                        <span className="capitalize">{customerProfileData.customerPlan || "Individual"}</span>
                      </div>
                    </div>
                  </div>

                  {/* License Info */}
                  {(customerProfileData.licenseNo || customerProfileData.dot || customerProfileData.state) && (
                    <div className="rounded-xl border border-slate-200 p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">Documents</p>
                      <div className="flex flex-wrap gap-3 text-sm text-slate-700">
                        {customerProfileData.licenseNo && (
                          <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">License: {customerProfileData.licenseNo}</span>
                        )}
                        {customerProfileData.dot && (
                          <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">DOT: {customerProfileData.dot}</span>
                        )}
                        {customerProfileData.state && (
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">State: {customerProfileData.state}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {customerProfileData.address && (
                    <div className="rounded-xl border border-slate-200 p-4">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Address</p>
                      <p className="text-sm text-slate-700">{customerProfileData.address}</p>
                    </div>
                  )}
                </div>
              )}
              {!customerProfileLoading && !customerProfileData && (
                <p className="py-10 text-center text-sm text-slate-500">Customer not found.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Ticket Modal */}
      {showEditModal && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="max-h-[95vh] w-full max-w-6xl overflow-y-auto rounded-[28px] border border-white/70 bg-gradient-to-b from-slate-50 via-white to-slate-50 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
            <div className="flex items-start justify-between border-b border-slate-200 bg-gradient-to-r from-primary/5 to-secondary/5 px-5 py-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r from-primary to-secondary text-white shadow-md">
                    <PencilSquareIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-900">Edit Ticket</h3>
                    <p className="text-sm text-slate-500">Update ticket information and case details</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 p-5 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/70 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-primary">
                    <CalendarDaysIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900">Basic Information</h4>
                    <p className="text-xs text-slate-500">Core ticket details</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Court Date</label>
                    <input
                      type="date"
                      name="courtDate"
                      value={editFormData.courtDate}
                      onChange={handleEditInputChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Court Name</label>
                    <input
                      type="text"
                      name="courtName"
                      value={editFormData.courtName}
                      onChange={handleEditInputChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Portal Status</label>
                    <select
                      name="status"
                      value={editFormData.status}
                      onChange={handleEditInputChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="New">New</option>
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Self Pay">Self Pay</option>
                      <option value="Closed">Closed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Payment Status</label>
                    <select
                      name="paymentStatus"
                      value={editFormData.paymentStatus}
                      onChange={handleEditInputChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="Paid">Paid</option>
                      <option value="Unpaid">Unpaid</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Court Date Type</label>
                    <select
                      name="courtDateType"
                      value={editFormData.courtDateType}
                      onChange={handleEditInputChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Select Type</option>
                      <option value="Response">Response</option>
                      <option value="Trial">Trial</option>
                      <option value="Appearance">Appearance</option>
                      <option value="Timing">Timing</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Ticket Type</label>
                    <select
                      name="ticketType"
                      value={editFormData.ticketType}
                      onChange={handleEditInputChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="Ticket">Ticket</option>
                      <option value="Violation">Violation</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/70 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900">Assignment & Notes</h4>
                    <p className="text-xs text-slate-500">Lawyer and case notes</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Assign to Lawyer</label>
                    <select
                      name="assignedLawyer"
                      value={editFormData.assignedLawyer}
                      onChange={handleEditInputChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Unassigned</option>
                      {lawyers.map((lawyer) => (
                        <option key={lawyer._id} value={lawyer._id}>
                          {`${lawyer.firstName || ""} ${lawyer.lastName || ""}`.trim()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Customer Notes</label>
                    <textarea
                      name="customerNotes"
                      value={editFormData.customerNotes}
                      onChange={handleEditInputChange}
                      rows={6}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Team Notes (Internal)</label>
                    <textarea
                      name="teamNotes"
                      value={editFormData.teamNotes}
                      onChange={handleEditInputChange}
                      rows={6}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/70 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <PaperClipIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900">File Attachments</h4>
                    <p className="text-xs text-slate-500">Upload documents</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Case Result Image</label>
                    <label className="block cursor-pointer rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4 text-center text-sm text-slate-600 transition hover:border-primary hover:bg-primary/5">
                      Drop image here or click to browse
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        onChange={(event) => handleEditFileChange(event, "caseResultPdf")}
                        className="hidden"
                      />
                    </label>
                    {selectedTicket.caseResultFile?.url && (
                      <button
                        type="button"
                        onClick={() => openFilePreview(selectedTicket.caseResultFile)}
                        className="mt-1 inline-block text-xs font-semibold text-primary underline"
                      >
                        View current case result
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Payment Slip</label>
                    <label className="block cursor-pointer rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4 text-center text-sm text-slate-600 transition hover:border-primary hover:bg-primary/5">
                      Drop image here or click to browse
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        onChange={(event) => handleEditFileChange(event, "paymentSlip")}
                        className="hidden"
                      />
                    </label>
                    {selectedTicket.paymentSlipFile?.url && (
                      <button
                        type="button"
                        onClick={() => openFilePreview(selectedTicket.paymentSlipFile)}
                        className="mt-1 inline-block text-xs font-semibold text-primary underline"
                      >
                        View current payment slip
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 bg-white/80 px-5 py-4">
              <p className="text-xs text-slate-500">All fields marked with * are required</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateTicket}
                  disabled={isTicketUpdating}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  {isTicketUpdating ? "Updating..." : "Update Ticket"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewFile && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/80 p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <p className="truncate text-sm font-semibold text-slate-900">{previewFile.name}</p>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="flex max-h-[80vh] items-center justify-center bg-slate-100 p-4">
              <img src={previewFile.url} alt={previewFile.name} className="max-h-[72vh] w-auto rounded-xl object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
