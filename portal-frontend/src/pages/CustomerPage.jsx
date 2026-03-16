import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import TopNavbar from "../components/TopNavbar";
import { apiRequest } from "../utils/api";
import { getAuthUser, hasAnyRole } from "../utils/auth";

export default function CustomerPage() {
  const user = getAuthUser();
  const canManageCustomers = hasAnyRole(user?.role, ["AGENT"]);
  const canViewCustomers = hasAnyRole(user?.role, ["ADMIN", "SUPERVISOR", "AGENT"]);
  const canApproveUsers = hasAnyRole(user?.role, ["ADMIN"]);
  const canEditCustomers = hasAnyRole(user?.role, ["AGENT"]);
  const canBlockCustomers = hasAnyRole(user?.role, ["ADMIN", "AGENT"]);
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
  });
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({
    office: "Lahore Office (LHR)",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
  });

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
    if (!query) {
      return records;
    }

    return records.filter((record) => {
      const fullName = `${record.firstName || ""} ${record.lastName || ""}`.toLowerCase();
      return (
        fullName.includes(query) ||
        String(record.email || "").toLowerCase().includes(query) ||
        String(record.phone || "").toLowerCase().includes(query)
      );
    });
  }, [records, search]);

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

  const toggleStatus = async (record) => {
    try {
      const data = await apiRequest(`/api/users/${record._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !record.isActive }),
      });

      if (data.user) {
        setRecords((prev) => prev.map((item) => (item._id === data.user._id ? data.user : item)));
      }

      setNotification({
        text: data.user?.isActive ? "Customer activated successfully" : "Customer blocked successfully",
        type: "success",
      });
    } catch (error) {
      setNotification({ text: error.message || "Unable to update customer status", type: "error" });
    }
  };

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

          <div className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.08)] lg:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Filters</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">Refine customer records</h3>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10 sm:min-w-[240px]">
                <MagnifyingGlassIcon className="h-5 w-5 flex-shrink-0 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search customers…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:bg-primary/5 hover:text-primary">Last Week</button>
              <button className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:bg-primary/5 hover:text-primary">Last Month</button>
              <button className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:bg-primary/5 hover:text-primary">Last 2 Months</button>
              <button className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:bg-primary/5 hover:text-primary">Last 6 Months</button>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.08)] lg:p-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-slate-900">Customer Table</h3>
              {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
            </div>

            {canViewCustomers && filteredRecords.length > 0 && (
              <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Agent</th>
                      <th className="px-4 py-3 font-semibold">Phone</th>
                      <th className="px-4 py-3 font-semibold">Office</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Approval</th>
                      <th className="px-4 py-3 font-semibold">Plan</th>
                      <th className="px-4 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => (
                      <tr key={record._id} className="border-t border-slate-100">
                        <td className="px-4 py-3 text-slate-700">{`${record.firstName || ""} ${record.lastName || ""}`.trim()}</td>
                        <td className="px-4 py-3 text-slate-700">{record.email || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {record.createdBy
                            ? `${record.createdBy.firstName || ""} ${record.createdBy.lastName || ""}`.trim() || record.createdBy.email || "-"
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{record.phone || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{record.office || "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${record.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                            {record.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {record.requiresAdminApproval ? (
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${record.isApprovedByAdmin ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                              {record.isApprovedByAdmin ? "Approved" : "Pending"}
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Not Required</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{record.customerPlan || "INDIVIDUAL"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {canApproveUsers && record.requiresAdminApproval && !record.isApprovedByAdmin && (
                              <button
                                onClick={() => approveUser(record)}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                              >
                                Approve
                              </button>
                            )}
                            {canEditCustomers && (
                              <button
                                onClick={() => openEditModal(record)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                              >
                                <PencilSquareIcon className="h-4 w-4" />
                                Edit
                              </button>
                            )}
                            {canBlockCustomers && (
                              <button
                                onClick={() => toggleStatus(record)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition ${record.isActive ? "bg-red-500 hover:bg-red-600" : "bg-emerald-600 hover:bg-emerald-700"}`}
                              >
                                {record.isActive ? "Block" : "Activate"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
