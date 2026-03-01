export default function StatCard({ title, value, status }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 shadow-lg hover:shadow-2xl hover:border-slate-500 hover:-translate-y-1 transition-all duration-300">
      <p className="text-slate-400 text-sm mb-2">{title}</p>
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-semibold">{value}</h3>
        {status && (
          <span
            className={`px-3 py-1 text-xs rounded-full ${
              status === "SUCCESS"
                ? "bg-green-500/20 text-green-400"
                : status === "FAILED"
                ? "bg-red-500/20 text-red-400"
                : status === "RUNNING"
                ? "bg-yellow-500/20 text-yellow-400"
                : status === "COMING SOON"
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-slate-500/20 text-slate-400"
            }`}
          >
            {status}
          </span>
        )}
      </div>
    </div>
  );
}