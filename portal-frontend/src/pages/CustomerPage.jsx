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
import TopNavbar from "../components/TopNavbar";
import { apiRequest } from "../utils/api";
import { getAuthUser, hasAnyRole } from "../utils/auth";

export default function CustomerPage() {
  const user = getAuthUser();
  const navigate = useNavigate();
  const isAdmin = hasAnyRole(user?.role, ["ADMIN"]);
  const isSupervisor = hasAnyRole(user?.role, ["SUPERVISOR"]);
  const canManageCustomers = hasAnyRole(user?.role, ["AGENT"]);
  const canViewCustomers = hasAnyRole(user?.role, ["ADMIN", "SUPERVISOR", "AGENT"]);
  const canConfirmPayment = isAdmin;
  const canViewBillingDetails = hasAnyRole(user?.role, ["ADMIN", "AGENT"]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState({ text: "", type: "success" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerPlan, setCustomerPlan] = useState("INDIVIDUAL");
  const [fleetTargetCount, setFleetTargetCount] = useState(2);
  const [fleetCustomers, setFleetCustomers] = useState([]);
  const [licenseFileName, setLicenseFileName] = useState("");
  const [editLicenseFileName, setEditLicenseFileName] = useState("");
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
  });
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInvoiceLoading, setIsInvoiceLoading] = useState(false);
  const [invoiceRows, setInvoiceRows] = useState([]);
  const [billingCustomer, setBillingCustomer] = useState(null);
  const [billingModalType, setBillingModalType] = useState("");
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");
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
    });
    setFleetCustomers([]);
    setCustomerPlan("INDIVIDUAL");
    setFleetTargetCount(2);
    setLicenseFileName("");
  };

  const loadCustomers = useCallback(async () => {
    if (!canViewCustomers) {
      return;
    }

    try {
      setIsLoading(true);
      const data = await apiRequest("/api/users?role=CUSTOMER");
      setRecords(data.users || []);
    } catch (error) {
      setNotification({ text: error.message || "Unable to load customers", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [canViewCustomers]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = Date.now();

    return records.filter((record) => {
      if (quickFilter === "PENDING" && (record.isApprovedByAdmin || !record.requiresAdminApproval)) {
        return false;
      }

      if (quickFilter === "CANCELLED" && record.isActive) {
        return false;
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
  }, [records, search, quickFilter, dateFilter]);

  const pendingCount = useMemo(
    () => records.filter((record) => !record.isApprovedByAdmin && record.requiresAdminApproval).length,
    [records]
  );

  const cancelledCount = useMemo(
    () => records.filter((record) => !record.isActive).length,
    [records]
  );

  const addFleetCustomer = () => {
    if (!canSaveCurrentCustomer) {
      setNotification({
        text: "First name, last name, email, and password are required before saving next customer.",
        type: "error",
      });
      return;
    }

    const normalizedEmail = String(formData.email || "").trim().toLowerCase();
    const existingEmails = fleetCustomers.map((entry) => String(entry.email || "").trim().toLowerCase());

    if (existingEmails.includes(normalizedEmail)) {
      setNotification({ text: "Fleet customers must have unique email addresses.", type: "error" });
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
        data = await apiRequest("/api/users/customers", {
          method: "POST",
          body: JSON.stringify({
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            password: formData.password,
            phone: formData.phone,
            office: formData.office,
            licenseNo: formData.licenseNo,
            dot: formData.dot,
            state: formData.state,
            customerPlan: "INDIVIDUAL",
          }),
        });
      } else {
        const customersForSubmit = [...fleetCustomers];

        if (canSaveCurrentCustomer) {
          const currentEmail = String(formData.email || "").trim().toLowerCase();
          const existingEmails = customersForSubmit.map((entry) => String(entry.email || "").trim().toLowerCase());

          if (existingEmails.includes(currentEmail)) {
            setNotification({ text: "Fleet customers must have unique email addresses.", type: "error" });
            setIsSubmitting(false);
            return;
          }

          customersForSubmit.push({
            ...formData,
            email: currentEmail,
          });
        }

        if (customersForSubmit.length < fleetTargetCount) {
          setNotification({ text: `Please add at least ${fleetTargetCount} customers for fleet plan.`, type: "error" });
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

      setNotification({ text: data.message || "Customer created successfully", type: "success" });
      setIsModalOpen(false);
      resetForm();
      await loadCustomers();
    } catch (error) {
      setNotification({ text: error.message || "Unable to create customer", type: "error" });
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
    });
    setEditLicenseFileName("");
    setIsEditOpen(true);
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();

    try {
      setIsEditSubmitting(true);
      const data = await apiRequest(`/api/users/${editingUserId}`, {
        method: "PATCH",
        body: JSON.stringify(editFormData),
      });

      if (data.user) {
        setRecords((prev) => prev.map((record) => (record._id === data.user._id ? data.user : record)));
      }

      setNotification({ text: data.message || "Customer updated successfully", type: "success" });
      setIsEditOpen(false);
    } catch (error) {
      setNotification({ text: error.message || "Unable to update customer", type: "error" });
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

  const openPaymentMethodModal = (record) => {
    setBillingCustomer(record);
    setBillingModalType("PAYMENT_METHOD");
  };

  const openSubscriptionModal = (record) => {
    setBillingCustomer(record);
    setBillingModalType("SUBSCRIPTION");
  };

  const openInvoiceModal = async (record) => {
    try {
      setBillingCustomer(record);
      setBillingModalType("INVOICE");
      setIsInvoiceLoading(true);
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
  };

  return (
    <div className="flex flex-col min-h-screen bg-accent">
      <TopNavbar />

      <div className="flex-1 px-6 py-8 lg:px-8">
        <div className="w-full space-y-8">
          <div className="rounded-[28px] bg-gradient-to-r from-primary via-secondary to-[#1f3c97] p-5 text-white shadow-[0_16px_40px_rgba(0,87,231,0.20)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold lg:text-3xl">Customer Management</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
                  Manage customer records and account access.
                </p>
              </div>

              {canManageCustomers && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-base font-semibold text-primary transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-xl"
                >
                  <PlusIcon className="h-5 w-5" />
                  Add Customer
                </button>
              )}
            </div>
          </div>

          {/* Quick Actions & Filters Section */}
          <div className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.08)] lg:p-8">
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="flex flex-col gap-4">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Quick Actions</p>
                <div className="flex flex-wrap gap-3">
                  {!isSupervisor && (
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

              {/* Filters */}
              <div className="flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between sm:border-t-0 sm:pt-0">
                <div className="flex-1">
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Filters</p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-900">Search & Find Customer</h3>
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
                  </div>
                  <select className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-primary focus:border-primary focus:outline-none">
                    <option>Name</option>
                    <option>Email</option>
                    <option>Phone</option>
                  </select>
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
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-slate-900">Customer Records</h3>
              {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
            </div>

            {canViewCustomers && filteredRecords.length > 0 && (
              <div className="mt-6 space-y-4">
                {filteredRecords.map((record) => (
                  <div key={record._id} className="rounded-2xl border border-slate-200 p-6 hover:border-primary/50 transition">
                    {(() => {
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
                            <p className="text-xs text-slate-500">ID: M-{record._id.substring(0, 6).toUpperCase()}</p>
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
                        <div className="flex flex-col gap-1">
                          {canViewBillingDetails && (
                            <>
                              <button
                                type="button"
                                onClick={() => openPaymentMethodModal(record)}
                                className="rounded-lg bg-purple-500 text-white px-2.5 py-1.5 text-xs font-semibold transition hover:bg-purple-600"
                              >
                                Payment Method
                              </button>
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
                          <button className="rounded-lg bg-green-500 text-white px-2.5 py-1.5 text-xs font-semibold transition hover:bg-green-600">
                            🎫 Tickets
                          </button>
                          {canConfirmPayment && record.paymentStatus === "UNDER_REVIEW" && (
                            <button
                              type="button"
                              onClick={() => confirmPayment(record)}
                              className="rounded-lg bg-emerald-600 text-white px-2.5 py-1.5 text-xs font-semibold transition hover:bg-emerald-700"
                            >
                              Confirm Payment
                            </button>
                          )}
                          <button onClick={() => openEditModal(record)} className="rounded-lg border border-slate-300 text-slate-700 px-2.5 py-1.5 text-xs font-semibold transition hover:border-primary hover:text-primary flex items-center justify-center gap-1">
                            <EllipsisHorizontalIcon className="h-4 w-4" />
                            More Actions
                          </button>
                        </div>
                      </div>
                    </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}

            {canViewCustomers && !isLoading && filteredRecords.length === 0 && (
              <div className="mt-8 rounded-2xl border border-dashed border-primary/20 bg-slate-50 p-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <XCircleIcon className="h-8 w-8" />
                </div>
                <h4 className="mt-4 text-xl font-semibold text-slate-900">No Customer Records Found</h4>
                <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">Add a customer from the top action button and it will appear here instantly.</p>
              </div>
            )}

            {notification.text && (
              <p className={`mx-auto mt-6 max-w-xl rounded-2xl px-4 py-3 text-sm font-medium ${notification.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                {notification.text}
              </p>
            )}
          </div>
        </div>
      </div>

      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 px-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-slate-900">Edit Customer</h3>
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
                    onChange={(event) => setEditLicenseFileName(event.target.files?.[0]?.name || "")}
                  />
                  <label
                    htmlFor="edit-customer-license"
                    className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                  >
                    Add License Pic
                  </label>
                  <button
                    type="button"
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-secondary"
                  >
                    Upload
                  </button>
                  <p className="text-xs text-slate-500">{editLicenseFileName || "No file selected"}</p>
                </div>
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
          <div className="w-full max-w-4xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold text-slate-900">
                  {billingModalType === "PAYMENT_METHOD"
                    ? "Payment Method"
                    : billingModalType === "SUBSCRIPTION"
                      ? "Subscription"
                      : "Invoice History"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {`${billingCustomer.firstName || ""} ${billingCustomer.lastName || ""}`.trim()}
                </p>
              </div>
              <button
                onClick={closeBillingModal}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
              >
                Close
              </button>
            </div>

            {billingModalType === "PAYMENT_METHOD" && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Selected Method</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{getPaymentMethodLabel(billingCustomer.paymentMethod)}</p>
                <p className="mt-3 text-sm text-slate-600">Payment Status: {getPaymentStatusLabel(billingCustomer.paymentStatus)}</p>
              </div>
            )}

            {billingModalType === "SUBSCRIPTION" && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Subscription Timeline</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Start</p>
                    <p className="text-sm font-semibold text-slate-900">{formatDateTime(billingCustomer.subscriptionStartAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">End</p>
                    <p className="text-sm font-semibold text-slate-900">{formatDateTime(billingCustomer.subscriptionEndAt)}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {billingCustomer.subscriptionEndAt && new Date(billingCustomer.subscriptionEndAt).getTime() < Date.now()
                    ? "Subscription expired"
                    : "Subscription active"}
                </p>
              </div>
            )}

            {billingModalType === "INVOICE" && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-3">
                <h4 className="text-sm font-semibold text-slate-900">Invoices</h4>
              </div>
              <div className="max-h-[320px] overflow-auto">
                {isInvoiceLoading ? (
                  <p className="px-4 py-6 text-sm text-slate-500">Loading invoices...</p>
                ) : invoiceRows.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-slate-500">No invoices found.</p>
                ) : (
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Invoice</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Method</th>
                        <th className="px-4 py-3 font-semibold">Issued</th>
                        <th className="px-4 py-3 font-semibold">Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceRows.map((row) => (
                        <tr key={row.invoiceNumber} className="border-t border-slate-100">
                          <td className="px-4 py-3 text-slate-700">{row.invoiceNumber}</td>
                          <td className="px-4 py-3 text-slate-700">{row.status || "-"}</td>
                          <td className="px-4 py-3 text-slate-700">{getPaymentMethodLabel(row.paymentMethod)}</td>
                          <td className="px-4 py-3 text-slate-700">{formatDateTime(row.issuedAt)}</td>
                          <td className="px-4 py-3 text-slate-700">{formatDateTime(row.paidAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            )}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/55 p-3 sm:p-6">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
              <div>
                <h3 className="text-2xl font-bold text-primary">Register New Customer</h3>
                <p className="mt-1 text-sm text-slate-600">Choose plan type, then create customer account credentials.</p>
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
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setCustomerPlan("INDIVIDUAL")}
                  className={`rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition ${customerPlan === "INDIVIDUAL" ? "border-primary bg-primary/10 text-primary" : "border-slate-300 bg-white text-slate-700"}`}
                >
                  Individual Plan
                  <p className="mt-1 text-xs font-normal text-slate-500">Create exactly one customer account.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerPlan("FLEET")}
                  className={`rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition ${customerPlan === "FLEET" ? "border-primary bg-primary/10 text-primary" : "border-slate-300 bg-white text-slate-700"}`}
                >
                  Fleet Plan
                  <p className="mt-1 text-xs font-normal text-slate-500">Add 2 or more customers with Save and Next flow.</p>
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
                        title="Add one more customer"
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
                      onChange={(event) => setLicenseFileName(event.target.files?.[0]?.name || "")}
                    />
                    <label
                      htmlFor="customer-license"
                      className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                    >
                      Add License Pic
                    </label>
                    <button
                      type="button"
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-secondary"
                    >
                      Upload
                    </button>
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
                        ? "Save Customer"
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
