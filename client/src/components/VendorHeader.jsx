import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const TABS = [
  { to: "/vendor", label: "Orders", end: true },
  { to: "/vendor/menu", label: "Menu & stock" },
  { to: "/vendor/slots", label: "Pickup times" },
];

export default function VendorHeader({ stall }) {
  const { logout } = useAuth();

  return (
    <header className="bg-rice-50/95 backdrop-blur border-b border-rice-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 pt-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-xs font-bold text-ube-700">
            CSU Canteen vendor
          </p>
          <p className="font-display text-lg font-extrabold leading-tight text-kape-900 truncate">
            {stall || "Your stall"}
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="shrink-0 text-sm text-kape-700 hover:text-kape-900 rounded"
        >
          Sign out
        </button>
      </div>

      <nav
        aria-label="Vendor sections"
        className="max-w-6xl mx-auto px-4 mt-1 flex gap-6 overflow-x-auto"
      >
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `shrink-0 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? "border-ube-700 text-ube-700"
                  : "border-transparent text-kape-700 hover:text-kape-900"
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
