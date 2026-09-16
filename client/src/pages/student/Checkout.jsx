import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../../api/client";

export default function Checkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();

  const [slots, setSlots] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  // Cart came through router state from the menu screen
  const cart = state?.cart || {};
  const menu = state?.menu || [];
  const stall = state?.stall;

  const lines = menu
    .filter((i) => cart[i.item_id])
    .map((i) => ({ ...i, qty: cart[i.item_id] }));

  const total = lines.reduce((s, l) => s + Number(l.price) * l.qty, 0);

  useEffect(() => {
    if (lines.length === 0) {
      navigate(`/stalls/${id}`);
      return;
    }

    api
      .get(`/browse/stalls/${id}/slots`)
      .then(({ data }) => setSlots(data.slots))
      .catch(() => setError("Could not load pickup times."))
      .finally(() => setLoading(false));
  }, [id, lines.length]);

  const time = (iso) =>
    new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const placeOrder = async () => {
    setError("");
    setPlacing(true);
    try {
      const { data } = await api.post("/orders", {
        slot_id: selected,
        items: lines.map((l) => ({ item_id: l.item_id, quantity: l.qty })),
      });
      navigate("/orders", { state: { justPlaced: data.order.order_code } });
    } catch (err) {
      setError(err.response?.data?.message || "Could not place the order.");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-slate-400 hover:text-slate-700 text-xl leading-none"
          >
            ←
          </button>
          <div>
            <h1 className="font-semibold text-slate-800 leading-tight">
              Confirm order
            </h1>
            <p className="text-xs text-slate-500">{stall?.stall_name}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <section className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
            Your order
          </h2>
          <div className="space-y-2">
            {lines.map((l) => (
              <div key={l.item_id} className="flex justify-between text-sm">
                <span className="text-slate-700">
                  {l.qty} × {l.name}
                </span>
                <span className="text-slate-600">
                  ₱{(Number(l.price) * l.qty).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 mt-3 pt-3 flex justify-between font-medium">
            <span className="text-slate-800">Total</span>
            <span className="text-slate-800">₱{total.toFixed(2)}</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Pay in cash when you collect.
          </p>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
            Pickup time
          </h2>

          {loading && <p className="text-slate-400 text-sm">Loading times…</p>}

          {!loading && slots.length === 0 && (
            <p className="text-slate-500 text-sm">
              No pickup times are available today.
            </p>
          )}

          <div className="grid grid-cols-3 gap-2">
            {slots.map((s) => {
              const isSelected = selected === s.slot_id;
              return (
                <button
                  key={s.slot_id}
                  disabled={s.is_full}
                  onClick={() => setSelected(s.slot_id)}
                  className={`rounded-xl border py-3 px-2 text-sm transition ${
                    s.is_full
                      ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                      : isSelected
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "bg-white border-slate-200 text-slate-700 hover:border-emerald-400"
                  }`}
                >
                  <div className="font-medium">{time(s.start_time)}</div>
                  <div className="text-xs mt-0.5 opacity-80">
                    {s.is_full ? "Full" : `${s.remaining} left`}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </main>

      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 p-4">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={placeOrder}
            disabled={!selected || placing}
            className="w-full bg-emerald-600 hover:bg-emerald-700
                       disabled:bg-slate-200 disabled:text-slate-400
                       text-white font-medium rounded-xl py-3 transition"
          >
            {placing
              ? "Placing order…"
              : selected
                ? `Place order · ₱${total.toFixed(2)}`
                : "Choose a pickup time"}
          </button>
        </div>
      </div>
    </div>
  );
}
