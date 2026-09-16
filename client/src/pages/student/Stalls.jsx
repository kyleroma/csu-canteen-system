import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";

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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-emerald-700">CSU Canteen</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 hidden sm:inline">
              {user?.full_name}
            </span>
            <button
              onClick={logout}
              className="text-sm text-slate-500 hover:text-slate-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">
          Choose a stall
        </h2>
        <p className="text-sm text-slate-500 mb-5">
          Order ahead and pick a collection time.
        </p>

        {loading && <p className="text-slate-400 text-sm">Loading stalls…</p>}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {!loading && !error && stalls.length === 0 && (
          <p className="text-slate-500 text-sm">
            No stalls are open right now.
          </p>
        )}

        <div className="space-y-3">
          {stalls.map((stall) => (
            <Link
              key={stall.vendor_id}
              to={`/stalls/${stall.vendor_id}`}
              className="block bg-white rounded-xl border border-slate-200 p-4
                         hover:border-emerald-400 hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium text-slate-800">
                    {stall.stall_name}
                  </h3>
                  {stall.location && (
                    <p className="text-sm text-slate-500 mt-0.5">
                      {stall.location}
                    </p>
                  )}
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${
                    stall.is_open
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {stall.is_open ? "Open" : "Closed"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
