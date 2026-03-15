import { useEffect, useState } from "react";
import { fetchSystemSummary } from "../services/api";
import Loader from "../components/Loader";
import Toast from "../components/Toast";
import StatCard from "../components/StatCard";
import AdminPasswordModal from "../components/AdminPasswordModal";

function NotificationChannelsCard({ emailEnabled, whatsappEnabled }) {
  const StatusBadge = ({ active }) => (
    <span
      className={`px-3 py-1 text-xs rounded-full ${
        active
          ? "bg-green-500/20 text-green-400"
          : "bg-red-500/20 text-red-400"
      }`}
    >
      {active ? "ACTIVE" : "DISABLED"}
    </span>
  );

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 shadow-lg hover:shadow-2xl hover:border-slate-500 hover:-translate-y-1 transition-all duration-300">
      <p className="text-slate-400 text-sm mb-4">Notification Channels</p>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span>Email</span>
          <StatusBadge active={emailEnabled} />
        </div>

        <div className="flex justify-between items-center">
          <span>WhatsApp</span>
          <StatusBadge active={whatsappEnabled} />
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [scanLoading, setScanLoading] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState(null);
  const [showAdminModal, setShowAdminModal] = useState(false);

  useEffect(() => {
    async function init() {
      setPageLoading(true);
      await loadSummary();
      setPageLoading(false);
    }
    init();
  }, []);

  const loadSummary = async () => {
    try {
      const data = await fetchSystemSummary();
      setSummary(data);
    } catch (err) {
      console.error(err);
    }
};

  const formatStatus = (status) => {
    if (!status) return "Unknown";
    return status.charAt(0) + status.slice(1).toLowerCase();
  };

  const getNextScheduledRun = () => {
    const now = new Date();
    const next = new Date();
    next.setHours(2, 0, 0, 0);

    if (now >= next) next.setDate(next.getDate() + 1);

    const isToday = now.toDateString() === next.toDateString();

    const timeString = next.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });

    if (isToday) return timeString;

    const dateString = next.toLocaleDateString([], {
      day: "2-digit",
      month: "short"
    });

    return `${dateString} • ${timeString}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  const handleScan = async () => {
    setScanLoading(true);
    try {
      await fetch("/api/run-now", { 
        method: "POST",
        headers: {
          "x-admin-password": adminPassword
        }
      });
      await loadSummary();
      setToast({ message: "Statement scan triggered successfully", type: "success" });
    } catch {
      setToast({ message: "Scan failed", type: "error" });
    }
    finally {
      setScanLoading(false);
    }
    };

  const handleSendNotification = async () => {
    setNotifyLoading(true);
    try {
      await fetch("/api/test-monthly-notifications", { 
        method: "POST",
        headers: {
          "x-admin-password": adminPassword
        }
      });
      await loadSummary();
      setToast({ message: "Monthly notification triggered", type: "success" });
    } catch {
      setToast({ message: "Notification failed", type: "error" });
    }
    finally {
      setNotifyLoading(false);
    }
  };

  if (pageLoading) return <Loader fullScreen />;

  if (!summary)
    return (
      <div className="text-red-400 text-lg">
        Failed to load system summary
      </div>
    );

  return (
    <div className="space-y-12 animate-fade-in">
      <h2 className="text-3xl font-semibold">System Overview</h2>

      <div
        className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 transition-opacity duration-300`}
      >
        <StatCard
          title="System Status"
          value={
            summary.overallStatus === "SUCCESS"
              ? "Healthy"
              : summary.overallStatus
          }
          status={summary.overallStatus}
        />

        <StatCard
          title="Last Job Run"
          value={
            summary.lastRun
              ? formatDate(summary.lastRun.startedAt)
              : "N/A"
          }
        />

        <StatCard
          title="Next Scheduled Job Run"
          value={getNextScheduledRun()}
        />

        <StatCard
          title="Total Job Runs"
          value={summary.totalRuns}
        />

        <StatCard
          title="Monthly Notification (Email & WhatsApp)"
          value={
            summary.monthlyNotificationStatus === "SUCCESS"
              ? "Sent"
              : summary.monthlyNotificationStatus === "FAILED"
              ? "Failed"
              : summary.monthlyNotificationStatus === "RUNNING"
              ? "Running"
              : "Pending"
          }
          status={summary.monthlyNotificationStatus}
        />

        <StatCard
          title="Axis Bank (Last Job Run Status)"
          value={formatStatus(summary.axisStatus)}
          status={summary.axisStatus}
        />

        <StatCard
          title="Kotak Bank (Last Job Run Status)"
          value={formatStatus(summary.kotakStatus)}
          status={summary.kotakStatus}
        />

        <StatCard
          title="HSBC Bank (Last Job Run Status)"
          value={formatStatus(summary.hsbcStatus)}
          status={summary.hsbcStatus}
        />

        <StatCard
          title="Other Banks"
          value={"Under Construction"}
          status={"COMING SOON"}
        />

        <StatCard
          title="Last Successful Run"
          value={formatDate(summary.lastSuccess?.startedAt)}
          status="SUCCESS"
        />

        <StatCard
          title="Last Failure Run"
          value={
            summary.lastFailure
              ? formatDate(summary.lastFailure.startedAt)
              : "None"
          }
          status={summary.lastFailure ? "FAILED" : "SUCCESS"}
        />

        <NotificationChannelsCard
          emailEnabled={summary.emailEnabled}
          whatsappEnabled={summary.whatsappEnabled}
        />
      </div>

      <div className="flex gap-4 mt-6">
        {!isAdmin && (
          <button
            onClick={() => setShowAdminModal(true)}
            className="px-6 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 transition font-medium cursor-pointer"
          >
            Admin Login
          </button>
        )}

        {isAdmin && (
          <>
            <button
              disabled={scanLoading}
              onClick={handleScan}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 transition font-medium cursor-pointer"
            >
              {scanLoading ? "Scanning..." : "Scan Statements"}
            </button>

            <button
              disabled={notifyLoading}
              onClick={handleSendNotification}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 transition font-medium cursor-pointer"
            >
              {notifyLoading ? "Sending..." : "Send Monthly Notification"}
            </button>
          </>
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {showAdminModal && (
        <AdminPasswordModal
          onClose={() => setShowAdminModal(false)}
          onSuccess={(password) => {
            setAdminPassword(password);
            setIsAdmin(true);
            setShowAdminModal(false);
          }}
        />
      )}
    </div>
  );
}

export default Dashboard;