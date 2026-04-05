import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  XCircleIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  DocumentIcon,
  EllipsisHorizontalIcon,
} from "@heroicons/react/24/outline";
import MemberTicketsModal from "../components/MemberTicketsModal";
import TopNavbar from "../components/TopNavbar";
import { API_BASE_URL, apiRequest } from "../utils/api";
import { getAuthUser, hasAnyRole } from "../utils/auth";

export default function MemberPage() {
  const user = getAuthUser();
  const navigate = useNavigate();
  const isAdmin = hasAnyRole(user?.role, ["ADMIN"]);
  const isSupervisor = hasAnyRole(user?.role, ["SUPERVISOR"]);
  const isTicketChecker = hasAnyRole(user?.role, ["TICKET CHECKER"]);
  const canManageMembers = hasAnyRole(user?.role, ["AGENT"]);
  const canViewMembers = hasAnyRole(user?.role, ["ADMIN", "SUPERVISOR", "AGENT", "TICKET CHECKER"]);
  const canConfirmPayment = isAdmin;
  const canViewBillingDetails = hasAnyRole(user?.role, ["ADMIN", "SUPERVISOR", "AGENT", "TICKET CHECKER"]);
  const canViewAllActionButtons = hasAnyRole(user?.role, ["ADMIN", "SUPERVISOR", "AGENT"]);
  const canUsePaymentMethodButton = canViewAllActionButtons;
  const canUseTicketsButton = canViewBillingDetails;
  const canUseMoreActionsMenu = hasAnyRole(user?.role, ["ADMIN", "SUPERVISOR", "AGENT"]);
  const canUseAdminSubscriptionActions = isAdmin;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState({ text: "", type: "success" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerPlan, setCustomerPlan] = useState("INDIVIDUAL");
  const [fleetTargetCount, setFleetTargetCount] = useState(2);
  const [fleetCustomers, setFleetCustomers] = useState([]);
  const [licenseFileName, setLicenseFileName] = useState("");
  const [editLicenseFileName, setEditLicenseFileName] = useState("");
  const [licenseFile, setLicenseFile] = useState(null);
  const [editLicenseFile, setEditLicenseFile] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editingUserId, setEditingUserId] = useState("");
  const [editFormData, setEditFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    office: "",
    licenseNo: "",
    dot: "",
    state: "",
    address: "",
  });
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInvoiceLoading, setIsInvoiceLoading] = useState(false);
  const [invoiceRows, setInvoiceRows] = useState([]);
  const [billingCustomer, setBillingCustomer] = useState(null);
  const [billingModalType, setBillingModalType] = useState("");
  const [moreActionsMemberId, setMoreActionsMemberId] = useState("");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("ALL");
  const [invoiceSort, setInvoiceSort] = useState("NEWEST");
  const [showMemberTicketsModal, setShowMemberTicketsModal] = useState(false);
  const [isMemberTicketsLoading, setIsMemberTicketsLoading] = useState(false);
  const [memberTicketsRows, setMemberTicketsRows] = useState([]);
  const [memberTicketsCustomer, setMemberTicketsCustomer] = useState(null);
  const [memberTicketsSearch, setMemberTicketsSearch] = useState("");
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [cancelledPlanFilter, setCancelledPlanFilter] = useState("ALL");
  const [formData, setFormData] = useState({
    office: "Lahore Office (LHR)",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    licenseNo: "",
    dot: "",
    state: "",
    address: "",
  });

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

  const getSubscriptionInsights = (record) => {
    const now = new Date();
    const start = record?.subscriptionStartAt ? new Date(record.subscriptionStartAt) : null;
    const end = record?.subscriptionEndAt ? new Date(record.subscriptionEndAt) : null;

    const hasTimeline = Boolean(start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()));

    if (!hasTimeline) {
      return {
        progressPercent: 0,
        daysRemaining: null,
        statusText: "Pending Activation",
      };
    }

    const totalDuration = Math.max(1, end.getTime() - start.getTime());
    const elapsed = Math.min(Math.max(now.getTime() - start.getTime(), 0), totalDuration);
    const progressPercent = Math.max(0, Math.min(100, Math.round((elapsed / totalDuration) * 100)));
    const daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      progressPercent,
      daysRemaining,
      statusText: end.getTime() < now.getTime() ? "Expired" : "Upcoming Renewal",
    };
  };

  const getPaymentMethodLabel = (value) => {
    if (value === "CREDIT_CARD") {
      return "Credit Card";
    }

    if (value === "BANK_TRANSFER") {
      return "Bank Transfer";
    }

    return "Not Set";
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

  const getInvoiceStatusCategory = (value) => {
    const status = String(value || "").trim().toUpperCase();

    if (status === "PAID") {
      return "PAID";
    }

    if (status === "OVERDUE") {
      return "OVERDUE";
    }

    if (status === "DRAFT") {
      return "DRAFT";
    }

    return "UNPAID";
  };

  const filteredInvoiceRows = useMemo(() => {
    const query = String(invoiceSearch || "").trim().toLowerCase();

    const rows = invoiceRows.filter((row) => {
      const statusCategory = getInvoiceStatusCategory(row.status);

      if (invoiceStatusFilter !== "ALL" && statusCategory !== invoiceStatusFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const invoiceId = String(row.invoiceNumber || "").toLowerCase();
      const paymentId = String(row._id || row.paymentId || "").toLowerCase();

      return invoiceId.includes(query) || paymentId.includes(query);
    });

    rows.sort((a, b) => {
      const aTime = new Date(a.issuedAt || 0).getTime();
      const bTime = new Date(b.issuedAt || 0).getTime();
      return invoiceSort === "NEWEST" ? bTime - aTime : aTime - bTime;
    });

    return rows;
  }, [invoiceRows, invoiceSearch, invoiceSort, invoiceStatusFilter]);

  const generatePassword = () => {
    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
    let generated = "";

    for (let index = 0; index < 10; index += 1) {
      generated += charset[Math.floor(Math.random() * charset.length)];
    }

    setFormData((prev) => ({ ...prev, password: generated }));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

  const handleLicenseChange = (event, isEdit = false) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      if (isEdit) {
        setEditLicenseFile(null);
        setEditLicenseFileName("");
      } else {
        setLicenseFile(null);
        setLicenseFileName("");
      }
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type) || file.size > 10 * 1024 * 1024) {
      setNotification({ text: "License image must be JPG, JPEG, PNG or WEBP and under 10MB.", type: "error" });
      event.target.value = "";
      return;
    }

    if (isEdit) {
      setEditLicenseFile(file);
      setEditLicenseFileName(file.name);
    } else {
      setLicenseFile(file);
      setLicenseFileName(file.name);
    }
  };

  const canSaveCurrentCustomer = useMemo(() => {
    return Boolean(
      String(formData.firstName || "").trim() &&
        String(formData.lastName || "").trim() &&
        String(formData.email || "").trim() &&
        String(formData.password || "").trim()
    );
  }, [formData]);

  const fleetCanSubmit = useMemo(() => {
    const currentDraftCount = canSaveCurrentCustomer ? 1 : 0;
    return fleetCustomers.length + currentDraftCount >= fleetTargetCount;
  }, [fleetCustomers.length, canSaveCurrentCustomer, fleetTargetCount]);

  const fleetBubbles = useMemo(() => {
    return Array.from({ length: fleetTargetCount }, (_, index) => {
      const step = index + 1;
      const hasCustomer = step <= fleetCustomers.length;
      const isCurrent = step === fleetCustomers.length + 1;
      return {
        step,
        hasCustomer,
        isCurrent,
      };
    });
  }, [fleetTargetCount, fleetCustomers.length]);

  const resetForm = () => {
    setFormData({
      office: "Lahore Office (LHR)",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      licenseNo: "",
      dot: "",
      state: "",
      address: "",
    });
    setFleetCustomers([]);
    setCustomerPlan("INDIVIDUAL");
    setFleetTargetCount(2);
    setLicenseFileName("");
    setLicenseFile(null);
  };

  const loadMembers = useCallback(async () => {
    if (!canViewMembers) {
      return;
    }

    try {
      setIsLoading(true);
      const data = await apiRequest("/api/users?role=CUSTOMER");
      setRecords(data.users || []);
    } catch (error) {
      setNotification({ text: error.message || "Unable to load members", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [canViewMembers]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = Date.now();

    return records.filter((record) => {
      const normalizedPlan = String(record.customerPlan || "INDIVIDUAL").trim().toUpperCase();

      if (quickFilter === "CANCELLED") {
        if (record.isActive) return false;
        if (cancelledPlanFilter === "FLEET" && normalizedPlan !== "FLEET") return false;
        if (cancelledPlanFilter === "INDIVIDUAL" && normalizedPlan !== "INDIVIDUAL") return false;
      } else {
        if (quickFilter === "PENDING" && (record.isApprovedByAdmin || !record.requiresAdminApproval)) {
          return false;
        }

        if (planFilter === "FLEET" && normalizedPlan !== "FLEET") {
          return false;
        }

        if (planFilter === "INDIVIDUAL" && normalizedPlan !== "INDIVIDUAL") {
          return false;
        }
      }

      if (dateFilter !== "ALL") {
        const createdAt = new Date(record.createdAt).getTime();
        const diffDays = (now - createdAt) / (1000 * 60 * 60 * 24);

        if (dateFilter === "LAST_WEEK" && diffDays > 7) {
          return false;
        }

        if (dateFilter === "LAST_MONTH" && diffDays > 30) {
          return false;
        }

        if (dateFilter === "LAST_YEAR" && diffDays > 365) {
          return false;
        }
      }

      if (!query) {
        return true;
      }

      const fullName = `${record.firstName || ""} ${record.lastName || ""}`.toLowerCase();
      return (
        fullName.includes(query) ||
        String(record.email || "").toLowerCase().includes(query) ||
        String(record.phone || "").toLowerCase().includes(query)
      );
    });
  }, [records, search, quickFilter, dateFilter, planFilter, cancelledPlanFilter]);

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

  const pendingCount = useMemo(
    () => records.filter((record) => !record.isApprovedByAdmin && record.requiresAdminApproval).length,
    [records]
  );

  const cancelledCount = useMemo(
    () => records.filter((record) => !record.isActive).length,
    [records]
  );

  const fleetCount = useMemo(
    () => records.filter((record) => String(record.customerPlan || "INDIVIDUAL").trim().toUpperCase() === "FLEET").length,
    [records]
  );

  const individualCount = useMemo(
    () => records.filter((record) => String(record.customerPlan || "INDIVIDUAL").trim().toUpperCase() === "INDIVIDUAL").length,
    [records]
  );

  const cancelledFleetCount = useMemo(
    () => records.filter((record) => !record.isActive && String(record.customerPlan || "INDIVIDUAL").trim().toUpperCase() === "FLEET").length,
    [records]
  );

  const cancelledIndividualCount = useMemo(
    () => records.filter((record) => !record.isActive && String(record.customerPlan || "INDIVIDUAL").trim().toUpperCase() === "INDIVIDUAL").length,
    [records]
  );

  const addFleetCustomer = () => {
    if (!canSaveCurrentCustomer) {
      setNotification({
        text: "First name, last name, email, and password are required before saving next member.",
        type: "error",
      });
      return;
    }

    const normalizedEmail = String(formData.email || "").trim().toLowerCase();
    const existingEmails = fleetCustomers.map((entry) => String(entry.email || "").trim().toLowerCase());

    if (existingEmails.includes(normalizedEmail)) {
      setNotification({ text: "Fleet members must have unique email addresses.", type: "error" });
      return;
    }

    setFleetCustomers((prev) => [
      ...prev,
      {
        ...formData,
        email: normalizedEmail,
      },
    ]);

    setFormData((prev) => ({
      ...prev,
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      let data;

      if (customerPlan === "INDIVIDUAL") {
        const submitData = new FormData();
        submitData.append("firstName", formData.firstName);
        submitData.append("lastName", formData.lastName);
        submitData.append("email", formData.email);
        submitData.append("password", formData.password);
        submitData.append("phone", formData.phone);
        submitData.append("office", formData.office);
        submitData.append("licenseNo", formData.licenseNo);
        submitData.append("dot", formData.dot);
        submitData.append("state", formData.state);
        submitData.append("address", formData.address);
        submitData.append("customerPlan", "INDIVIDUAL");

        if (licenseFile) {
          submitData.append("licenseDocuments", licenseFile);
        }

        data = await apiRequest("/api/users/customers", {
          method: "POST",
          body: submitData,
        });
      } else {
        const customersForSubmit = [...fleetCustomers];

        if (canSaveCurrentCustomer) {
          const currentEmail = String(formData.email || "").trim().toLowerCase();
          const existingEmails = customersForSubmit.map((entry) => String(entry.email || "").trim().toLowerCase());

          if (existingEmails.includes(currentEmail)) {
            setNotification({ text: "Fleet members must have unique email addresses.", type: "error" });
            setIsSubmitting(false);
            return;
          }

          customersForSubmit.push({
            ...formData,
            email: currentEmail,
          });
        }

        if (customersForSubmit.length < fleetTargetCount) {
          setNotification({ text: `Please add at least ${fleetTargetCount} members for fleet plan.`, type: "error" });
          setIsSubmitting(false);
          return;
        }

        data = await apiRequest("/api/users/customers/fleet", {
          method: "POST",
          body: JSON.stringify({
            customers: customersForSubmit.map((entry) => ({
              ...entry,
              customerPlan: "FLEET",
            })),
          }),
        });
      }

      setNotification({ text: data.message || "Member created successfully", type: "success" });
      setIsModalOpen(false);
      resetForm();
      setLicenseFile(null);
      await loadMembers();
    } catch (error) {
      setNotification({ text: error.message || "Unable to create member", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (record) => {
    setEditingUserId(record._id);
    setEditFormData({
      firstName: record.firstName || "",
      lastName: record.lastName || "",
      email: record.email || "",
      phone: record.phone || "",
      office: record.office || "",
      licenseNo: record.licenseNo || "",
      dot: record.dot || "",
      state: record.state || "",
      address: record.address || "",
    });
    setEditLicenseFileName("");
    setEditLicenseFile(null);
    setIsEditOpen(true);
  };

  const editingRecord = useMemo(
    () => records.find((item) => item._id === editingUserId) || null,
    [records, editingUserId]
  );

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();

    try {
      setIsEditSubmitting(true);
      const submitData = new FormData();
      Object.entries(editFormData).forEach(([key, value]) => {
        submitData.append(key, value || "");
      });

      if (editLicenseFile) {
        submitData.append("licenseDocuments", editLicenseFile);
      }

      const data = await apiRequest(`/api/users/${editingUserId}`, {
        method: "PATCH",
        body: submitData,
      });

      if (data.user) {
        setRecords((prev) => prev.map((record) => (record._id === data.user._id ? data.user : record)));
      }

      setNotification({ text: data.message || "Member updated successfully", type: "success" });
      setIsEditOpen(false);
    } catch (error) {
      setNotification({ text: error.message || "Unable to update member", type: "error" });
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const confirmPayment = async (record) => {
    try {
      const data = await apiRequest(`/api/users/${record._id}/payment-confirmation`, {
        method: "PATCH",
      });

      if (data.user) {
        setRecords((prev) => prev.map((item) => (item._id === data.user._id ? data.user : item)));
      }

      setNotification({ text: data.message || "Payment confirmed", type: "success" });
    } catch (error) {
      setNotification({ text: error.message || "Unable to confirm payment", type: "error" });
    }
  };

  const toggleMemberBlockStatus = async (record) => {
    try {
      const data = await apiRequest(`/api/users/${record._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !record.isActive }),
      });

      if (data.user) {
        setRecords((prev) => prev.map((item) => (item._id === data.user._id ? data.user : item)));
      }

      setNotification({
        text: data.user?.isActive ? "Member activated successfully" : "Member blocked successfully",
        type: "success",
      });
    } catch (error) {
      setNotification({ text: error.message || "Unable to update member status", type: "error" });
    } finally {
      setMoreActionsMemberId("");
    }
  };

  const cancelMemberSubscription = async (record) => {
    try {
      const data = await apiRequest(`/api/users/${record._id}/cancel-subscription`, {
        method: "PATCH",
      });

      if (data.user) {
        setRecords((prev) => prev.map((item) => (item._id === data.user._id ? data.user : item)));
      }

      setNotification({ text: data.message || "Subscription cancelled successfully", type: "success" });
    } catch (error) {
      setNotification({ text: error.message || "Unable to cancel subscription", type: "error" });
    } finally {
      setMoreActionsMemberId("");
    }
  };

  const openPaymentMethodModal = (record) => {
    setMoreActionsMemberId("");
    setBillingCustomer(record);
    setBillingModalType("PAYMENT_METHOD");
  };

  const openSubscriptionModal = (record) => {
    setMoreActionsMemberId("");
    setBillingCustomer(record);
    setBillingModalType("SUBSCRIPTION");
  };

  const openInvoiceModal = async (record) => {
    try {
      setMoreActionsMemberId("");
      setBillingCustomer(record);
      setBillingModalType("INVOICE");
      setIsInvoiceLoading(true);
      setInvoiceSearch("");
      setInvoiceStatusFilter("ALL");
      setInvoiceSort("NEWEST");
      const data = await apiRequest(`/api/users/${record._id}/invoices`);
      setInvoiceRows(data.invoices || []);
    } catch (error) {
      setNotification({ text: error.message || "Unable to load invoices", type: "error" });
      setBillingCustomer(null);
      setInvoiceRows([]);
      setBillingModalType("");
    } finally {
      setIsInvoiceLoading(false);
    }
  };

  const closeBillingModal = () => {
    setBillingModalType("");
    setBillingCustomer(null);
    setInvoiceRows([]);
    setInvoiceSearch("");
    setInvoiceStatusFilter("ALL");
    setInvoiceSort("NEWEST");
  };

  const openMemberTicketsModal = async (record) => {
    try {
      setIsMemberTicketsLoading(true);
      setMemberTicketsCustomer(record);
      setMemberTicketsRows([]);
      setMemberTicketsSearch("");
      setShowMemberTicketsModal(true);

      const data = await apiRequest(`/api/tickets?memberId=${encodeURIComponent(record._id)}`);
      setMemberTicketsRows(Array.isArray(data) ? data : data.tickets || []);
    } catch (error) {
      setNotification({ text: error.message || "Unable to load member tickets", type: "error" });
      setShowMemberTicketsModal(false);
      setMemberTicketsCustomer(null);
    } finally {
      setIsMemberTicketsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-accent">
      <TopNavbar />

      <div className="flex-1 px-6 py-8 lg:px-8">
        <div className="w-full space-y-8">
          <div className="rounded-[28px] bg-gradient-to-r from-primary via-secondary to-[#1f3c97] p-5 text-white shadow-[0_16px_40px_rgba(0,87,231,0.20)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold lg:text-3xl">Member Management</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
                  Manage member records and account access.
                </p>
              </div>

              {canManageMembers && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-base font-semibold text-primary transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-xl"
                >
                  <PlusIcon className="h-5 w-5" />
                  Add Member
                </button>
              )}
            </div>
          </div>

          {/* Quick Actions & Filters Section */}
          <div className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.08)] lg:p-8">
            <div className="space-y-6">
              {/* Quick Actions */}
              {!isTicketChecker && (
              <div className="flex flex-col gap-4">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Quick Actions</p>
                <div className="flex flex-wrap gap-3">
                  {!isSupervisor && !isTicketChecker && (
                    <>
                      <button
                        onClick={() => navigate("/pending-approvals")}
                        className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                          quickFilter === "PENDING"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-slate-300 bg-white text-slate-700 hover:border-primary hover:bg-primary/5 hover:text-primary"
                        }`}
                      >
                        <ExclamationCircleIcon className="h-4 w-4" />
                        Pending Approvals ({pendingCount})
                      </button>
                      <button
                        onClick={() => setQuickFilter((prev) => (prev === "CANCELLED" ? "ALL" : "CANCELLED"))}
                        className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                          quickFilter === "CANCELLED"
                            ? "border-rose-500 bg-rose-50 text-rose-700"
                            : "border-slate-300 bg-white text-slate-700 hover:border-primary hover:bg-primary/5 hover:text-primary"
                        }`}
                      >
                        <XCircleIcon className="h-4 w-4" />
                        Cancelled ({cancelledCount})
                      </button>
                      <button
                        onClick={() => navigate("/reservation-management")}
                        className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-secondary"
                      >
                        <DocumentIcon className="h-4 w-4" />
                        Reservation Management
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => navigate("/check-reservation")}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                    Check Reservation
                  </button>
                </div>
              </div>
              )}

              {/* Filters */}
              <div className="flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between sm:border-t-0 sm:pt-0">
                <div className="flex-1">
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Filters</p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-900">Search & Find Member</h3>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setDateFilter("LAST_WEEK")}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                        dateFilter === "LAST_WEEK"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary"
                      }`}
                    >
                      Last Week
                    </button>
                    <button
                      onClick={() => setDateFilter("LAST_MONTH")}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                        dateFilter === "LAST_MONTH"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary"
                      }`}
                    >
                      Last Month
                    </button>
                    <button
                      onClick={() => setDateFilter("LAST_YEAR")}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                        dateFilter === "LAST_YEAR"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary"
                      }`}
                    >
                      Last Year
                    </button>
                    {!isTicketChecker && (
                      <button
                        onClick={() => setDateFilter("ALL")}
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                          dateFilter === "ALL"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary"
                        }`}
                      >
                        All
                      </button>
                    )}
                  </div>
                  {!isTicketChecker && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPlanFilter((prev) => (prev === "FLEET" ? "ALL" : "FLEET"))}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                        planFilter === "FLEET"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary"
                      }`}
                    >
                      Fleet ({fleetCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlanFilter((prev) => (prev === "INDIVIDUAL" ? "ALL" : "INDIVIDUAL"))}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                        planFilter === "INDIVIDUAL"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary"
                      }`}
                    >
                      Individual ({individualCount})
                    </button>
                  </div>
                  )}
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10 sm:min-w-[240px]">
                    <MagnifyingGlassIcon className="h-5 w-5 flex-shrink-0 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search…"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.08)] lg:p-8">
            {notification.text && !isModalOpen && !isEditOpen && (
              <p className={`mb-6 rounded-2xl px-4 py-3 text-sm font-medium ${notification.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                {notification.text}
              </p>
            )}

            {quickFilter === "CANCELLED" ? (
              <>
                {/* Cancelled Members sub-page header */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => { setQuickFilter("ALL"); setCancelledPlanFilter("ALL"); }}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
                      >
                        ← Back
                      </button>
                      <h3 className="text-2xl font-semibold text-rose-700">Cancelled Members <span className="text-base font-medium text-slate-500">({filteredRecords.length} of {cancelledCount})</span></h3>
                    </div>
                    <p className="mt-1 text-sm text-slate-500 pl-16">Members whose subscriptions have been cancelled</p>
                  </div>
                  {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
                </div>

                {/* Cancelled plan sub-filters */}
                <div className="mb-6 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setCancelledPlanFilter("ALL")}
                    className={`rounded-xl border px-4 py-2 text-xs font-semibold transition ${
                      cancelledPlanFilter === "ALL"
                        ? "border-rose-500 bg-rose-50 text-rose-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-rose-400 hover:text-rose-600"
                    }`}
                  >
                    All Cancelled ({cancelledCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCancelledPlanFilter("FLEET")}
                    className={`rounded-xl border px-4 py-2 text-xs font-semibold transition ${
                      cancelledPlanFilter === "FLEET"
                        ? "border-rose-500 bg-rose-50 text-rose-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-rose-400 hover:text-rose-600"
                    }`}
                  >
                    Fleet ({cancelledFleetCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCancelledPlanFilter("INDIVIDUAL")}
                    className={`rounded-xl border px-4 py-2 text-xs font-semibold transition ${
                      cancelledPlanFilter === "INDIVIDUAL"
                        ? "border-rose-500 bg-rose-50 text-rose-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-rose-400 hover:text-rose-600"
                    }`}
                  >
                    Individual ({cancelledIndividualCount})
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-semibold text-slate-900">Member Records <span className="text-base font-medium text-slate-500">({records.length})</span></h3>
                {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
              </div>
            )}

            {canViewMembers && filteredRecords.length > 0 && (
              <div className="mt-6 space-y-4">
                {filteredRecords.map((record) => (
                  <div key={record._id} className="rounded-2xl border border-slate-200 p-6 hover:border-primary/50 transition">
                    {(() => {
                      const memberId = memberIdByUserId[record._id] || formatMemberId(1);

                      return (
                    <div className="grid gap-6 lg:grid-cols-5">
                      {/* User Information */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary mb-3 flex items-center gap-1">
                          👤 User Information
                        </p>
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{`${record.firstName || ""} ${record.lastName || ""}`.trim()}</p>
                            <p className="text-xs text-slate-500">ID: {memberId}</p>
                          </div>
                          <div>
                            <span className="inline-block rounded-full bg-emerald-50 text-emerald-700 px-2 py-1 text-xs font-semibold">{record.customerPlan || "INDIVIDUAL"}</span>
                          </div>
                          <div>
                            <p className="text-xs text-slate-600">Joined: {new Date(record.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                          </div>
                          {record.createdBy && (
                            <div>
                              <p className="text-xs font-semibold text-slate-600">Agent: {`${record.createdBy.firstName || ""} ${record.createdBy.lastName || ""}`.trim() || record.createdBy.email || "-"}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Contact Details */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-green-700 mb-3 flex items-center gap-1">
                          ✉️ Contact Details
                        </p>
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
                          {record.address && (
                            <div>
                              <p className="text-xs font-medium text-slate-600">Address</p>
                              <p className="text-xs text-slate-700">{record.address}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Documents */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-violet-700 mb-3 flex items-center gap-1">
                          📄 Documents
                        </p>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs font-medium text-slate-600">License</p>
                            <span className="inline-block rounded-full bg-purple-50 text-purple-700 px-2 py-1 text-xs font-medium">{record.licenseNo || "NO"}</span>
                              {Array.isArray(record.licenseFiles) && record.licenseFiles.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => window.open(getFileUrl(record.licenseFiles[0].url), "_blank", "noopener,noreferrer")}
                                  className="mt-2 block text-xs font-semibold text-primary underline"
                                >
                                  View License Image
                                </button>
                              )}
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

                      {/* Status */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700 mb-3 flex items-center gap-1">
                          🔔 Status
                        </p>
                        <div className="flex flex-col gap-2">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-slate-600">Approval</p>
                            <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${record.isApprovedByAdmin ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                              {record.isApprovedByAdmin ? "✓ Approved" : "⏳ Pending"}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-slate-600">Payment</p>
                            <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${record.paymentStatus === "PAID_APPROVED" ? "bg-emerald-50 text-emerald-700" : record.paymentStatus === "UNDER_REVIEW" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-700"}`}>
                              {getPaymentStatusLabel(record.paymentStatus)}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-slate-600">Status</p>
                            <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${record.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                              {record.isActive ? "● ACTIVE" : "● INACTIVE"}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-slate-500">Joined: {new Date(record.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                            {!record.isActive && (
                              <p className="text-xs text-rose-600">Cancelled: {new Date(record.updatedAt || record.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-700 mb-3 flex items-center gap-1">
                          ⚙️ Actions
                        </p>
                        <div className="relative flex flex-col gap-1">
                          {canViewBillingDetails && (
                            <>
                              {canUsePaymentMethodButton && (
                                <button
                                  type="button"
                                  onClick={() => openPaymentMethodModal(record)}
                                  className="rounded-lg bg-purple-500 text-white px-2.5 py-1.5 text-xs font-semibold transition hover:bg-purple-600"
                                >
                                  Payment Method
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openSubscriptionModal(record)}
                                className="rounded-lg bg-blue-500 text-white px-2.5 py-1.5 text-xs font-semibold transition hover:bg-blue-600"
                              >
                                Subscription
                              </button>
                              <button
                                type="button"
                                onClick={() => openInvoiceModal(record)}
                                className="rounded-lg bg-orange-500 text-white px-2.5 py-1.5 text-xs font-semibold transition hover:bg-orange-600"
                              >
                                Invoices
                              </button>
                            </>
                          )}
                          {canUseTicketsButton && (
                            <button
                              type="button"
                              onClick={() => openMemberTicketsModal(record)}
                              className="rounded-lg bg-green-500 text-white px-2.5 py-1.5 text-xs font-semibold transition hover:bg-green-600"
                            >
                              🎫 Tickets
                            </button>
                          )}
                          {canConfirmPayment && record.paymentStatus === "UNDER_REVIEW" && (
                            <button
                              type="button"
                              onClick={() => confirmPayment(record)}
                              className="rounded-lg bg-emerald-600 text-white px-2.5 py-1.5 text-xs font-semibold transition hover:bg-emerald-700"
                            >
                              Confirm Payment
                            </button>
                          )}
                          {canUseMoreActionsMenu && (
                            <>
                              <button
                                type="button"
                                onClick={() => setMoreActionsMemberId((prev) => (prev === record._id ? "" : record._id))}
                                className="rounded-lg border border-slate-300 text-slate-700 px-2.5 py-1.5 text-xs font-semibold transition hover:border-primary hover:text-primary flex items-center justify-center gap-1"
                              >
                                <EllipsisHorizontalIcon className="h-4 w-4" />
                                More Actions
                              </button>

                              {moreActionsMemberId === record._id && (
                                <div className="absolute right-0 top-[calc(100%+4px)] z-20 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      openEditModal(record);
                                      setMoreActionsMemberId("");
                                    }}
                                    className="w-full rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                                  >
                                    Edit Member
                                  </button>
                                  {canUseAdminSubscriptionActions && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => toggleMemberBlockStatus(record)}
                                        className={`mt-1 w-full rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-white transition ${record.isActive ? "bg-red-500 hover:bg-red-600" : "bg-emerald-600 hover:bg-emerald-700"}`}
                                      >
                                        {record.isActive ? "Block Member" : "Activate Member"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => cancelMemberSubscription(record)}
                                        className="mt-1 w-full rounded-lg bg-amber-500 px-2 py-1.5 text-left text-xs font-semibold text-white transition hover:bg-amber-600"
                                      >
                                        Cancel Subscription
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}

            {canViewMembers && !isLoading && filteredRecords.length === 0 && (
              <div className="mt-8 rounded-2xl border border-dashed border-primary/20 bg-slate-50 p-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <XCircleIcon className="h-8 w-8" />
                </div>
                <h4 className="mt-4 text-xl font-semibold text-slate-900">
                  {quickFilter === "CANCELLED" ? "No Cancelled Members Found" : "No Member Records Found"}
                </h4>
                <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
                  {quickFilter === "CANCELLED" ? "No cancelled members match the selected plan filter." : "Add a member from the top action button and it will appear here instantly."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 px-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-slate-900">Edit Member</h3>
              <button
                onClick={() => setIsEditOpen(false)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">First Name</label>
                  <input name="firstName" value={editFormData.firstName} onChange={handleEditChange} placeholder="First Name" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white" required />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Last Name</label>
                  <input name="lastName" value={editFormData.lastName} onChange={handleEditChange} placeholder="Last Name" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white" required />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                  <input name="email" value={editFormData.email} onChange={handleEditChange} placeholder="Email" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white" required />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Phone</label>
                  <input name="phone" value={editFormData.phone} onChange={handleEditChange} placeholder="Phone" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">License No</label>
                  <input name="licenseNo" value={editFormData.licenseNo} onChange={handleEditChange} placeholder="License Number" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">DOT</label>
                  <input name="dot" value={editFormData.dot} onChange={handleEditChange} placeholder="DOT" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">State</label>
                  <input name="state" value={editFormData.state} onChange={handleEditChange} placeholder="State" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Address</label>
                  <input name="address" value={editFormData.address} onChange={handleEditChange} placeholder="Full address" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white" />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Office</label>
                <input name="office" value={editFormData.office} onChange={handleEditChange} placeholder="Office" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white" />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-700">License Image</p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    id="edit-customer-license"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleLicenseChange(event, true)}
                  />
                  <label
                    htmlFor="edit-customer-license"
                    className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                  >
                    Add License Pic
                  </label>
                  <p className="text-xs text-slate-500">{editLicenseFileName || "No file selected"}</p>
                </div>
                {Array.isArray(editingRecord?.licenseFiles) && editingRecord?.licenseFiles?.[0]?.url && (
                  <button
                    type="button"
                    onClick={() => window.open(getFileUrl(editingRecord.licenseFiles[0].url), "_blank", "noopener,noreferrer")}
                    className="mt-2 text-xs font-semibold text-primary underline"
                  >
                    View current license image
                  </button>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsEditOpen(false)} className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-primary hover:text-primary">Cancel</button>
                <button type="submit" disabled={isEditSubmitting} className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-70">
                  {isEditSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {Boolean(billingModalType) && billingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 px-4">
          <div className={`w-full ${billingModalType === "INVOICE" ? "max-w-[1500px]" : "max-w-4xl"} rounded-3xl bg-white shadow-2xl`}>
            {billingModalType !== "INVOICE" && (
            <div className="flex items-center justify-between gap-4 p-6 sm:p-8">
              <div>
                <h3 className="text-2xl font-semibold text-slate-900">
                  {billingModalType === "PAYMENT_METHOD"
                    ? "Payment Method"
                    : billingModalType === "SUBSCRIPTION"
                      ? "Subscription"
                      : "Invoice History"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {`Member: ${`${billingCustomer.firstName || ""} ${billingCustomer.lastName || ""}`.trim() || "-"}`}
                </p>
              </div>
              <button
                onClick={closeBillingModal}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
              >
                Close
              </button>
            </div>
            )}

            {billingModalType === "PAYMENT_METHOD" && (
              <div className="mx-6 mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:mx-8 sm:mb-8">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Selected Method</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{getPaymentMethodLabel(billingCustomer.paymentMethod)}</p>
                <p className="mt-3 text-sm text-slate-600">Payment Status: {getPaymentStatusLabel(billingCustomer.paymentStatus)}</p>
              </div>
            )}

            {billingModalType === "SUBSCRIPTION" && (
              <div className="mx-6 mb-6 mt-6 space-y-5 sm:mx-8 sm:mb-8">
                {(() => {
                  const memberId = memberIdByUserId[billingCustomer._id] || formatMemberId(1);
                  const subscription = getSubscriptionInsights(billingCustomer);
                  const isApprovalGranted = !billingCustomer.requiresAdminApproval || billingCustomer.isApprovedByAdmin;
                  const accountIsActive = Boolean(billingCustomer.isActive && isApprovalGranted);

                  return (
                    <>
                      <div className="rounded-2xl border border-[#cfd8e3] bg-[#f3f5f9] p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-2xl font-semibold text-slate-900">{`${billingCustomer.firstName || ""} ${billingCustomer.lastName || ""}`.trim() || "Unknown Member"}</p>
                            <p className="mt-1 text-sm text-slate-600">ID: {memberId}</p>
                            <p className="mt-1 text-sm text-slate-600">{billingCustomer.email || "-"}</p>
                          </div>
                          <span className={`inline-flex w-fit items-center rounded-full px-4 py-2 text-sm font-semibold ${accountIsActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                            {accountIsActive ? "Active Account" : "Inactive Account"}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[#d8dee9] bg-[#f8fafc]">
                        <div className="flex items-center justify-between gap-3 border-b border-[#d8dee9] px-5 py-4">
                          <div>
                            <p className="text-xl font-semibold text-slate-900">{`${billingCustomer.customerPlan || "INDIVIDUAL"}-USA MONTHLY`}</p>
                            <p className="text-sm text-slate-500">ID: {String(billingCustomer._id || "").slice(0, 8) || "-"}</p>
                          </div>
                          <span className={`rounded-full px-4 py-1.5 text-sm font-semibold ${accountIsActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                            {accountIsActive ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </div>

                        <div className="space-y-4 px-5 py-4">
                          <div className="flex items-center justify-between text-sm text-slate-600">
                            <p>Billing Period Progress</p>
                            <p className="font-semibold">{subscription.progressPercent}%</p>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-blue-600 transition-all duration-500"
                              style={{ width: `${subscription.progressPercent}%` }}
                            />
                          </div>

                          <div className="grid gap-3 md:grid-cols-3">
                            <div className="rounded-xl bg-[#eef1f6] p-4 text-center">
                              <p className="text-sm font-medium text-slate-500">Start Date</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">{formatDateTime(billingCustomer.subscriptionStartAt)}</p>
                            </div>
                            <div className="rounded-xl bg-[#eef1f6] p-4 text-center">
                              <p className="text-sm font-medium text-slate-500">Next Billing</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">{formatDateTime(billingCustomer.subscriptionEndAt)}</p>
                            </div>
                            <div className="rounded-xl bg-[#f4f1dc] p-4 text-center">
                              <p className="text-sm font-medium text-slate-500">Status</p>
                              <p className="mt-1 text-base font-semibold text-amber-700">{subscription.statusText}</p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 border-t border-slate-200 pt-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                            <p>
                              {subscription.daysRemaining === null
                                ? "Subscription dates are not available"
                                : `${subscription.daysRemaining} days remaining`}
                            </p>
                            <p>Currency: USD</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[#cad5e6] bg-[#eaf0fb] p-5">
                        <h4 className="text-center text-xl font-semibold text-slate-900">Subscription Summary</h4>
                        <div className="mt-4 space-y-3 text-sm">
                          <div className="flex items-center justify-between border-b border-[#c9d7ee] pb-2">
                            <span className="text-slate-700">Total Active Subscriptions</span>
                            <span className="font-semibold text-slate-900">{accountIsActive ? "1" : "0"}</span>
                          </div>
                          <div className="flex items-center justify-between border-b border-[#c9d7ee] pb-2">
                            <span className="text-slate-700">Next Renewal</span>
                            <span className="font-semibold text-slate-900">{formatDateTime(billingCustomer.subscriptionEndAt)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-700">Member Since</span>
                            <span className="font-semibold text-slate-900">{formatDateTime(billingCustomer.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {billingModalType === "INVOICE" && (
              <div className="max-h-[88vh] overflow-y-auto rounded-3xl bg-[#f6f8fc]">
                <div className="border-b border-slate-200 bg-white px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-4xl font-bold tracking-tight text-slate-900">Member Subscription Invoices</h3>
                      <p className="mt-1 text-sm text-slate-500">Billing records for <span className="font-semibold text-primary">{`${billingCustomer.firstName || ""} ${billingCustomer.lastName || ""}`.trim() || "Member"}</span></p>
                    </div>
                    <button
                      type="button"
                      onClick={closeBillingModal}
                      className="text-sm font-semibold text-slate-500 transition hover:text-primary"
                    >
                      x Back to Dashboard
                    </button>
                  </div>
                </div>

                <div className="space-y-4 p-6">
                  <div className="grid gap-3 lg:grid-cols-4">
                    {[
                      { key: "PAID", label: "PAID", tone: "border-emerald-500", bg: "bg-emerald-50", text: "text-emerald-600" },
                      { key: "UNPAID", label: "UNPAID", tone: "border-amber-500", bg: "bg-amber-50", text: "text-amber-600" },
                      { key: "OVERDUE", label: "OVERDUE", tone: "border-rose-500", bg: "bg-rose-50", text: "text-rose-600" },
                      { key: "DRAFT", label: "DRAFT", tone: "border-slate-500", bg: "bg-slate-100", text: "text-slate-600" },
                    ].map((card) => {
                      const count = invoiceRows.filter((row) => getInvoiceStatusCategory(row.status) === card.key).length;
                      return (
                        <div key={card.key} className={`rounded-xl border-l-4 ${card.tone} bg-white p-4 shadow-sm`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold tracking-wide text-slate-500">{card.label}</p>
                              <p className={`mt-1 text-4xl font-bold ${card.text}`}>{count}</p>
                            </div>
                            <div className={`rounded-xl p-3 ${card.bg}`}>
                              <CheckCircleIcon className={`h-5 w-5 ${card.text}`} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:max-w-sm">
                          <MagnifyingGlassIcon className="h-4 w-4 text-slate-400" />
                          <input
                            value={invoiceSearch}
                            onChange={(event) => setInvoiceSearch(event.target.value)}
                            placeholder="Search invoices..."
                            className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                          />
                        </div>

                        <select
                          value={invoiceStatusFilter}
                          onChange={(event) => setInvoiceStatusFilter(event.target.value)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                        >
                          <option value="ALL">All Status ({invoiceRows.length})</option>
                          <option value="PAID">Paid</option>
                          <option value="UNPAID">Unpaid</option>
                          <option value="OVERDUE">Overdue</option>
                          <option value="DRAFT">Draft</option>
                        </select>

                        <select
                          value={invoiceSort}
                          onChange={(event) => setInvoiceSort(event.target.value)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                        >
                          <option value="NEWEST">Newest</option>
                          <option value="OLDEST">Oldest</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => openInvoiceModal(billingCustomer)}
                        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-secondary"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-sky-200 bg-white p-4 shadow-sm">
                    {isInvoiceLoading ? (
                      <p className="py-10 text-center text-sm text-slate-500">Loading invoices...</p>
                    ) : filteredInvoiceRows.length === 0 ? (
                      <p className="py-10 text-center text-sm text-slate-500">No invoices found for current filters.</p>
                    ) : (
                      <div className="space-y-3">
                        {filteredInvoiceRows.map((row) => {
                          const statusCategory = getInvoiceStatusCategory(row.status);
                          return (
                            <div key={row.invoiceNumber || row._id} className="rounded-xl border border-sky-200 bg-slate-50 p-3">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex flex-1 items-start gap-3">
                                  <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                                    <CheckCircleIcon className="h-4 w-4" />
                                  </div>

                                  <div className="w-full space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="font-semibold text-slate-900">{new Date(row.issuedAt || Date.now()).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusCategory === "PAID" ? "bg-emerald-100 text-emerald-700" : statusCategory === "OVERDUE" ? "bg-rose-100 text-rose-700" : statusCategory === "DRAFT" ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-700"}`}>
                                        {statusCategory}
                                      </span>
                                    </div>

                                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                      <p className="text-xs font-semibold text-slate-500">Invoice ID</p>
                                      <p className="text-xs font-semibold text-slate-700">{row.invoiceNumber || "-"}</p>
                                    </div>

                                    <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2">
                                      <p className="text-xs font-semibold text-sky-700">Payment ID</p>
                                      <p className="text-xs font-semibold text-sky-800">{row._id || row.paymentId || "-"}</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <p className="text-2xl font-bold text-slate-900">${Number(row.amount || 0).toFixed(2)}</p>
                                  <p className="text-xs font-semibold text-slate-500">USD</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3">
                  <p className="text-sm text-slate-500">Showing {filteredInvoiceRows.length} of {invoiceRows.length} invoices</p>
                  <button
                    type="button"
                    onClick={closeBillingModal}
                    className="rounded-xl border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <MemberTicketsModal
        isOpen={showMemberTicketsModal}
        onClose={() => {
          setShowMemberTicketsModal(false);
          setMemberTicketsCustomer(null);
          setMemberTicketsRows([]);
          setMemberTicketsSearch("");
        }}
        member={memberTicketsCustomer}
        tickets={memberTicketsRows}
        search={memberTicketsSearch}
        onSearchChange={setMemberTicketsSearch}
        isLoading={isMemberTicketsLoading}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/55 p-3 sm:p-6">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
              <div>
                <h3 className="text-2xl font-bold text-primary">Register New Member</h3>
                <p className="mt-1 text-sm text-slate-600">Choose plan type, then create member account credentials.</p>
              </div>
              <button
                aria-label="Close popup"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 p-4 sm:p-6">
              {notification.text && (
                <p className={`rounded-2xl px-4 py-3 text-sm font-medium ${notification.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                  {notification.text}
                </p>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setCustomerPlan("INDIVIDUAL")}
                  className={`rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition ${customerPlan === "INDIVIDUAL" ? "border-primary bg-primary/10 text-primary" : "border-slate-300 bg-white text-slate-700"}`}
                >
                  Individual Plan
                  <p className="mt-1 text-xs font-normal text-slate-500">Create exactly one member account.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerPlan("FLEET")}
                  className={`rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition ${customerPlan === "FLEET" ? "border-primary bg-primary/10 text-primary" : "border-slate-300 bg-white text-slate-700"}`}
                >
                  Fleet Plan
                              {notification.text && (
                                <p className={`rounded-2xl px-4 py-3 text-sm font-medium ${notification.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                                  {notification.text}
                                </p>
                              )}

                  <p className="mt-1 text-xs font-normal text-slate-500">Add 2 or more members with Save and Next flow.</p>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                {customerPlan === "FLEET" && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Fleet Members</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {fleetBubbles.map((bubble) => (
                        <button
                          key={bubble.step}
                          type="button"
                          onClick={() => setFleetTargetCount(Math.max(2, bubble.step))}
                          className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold transition ${bubble.hasCustomer ? "border-emerald-600 bg-emerald-600 text-white" : bubble.isCurrent ? "border-primary bg-primary text-white" : "border-slate-300 bg-white text-slate-600"}`}
                          title={`Set fleet count to ${bubble.step}`}
                        >
                          {bubble.step}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setFleetTargetCount((prev) => Math.min(20, prev + 1))}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-primary bg-white text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
                        title="Add one more member"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold text-slate-700">First Name *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required={customerPlan === "INDIVIDUAL"}
                      placeholder="Enter first name"
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700">Last Name *</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required={customerPlan === "INDIVIDUAL"}
                      placeholder="Enter last name"
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700">Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required={customerPlan === "INDIVIDUAL"}
                      placeholder="Enter email"
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Enter phone number"
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700">License No</label>
                    <input
                      type="text"
                      name="licenseNo"
                      value={formData.licenseNo}
                      onChange={handleChange}
                      placeholder="Enter license number"
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700">DOT</label>
                    <input
                      type="text"
                      name="dot"
                      value={formData.dot}
                      onChange={handleChange}
                      placeholder="Enter DOT"
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700">State</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="Enter state"
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700">Address</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Enter full address"
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">Password *</label>
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                    <input
                      type="text"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required={customerPlan === "INDIVIDUAL"}
                      placeholder="Enter password"
                      className="w-full bg-transparent px-1 py-2 text-sm text-slate-800 outline-none"
                    />
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-secondary"
                    >
                      Generate
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-700">License Image</p>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      id="customer-license"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => handleLicenseChange(event, false)}
                    />
                    <label
                      htmlFor="customer-license"
                      className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                    >
                      Add License Pic
                    </label>
                    <p className="text-xs text-slate-500">{licenseFileName || "No file selected"}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:justify-end">
                  {customerPlan === "FLEET" && (
                    <button
                      type="button"
                      onClick={addFleetCustomer}
                      className="rounded-lg border border-primary bg-white px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
                    >
                      Save & Add Next
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || (customerPlan === "FLEET" && !fleetCanSubmit)}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting
                      ? "Saving..."
                      : customerPlan === "INDIVIDUAL"
                        ? "Save Member"
                        : "Submit Fleet"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
