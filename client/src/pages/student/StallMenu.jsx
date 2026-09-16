import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/client";

export default function StallMenu() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [stall, setStall] = useState(null);
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/browse/stalls/${id}/menu`)
      .then(({ data }) => {
        setStall(data.stall);
        setMenu(data.menu);
      })
      .catch(() => setError("Could not load this menu."))
      .finally(() => setLoading(false));
  }, [id]);

  const addToCart = (item) => {
    setCart((c) => ({ ...c, [item.item_id]: (c[item.item_id] || 0) + 1 }));
  };

  const removeFromCart = (item) => {
    setCart((c) => {
      const next = { ...c };
      if (next[item.item_id] > 1) next[item.item_id] -= 1;
      else delete next[item.item_id];
      return next;
    });
  };

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = menu.reduce(
    (sum, i) => sum + (cart[i.item_id] || 0) * Number(i.price),
    0,
  );

  // Group items by category for a cleaner list
  const grouped = menu.reduce((acc, item) => {
    const key = item.category || "Other";
    (acc[key] = acc[key] || []).push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="text-slate-400 hover:text-slate-700 text-xl leading-none"
          >
            ←
          </button>
          <div>
            <h1 className="font-semibold text-slate-800 leading-tight">
              {stall?.stall_name || "Menu"}
            </h1>
            {stall?.location && (
              <p className="text-xs text-slate-500">{stall.location}</p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {loading && <p className="text-slate-400 text-sm">Loading menu…</p>}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {!loading && menu.length === 0 && (
          <p className="text-slate-500 text-sm">This stall has no items yet.</p>
        )}

        {Object.entries(grouped).map(([category, items]) => (
          <section key={category} className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
              {category}
            </h2>

            <div className="space-y-2">
              {items.map((item) => {
                const qty = cart[item.item_id] || 0;

                return (
                  <div
                    key={item.item_id}
                    className={`bg-white rounded-xl border p-4 flex items-center justify-between gap-4 ${
                      item.available
                        ? "border-slate-200"
                        : "border-slate-200 opacity-60"
                    }`}
                  >
                    <div className="min-w-0">
                      <h3 className="font-medium text-slate-800 truncate">
                        {item.name}
                      </h3>
                      <p className="text-sm text-slate-600 mt-0.5">
                        ₱{Number(item.price).toFixed(2)}
                      </p>
                      {item.available && item.stock_left <= 5 && (
                        <p className="text-xs text-amber-600 mt-0.5">
                          Only {item.stock_left} left
                        </p>
                      )}
                    </div>

                    {!item.available ? (
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full shrink-0">
                        Sold out
                      </span>
                    ) : qty === 0 ? (
                      <button
                        onClick={() => addToCart(item)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm
                                   font-medium px-4 py-1.5 rounded-full shrink-0 transition"
                      >
                        Add
                      </button>
                    ) : (
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={() => removeFromCart(item)}
                          className="w-8 h-8 rounded-full border border-slate-300
                                     text-slate-600 hover:bg-slate-50"
                        >
                          −
                        </button>
                        <span className="w-4 text-center font-medium text-slate-800">
                          {qty}
                        </span>
                        <button
                          onClick={() => addToCart(item)}
                          disabled={qty >= item.stock_left}
                          className="w-8 h-8 rounded-full bg-emerald-600 text-white
                                     hover:bg-emerald-700 disabled:bg-slate-200
                                     disabled:text-slate-400"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      {cartCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 p-4">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() =>
                navigate(`/stalls/${id}/checkout`, {
                  state: { cart, menu, stall },
                })
              }
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white
                         font-medium rounded-xl py-3 flex items-center justify-between px-5"
            >
              <span>
                {cartCount} {cartCount === 1 ? "item" : "items"}
              </span>
              <span>₱{cartTotal.toFixed(2)} · Choose pickup time</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
