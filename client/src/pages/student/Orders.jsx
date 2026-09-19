import { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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

function OrderCard({ order, confirming, onConfirm, onCancel, onDismiss }) {
  const [busy, setBusy] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const stepIndex = STEPS.indexOf(order.status);
  const cancelled = order.status === "CANCELLED";

  const time = (iso) =>
    new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const confirmCancel = async () => {
    setBusy(true);
    setCancelError("");
    const message = await onCancel(order);
    if (message) setCancelError(message);
    setBusy(false);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-800">{order.order_code}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Pickup {order.PickupSlot ? time(order.PickupSlot.start_time) : "—"}
          </p>
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
            cancelled
              ? "bg-red-50 text-red-600"
              : order.status === "READY"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-slate-100 text-slate-600"
          }`}
        >
          {LABEL[order.status]}
        </span>
      </div>

      <div className="mt-3 space-y-1">
        {order.items?.map((line) => (
          <div
            key={line.order_item_id}
            className="flex justify-between text-sm"
          >
            <span className="text-slate-600">
              {line.quantity} × {line.MenuItem?.name}
            </span>
            <span className="text-slate-500">
              ₱{(Number(line.unit_price) * line.quantity).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 mt-3 pt-3 flex justify-between text-sm font-medium">
        <span className="text-slate-700">Total</span>
        <span className="text-slate-800">
          ₱{Number(order.total_amount).toFixed(2)}
        </span>
      </div>

      {!cancelled && (
        <div className="mt-4">
          <div className="flex items-center">
            {STEPS.map((step, i) => (
              <div
                key={step}
                className="flex items-center flex-1 last:flex-none"
              >
                <div
                  className={`w-3 h-3 rounded-full shrink-0 ${
                    i <= stepIndex ? "bg-emerald-600" : "bg-slate-200"
                  }`}
                />
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 ${
                      i < stepIndex ? "bg-emerald-600" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1.5">
            {STEPS.map((step, i) => (
              <span
                key={step}
                className={`text-[10px] ${
                  i <= stepIndex
                    ? "text-emerald-700 font-medium"
                    : "text-slate-400"
                }`}
              >
                {step.charAt(0) + step.slice(1).toLowerCase()}
              </span>
            ))}
          </div>
        </div>
      )}

      {order.status === "READY" && (
        <p className="mt-3 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
          Your order is ready. Collect it at the stall.
        </p>
      )}

      {cancelError && (
        <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {cancelError}
        </p>
      )}

      {/* Cancelling is only possible while the stall has not started cooking. */}
      {order.status === "PENDING" && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          {confirming ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <p className="text-sm text-slate-600 sm:mr-auto">
                Cancel this order? The stall will release your items.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={confirmCancel}
                  disabled={busy}
                  className="text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg px-4 py-2"
                >
                  {busy ? "Cancelling…" : "Yes, cancel"}
                </button>
                <button
                  onClick={onDismiss}
                  disabled={busy}
                  className="text-sm font-medium text-slate-600 border border-slate-300 hover:bg-slate-50 rounded-lg px-4 py-2"
                >
                  Keep order
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => onConfirm(order.order_id)}
              className="text-sm font-medium text-red-600 hover:underline"
            >
              Cancel order
            </button>
          )}
        </div>
      )}
    </div>
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
      .then(({ data }) => setOrders(data.orders))
      .catch(() => setError("Could not load your orders."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    // Pause the poll while a confirm is open, so a refresh cannot
    // pull the card out from under the student mid-decision.
    if (confirmingId !== null) return;
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [load, confirmingId]);

  // Returns an error message to show on the card, or "" on success.
  const cancelOrder = async (order) => {
    try {
      await api.patch(`/orders/${order.order_id}/cancel`);
      setConfirmingId(null);
      await load();
      return "";
    } catch (err) {
      // 409 means the vendor moved the order on before the tap landed —
      // reload so the student sees the real status, then explain why.
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

  const cardProps = (o) => ({
    key: o.order_id,
    order: o,
    confirming: confirmingId === o.order_id,
    onConfirm: setConfirmingId,
    onCancel: cancelOrder,
    onDismiss: () => setConfirmingId(null),
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-emerald-700">My orders</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="text-sm text-emerald-700 font-medium hover:underline"
            >
              Order again
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

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {state?.justPlaced && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <p className="text-sm font-medium text-emerald-800">
              Order {state.justPlaced} placed.
            </p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Pay in cash when you collect.
            </p>
          </div>
        )}

        {loading && <p className="text-slate-400 text-sm">Loading orders…</p>}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {!loading && orders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500">You have no orders yet.</p>
            <button
              onClick={() => navigate("/")}
              className="mt-3 text-emerald-700 font-medium hover:underline"
            >
              Browse stalls
            </button>
          </div>
        )}

        {active.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
              Active
            </h2>
            <div className="space-y-3">
              {active.map((o) => (
                <OrderCard {...cardProps(o)} />
              ))}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
              Past orders
            </h2>
            <div className="space-y-3">
              {past.map((o) => (
                <OrderCard {...cardProps(o)} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
