import { useEffect } from "react";

function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bg =
    type === "success"
      ? "bg-green-600"
      : type === "error"
      ? "bg-red-600"
      : "bg-slate-700";

  return (
    <div
      className={`fixed top-6 right-6 z-50 px-6 py-3 rounded-xl shadow-lg text-white ${bg} animate-slide-in`}
    >
      {message}
    </div>
  );
}

export default Toast;