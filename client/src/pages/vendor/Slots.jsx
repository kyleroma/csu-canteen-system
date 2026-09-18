import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";

const inputClass =
  "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

export default function VendorSlots() {
  const [stall, setStall] = useState("");
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState({
    open_time: "07:00",
    close_time: "15:00",
    interval_minutes: "15",
    capacity: "20",
  });
  const [capDraft, setCapDraft] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const navigate = useNavigate();
  const { logout } = useAuth();

  const load = () => {
    setLoading(true);
    api
      .get("/vendor/slots")
      .then(({ data }) => {
        setStall(data.stall);
        setSlots(data.slots);
        setCapDraft({});
        setError("");
      })
      .catch((err) =>
        setError(err.response?.data?.message || "Could not load pickup times."),
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

  const generate = async (e) => {
    e.preventDefault();
    setError("");
    setGenerating(true);
    try {
      const { data } = await api.post("/vendor/slots/generate", {
        open_time: form.open_time,
        close_time: form.close_time,
        interval_minutes: Number(form.interval_minutes),
        capacity: Number(form.capacity),
      });
      flash(data.message);
      load();
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not create the pickup times.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const saveCapacity = async (slot) => {
    const raw = capDraft[slot.slot_id];
    const cap = Number(raw);
    if (raw === "" || !Number.isInteger(cap) || cap < 1) {
      setError("Capacity must be a whole number, 1 or more.");
      return;
    }
    setBusyId(slot.slot_id);
    setError("");
    try {
      await api.patch(`/vendor/slots/${slot.slot_id}`, { capacity: cap });
      flash("Capacity updated.");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update the slot.");
    } finally {
      setBusyId(null);
    }
  };

  const removeSlot = async (slot) => {
    setBusyId(slot.slot_id);
    setError("");
    try {
      await api.delete(`/vendor/slots/${slot.slot_id}`);
      setSlots((prev) => prev.filter((s) => s.slot_id !== slot.slot_id));
      flash("Pickup time removed.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not remove the slot.");
    } finally {
      setBusyId(null);
    }
  };

  const time = (iso) =>
    new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const now = Date.now();
  const booked = slots.reduce((sum, s) => sum + s.booked_count, 0);
  const upcoming = slots.filter((s) => new Date(s.start_time).getTime() > now);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-emerald-700 leading-tight">
              {stall || "Vendor"}
            </h1>
            <p className="text-xs text-slate-500">Pickup times</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/vendor")}
              className="text-sm text-emerald-700 font-medium hover:underline"
            >
              Order queue
            </button>
            <button
              onClick={() => navigate("/vendor/menu")}
              className="text-sm text-emerald-700 font-medium hover:underline"
            >
              Menu & stock
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

        <form
          onSubmit={generate}
          className="bg-white rounded-xl border border-slate-200 p-4 mb-6"
        >
          <h2 className="font-semibold text-slate-700 mb-1">
            Open pickup times for today
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Slots run for today only. Generate them again each morning.
          </p>

          <div className="grid gap-3 sm:grid-cols-5">
            <div>
              <label className="text-xs text-slate-500">Opens</label>
              <input
                type="time"
                className={inputClass}
                value={form.open_time}
                onChange={(e) =>
                  setForm({ ...form, open_time: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Closes</label>
              <input
                type="time"
                className={inputClass}
                value={form.close_time}
                onChange={(e) =>
                  setForm({ ...form, close_time: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Every (min)</label>
              <input
                type="number"
                min="5"
                max="120"
                step="5"
                className={inputClass}
                value={form.interval_minutes}
                onChange={(e) =>
                  setForm({ ...form, interval_minutes: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Orders per slot</label>
              <input
                type="number"
                min="1"
                step="1"
                className={inputClass}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={generating}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2"
              >
                {generating ? "Creating…" : "Create slots"}
              </button>
            </div>
          </div>
        </form>

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-700">
            Today&apos;s slots{" "}
            <span className="text-slate-400 font-normal">
              ({slots.length} · {upcoming.length} upcoming · {booked} booked)
            </span>
          </h2>
          <button
            onClick={load}
            className="text-sm text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg px-3 py-2"
          >
            Refresh
          </button>
        </div>

        {loading && <p className="text-slate-400 text-sm">Loading slots…</p>}

        {!loading && slots.length === 0 && (
          <p className="text-sm text-slate-400 bg-white border border-dashed border-slate-200 rounded-xl p-6 text-center">
            No pickup times yet. Create them above so students can order.
          </p>
        )}

        <div className="space-y-2">
          {slots.map((slot) => {
            const busy = busyId === slot.slot_id;
            const past = new Date(slot.start_time).getTime() <= now;
            const draft = capDraft[slot.slot_id];
            const capValue = draft ?? String(slot.capacity);
            const capChanged =
              draft !== undefined && draft !== String(slot.capacity);

            return (
              <div
                key={slot.slot_id}
                className={`bg-white rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center gap-3 ${
                  past ? "border-slate-200 opacity-60" : "border-slate-200"
                }`}
              >
                <div className="w-40 shrink-0">
                  <p className="font-semibold text-slate-800 text-sm">
                    {time(slot.start_time)} – {time(slot.end_time)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {past
                      ? "Past — hidden from students"
                      : slot.is_full
                        ? "Full"
                        : `${slot.remaining} left`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      slot.is_full
                        ? "bg-red-100 text-red-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {slot.booked_count} / {slot.capacity} booked
                  </span>
                </div>

                <div className="flex items-center gap-2 sm:ml-auto">
                  <label className="text-sm text-slate-600">Capacity</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={capValue}
                    onChange={(e) =>
                      setCapDraft({
                        ...capDraft,
                        [slot.slot_id]: e.target.value,
                      })
                    }
                    className="w-20 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {capChanged && (
                    <button
                      onClick={() => saveCapacity(slot)}
                      disabled={busy}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-3 py-2"
                    >
                      Save
                    </button>
                  )}
                  {slot.booked_count === 0 ? (
                    <button
                      onClick={() => removeSlot(slot)}
                      disabled={busy}
                      className="text-sm font-medium text-red-600 border border-red-300 hover:bg-red-50 disabled:opacity-40 rounded-lg px-3 py-2"
                    >
                      Remove
                    </button>
                  ) : (
                    <span
                      title="This slot has orders and cannot be removed"
                      className="text-xs text-slate-400 px-3 py-2"
                    >
                      Has orders
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
