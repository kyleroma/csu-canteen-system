import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/client";

// Photos are optional: a stall that has not added one still gets a clean row
// rather than a grey placeholder box pretending an image is missing.
function Photo({ src, alt, dimmed }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`w-16 h-16 rounded-[10px] object-cover shrink-0 bg-rice-100 ${
        dimmed ? "opacity-40 saturate-50" : ""
      }`}
    />
  );
}

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
    <div className="min-h-screen bg-rice-50 pb-32">
      <header className="bg-rice-50/95 backdrop-blur border-b border-rice-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            aria-label="Back to stalls"
            className="w-9 h-9 grid place-items-center rounded-full border border-rice-200
                       text-kape-700 hover:bg-rice-100 shrink-0"
          >
            ←
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-lg font-extrabold text-kape-900 leading-tight truncate">
              {stall?.stall_name || "Menu"}
            </h1>
            {stall?.location && (
              <p className="text-xs text-kape-700 truncate">{stall.location}</p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {loading && <p className="text-kape-700/60 text-sm">Loading menu…</p>}

        {error && (
          <p className="text-sm text-sili-700 bg-sili-50 border border-sili-100 rounded-card px-3.5 py-2.5">
            {error}
          </p>
        )}

        {!loading && menu.length === 0 && (
          <div className="border border-dashed border-rice-200 rounded-card px-5 py-10 text-center">
            <p className="font-display text-lg font-bold text-kape-900">
              Nothing on the menu yet
            </p>
            <p className="text-sm text-kape-700 mt-1">
              This stall hasn&apos;t added their food. Try another stall.
            </p>
          </div>
        )}

        {Object.entries(grouped).map(([category, items]) => (
          <section key={category} className="mb-7">
            <h2 className="font-display text-base font-bold text-kape-900 mb-3">
              {category}
            </h2>

            <ul className="space-y-2.5">
              {items.map((item) => {
                const qty = cart[item.item_id] || 0;
                const soldOut = !item.available;

                return (
                  <li
                    key={item.item_id}
                    className={`rounded-card border p-4 flex items-center justify-between gap-4 ${
                      soldOut
                        ? "bg-rice-100/60 border-rice-200"
                        : "bg-white border-rice-200"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <Photo
                        src={item.image_url}
                        alt={item.name}
                        dimmed={soldOut}
                      />
                      <div className="min-w-0">
                        <h3
                          className={`font-medium truncate ${
                            soldOut ? "text-kape-900/45" : "text-kape-900"
                          }`}
                        >
                          {item.name}
                        </h3>
                        <p
                          className={`tabular mt-0.5 ${
                            soldOut
                              ? "text-kape-700/45"
                              : "text-kape-700 font-medium"
                          }`}
                        >
                          ₱{Number(item.price).toFixed(2)}
                        </p>
                        {!soldOut && item.stock_left <= 5 && (
                          <p className="text-xs text-calamansi-600 mt-1">
                            Only {item.stock_left} left
                          </p>
                        )}
                      </div>
                    </div>

                    {soldOut ? (
                      // A stamp reads faster than grey text when you are
                      // scanning a menu during a short break.
                      <span
                        className="shrink-0 -rotate-6 border-2 border-sili-600/70 text-sili-600/80
                                   font-display font-extrabold text-xs px-2.5 py-1 rounded"
                      >
                        Sold out
                      </span>
                    ) : qty === 0 ? (
                      <button
                        onClick={() => addToCart(item)}
                        className="bg-calamansi-500 hover:bg-calamansi-600 text-kape-900 text-sm
                                   font-semibold px-5 py-2 rounded-full shrink-0 transition-colors"
                      >
                        Add
                      </button>
                    ) : (
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={() => removeFromCart(item)}
                          aria-label={`Remove one ${item.name}`}
                          className="w-9 h-9 rounded-full border border-rice-200 text-kape-900
                                     hover:bg-rice-100 text-lg leading-none"
                        >
                          −
                        </button>
                        <span className="w-5 text-center font-semibold text-kape-900 tabular">
                          {qty}
                        </span>
                        <button
                          onClick={() => addToCart(item)}
                          disabled={qty >= item.stock_left}
                          aria-label={`Add one ${item.name}`}
                          className="w-9 h-9 rounded-full bg-calamansi-500 text-kape-900 text-lg leading-none
                                     hover:bg-calamansi-600 disabled:bg-rice-100 disabled:text-kape-700/40"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </main>

      {/* The cart is a receipt in progress: torn top edge, figures in a column */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-rice-200">
          <div className="receipt-edge h-0.5" />
          <div className="max-w-3xl mx-auto px-4 pt-3 pb-4">
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-sm text-kape-700">
                {cartCount} {cartCount === 1 ? "item" : "items"}
              </span>
              <span className="font-display text-xl font-extrabold text-kape-900 tabular">
                ₱{cartTotal.toFixed(2)}
              </span>
            </div>
            <button
              onClick={() =>
                navigate(`/stalls/${id}/checkout`, {
                  state: { cart, menu, stall },
                })
              }
              className="w-full bg-ube-700 hover:bg-ube-600 text-white font-semibold
                         rounded-card py-3.5 transition-colors"
            >
              Choose a pickup time
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
