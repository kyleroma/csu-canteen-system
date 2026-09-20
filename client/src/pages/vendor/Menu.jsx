import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";

const EMPTY = {
  name: "",
  category: "",
  price: "",
  stock_qty: "",
  image_url: "",
};

const inputClass =
  "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

export default function VendorMenu() {
  const [stall, setStall] = useState("");
  const [items, setItems] = useState([]);
  const [stockDraft, setStockDraft] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState(EMPTY);
  const [busyId, setBusyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const navigate = useNavigate();
  const { logout } = useAuth();

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
  }, []);

  const flash = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 2500);
  };

  const replaceItem = (updated) =>
    setItems((prev) =>
      prev.map((i) => (i.item_id === updated.item_id ? updated : i)),
    );

  // Every change goes through PATCH /vendor/menu/:id
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

  // Explicit true/false, not the toggle route — a double tap can't flip it back
  const setSoldOut = (item, value) =>
    patchItem(
      item.item_id,
      { is_sold_out: value },
      value ? `${item.name} marked sold out.` : `${item.name} is available.`,
    );

  const startEdit = (item) => {
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
        // An empty box clears the photo
        image_url: editForm.image_url.trim(),
      },
      "Item updated.",
    );
    if (ok) setEditingId(null);
  };

  const addItem = async (e) => {
    e.preventDefault();
    setError("");

    const price = Number(newItem.price);
    const qty = newItem.stock_qty === "" ? 0 : Number(newItem.stock_qty);

    if (!newItem.name.trim()) return setError("Name is required.");
    if (newItem.price === "" || isNaN(price) || price < 0)
      return setError("Price must be 0 or more.");
    if (!Number.isInteger(qty) || qty < 0)
      return setError("Stock must be a whole number, 0 or more.");

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
    }
  };

  const badge = (item) => {
    if (item.is_active === false)
      return (
        <span className="text-xs font-medium bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
          Hidden
        </span>
      );
    if (item.is_sold_out || item.stock_qty === 0)
      return (
        <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
          Sold out
        </span>
      );
    return (
      <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
        Available
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-emerald-700 leading-tight">
              {stall || "Vendor"}
            </h1>
            <p className="text-xs text-slate-500">Menu & stock</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/vendor")}
              className="text-sm text-emerald-700 font-medium hover:underline"
            >
              Order queue
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

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-700">
            Items{" "}
            <span className="text-slate-400 font-normal">({items.length})</span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="text-sm text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg px-3 py-2"
            >
              Refresh
            </button>
            <button
              onClick={() => setShowAdd((v) => !v)}
              className="text-sm text-white bg-emerald-600 hover:bg-emerald-700 font-medium rounded-lg px-3 py-2"
            >
              {showAdd ? "Close" : "+ Add item"}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}
        {notice && (
          <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-4">
            {notice}
          </p>
        )}

        {showAdd && (
          <form
            onSubmit={addItem}
            className="bg-white rounded-xl border border-slate-200 p-4 mb-4 grid gap-3 sm:grid-cols-2"
          >
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-500">Name</label>
              <input
                className={inputClass}
                value={newItem.name}
                onChange={(e) =>
                  setNewItem({ ...newItem, name: e.target.value })
                }
                placeholder="e.g. Chicken Adobo"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Category</label>
              <input
                className={inputClass}
                value={newItem.category}
                onChange={(e) =>
                  setNewItem({ ...newItem, category: e.target.value })
                }
                placeholder="e.g. Rice meals"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Price (₱)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={newItem.price}
                onChange={(e) =>
                  setNewItem({ ...newItem, price: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Starting stock</label>
              <input
                type="number"
                min="0"
                step="1"
                className={inputClass}
                value={newItem.stock_qty}
                onChange={(e) =>
                  setNewItem({ ...newItem, stock_qty: e.target.value })
                }
                placeholder="0"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-500">
                Photo link (optional)
              </label>
              <input
                className={inputClass}
                value={newItem.image_url}
                onChange={(e) =>
                  setNewItem({ ...newItem, image_url: e.target.value })
                }
                placeholder="https://… paste a link to a photo of this dish"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg py-2"
              >
                Save item
              </button>
            </div>
          </form>
        )}

        {loading && <p className="text-slate-400 text-sm">Loading menu…</p>}

        {!loading && items.length === 0 && (
          <p className="text-sm text-slate-400 bg-white border border-dashed border-slate-200 rounded-xl p-6 text-center">
            No items yet. Add your first one.
          </p>
        )}

        <div className="space-y-3">
          {items.map((item) => {
            const busy = busyId === item.item_id;
            const draft = stockDraft[item.item_id];
            const stockValue = draft ?? String(item.stock_qty);
            const stockChanged =
              draft !== undefined && draft !== String(item.stock_qty);
            const isEditing = editingId === item.item_id;

            return (
              <div
                key={item.item_id}
                className="bg-white rounded-xl border border-slate-200 p-4"
              >
                {isEditing ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="text-xs text-slate-500">Name</label>
                      <input
                        className={inputClass}
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Category</label>
                      <input
                        className={inputClass}
                        value={editForm.category}
                        onChange={(e) =>
                          setEditForm({ ...editForm, category: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">
                        Price (₱)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={inputClass}
                        value={editForm.price}
                        onChange={(e) =>
                          setEditForm({ ...editForm, price: e.target.value })
                        }
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="text-xs text-slate-500">
                        Photo link (optional)
                      </label>
                      <input
                        className={inputClass}
                        value={editForm.image_url}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            image_url: e.target.value,
                          })
                        }
                        placeholder="https://… leave empty to remove the photo"
                      />
                    </div>
                    <div className="sm:col-span-3 flex gap-2">
                      <button
                        onClick={() => saveEdit(item)}
                        disabled={busy}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-sm text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg px-4 py-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt=""
                          loading="lazy"
                          className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800">
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.category || "Uncategorised"} · ₱
                          {Number(item.price).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {badge(item)}
                      <button
                        onClick={() => startEdit(item)}
                        className="text-xs text-emerald-700 font-medium hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                )}

                {!isEditing && (
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-slate-600">Stock</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={stockValue}
                        onChange={(e) =>
                          setStockDraft({
                            ...stockDraft,
                            [item.item_id]: e.target.value,
                          })
                        }
                        className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      {stockChanged && (
                        <button
                          onClick={() => saveStock(item)}
                          disabled={busy}
                          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-3 py-2"
                        >
                          Save
                        </button>
                      )}
                      {!stockChanged &&
                        item.stock_qty > 0 &&
                        item.stock_qty <= 3 && (
                          <span className="text-xs text-amber-600">
                            Running low
                          </span>
                        )}
                    </div>

                    <div className="sm:ml-auto">
                      {item.is_sold_out ? (
                        <button
                          onClick={() => setSoldOut(item, false)}
                          disabled={busy || item.stock_qty === 0}
                          title={
                            item.stock_qty === 0
                              ? "Add stock first"
                              : "Make this item orderable again"
                          }
                          className="w-full sm:w-auto text-sm font-medium text-emerald-700 border border-emerald-300 hover:bg-emerald-50 disabled:opacity-40 disabled:hover:bg-white rounded-lg px-4 py-2"
                        >
                          {item.stock_qty === 0
                            ? "Add stock to reopen"
                            : "Mark available"}
                        </button>
                      ) : (
                        <button
                          onClick={() => setSoldOut(item, true)}
                          disabled={busy}
                          className="w-full sm:w-auto text-sm font-medium text-red-600 border border-red-300 hover:bg-red-50 disabled:opacity-40 rounded-lg px-4 py-2"
                        >
                          Mark sold out
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
