import { useEffect, useState } from "react";
import api from "../../api/client";
import VendorHeader from "../../components/VendorHeader";

const COLUMNS = [
  {
    key: "PENDING",
    label: "New",
    next: "PREPARING",
    action: "Start preparing",
    dot: "bg-calamansi-500",
    button: "bg-ube-700 hover:bg-ube-600 text-white",
    empty: "No new orders yet",
  },
  {
    key: "PREPARING",
    label: "Preparing",
    next: "READY",
    action: "Mark ready",
    dot: "bg-ube-700",
    button: "bg-dahon-600 hover:bg-dahon-700 text-white",
    empty: "Nothing cooking right now",
  },
  {
    key: "READY",
    label: "Ready for pickup",
    next: "CLAIMED",
    action: "Mark collected",
    dot: "bg-dahon-600",
    button: "bg-kape-900 hover:bg-kape-700 text-white",
    empty: "Nothing waiting for pickup",
  },
];

const time = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const peso = (n) => `₱${Number(n || 0).toFixed(2)}`;

const urgency = (iso) => {
  const mins = (new Date(iso).getTime() - Date.now()) / 60000;
  if (mins < 0) return "late";
  if (mins <= 10) return "soon";
  return "later";
};

const PICKUP_PILL = {
  late: "bg-sili-50 text-sili-700",
  soon: "bg-calamansi-50 text-calamansi-600",
  later: "bg-rice-100 text-kape-700",
};

function OrderCard({ order, column, busy, onAdvance }) {
  const slot = order.PickupSlot;
  const level =
    slot && column.key !== "READY" ? urgency(slot.start_time) : "later";

  return (
    <article className="bg-white rounded-card border border-rice-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-xl font-extrabold leading-tight text-kape-900 tabular tracking-wide">
            {order.order_code}
          </p>
          <p className="text-sm text-kape-700 truncate">
            {order.student?.full_name || "Student"}
          </p>
        </div>
        <span
          className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full tabular ${PICKUP_PILL[level]}`}
        >
          {slot ? time(slot.start_time) : "—"}
          {level === "late" ? " · late" : ""}
        </span>
      </div>

      <ul className="mt-3 pt-3 border-t border-dashed border-rice-200 space-y-1">
        {order.items?.map((line) => (
          <li key={line.order_item_id} className="text-sm text-kape-900">
            <span className="tabular font-semibold text-ube-700 mr-2">
              {line.quantity}×
            </span>
            {line.MenuItem?.name}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-sm text-kape-700">
          {column.key === "READY" ? "Collect in cash" : "Total"}
        </span>
        <span className="font-display text-lg font-extrabold text-kape-900 tabular">
          {peso(order.total_amount)}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onAdvance(order, column.next)}
        disabled={busy}
        className={`w-full mt-3 text-sm font-semibold rounded-card py-3 transition-colors disabled:opacity-50 ${column.button}`}
      >
        {busy ? "Updating…" : column.action}
      </button>
    </article>
  );
}

export default function VendorDashboard() {
  const [queue, setQueue] = useState({});
  const [counts, setCounts] = useState({});
  const [stall, setStall] = useState("");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState({});

  const load = () => {
    api
      .get("/vendor/orders/summary")
      .then(({ data }) => setSummary(data))
      .catch(() => {});

    return api
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
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const n = counts.PENDING || 0;
    document.title = n ? `(${n}) New orders · CSU Canteen` : "CSU Canteen";
    return () => {
      document.title = "CSU Canteen";
    };
  }, [counts.PENDING]);

  const advance = async (order, next) => {
    if (busy[order.order_id]) return;
    setBusy((b) => ({ ...b, [order.order_id]: true }));
    try {
      await api.patch(`/vendor/orders/${order.order_id}/status`, {
        status: next,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Could not update the order.");
    } finally {
      await load();
      setBusy((b) => {
        const rest = { ...b };
        delete rest[order.order_id];
        return rest;
      });
    }
  };

  return (
    <div className="min-h-screen bg-rice-50">
      <VendorHeader stall={stall} />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {summary && (
          <section
            aria-label="Today"
            className="bg-white rounded-card border border-rice-200 grid grid-cols-3 divide-x divide-dashed divide-rice-200 mb-6"
          >
            <div className="px-4 py-3.5">
              <p className="text-xs text-kape-700">Orders today</p>
              <p className="font-display text-2xl font-extrabold text-kape-900 tabular mt-0.5">
                {summary.orders_today ?? 0}
              </p>
            </div>
            <div className="px-4 py-3.5">
              <p className="text-xs text-kape-700">Collected</p>
              <p className="font-display text-2xl font-extrabold text-kape-900 tabular mt-0.5">
                {summary.claimed_today ?? 0}
              </p>
            </div>
            <div className="px-4 py-3.5">
              <p className="text-xs text-kape-700">Revenue today</p>
              <p className="font-display text-2xl font-extrabold text-dahon-600 tabular mt-0.5 truncate">
                {peso(summary.revenue_today)}
              </p>
            </div>
          </section>
        )}

        {error && (
          <p
            role="alert"
            className="text-sm text-sili-700 bg-sili-50 border border-sili-100 rounded-card px-3.5 py-2.5 mb-5"
          >
            {error}
          </p>
        )}

        {loading && <p className="text-kape-700/60 text-sm">Loading orders…</p>}

        {!loading && (
          <div className="grid md:grid-cols-3 gap-6 md:gap-4">
            {COLUMNS.map((col) => {
              const orders = queue[col.key] || [];
              return (
                <section key={col.key} aria-labelledby={`col-${col.key}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h2
                      id={`col-${col.key}`}
                      className="flex items-center gap-2 font-display text-base font-bold text-kape-900"
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${col.dot}`}
                        aria-hidden="true"
                      />
                      {col.label}
                    </h2>
                    <span className="text-xs font-semibold tabular bg-rice-100 text-kape-700 px-2.5 py-0.5 rounded-full">
                      {counts[col.key] ?? 0}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {orders.length === 0 && (
                      <p className="text-sm text-kape-700/60 border border-dashed border-rice-200 rounded-card px-4 py-6 text-center">
                        {col.empty}
                      </p>
                    )}

                    {orders.map((order) => (
                      <OrderCard
                        key={order.order_id}
                        order={order}
                        column={col}
                        busy={!!busy[order.order_id]}
                        onAdvance={advance}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
