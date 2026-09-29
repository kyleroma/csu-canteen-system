import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../../api/client";

const STOCK_ERRORS = ["ITEM_SOLD_OUT", "INSUFFICIENT_STOCK", "ITEM_NOT_FOUND"];

export default function Checkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();

  const [slots, setSlots] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");

  const cart = state?.cart || {};
  const menu = state?.menu || [];
  const stall = state?.stall;

  const lines = menu
    .filter((i) => cart[i.item_id])
    .map((i) => ({ ...i, qty: cart[i.item_id] }));

  const total = lines.reduce((s, l) => s + Number(l.price) * l.qty, 0);
  const itemCount = lines.reduce((s, l) => s + l.qty, 0);

  const loadSlots = () =>
    api
      .get(`/browse/stalls/${id}/slots`)
      .then(({ data }) => setSlots(data.slots))
      .catch(() => setError("Could not load pickup times."))
      .finally(() => setLoading(false));

  useEffect(() => {
    if (lines.length === 0) {
      navigate(`/stalls/${id}`, { replace: true });
      return;
    }
    loadSlots();
  }, [id, lines.length]);

  const time = (iso) =>
    new Date(iso).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

  const chosen = slots.find((s) => s.slot_id === selected);

  const placeOrder = async () => {
    setError("");
    setErrorCode("");
    setPlacing(true);
    try {
      const { data } = await api.post("/orders", {
        slot_id: selected,
        items: lines.map((l) => ({ item_id: l.item_id, quantity: l.qty })),
      });
      navigate("/orders", {
        replace: true,
        state: { justPlaced: data.order.order_code },
      });
    } catch (err) {
      const code = err.response?.data?.code || "";
      setError(
        err.response?.data?.message ||
          "Could not place the order. Check your connection and try again.",
      );
      setErrorCode(code);
      if (code === "SLOT_FULL") {
        setSelected(null);
        loadSlots();
      }
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="min-h-screen bg-rice-50 pb-40">
      <header className="bg-rice-50/95 backdrop-blur border-b border-rice-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(`/stalls/${id}`)}
            aria-label="Back to menu"
            className="h-9 w-9 -ml-1 grid place-items-center rounded-full text-kape-700 hover:bg-rice-100 hover:text-kape-900 text-xl leading-none"
          >
            ←
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-lg font-extrabold text-kape-900 leading-tight">
              Confirm your order
            </h1>
            {stall?.stall_name && (
              <p className="text-xs text-kape-700 truncate">
                {stall.stall_name}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        <section aria-labelledby="order-heading">
          <h2
            id="order-heading"
            className="font-display text-base font-bold text-kape-900 mb-3"
          >
            Your order
          </h2>

          <div className="bg-white rounded-card border border-rice-200 px-5 py-4">
            <ul className="space-y-2.5">
              {lines.map((l) => (
                <li
                  key={l.item_id}
                  className="flex items-baseline justify-between gap-4 text-sm"
                >
                  <span className="text-kape-900 min-w-0">
                    <span className="tabular font-semibold text-ube-700 mr-2">
                      {l.qty}×
                    </span>
                    {l.name}
                  </span>
                  <span className="tabular text-kape-700 shrink-0">
                    ₱{(Number(l.price) * l.qty).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="border-t border-dashed border-rice-200 mt-4 pt-3 flex items-baseline justify-between">
              <span className="text-sm text-kape-700">
                Total · {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
              <span className="font-display text-2xl font-extrabold text-kape-900 tabular">
                ₱{total.toFixed(2)}
              </span>
            </div>

            <p className="mt-3 flex items-center gap-2 text-xs text-kape-700">
              <span
                className="h-1.5 w-1.5 rounded-full bg-calamansi-500"
                aria-hidden="true"
              />
              Pay in cash at the stall when you collect.
            </p>
          </div>
        </section>

        <section aria-labelledby="slot-heading">
          <h2
            id="slot-heading"
            className="font-display text-base font-bold text-kape-900"
          >
            Pickup time
          </h2>
          <p className="text-sm text-kape-700 mt-0.5 mb-3">
            Choose when you&apos;ll come to the stall.
          </p>

          {loading && (
            <p className="text-kape-700/60 text-sm">Loading pickup times…</p>
          )}

          {!loading && slots.length === 0 && (
            <div className="border border-dashed border-rice-200 rounded-card px-5 py-8 text-center">
              <p className="font-display text-base font-bold text-kape-900">
                No pickup times left today
              </p>
              <p className="text-sm text-kape-700 mt-1">
                This stall hasn&apos;t opened any more slots. Check back later.
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {slots.map((s) => {
              const isSelected = selected === s.slot_id;
              const low = !s.is_full && s.remaining <= 2;

              return (
                <button
                  key={s.slot_id}
                  type="button"
                  disabled={s.is_full}
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelected(s.slot_id);
                    setError("");
                    setErrorCode("");
                  }}
                  className={`rounded-card border py-3 px-2 text-center transition-colors ${
                    s.is_full
                      ? "bg-rice-100/60 border-rice-200 cursor-not-allowed"
                      : isSelected
                        ? "bg-ube-700 border-ube-700 text-white"
                        : "bg-white border-rice-200 text-kape-900 hover:border-ube-600"
                  }`}
                >
                  <span
                    className={`block font-display text-base font-bold tabular ${
                      s.is_full ? "text-kape-700/40 line-through" : ""
                    }`}
                  >
                    {time(s.start_time)}
                  </span>
                  <span
                    className={`block text-xs mt-0.5 ${
                      s.is_full
                        ? "text-sili-600/70 font-semibold"
                        : isSelected
                          ? "text-ube-100"
                          : low
                            ? "text-calamansi-600 font-semibold"
                            : "text-kape-700"
                    }`}
                  >
                    {s.is_full ? "Full" : `${s.remaining} left`}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="text-sm text-sili-700 bg-sili-50 border border-sili-100 rounded-card px-3.5 py-3"
          >
            <p>{error}</p>
            {STOCK_ERRORS.includes(errorCode) && (
              <button
                type="button"
                onClick={() => navigate(`/stalls/${id}`)}
                className="mt-2 font-semibold text-sili-700 underline underline-offset-2 rounded"
              >
                Back to the menu
              </button>
            )}
            {errorCode === "SLOT_FULL" && (
              <p className="mt-1 text-sili-700/80">
                The times above are updated. Pick another one.
              </p>
            )}
          </div>
        )}
      </main>

      <div className="fixed bottom-0 inset-x-0 bg-rice-50/95 backdrop-blur border-t border-rice-200">
        <div className="max-w-3xl mx-auto px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p className="text-sm text-kape-700 mb-2 min-h-[1.25rem]">
            {chosen ? (
              <>
                Pickup at{" "}
                <span className="font-semibold text-kape-900 tabular">
                  {time(chosen.start_time)} – {time(chosen.end_time)}
                </span>
              </>
            ) : (
              "No pickup time chosen yet"
            )}
          </p>
          <button
            type="button"
            onClick={placeOrder}
            disabled={!selected || placing}
            className="w-full bg-calamansi-500 hover:bg-calamansi-600 disabled:bg-rice-100 disabled:text-kape-700/50
                       text-kape-900 font-semibold rounded-card py-3.5 transition-colors"
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
