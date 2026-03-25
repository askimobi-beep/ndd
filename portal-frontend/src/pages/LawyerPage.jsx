import { useEffect, useMemo, useState } from "react";
import TopNavbar from "../components/TopNavbar";
import { apiRequest } from "../utils/api";
import { getAuthUser, hasAnyRole } from "../utils/auth";
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  ScaleIcon,
} from "@heroicons/react/24/outline";

export default function LawyerPage() {
  const user = getAuthUser();
  const canViewLawyers = hasAnyRole(user?.role, ["ADMIN", "TICKET CHECKER"]);
  const canManageLawyers = hasAnyRole(user?.role, ["TICKET CHECKER"]);

  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [notification, setNotification] = useState({ text: "", type: "success" });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editingUserId, setEditingUserId] = useState("");
  const [editFormData, setEditFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  useEffect(() => {
    async function loadLawyers() {
      if (!canViewLawyers) {
        return;
      }

      try {
        setIsLoading(true);
        const data = await apiRequest("/api/users?role=LAWYER");
        setRecords(data.users || []);
      } catch (error) {
        setNotification({ text: error.message || "Unable to load lawyers", type: "error" });
      } finally {
        setIsLoading(false);
      }
    }

    loadLawyers();
  }, [canViewLawyers]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return records;
    }

    return records.filter((record) => {
      const fullName = `${record.firstName || ""} ${record.lastName || ""}`.toLowerCase();
      return fullName.includes(query) || String(record.email || "").toLowerCase().includes(query);
    });
  }, [records, search]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ firstName: "", lastName: "", email: "" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      const data = await apiRequest("/api/users/lawyers", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      setNotification({ text: data.message || "Lawyer created successfully", type: "success" });
      setIsModalOpen(false);
      resetForm();

      if (data.user) {
        setRecords((prev) => [data.user, ...prev.filter((record) => record._id !== data.user._id)]);
      }
    } catch (error) {
      setNotification({ text: error.message || "Unable to create lawyer", type: "error" });
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
    });
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

      setNotification({ text: data.message || "Lawyer updated successfully", type: "success" });
      setIsEditOpen(false);
    } catch (error) {
      setNotification({ text: error.message || "Unable to update lawyer", type: "error" });
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
        text: data.user?.isActive ? "Lawyer activated successfully" : "Lawyer blocked successfully",
        type: "success",
      });
    } catch (error) {
      setNotification({ text: error.message || "Unable to update lawyer status", type: "error" });
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
                <h2 className="text-2xl font-semibold lg:text-3xl">Lawyer Management</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
                  View all lawyers and create new lawyer accounts.
                </p>
              </div>

              {canManageLawyers && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-base font-semibold text-primary transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-xl"
                >
                  <PlusIcon className="h-5 w-5" />
                  Add Lawyer
                </button>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.08)] lg:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Filters</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">Refine lawyer records</h3>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10 sm:min-w-[240px]">
                <MagnifyingGlassIcon className="h-5 w-5 flex-shrink-0 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search lawyers..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.08)] lg:p-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-slate-900">Lawyer Table</h3>
              {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
            </div>

            {!canManageLawyers && (
              <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Admin can view lawyers only. Only ticket checker can add or manage lawyers.
              </div>
            )}

            {canViewLawyers && filteredRecords.length > 0 && (
              <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      {canManageLawyers && <th className="px-4 py-3 font-semibold">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => (
                      <tr key={record._id} className="border-t border-slate-100">
                        <td className="px-4 py-3 text-slate-700">{`${record.firstName || ""} ${record.lastName || ""}`.trim()}</td>
                        <td className="px-4 py-3 text-slate-700">{record.email || "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${record.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                            {record.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        {canManageLawyers && (
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => openEditModal(record)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                              >
                                <PencilSquareIcon className="h-4 w-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => toggleStatus(record)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition ${record.isActive ? "bg-red-500 hover:bg-red-600" : "bg-emerald-600 hover:bg-emerald-700"}`}
                              >
                                {record.isActive ? "Block" : "Activate"}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {canViewLawyers && !isLoading && filteredRecords.length === 0 && (
              <div className="mt-8 rounded-2xl border border-dashed border-primary/20 bg-slate-50 p-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ScaleIcon className="h-8 w-8" />
                </div>
                <h4 className="mt-4 text-xl font-semibold text-slate-900">No Lawyer Records Found</h4>
                <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">Add a lawyer from the top action button and it will appear here instantly.</p>
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 px-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-slate-900">Add Lawyer</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">First Name</label>
                  <input
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="First Name"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Last Name</label>
                  <input
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Last Name"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-primary hover:text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Saving..." : "Save Lawyer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 px-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-slate-900">Edit Lawyer</h3>
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
                  <input
                    name="firstName"
                    value={editFormData.firstName}
                    onChange={handleEditChange}
                    placeholder="First Name"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Last Name</label>
                  <input
                    name="lastName"
                    value={editFormData.lastName}
                    onChange={handleEditChange}
                    placeholder="Last Name"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                <input
                  name="email"
                  type="email"
                  value={editFormData.email}
                  onChange={handleEditChange}
                  placeholder="Email"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-primary hover:text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isEditSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
