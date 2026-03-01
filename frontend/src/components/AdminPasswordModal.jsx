import { useState, useEffect } from "react";

function AdminPasswordModal({ onSuccess, onClose }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

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

  const handleSubmit = async () => {
    if (!password) return;

    try {
        const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: {
            "x-admin-password": password
        }
        });

        if (!res.ok) {
            setPassword("");
            throw new Error("Invalid password");
        }

        onSuccess(password);
    } catch {
        setError(true);
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        className="fixed top-0 left-0 w-screen h-screen bg-black/70 backdrop-blur-sm z-[999]"
      />

      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-[modalFadeIn_0.2s_ease-out]">
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-8 shadow-2xl"
        >
          <h3 className="text-xl font-semibold mb-6">
            Admin Access
          </h3>

          <input
            type="password"
            placeholder="Enter admin password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 mb-4 focus:outline-none"
          />

          {error && (
            <p className="text-red-400 text-sm mb-4">Invalid password</p>
          )}

          <button
            onClick={handleSubmit}
            className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-lg py-3 font-medium cursor-pointer"
          >
            Unlock
          </button>
        </div>
      </div>
    </>
  );
}

export default AdminPasswordModal;