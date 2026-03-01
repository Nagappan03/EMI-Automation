import { NavLink } from "react-router-dom";

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <nav className="border-b border-slate-800 bg-slate-950 px-8 py-4 flex justify-between items-center">
        <h1 className="text-lg font-semibold text-indigo-400">
          EMI Tracker Automation Engine System
        </h1>

        <div className="flex gap-6 text-sm">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive
                ? "text-white font-medium"
                : "text-slate-400 hover:text-white"
            }
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/runs"
            className={({ isActive }) =>
              isActive
                ? "text-white font-medium"
                : "text-slate-400 hover:text-white"
            }
          >
            Runs
          </NavLink>

          <NavLink
            to="/system"
            className={({ isActive }) =>
              isActive
                ? "text-white font-medium"
                : "text-slate-400 hover:text-white"
            }
          >
            System
          </NavLink>
        </div>
      </nav>

      <main className="p-8">{children}</main>
    </div>
  );
}

export default Layout;