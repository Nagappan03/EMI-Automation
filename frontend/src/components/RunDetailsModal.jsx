import { useEffect } from "react";

function StatusBadge({ status }) {
  const styles = {
    SUCCESS: "bg-green-500/20 text-green-400",
    FAILED: "bg-red-500/20 text-red-400",
    RUNNING: "bg-yellow-500/20 text-yellow-400",
    SKIPPED: "bg-slate-500/20 text-slate-400"
  };

  return (
    <span
      className={`px-3 py-1 text-xs rounded-full font-medium whitespace-nowrap ${
        styles[status] || "bg-slate-700 text-slate-300"
      }`}
    >
      {status}
    </span>
  );
}

function RunDetailsModal({ run, onClose }) {
  if (!run) return null;

  const formatDuration = (seconds) => {
    if (!seconds) return "—";
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";

    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl p-6"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
        >
          ✕
        </button>

        <h3 className="text-xl font-semibold mb-6">
          Job Run Details
        </h3>

        <div className="space-y-8 text-sm">

          {/* Overview */}
          <div>
            <h4 className="text-slate-400 uppercase text-xs tracking-wider mb-4">
              Overview
            </h4>

            <Detail label="Run ID" value={run.id} />

            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Status</span>
              <StatusBadge status={run.status} />
            </div>

            <Detail label="Triggered By" value={run.triggeredBy} />
            <Detail
              label="Started At"
              value={new Date(run.startedAt).toLocaleString()}
            />
            <Detail
              label="Completed At"
              value={
                run.completedAt
                  ? new Date(run.completedAt).toLocaleString()
                  : "—"
              }
            />
            <Detail
              label="Duration"
              value={
                run.durationSeconds
                  ? formatDuration(run.durationSeconds)
                  : "—"
              }
            />
          </div>

          {/* Bank Breakdown */}
          <div>
            <h4 className="text-slate-400 uppercase text-xs tracking-wider mb-4">
              Bank Breakdown
            </h4>

            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Axis Status</span>
              <StatusBadge status={run.axisStatus} />
            </div>

            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Kotak Status</span>
              <StatusBadge status={run.kotakStatus} />
            </div>

            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">HSBC Status</span>
              <StatusBadge status={run.hsbcStatus} />
            </div>
          </div>

          {run.errorMessage && (
            <div>
              <h4 className="text-red-400 uppercase text-xs tracking-wider mb-4">
                Error Diagnostics
              </h4>

              <div className="bg-slate-800 p-4 rounded text-red-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                {run.errorMessage}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="flex justify-between border-b border-slate-800 pb-2">
      <span className="text-slate-400">{label}</span>
      <span className="text-right max-w-[60%] break-words">
        {value || "—"}
      </span>
    </div>
  );
}

export default RunDetailsModal;