import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ExclamationCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  EllipsisHorizontalIcon,
  XMarkIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import TopNavbar from "../components/TopNavbar";
import { API_BASE_URL, apiRequest } from "../utils/api";
import { getAuthUser, hasAnyRole } from "../utils/auth";

export default function PendingApprovalsPage() {
  const user = getAuthUser();
  const canApproveRecords = hasAnyRole(user?.role, ["ADMIN"]);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({ text: "", type: "success" });
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editLicenseFile, setEditLicenseFile] = useState(null);
  const [editLicenseFileName, setEditLicenseFileName] = useState("");
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

  const loadMembers = useCallback(async () => {
    try {
      setIsLoading(true);
      const requests = [apiRequest("/api/users?role=CUSTOMER")];

      if (canApproveRecords) {
        requests.push(apiRequest("/api/users?role=LAWYER"));
      }

      const [customerData, lawyerData] = await Promise.all(requests);
      const customers = customerData?.users || [];
      const lawyers = canApproveRecords ? lawyerData?.users || [] : [];
      setRecords([...customers, ...lawyers]);
    } catch (error) {
      setNotification({ text: error.message || "Unable to load members", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [canApproveRecords]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

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

  const getPaymentStatusLabel = (value) => {
    if (value === "UNDER_REVIEW") {
      return "Payment Under Review";
    }

    if (value === "PAID_APPROVED") {
      return "Payment Confirmed";
    }

    return "Payment Pending";
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

  const pendingMembers = records.filter((record) => {
    if (!record?.requiresAdminApproval || record?.isApprovedByAdmin) {
      return false;
    }

    if (String(record.role || "").toUpperCase() === "CUSTOMER") {
      return record.paymentStatus === "PAID_APPROVED";
    }

    return true;
  });

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

  const approveUser = async (record) => {
    if (!canApproveRecords) {
      return;
    }

    try {
      const data = await apiRequest(`/api/users/${record._id}/approval`, {
        method: "PATCH",
        body: JSON.stringify({ isApprovedByAdmin: true }),
      });

      if (data.user) {
        setRecords((prev) => prev.map((item) => (item._id === data.user._id ? data.user : item)));
      }

      setNotification({ text: data.message || "User approved successfully", type: "success" });
    } catch (error) {
      setNotification({ text: error.message || "Unable to approve user", type: "error" });
    }
  };

  const openDetailsModal = (record) => {
    setSelectedRecord(record);
    setIsDetailOpen(true);
  };

  const closeDetailsModal = () => {
    setIsDetailOpen(false);
    setSelectedRecord(null);
  };

  const openEditModal = (record) => {
    setSelectedRecord(record);
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
    setEditLicenseFile(null);
    setEditLicenseFileName("");
    setIsEditOpen(true);
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditLicenseChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setEditLicenseFile(null);
      setEditLicenseFileName("");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type) || file.size > 10 * 1024 * 1024) {
      setNotification({ text: "License image must be JPG, JPEG, PNG or WEBP and under 10MB.", type: "error" });
      event.target.value = "";
      return;
    }

    setEditLicenseFile(file);
    setEditLicenseFileName(file.name);
  };

  const submitEditMember = async (event) => {
    event.preventDefault();
    if (!selectedRecord?._id) {
      return;
    }

    try {
      setIsEditSubmitting(true);

      const formData = new FormData();
      Object.entries(editFormData).forEach(([key, value]) => {
        formData.append(key, value || "");
      });

      if (editLicenseFile) {
        formData.append("licenseDocuments", editLicenseFile);
      }

      const data = await apiRequest(`/api/users/${selectedRecord._id}`, {
        method: "PATCH",
        body: formData,
      });

      if (data.user) {
        setRecords((prev) => prev.map((item) => (item._id === data.user._id ? data.user : item)));
        setSelectedRecord(data.user);
      }

      setNotification({ text: data.message || "Member updated successfully", type: "success" });
      setIsEditOpen(false);
      setEditLicenseFile(null);
      setEditLicenseFileName("");
    } catch (error) {
      setNotification({ text: error.message || "Unable to update member", type: "error" });
    } finally {
      setIsEditSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-accent">
      <TopNavbar />

      <div className="flex-1 px-6 py-8 lg:px-8">
        <div className="w-full space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Pending Approvals</h2>
              <p className="text-sm text-slate-600 mt-1">All users waiting for final admin approval</p>
            </div>
            <a href="/members" className="text-sm font-semibold text-primary hover:text-secondary transition">
              ← Back to Dashboard
            </a>
          </div>

          <div className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
            <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary">
              <ExclamationCircleIcon className="h-4 w-4" />
              Pending Approvals ({pendingMembers.length})
            </div>

            <div className="mt-2 space-y-4">
              {isLoading ? (
                <p className="text-center text-slate-500 py-8">Loading...</p>
              ) : pendingMembers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-primary/20 bg-slate-50 p-8 text-center">
                  <ExclamationCircleIcon className="h-12 w-12 mx-auto text-primary/30 mb-3" />
                  <p className="text-slate-600">No pending approvals at this time</p>
                </div>
              ) : (
                pendingMembers.map((record) => (
                  <div key={record._id} className="rounded-2xl border border-slate-200 p-6 hover:border-primary/50 transition">
                    <div className="grid gap-6 lg:grid-cols-5">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary mb-3">Member Information</p>
                          <div className="space-y-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{`${record.firstName || ""} ${record.lastName || ""}`.trim()}</p>
                                <p className="text-xs text-slate-500">ID: {memberIdByUserId[record._id] || formatMemberId(1)}</p>
                            </div>
                            <div>
                              <span className="inline-block rounded-full bg-emerald-50 text-emerald-700 px-2 py-1 text-xs font-semibold">{record.customerPlan || "INDIVIDUAL"}</span>
                            </div>
                            <div>
                              <p className="text-xs text-slate-600">Joined: {new Date(record.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                            </div>
                            {record.createdBy && (
                              <div>
                                <p className="text-xs font-semibold text-slate-600">Agent: {`${record.createdBy.firstName || ""} ${record.createdBy.lastName || ""}`.trim() || record.createdBy.email || "-"}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-green-700 mb-3">Contact Details</p>
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

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-violet-700 mb-3">Documents</p>
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

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700 mb-3">Status</p>
                          <div className="flex flex-col gap-2">
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-slate-600">Approval</p>
                              <span className="inline-block rounded-full px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700">Pending</span>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-slate-600">Payment</p>
                              <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${record.paymentStatus === "PAID_APPROVED" ? "bg-emerald-50 text-emerald-700" : record.paymentStatus === "UNDER_REVIEW" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-700"}`}>
                                {getPaymentStatusLabel(record.paymentStatus)}
                              </span>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-slate-500">Subscription Start: {formatDateTime(record.subscriptionStartAt)}</p>
                              <p className="text-xs text-slate-500">Subscription End: {formatDateTime(record.subscriptionEndAt)}</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-700 mb-3">Actions</p>
                          <div className="flex flex-col gap-2">
                            {canApproveRecords ? (
                              <button
                                onClick={() => approveUser(record)}
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                              >
                                Approve
                              </button>
                            ) : (
                              <span className="rounded-lg bg-slate-100 px-3 py-2 text-center text-xs font-semibold text-slate-700">
                                View Only
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => openDetailsModal(record)}
                              className="rounded-lg border border-slate-300 text-slate-700 px-3 py-2 text-xs font-semibold transition hover:border-primary hover:text-primary flex items-center justify-center gap-1"
                            >
                              <EllipsisHorizontalIcon className="h-4 w-4" />
                              View Details
                            </button>
                            <span className="rounded-lg bg-slate-100 px-3 py-2 text-center text-xs font-semibold text-slate-700">
                              {String(record.role || "").toUpperCase() === "LAWYER" ? "Role: Lawyer" : "Role: Member"}
                            </span>
                          </div>
                        </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {notification.text && (
            <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${
              notification.type === "success"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-600"
            }`}>
              {notification.text}
            </div>
          )}
        </div>
      </div>

      {isDetailOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-slate-900">Pending Member Details</h3>
              <button
                type="button"
                onClick={closeDetailsModal}
                className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:border-primary hover:text-primary"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div><p className="text-xs font-semibold text-slate-500">First Name</p><p className="text-sm text-slate-900">{selectedRecord.firstName || "-"}</p></div>
              <div><p className="text-xs font-semibold text-slate-500">Last Name</p><p className="text-sm text-slate-900">{selectedRecord.lastName || "-"}</p></div>
              <div><p className="text-xs font-semibold text-slate-500">Email</p><p className="text-sm text-slate-900 break-all">{selectedRecord.email || "-"}</p></div>
              <div><p className="text-xs font-semibold text-slate-500">Phone</p><p className="text-sm text-slate-900">{selectedRecord.phone || "-"}</p></div>
              <div><p className="text-xs font-semibold text-slate-500">Office</p><p className="text-sm text-slate-900">{selectedRecord.office || "-"}</p></div>
              <div><p className="text-xs font-semibold text-slate-500">Plan</p><p className="text-sm text-slate-900">{selectedRecord.customerPlan || "INDIVIDUAL"}</p></div>
              <div><p className="text-xs font-semibold text-slate-500">License No</p><p className="text-sm text-slate-900">{selectedRecord.licenseNo || "-"}</p></div>
              <div><p className="text-xs font-semibold text-slate-500">DOT</p><p className="text-sm text-slate-900">{selectedRecord.dot || "-"}</p></div>
              <div><p className="text-xs font-semibold text-slate-500">State</p><p className="text-sm text-slate-900">{selectedRecord.state || "-"}</p></div>
              <div><p className="text-xs font-semibold text-slate-500">Address</p><p className="text-sm text-slate-900">{selectedRecord.address || "-"}</p></div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">License</p>
              <p className="mt-1 text-sm text-slate-900">{selectedRecord.licenseNo || "No license number"}</p>
              {Array.isArray(selectedRecord.licenseFiles) && selectedRecord.licenseFiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => window.open(getFileUrl(selectedRecord.licenseFiles[0].url), "_blank", "noopener,noreferrer")}
                  className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-secondary"
                >
                  View License Pic
                </button>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => openEditModal(selectedRecord)}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                <PencilSquareIcon className="h-4 w-4" />
                Edit Member
              </button>
              <button
                type="button"
                onClick={closeDetailsModal}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditOpen && selectedRecord && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/65 px-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-slate-900">Edit Pending Member</h3>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:border-primary hover:text-primary"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitEditMember} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">First Name</label>
                  <input name="firstName" value={editFormData.firstName} onChange={handleEditChange} placeholder="First Name" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white" required />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Last Name</label>
                  <input name="lastName" value={editFormData.lastName} onChange={handleEditChange} placeholder="Last Name" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white" required />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Email</label>
                  <input name="email" value={editFormData.email} onChange={handleEditChange} placeholder="Email" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white" required />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Phone</label>
                  <input name="phone" value={editFormData.phone} onChange={handleEditChange} placeholder="Phone" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Office</label>
                  <input name="office" value={editFormData.office} onChange={handleEditChange} placeholder="Office" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">License No</label>
                  <input name="licenseNo" value={editFormData.licenseNo} onChange={handleEditChange} placeholder="License No" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">DOT</label>
                  <input name="dot" value={editFormData.dot} onChange={handleEditChange} placeholder="DOT" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">State</label>
                  <input name="state" value={editFormData.state} onChange={handleEditChange} placeholder="State" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Address</label>
                <input name="address" value={editFormData.address} onChange={handleEditChange} placeholder="Address" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white" />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-700">License Image</p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input id="pending-edit-license" type="file" accept="image/*" className="hidden" onChange={handleEditLicenseChange} />
                  <label htmlFor="pending-edit-license" className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary">
                    Upload License Pic
                  </label>
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
    </div>
  );
}
