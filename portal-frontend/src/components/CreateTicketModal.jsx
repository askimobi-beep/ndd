import {
  ArrowUpTrayIcon,
  CalendarDaysIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

function getMemberName(member) {
  return `${member?.firstName || ""} ${member?.lastName || ""}`.trim() || "Selected Customer";
}

export default function CreateTicketModal({
  isOpen,
  onClose,
  member,
  courtDate,
  onCourtDateChange,
  ticketFiles,
  onFileChange,
  onSubmit,
  isSubmitting,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/65 p-3 lg:p-6">
      <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-[22px] border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 bg-slate-100 px-5 py-4 text-center">
          <div className="flex items-start justify-between gap-3">
            <div className="w-6" />
            <div>
              <h3 className="text-3xl font-semibold text-slate-800">Create New Ticket</h3>
              <p className="mt-1 text-sm text-slate-500">Submit your court case documentation</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-primary">{getMemberName(member)}</p>
              <div className="mx-auto mt-2 h-0.5 w-16 rounded-full bg-primary" />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-blue-700">
              <InformationCircleIcon className="h-4 w-4" />
              File Upload Guidelines
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-xs text-blue-700">
              <li>Maximum 7 files allowed</li>
              <li>Each file must be under 10MB</li>
              <li>Supported formats: PDF, JPG, PNG, JPEG</li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <label className="mb-2 flex items-center gap-2 text-2xl font-semibold text-slate-800">
              <CalendarDaysIcon className="h-5 w-5 text-primary" />
              Court Date
            </label>
            <input
              type="date"
              value={courtDate}
              onChange={(event) => onCourtDateChange(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="mb-3 flex items-center gap-2 text-2xl font-semibold text-slate-800">
              <ArrowUpTrayIcon className="h-5 w-5 text-primary" />
              Upload Ticket Documents
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-primary">
                {ticketFiles.length}/7 files
              </span>
            </p>

            <label className="block cursor-pointer rounded-xl border border-dashed border-slate-300 p-8 text-center transition hover:border-primary hover:bg-primary/5">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-primary">
                <ArrowUpTrayIcon className="h-6 w-6" />
              </div>
              <p className="text-2xl font-semibold text-slate-700">Upload Your Files</p>
              <p className="mt-1 text-sm text-slate-500">Click to select files or drag and drop</p>
              <p className="text-xs text-slate-400">PDF, JPG, PNG, JPEG (Max 10MB each)</p>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={onFileChange}
                className="hidden"
              />
            </label>

            {ticketFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {ticketFiles.map((file) => (
                  <div key={`${file.name}-${file.size}`} className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    <span className="truncate text-slate-700">{file.name}</span>
                    <span className="text-xs text-slate-500">{Math.ceil(file.size / 1024)} KB</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 flex items-center gap-2 text-sm text-slate-500">
              <InformationCircleIcon className="h-4 w-4" />
              Complete all fields to continue
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={!courtDate || ticketFiles.length === 0 || isSubmitting}
                className="rounded-lg bg-slate-400 px-4 py-2.5 text-sm font-semibold text-white transition enabled:bg-primary enabled:hover:bg-secondary disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : "Submit Ticket"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
