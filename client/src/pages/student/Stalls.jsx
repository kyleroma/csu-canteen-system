import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";

// The first letter doubles as the stall's sign — canteen stalls are
// recognised by their painted board long before you read the name.
function StallMark({ name, muted }) {
  return (
    <div
      className={`w-12 h-12 rounded-[10px] grid place-items-center shrink-0 font-display text-xl font-extrabold ${
        muted ? "bg-rice-100 text-kape-700/50" : "bg-ube-100 text-ube-700"
      }`}
      aria-hidden="true"
    >
      {name.trim().charAt(0).toUpperCase()}
    </div>
  );
}

export default function Stalls() {
  const [stalls, setStalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user, logout } = useAuth();

  useEffect(() => {
    api
      .get("/browse/stalls")
      .then(({ data }) => setStalls(data.stalls))
      .catch(() => setError("Could not load stalls."))
      .finally(() => setLoading(false));
  }, []);

  const firstName = user?.full_name?.split(" ")[0];
  const open = stalls.filter((s) => s.is_open);
  const closed = stalls.filter((s) => !s.is_open);

  return (
    <div className="min-h-screen bg-rice-50">
      <header className="bg-rice-50/95 backdrop-blur border-b border-rice-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="font-display text-lg font-extrabold text-ube-700">
            CSU Canteen
          </span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-kape-700 hidden sm:inline">
              {user?.full_name}
            </span>
            <button
              onClick={logout}
              className="text-sm text-kape-700 hover:text-kape-900 rounded"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-7">
        <h1 className="font-display text-[28px] leading-tight font-extrabold text-kape-900">
          {firstName
            ? `Where are you eating, ${firstName}?`
            : "Where are you eating?"}
        </h1>
        <p className="text-kape-700 mt-1.5 max-w-[46ch]">
          Order ahead, reserve a pickup time, and collect it when it&apos;s
          ready. Pay in cash at the stall.
        </p>

        {loading && (
          <p className="text-kape-700/60 text-sm mt-8">Loading stalls…</p>
        )}

        {error && (
          <p className="text-sm text-sili-700 bg-sili-50 border border-sili-100 rounded-card px-3.5 py-2.5 mt-6">
            {error}
          </p>
        )}

        {!loading && !error && stalls.length === 0 && (
          <div className="mt-8 border border-dashed border-rice-200 rounded-card px-5 py-10 text-center">
            <p className="font-display text-lg font-bold text-kape-900">
              No stalls yet
            </p>
            <p className="text-sm text-kape-700 mt-1">
              Stalls appear here once the canteen office verifies them.
            </p>
          </div>
        )}

        {open.length > 0 && (
          <ul className="mt-7 space-y-3">
            {open.map((stall) => (
              <li key={stall.vendor_id}>
                <Link
                  to={`/stalls/${stall.vendor_id}`}
                  className="flex items-center gap-4 bg-white rounded-card border border-rice-200 p-4
                             hover:border-ube-600 focus-visible:border-ube-600 transition-colors"
                >
                  <StallMark name={stall.stall_name} />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-lg font-bold text-kape-900 truncate">
                      {stall.stall_name}
                    </h2>
                    <p className="text-sm text-kape-700 truncate">
                      {stall.location || "Main Canteen"}
                    </p>
                  </div>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-dahon-600 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-dahon-600" />
                    Open
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {closed.length > 0 && (
          <div className="mt-8">
            <h2 className="font-display text-base font-bold text-kape-900">
              Closed right now
            </h2>
            <ul className="mt-3 space-y-3">
              {closed.map((stall) => (
                <li
                  key={stall.vendor_id}
                  className="flex items-center gap-4 bg-white/60 rounded-card border border-rice-200 p-4"
                >
                  <StallMark name={stall.stall_name} muted />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-lg font-bold text-kape-900/60 truncate">
                      {stall.stall_name}
                    </h3>
                    <p className="text-sm text-kape-700/60 truncate">
                      {stall.location || "Main Canteen"}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-kape-700/50 shrink-0">
                    Closed
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
