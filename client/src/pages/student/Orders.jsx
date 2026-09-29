import { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";

const STEPS = ["PENDING", "PREPARING", "READY", "CLAIMED"];

const LABEL = {
  PENDING: "Order placed",
  PREPARING: "Being prepared",
  READY: "Ready for pickup",
  CLAIMED: "Collected",
  CANCELLED: "Cancelled",
};

const PILL = {
  PENDING: "bg-rice-100 text-kape-700",
  PREPARING: "bg-ube-50 text-ube-700",
  READY: "bg-dahon-600 text-white",
  CLAIMED: "bg-dahon-50 text-dahon-700",
  CANCELLED: "bg-sili-50 text-sili-700",
};

const time = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const day = (iso) =>
  new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });

const peso = (n) => `₱${Number(n).toFixed(2)}`;

function StatusPill({ status }) {
  return (
    <span
      className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${PILL[status]}`}
    >
      {LABEL[status]}
    </span>
  );
}

function Progress({ status }) {
  const stepIndex = STEPS.indexOf(status);
  const ready = status === "READY";
  const fill = ready ? "bg-dahon-600" : "bg-ube-700";
  const halo = ready ? "ring-dahon-100" : "ring-ube-100";

  return (
    <div className="mt-4" aria-hidden="true">
      <div className="flex items-center">
        {STEPS.map((step, i) => (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <span
              className={`w-3 h-3 rounded-full shrink-0 ${
                i <= stepIndex ? fill : "bg-rice-200"
              } ${i === stepIndex ? `ring-4 ${halo}` : ""} ${
                i === stepIndex && status === "PREPARING"
                  ? "motion-safe:animate-pulse"
                  : ""
              }`}
            />
            {i < STEPS.length - 1 && (
              <span
                className={`h-0.5 flex-1 mx-1 rounded-full ${
                  i < stepIndex ? fill : "bg-rice-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2">
        {STEPS.map((step, i) => (
          <span
            key={step}
            className={`text-[11px] ${
              i === stepIndex
                ? "text-kape-900 font-semibold"
                : i < stepIndex
                  ? "text-kape-700"
                  : "text-kape-700/50"
            }`}
          >
            {step.charAt(0) + step.slice(1).toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
}

function ActiveCard({ order, confirming, onConfirm, onCancel, onDismiss }) {
  const [busy, setBusy] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const ready = order.status === "READY";
  const slot = order.PickupSlot;

  const confirmCancel = async () => {
    setBusy(true);
    setCancelError("");
    const message = await onCancel(order);
    if (message) setCancelError(message);
    setBusy(false);
  };

  return (
    <article
      className={`bg-white rounded-card border p-5 transition-colors ${
        ready ? "border-dahon-600 ring-4 ring-dahon-100" : "border-rice-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-kape-700 truncate">
            {order.Vendor?.stall_name || "Stall"}
          </p>
          <p className="font-display text-[26px] leading-tight font-extrabold text-kape-900 tabular tracking-wide">
            {order.order_code}
          </p>
        </div>
        <StatusPill status={order.status} />
      </div>

      <p className="text-sm text-kape-700 mt-1">
        Pickup at{" "}
        <span className="font-semibold text-kape-900 tabular">
          {slot ? `${time(slot.start_time)} – ${time(slot.end_time)}` : "—"}
        </span>
      </p>

      <Progress status={order.status} />

      {ready && (
        <div className="mt-4 bg-dahon-50 border border-dahon-100 rounded-card px-3.5 py-3">
          <p className="text-sm font-semibold text-dahon-700">
            Your food is ready.
          </p>
          <p className="text-sm text-dahon-700 mt-0.5">
            Show code{" "}
            <span className="font-bold tabular">{order.order_code}</span> at{" "}
            {order.Vendor?.location || "the stall"} and pay{" "}
            <span className="font-bold tabular">
              {peso(order.total_amount)}
            </span>{" "}
            in cash.
          </p>
        </div>
      )}

      <ul className="mt-4 pt-3 border-t border-dashed border-rice-200 space-y-1.5">
        {order.items?.map((line) => (
          <li
            key={line.order_item_id}
            className="flex items-baseline justify-between gap-4 text-sm"
          >
            <span className="text-kape-900 min-w-0">
              <span className="tabular font-semibold text-ube-700 mr-2">
                {line.quantity}×
              </span>
              {line.MenuItem?.name}
            </span>
            <span className="tabular text-kape-700 shrink-0">
              {peso(Number(line.unit_price) * line.quantity)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-sm text-kape-700">Total, cash on pickup</span>
        <span className="font-display text-xl font-extrabold text-kape-900 tabular">
          {peso(order.total_amount)}
        </span>
      </div>

      {cancelError && (
        <p
          role="alert"
          className="mt-3 text-sm text-sili-700 bg-sili-50 border border-sili-100 rounded-card px-3.5 py-2.5"
        >
          {cancelError}
        </p>
      )}

      {order.status === "PENDING" && (
        <div className="mt-4 pt-3 border-t border-rice-100">
          {confirming ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-sm text-kape-900 sm:mr-auto">
                Cancel this order? The stall will release your items.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={confirmCancel}
                  disabled={busy}
                  className="text-sm font-semibold text-white bg-sili-600 hover:bg-sili-700 disabled:opacity-50 rounded-card px-4 py-2.5"
                >
                  {busy ? "Cancelling…" : "Yes, cancel"}
                </button>
                <button
                  type="button"
                  onClick={onDismiss}
                  disabled={busy}
                  className="text-sm font-semibold text-kape-900 border border-rice-200 bg-white hover:bg-rice-50 rounded-card px-4 py-2.5"
                >
                  Keep order
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onConfirm(order.order_id)}
              className="text-sm font-semibold text-sili-600 hover:text-sili-700 hover:underline underline-offset-2 rounded"
            >
              Cancel order
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function PastCard({ order }) {
  const cancelled = order.status === "CANCELLED";
  const summary = order.items
    ?.map((line) => `${line.quantity}× ${line.MenuItem?.name}`)
    .join(", ");

  return (
    <article className="bg-white/60 rounded-card border border-rice-200 px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <p
          className={`font-display text-lg font-bold tabular tracking-wide ${
            cancelled ? "text-kape-700/60 line-through" : "text-kape-900"
          }`}
        >
          {order.order_code}
        </p>
        <StatusPill status={order.status} />
      </div>
      <p className="text-sm text-kape-700 mt-1 truncate">{summary}</p>
      <div className="mt-2 flex items-baseline justify-between text-sm">
        <span className="text-kape-700/70 truncate">
          {order.Vendor?.stall_name}
          {order.placed_at ? `, ${day(order.placed_at)}` : ""}
        </span>
        <span
          className={`tabular font-semibold shrink-0 ${
            cancelled ? "text-kape-700/50" : "text-kape-900"
          }`}
        >
          {peso(order.total_amount)}
        </span>
      </div>
    </article>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmingId, setConfirmingId] = useState(null);

  const navigate = useNavigate();
  const { state } = useLocation();
  const { logout } = useAuth();

  const load = useCallback(() => {
    return api
      .get("/orders/mine")
      .then(({ data }) => {
        setOrders(data.orders);
        setError("");
      })
      .catch(() => setError("Could not load your orders."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    if (confirmingId !== null) return;
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [load, confirmingId]);

  const cancelOrder = async (order) => {
    try {
      await api.patch(`/orders/${order.order_id}/cancel`);
      setConfirmingId(null);
      await load();
      return "";
    } catch (err) {
      await load();
      setConfirmingId(null);
      return (
        err.response?.data?.message || "Could not cancel this order. Try again."
      );
    }
  };

  const active = orders.filter(
    (o) => o.status !== "CLAIMED" && o.status !== "CANCELLED",
  );
  const past = orders.filter(
    (o) => o.status === "CLAIMED" || o.status === "CANCELLED",
  );

  return (
    <div className="min-h-screen bg-rice-50">
      <header className="bg-rice-50/95 backdrop-blur border-b border-rice-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            to="/"
            className="font-display text-lg font-extrabold text-ube-700 rounded"
          >
            CSU Canteen
          </Link>
          <button
            type="button"
            onClick={logout}
            className="text-sm text-kape-700 hover:text-kape-900 rounded"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-7">
        <div className="flex items-end justify-between gap-4">
          <h1 className="font-display text-[28px] leading-tight font-extrabold text-kape-900">
            Your orders
          </h1>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="shrink-0 text-sm font-semibold text-kape-900 bg-calamansi-500 hover:bg-calamansi-600 rounded-card px-4 py-2.5 transition-colors"
          >
            Order again
          </button>
        </div>

        {state?.justPlaced && (
          <div className="mt-6 bg-dahon-50 border border-dahon-100 rounded-card px-4 py-3.5">
            <p className="text-sm font-semibold text-dahon-700">
              Order <span className="tabular">{state.justPlaced}</span> placed.
            </p>
            <p className="text-sm text-dahon-700 mt-0.5">
              We&apos;ll show it here as the stall prepares it. Pay in cash when
              you collect.
            </p>
          </div>
        )}

        {loading && (
          <p className="text-kape-700/60 text-sm mt-8">Loading orders…</p>
        )}

        {error && (
          <p
            role="alert"
            className="mt-6 text-sm text-sili-700 bg-sili-50 border border-sili-100 rounded-card px-3.5 py-2.5"
          >
            {error}
          </p>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="mt-8 border border-dashed border-rice-200 rounded-card px-5 py-10 text-center">
            <p className="font-display text-lg font-bold text-kape-900">
              No orders yet
            </p>
            <p className="text-sm text-kape-700 mt-1">
              Pick a stall, choose your food, and reserve a pickup time.
            </p>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mt-4 text-sm font-semibold text-ube-700 hover:underline underline-offset-2 rounded"
            >
              Browse stalls
            </button>
          </div>
        )}

        {active.length > 0 && (
          <section className="mt-7" aria-labelledby="active-heading">
            <h2
              id="active-heading"
              className="font-display text-base font-bold text-kape-900 mb-3"
            >
              In progress
            </h2>
            <div className="space-y-4">
              {active.map((o) => (
                <ActiveCard
                  key={o.order_id}
                  order={o}
                  confirming={confirmingId === o.order_id}
                  onConfirm={setConfirmingId}
                  onCancel={cancelOrder}
                  onDismiss={() => setConfirmingId(null)}
                />
              ))}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section className="mt-9" aria-labelledby="past-heading">
            <h2
              id="past-heading"
              className="font-display text-base font-bold text-kape-900 mb-3"
            >
              Past orders
            </h2>
            <div className="space-y-3">
              {past.map((o) => (
                <PastCard key={o.order_id} order={o} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
