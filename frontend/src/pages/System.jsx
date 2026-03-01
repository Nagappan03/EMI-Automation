import { useEffect, useState } from "react";
import StatCard from "../components/StatCard";
import Loader from "../components/Loader";
import { fetchSystemDetails } from "../services/api";

function System() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await fetchSystemDetails();
      setData(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="space-y-12">
      <h2 className="text-3xl font-semibold">System Diagnostics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
        <StatCard
          title="API Status"
          value={data.api.status}
          status="SUCCESS"
        />

        <StatCard
          title="Database"
          value={data.database.connected ? "Connected" : "Disconnected"}
          status={data.database.connected ? "SUCCESS" : "FAILED"}
        />

        <StatCard
          title="Uptime"
          value={`${Math.floor(data.api.uptimeSeconds / 60)} mins`}
        />

        <StatCard
          title="Server Time"
          value={new Date(data.system.serverTime).toLocaleString()}
        />
      </div>

      <h3 className="text-xl font-semibold mt-12">Notification Channels</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
        <StatCard
          title="Email"
          value={data.notifications.emailEnabled ? "Configured" : "Missing"}
          status={data.notifications.emailEnabled ? "SUCCESS" : "FAILED"}
        />

        <StatCard
          title="WhatsApp"
          value={data.notifications.whatsappEnabled ? "Configured" : "Missing"}
          status={data.notifications.whatsappEnabled ? "SUCCESS" : "FAILED"}
        />

        <StatCard
          title="WhatsApp Recipients"
          value={data.notifications.whatsappRecipients}
        />
      </div>

      <h3 className="text-xl font-semibold mt-12">Runtime</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
        <StatCard
          title="Node Version"
          value={data.system.nodeVersion}
        />

        <StatCard
          title="Environment"
          value={data.system.environment}
        />

        <StatCard
          title="Memory Usage"
          value={`${data.system.memoryUsageMB} MB`}
        />
      </div>
    </div>
  );
}

export default System;