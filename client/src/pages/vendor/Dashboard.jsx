import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";

const COLUMNS = [
  {
    key: "PENDING",
    label: "New",
    next: "PREPARING",
    action: "Start preparing",
  },
  { key: "PREPARING", label: "Preparing", next: "READY", action: "Mark ready" },
  { key: "READY", label: "Ready", next: "CLAIMED", action: "Mark collected" },
];

export default function VendorDashboard() {
  const [queue, setQueue] = useState({});
  const [counts, setCounts] = useState({});
  const [stall, setStall] = useState("");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { logout } = useAuth();

  const load = () => {
    api
      .get("/vendor/orders")
      .then(({ data }) => {
        setStall(data.stall);
        setQueue(data.orders);
        setCounts(data.counts);
        setError("");
      })
      .catch((err) =>
        setError(err.response?.data?.message || "Could not load the queue."),
      )
      .finally(() => setLoading(false));

    api
      .get("/vendor/orders/summary")
      .then(({ data }) => setSummary(data))
      .catch(() => {});
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, []);

  const advance = async (order, next) => {
    try {
      await api.patch(`/vendor/orders/${order.order_id}/status`, {
        status: next,
      });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update the order.");
    }
  };

  const time = (iso) =>
    new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-emerald-700 leading-tight">
              {stall || "Vendor"}
            </h1>
            <p className="text-xs text-slate-500">Order queue</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/vendor/menu")}
              className="text-sm text-emerald-700 font-medium hover:underline"
            >
              Menu & stock
            </button>
            <button
              onClick={() => navigate("/vendor/slots")}
              className="text-sm text-emerald-700 font-medium hover:underline"
            >
              Pickup times
            </button>
            <button
              onClick={logout}
              className="text-sm text-slate-500 hover:text-slate-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {summary && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Orders today</p>
              <p className="text-2xl font-semibold text-slate-800 mt-1">
                {summary.orders_today}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Collected</p>
              <p className="text-2xl font-semibold text-slate-800 mt-1">
                {summary.claimed_today}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Revenue today</p>
              <p className="text-2xl font-semibold text-emerald-700 mt-1">
                ₱{summary.revenue_today}
              </p>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {loading && <p className="text-slate-400 text-sm">Loading queue…</p>}

        <div className="grid md:grid-cols-3 gap-4">
          {COLUMNS.map((col) => {
            const orders = queue[col.key] || [];
            return (
              <section key={col.key}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-slate-700">{col.label}</h2>
                  <span className="text-xs font-medium bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                    {counts[col.key] ?? 0}
                  </span>
                </div>

                <div className="space-y-3">
                  {orders.length === 0 && (
                    <p className="text-sm text-slate-400 bg-white border border-dashed border-slate-200 rounded-xl p-4 text-center">
                      Nothing here
                    </p>
                  )}

                  {orders.map((order) => (
                    <div
                      key={order.order_id}
                      className="bg-white rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 text-sm">
                            {order.order_code}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {order.student?.full_name}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                          {order.PickupSlot
                            ? time(order.PickupSlot.start_time)
                            : "—"}
                        </span>
                      </div>

                      <div className="mt-3 space-y-0.5">
                        {order.items?.map((line) => (
                          <p
                            key={line.order_item_id}
                            className="text-sm text-slate-700"
                          >
                            {line.quantity} × {line.MenuItem?.name}
                          </p>
                        ))}
                      </div>

                      <p className="text-sm font-medium text-slate-800 mt-2">
                        ₱{Number(order.total_amount).toFixed(2)}
                      </p>

                      <button
                        onClick={() => advance(order, col.next)}
                        className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700
                                   text-white text-sm font-medium rounded-lg py-2 transition"
                      >
                        {col.action}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
