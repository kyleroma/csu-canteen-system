import { useEffect, useRef, useState } from "react";
import api from "../../api/client";
import VendorHeader from "../../components/VendorHeader";

const EMPTY = {
  name: "",
  category: "",
  price: "",
  stock_qty: "",
  image_url: "",
};

const inputClass =
  "w-full rounded-card border border-rice-200 bg-rice-50 px-3.5 py-2.5 text-base text-kape-900 placeholder:text-kape-700/40 focus:border-ube-600 focus:bg-white transition";

const noSpinner =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

const peso = (n) => `₱${Number(n || 0).toFixed(2)}`;

function Field({ id, label, className = "", ...props }) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-kape-900 mb-1.5"
      >
        {label}
      </label>
      <input id={id} className={inputClass} {...props} />
    </div>
  );
}

function ItemThumb({ src, name, muted }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className="w-14 h-14 rounded-[10px] grid place-items-center shrink-0 bg-rice-100 font-display text-xl font-extrabold text-kape-700/50"
        aria-hidden="true"
      >
        {name.trim().charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={`w-14 h-14 rounded-[10px] object-cover bg-rice-100 shrink-0 ${
        muted ? "opacity-50 grayscale" : ""
      }`}
    />
  );
}

function StatusBadge({ item }) {
  if (item.is_active === false) {
    return (
      <span className="text-xs font-semibold bg-rice-100 text-kape-700 px-2.5 py-1 rounded-full">
        Hidden
      </span>
    );
  }
  if (item.is_sold_out || item.stock_qty === 0) {
    return (
      <span className="text-xs font-semibold bg-sili-50 text-sili-700 px-2.5 py-1 rounded-full">
        Sold out
      </span>
    );
  }
  return (
    <span className="text-xs font-semibold bg-dahon-50 text-dahon-700 px-2.5 py-1 rounded-full">
      Available
    </span>
  );
}

