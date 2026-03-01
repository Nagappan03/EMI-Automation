import { useEffect, useState } from "react";
import Loader from "../components/Loader";
import RunDetailsModal from "../components/RunDetailsModal";
import { fetchRuns } from "../services/api";

function StatusBadge({ status }) {
  const styles = {
    SUCCESS: "bg-green-500/20 text-green-400",
    FAILED: "bg-red-500/20 text-red-400",
    RUNNING: "bg-yellow-500/20 text-yellow-400",
    SKIPPED: "bg-slate-500/20 text-slate-400"
  };

  return (
    <span className={`px-3 py-1 text-xs rounded-full ${styles[status] || "bg-slate-600/20 text-slate-400"}`}>
      {status}
    </span>
  );
}

function Runs() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRun, setSelectedRun] = useState(null);

  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await fetchRuns();
      setRuns(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds}s`;

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${mins}m ${secs}s`;
  };

  const filteredRuns =
    filter === "ALL"
      ? runs
      : runs.filter((r) => r.status === filter);

  if (loading) return <Loader fullScreen />;

  const totalPages = Math.ceil(filteredRuns.length / itemsPerPage);

  const paginatedRuns = filteredRuns.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-semibold">Job Runs</h2>
          <p className="text-slate-400 text-sm mt-1">
            Execution history & diagnostics
          </p>
        </div>

        <div className="flex gap-2">
          {["ALL", "SUCCESS", "FAILED", "RUNNING"].map((type) => (
            <button
              key={type}
              onClick={() => {
                setFilter(type);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm ${
                filter === type
                  ? "bg-indigo-600 cursor-pointer"
                  : "bg-slate-800 border border-slate-700 cursor-pointer"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900/50 text-slate-400 text-sm">
            <tr>
              <th className="p-4">Status</th>
              <th>Started</th>
              <th>Duration</th>
              <th>Triggered</th>
              <th></th>
            </tr>
          </thead>

          <tbody className="text-sm">
            {filteredRuns.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center py-12 text-slate-400">
                  No {filter === "ALL" ? "" : filter.toLowerCase()} jobs found.
                </td>
              </tr>
            )}
            {paginatedRuns.map((run) => (
              <>
                <tr
                  key={run.id}
                  className="border-t border-slate-700 hover:bg-slate-900/40 transition-all duration-200"
                >
                  <td className="p-4">
                    <StatusBadge status={run.status} />
                  </td>
                  <td>{formatDate(run.startedAt)}</td>
                  <td>
                    {run.durationSeconds !== null
                      ? formatDuration(run.durationSeconds)
                      : "—"}
                  </td>
                  <td>{run.triggeredBy}</td>
                  <td>
                    <button
                      onClick={() => setSelectedRun(run)}
                      className="text-indigo-400 hover:underline flex items-center gap-2 cursor-pointer"
                    >
                      {run.status === "FAILED" && (
                        <span className="text-red-400">⚠</span>
                      )}
                      {run.status === "FAILED"
                        ? "Inspect"
                        : run.status === "RUNNING"
                        ? "Live"
                        : "Details"}
                    </button>
                  </td>
                </tr>
              </>
            ))}
          </tbody>
        </table>  
      </div>
      <div className="flex justify-between items-center mt-6">
        <span className="text-sm text-slate-400">
          Page {currentPage} of {totalPages || 1}
        </span>

        <div className="flex gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="px-3 py-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-40"
          >
            Prev
          </button>

          <button
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="px-3 py-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
      {selectedRun && (
        <RunDetailsModal
          run={selectedRun}
          onClose={() => setSelectedRun(null)}
        />
      )}
    </div>
  );
}

export default Runs;