export default function VendorMenu() {
  const [stall, setStall] = useState("");
  const [items, setItems] = useState([]);
  const [stockDraft, setStockDraft] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState(EMPTY);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const noticeTimer = useRef(null);

  const load = () => {
    setLoading(true);
    api
      .get("/vendor/menu")
      .then(({ data }) => {
        setStall(data.stall);
        setItems(data.items);
        setStockDraft({});
        setError("");
      })
      .catch((err) =>
        setError(err.response?.data?.message || "Could not load the menu."),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    return () => clearTimeout(noticeTimer.current);
  }, []);

  const flash = (message) => {
    clearTimeout(noticeTimer.current);
    setNotice(message);
    noticeTimer.current = setTimeout(() => setNotice(""), 2500);
  };

  const replaceItem = (updated) =>
    setItems((prev) =>
      prev.map((i) => (i.item_id === updated.item_id ? updated : i)),
    );

  const patchItem = async (id, body, message) => {
    setBusyId(id);
    setError("");
    try {
      const { data } = await api.patch(`/vendor/menu/${id}`, body);
      replaceItem(data.item);
      flash(message);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || "Could not update the item.");
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const bumpStock = (item, delta) => {
    const current = Number(stockDraft[item.item_id] ?? item.stock_qty);
    const base = Number.isFinite(current) ? current : 0;
    const next = Math.max(0, Math.floor(base) + delta);
    setStockDraft((prev) => ({ ...prev, [item.item_id]: String(next) }));
  };

  const saveStock = async (item) => {
    const raw = stockDraft[item.item_id];
    const qty = Number(raw);
    if (raw === "" || !Number.isInteger(qty) || qty < 0) {
      setError("Stock must be a whole number, 0 or more.");
      return;
    }
    const ok = await patchItem(
      item.item_id,
      { stock_qty: qty },
      `${item.name}: stock set to ${qty}.`,
    );
    if (ok) {
      setStockDraft((prev) => {
        const next = { ...prev };
        delete next[item.item_id];
        return next;
      });
    }
  };

  const setSoldOut = (item, value) =>
    patchItem(
      item.item_id,
      { is_sold_out: value },
      value ? `${item.name} marked sold out.` : `${item.name} is available.`,
    );

  const startEdit = (item) => {
    setError("");
    setEditingId(item.item_id);
    setEditForm({
      name: item.name,
      category: item.category || "",
      price: String(item.price),
      image_url: item.image_url || "",
      stock_qty: "",
    });
  };

  const saveEdit = async (item) => {
    const price = Number(editForm.price);
    if (!editForm.name.trim()) return setError("Name is required.");
    if (editForm.price === "" || isNaN(price) || price < 0)
      return setError("Price must be 0 or more.");

    const ok = await patchItem(
      item.item_id,
      {
        name: editForm.name.trim(),
        category: editForm.category.trim() || null,
        price,
        image_url: editForm.image_url.trim(),
      },
      "Item updated.",
    );
    if (ok) setEditingId(null);
  };

  const addItem = async (e) => {
    e.preventDefault();
    if (adding) return;
    setError("");

    const price = Number(newItem.price);
    const qty = newItem.stock_qty === "" ? 0 : Number(newItem.stock_qty);

    if (!newItem.name.trim()) return setError("Name is required.");
    if (newItem.price === "" || isNaN(price) || price < 0)
      return setError("Price must be 0 or more.");
    if (!Number.isInteger(qty) || qty < 0)
      return setError("Stock must be a whole number, 0 or more.");

    setAdding(true);
    try {
      const { data } = await api.post("/vendor/menu", {
        name: newItem.name.trim(),
        category: newItem.category.trim() || null,
        price,
        image_url: newItem.image_url.trim() || null,
        stock_qty: qty,
      });
      setItems((prev) => [...prev, data.item]);
      setNewItem(EMPTY);
      setShowAdd(false);
      flash(`${data.item.name} added.`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not add the item.");
    } finally {
      setAdding(false);
    }
  };

  const soldOutCount = items.filter(
    (i) => i.is_active !== false && (i.is_sold_out || i.stock_qty === 0),
  ).length;

  return (
    <div className="min-h-screen bg-rice-50">
      <VendorHeader stall={stall} />

      <main className="max-w-4xl mx-auto px-4 py-6 pb-28">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[28px] leading-tight font-extrabold text-kape-900">
              Menu & stock
            </h1>
            <p className="text-sm text-kape-700 mt-1">
              <span className="tabular">{items.length}</span>{" "}
              {items.length === 1 ? "item" : "items"}
              {soldOutCount > 0 && (
                <>
                  ,{" "}
                  <span className="text-sili-700 font-semibold tabular">
                    {soldOutCount} sold out
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={load}
              className="text-sm font-semibold text-kape-900 bg-white border border-rice-200 hover:bg-rice-100 rounded-card px-3.5 py-2.5"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAdd((v) => !v);
                setError("");
              }}
              aria-expanded={showAdd}
              className={`text-sm font-semibold rounded-card px-4 py-2.5 transition-colors ${
                showAdd
                  ? "text-kape-900 bg-white border border-rice-200 hover:bg-rice-100"
                  : "text-kape-900 bg-calamansi-500 hover:bg-calamansi-600"
              }`}
            >
              {showAdd ? "Close" : "+ Add item"}
            </button>
          </div>
        </div>

        {showAdd && (
          <form
            onSubmit={addItem}
            className="mt-5 bg-white rounded-card border border-rice-200 p-5 grid gap-4 sm:grid-cols-2"
          >
            <h2 className="sm:col-span-2 font-display text-base font-bold text-kape-900">
              New item
            </h2>
            <Field
              id="new-name"
              label="Name"
              className="sm:col-span-2"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              placeholder="e.g. Chicken Adobo"
            />
            <Field
              id="new-category"
              label="Category"
              value={newItem.category}
              onChange={(e) =>
                setNewItem({ ...newItem, category: e.target.value })
              }
              placeholder="e.g. Rice meals"
            />
            <Field
              id="new-price"
              label="Price (₱)"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={newItem.price}
              onChange={(e) =>
                setNewItem({ ...newItem, price: e.target.value })
              }
              placeholder="0.00"
            />
            <Field
              id="new-stock"
              label="Starting stock"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={newItem.stock_qty}
              onChange={(e) =>
                setNewItem({ ...newItem, stock_qty: e.target.value })
              }
              placeholder="0"
            />
            <Field
              id="new-photo"
              label="Photo link (optional)"
              className="sm:col-span-2"
              type="url"
              value={newItem.image_url}
              onChange={(e) =>
                setNewItem({ ...newItem, image_url: e.target.value })
              }
              placeholder="https://… a link to a photo of this dish"
            />
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={adding}
                className="w-full sm:w-auto bg-calamansi-500 hover:bg-calamansi-600 disabled:bg-rice-100 disabled:text-kape-700/50 text-kape-900 text-sm font-semibold rounded-card px-6 py-3 transition-colors"
              >
                {adding ? "Saving…" : "Save item"}
              </button>
            </div>
          </form>
        )}

        {loading && items.length === 0 && (
          <p className="text-kape-700/60 text-sm mt-8">Loading menu…</p>
        )}

        {!loading && items.length === 0 && (
          <div className="mt-8 border border-dashed border-rice-200 rounded-card px-5 py-10 text-center">
            <p className="font-display text-lg font-bold text-kape-900">
              Your menu is empty
            </p>
            <p className="text-sm text-kape-700 mt-1">
              Add your first dish so students can start ordering.
            </p>
          </div>
        )}

        <ul className="mt-6 space-y-3">
          {items.map((item) => {
            const busy = busyId === item.item_id;
            const draft = stockDraft[item.item_id];
            const stockValue = draft ?? String(item.stock_qty);
            const stockChanged =
              draft !== undefined && draft !== String(item.stock_qty);
            const isEditing = editingId === item.item_id;
            const soldOut = item.is_sold_out || item.stock_qty === 0;
            const low = !soldOut && item.stock_qty > 0 && item.stock_qty <= 3;

            return (
              <li
                key={item.item_id}
                className="bg-white rounded-card border border-rice-200 p-4 sm:p-5"
              >
                {isEditing ? (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field
                      id={`edit-name-${item.item_id}`}
                      label="Name"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                    />
                    <Field
                      id={`edit-category-${item.item_id}`}
                      label="Category"
                      value={editForm.category}
                      onChange={(e) =>
                        setEditForm({ ...editForm, category: e.target.value })
                      }
                    />
                    <Field
                      id={`edit-price-${item.item_id}`}
                      label="Price (₱)"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={editForm.price}
                      onChange={(e) =>
                        setEditForm({ ...editForm, price: e.target.value })
                      }
                    />
                    <Field
                      id={`edit-photo-${item.item_id}`}
                      label="Photo link (optional)"
                      className="sm:col-span-3"
                      type="url"
                      value={editForm.image_url}
                      onChange={(e) =>
                        setEditForm({ ...editForm, image_url: e.target.value })
                      }
                      placeholder="https://… leave empty to remove the photo"
                    />
                    <div className="sm:col-span-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(item)}
                        disabled={busy}
                        className="bg-calamansi-500 hover:bg-calamansi-600 disabled:opacity-50 text-kape-900 text-sm font-semibold rounded-card px-5 py-2.5 transition-colors"
                      >
                        {busy ? "Saving…" : "Save changes"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-sm font-semibold text-kape-900 bg-white border border-rice-200 hover:bg-rice-50 rounded-card px-5 py-2.5"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <ItemThumb
                        src={item.image_url}
                        name={item.name}
                        muted={soldOut}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h2
                            className={`font-display text-lg font-bold leading-tight truncate ${
                              soldOut ? "text-kape-900/60" : "text-kape-900"
                            }`}
                          >
                            {item.name}
                          </h2>
                          <StatusBadge item={item} />
                        </div>
                        <p className="text-sm text-kape-700 mt-0.5">
                          {item.category || "Uncategorised"}
                          <span className="mx-1.5 text-kape-700/40">/</span>
                          <span className="tabular font-semibold text-kape-900">
                            {peso(item.price)}
                          </span>
                        </p>
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="mt-1 text-sm font-semibold text-ube-700 hover:text-ube-900 hover:underline underline-offset-2 rounded"
                        >
                          Edit details
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-dashed border-rice-200 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-semibold text-kape-900">
                          Stock
                        </span>
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() => bumpStock(item, -1)}
                            disabled={busy}
                            aria-label={`One less ${item.name}`}
                            className="h-11 w-11 rounded-l-card border border-rice-200 bg-white text-lg font-bold text-kape-900 hover:bg-rice-100 disabled:opacity-40"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            step="1"
                            aria-label={`${item.name} stock`}
                            value={stockValue}
                            onChange={(e) =>
                              setStockDraft({
                                ...stockDraft,
                                [item.item_id]: e.target.value,
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && stockChanged)
                                saveStock(item);
                            }}
                            className={`h-11 w-16 border-y border-rice-200 bg-rice-50 text-center text-base font-semibold text-kape-900 tabular focus:bg-white ${noSpinner}`}
                          />
                          <button
                            type="button"
                            onClick={() => bumpStock(item, 1)}
                            disabled={busy}
                            aria-label={`One more ${item.name}`}
                            className="h-11 w-11 rounded-r-card border border-rice-200 bg-white text-lg font-bold text-kape-900 hover:bg-rice-100 disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>

                        {stockChanged && (
                          <button
                            type="button"
                            onClick={() => saveStock(item)}
                            disabled={busy}
                            className="bg-calamansi-500 hover:bg-calamansi-600 disabled:opacity-50 text-kape-900 text-sm font-semibold rounded-card px-4 py-2.5 transition-colors"
                          >
                            {busy ? "Saving…" : "Save stock"}
                          </button>
                        )}

                        {!stockChanged && low && (
                          <span className="text-xs font-semibold text-calamansi-600">
                            Running low
                          </span>
                        )}
                      </div>

                      <div className="sm:ml-auto">
                        {item.is_sold_out ? (
                          <button
                            type="button"
                            onClick={() => setSoldOut(item, false)}
                            disabled={busy || item.stock_qty === 0}
                            title={
                              item.stock_qty === 0
                                ? "Add stock first"
                                : "Make this item orderable again"
                            }
                            className="w-full sm:w-auto text-sm font-semibold text-dahon-700 bg-white border border-dahon-100 hover:bg-dahon-50 disabled:opacity-40 disabled:hover:bg-white rounded-card px-4 py-2.5 transition-colors"
                          >
                            {item.stock_qty === 0
                              ? "Add stock to reopen"
                              : "Mark available"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSoldOut(item, true)}
                            disabled={busy}
                            className="w-full sm:w-auto text-sm font-semibold text-sili-700 bg-white border border-sili-100 hover:bg-sili-50 disabled:opacity-40 rounded-card px-4 py-2.5 transition-colors"
                          >
                            Mark sold out
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </main>

      {(error || notice) && (
        <div className="fixed bottom-0 inset-x-0 z-20 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none">
          <div
            role={error ? "alert" : "status"}
            className={`pointer-events-auto max-w-md mx-auto rounded-card px-4 py-3 text-sm shadow-lg flex items-start gap-3 ${
              error
                ? "bg-sili-50 border border-sili-100 text-sili-700"
                : "bg-kape-900 text-rice-50"
            }`}
          >
            <p className="flex-1">{error || notice}</p>
            {error && (
              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Dismiss"
                className="font-bold leading-none px-1 rounded"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
