import { useEffect, useRef, useState } from "react";
import api from "../../api/client";
import VendorHeader from "../../components/VendorHeader";

const INTERVALS = [10, 15, 20, 30, 45, 60];

const inputClass =
  "w-full rounded-card border border-rice-200 bg-rice-50 px-3.5 py-2.5 text-base text-kape-900 focus:border-ube-600 focus:bg-white transition";

const noSpinner =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

const time = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const toMinutes = (hhmm) => {
  const [h, m] = (hhmm || "").split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : NaN;
};

function Label({ htmlFor, children }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-semibold text-kape-900 mb-1.5"
    >
      {children}
    </label>
  );
}

function FillBar({ slot }) {
  const pct = slot.capacity
    ? Math.min(100, Math.round((slot.booked_count / slot.capacity) * 100))
    : 0;
  const color = slot.is_full
    ? "bg-sili-600"
    : pct >= 75
      ? "bg-calamansi-500"
      : "bg-dahon-600";

  return (
    <div
      className="h-2 w-full rounded-full bg-rice-100 overflow-hidden"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={slot.capacity}
      aria-valuenow={slot.booked_count}
      aria-label={`${slot.booked_count} of ${slot.capacity} booked`}
    >
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

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

  const noticeTimer = useRef(null);

  const load = () => {
    setLoading(true);
    return api
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
    return () => clearTimeout(noticeTimer.current);
  }, []);

  const flash = (message) => {
    clearTimeout(noticeTimer.current);
    setNotice(message);
    noticeTimer.current = setTimeout(() => setNotice(""), 2500);
  };

  const span = toMinutes(form.close_time) - toMinutes(form.open_time);
  const step = Number(form.interval_minutes);
  const preview = span > 0 && step > 0 ? Math.floor(span / step) : 0;

  const generate = async (e) => {
    e.preventDefault();
    if (generating) return;
    setError("");

    const cap = Number(form.capacity);
    if (!(span > 0))
      return setError("Closing time must be after opening time.");
    if (form.capacity === "" || !Number.isInteger(cap) || cap < 1)
      return setError("Orders per slot must be a whole number, 1 or more.");

    setGenerating(true);
    try {
      const { data } = await api.post("/vendor/slots/generate", {
        open_time: form.open_time,
        close_time: form.close_time,
        interval_minutes: step,
        capacity: cap,
      });
      flash(data.message || "Pickup times created.");
      await load();
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not create the pickup times.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const bumpCapacity = (slot, delta) => {
    const current = Number(capDraft[slot.slot_id] ?? slot.capacity);
    const base = Number.isFinite(current) ? Math.floor(current) : slot.capacity;
    const floor = Math.max(1, slot.booked_count);
    const next = Math.max(floor, base + delta);
    setCapDraft((prev) => ({ ...prev, [slot.slot_id]: String(next) }));
  };

  const saveCapacity = async (slot) => {
    const raw = capDraft[slot.slot_id];
    const cap = Number(raw);
    if (raw === "" || !Number.isInteger(cap) || cap < 1) {
      setError("Capacity must be a whole number, 1 or more.");
      return;
    }
    if (cap < slot.booked_count) {
      setError(
        `This slot already has ${slot.booked_count} orders. Capacity can't go below that.`,
      );
      return;
    }
    setBusyId(slot.slot_id);
    setError("");
    try {
      await api.patch(`/vendor/slots/${slot.slot_id}`, { capacity: cap });
      flash(`${time(slot.start_time)}: capacity set to ${cap}.`);
      await load();
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
      flash(`${time(slot.start_time)} removed.`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not remove the slot.");
    } finally {
      setBusyId(null);
    }
  };

  const now = Date.now();
  const upcoming = slots.filter((s) => new Date(s.start_time).getTime() > now);
  const earlier = slots.filter((s) => new Date(s.start_time).getTime() <= now);
  const booked = slots.reduce((sum, s) => sum + s.booked_count, 0);

  return (
    <div className="min-h-screen bg-rice-50">
      <VendorHeader stall={stall} />

      <main className="max-w-6xl mx-auto px-4 py-6 pb-28">
        <div className="max-w-4xl">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-[28px] leading-tight font-extrabold text-kape-900">
                Pickup times
              </h1>
              <p className="text-sm text-kape-700 mt-1">
                <span className="tabular">{upcoming.length}</span> upcoming
                today,{" "}
                <span className="tabular font-semibold text-kape-900">
                  {booked}
                </span>{" "}
                {booked === 1 ? "order" : "orders"} booked
              </p>
            </div>
            <button
              type="button"
              onClick={load}
              className="shrink-0 text-sm font-semibold text-kape-900 bg-white border border-rice-200 hover:bg-rice-100 rounded-card px-3.5 py-2.5"
            >
              Refresh
            </button>
          </div>

          <form
            onSubmit={generate}
            className="mt-6 bg-white rounded-card border border-rice-200 p-5"
          >
            <h2 className="font-display text-base font-bold text-kape-900">
              Open pickup times for today
            </h2>
            <p className="text-sm text-kape-700 mt-0.5">
              Times are for today only. Create them again each morning.
            </p>

            <div className="mt-4 grid gap-4 grid-cols-2 sm:grid-cols-4">
              <div>
                <Label htmlFor="open-time">Opens</Label>
                <input
                  id="open-time"
                  type="time"
                  className={inputClass}
                  value={form.open_time}
                  onChange={(e) =>
                    setForm({ ...form, open_time: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="close-time">Closes</Label>
                <input
                  id="close-time"
                  type="time"
                  className={inputClass}
                  value={form.close_time}
                  onChange={(e) =>
                    setForm({ ...form, close_time: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="interval">Every</Label>
                <select
                  id="interval"
                  className={inputClass}
                  value={form.interval_minutes}
                  onChange={(e) =>
                    setForm({ ...form, interval_minutes: e.target.value })
                  }
                >
                  {INTERVALS.map((m) => (
                    <option key={m} value={String(m)}>
                      {m} minutes
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="capacity">Orders per slot</Label>
                <input
                  id="capacity"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  className={inputClass}
                  value={form.capacity}
                  onChange={(e) =>
                    setForm({ ...form, capacity: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-sm text-kape-700 sm:mr-auto">
                {preview > 0 ? (
                  <>
                    Creates about{" "}
                    <span className="font-semibold text-kape-900 tabular">
                      {preview}
                    </span>{" "}
                    pickup times, {form.interval_minutes} minutes apart.
                  </>
                ) : (
                  <span className="text-sili-700">
                    Closing time must be after opening time.
                  </span>
                )}
              </p>
              <button
                type="submit"
                disabled={generating || preview === 0}
                className="w-full sm:w-auto bg-calamansi-500 hover:bg-calamansi-600 disabled:bg-rice-100 disabled:text-kape-700/50 text-kape-900 text-sm font-semibold rounded-card px-6 py-3 transition-colors"
              >
                {generating ? "Creating…" : "Create pickup times"}
              </button>
            </div>
          </form>

          {loading && slots.length === 0 && (
            <p className="text-kape-700/60 text-sm mt-8">
              Loading pickup times…
            </p>
          )}

          {!loading && slots.length === 0 && (
            <div className="mt-8 border border-dashed border-rice-200 rounded-card px-5 py-10 text-center">
              <p className="font-display text-lg font-bold text-kape-900">
                No pickup times yet
              </p>
              <p className="text-sm text-kape-700 mt-1">
                Create them above so students can start ordering.
              </p>
            </div>
          )}

          {slots.length > 0 && upcoming.length === 0 && (
            <div className="mt-8 border border-dashed border-rice-200 rounded-card px-5 py-8 text-center">
              <p className="font-display text-base font-bold text-kape-900">
                All of today&apos;s pickup times have passed
              </p>
              <p className="text-sm text-kape-700 mt-1">
                Students can&apos;t order until you create new ones.
              </p>
            </div>
          )}

          {upcoming.length > 0 && (
            <section className="mt-8" aria-labelledby="upcoming-heading">
              <h2
                id="upcoming-heading"
                className="font-display text-base font-bold text-kape-900 mb-3"
              >
                Upcoming
              </h2>
              <ul className="space-y-3">
                {upcoming.map((slot) => {
                  const busy = busyId === slot.slot_id;
                  const draft = capDraft[slot.slot_id];
                  const capValue = draft ?? String(slot.capacity);
                  const capChanged =
                    draft !== undefined && draft !== String(slot.capacity);
                  const atFloor =
                    Number(capValue) <= Math.max(1, slot.booked_count);

                  return (
                    <li
                      key={slot.slot_id}
                      className="bg-white rounded-card border border-rice-200 p-4 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-display text-lg font-bold text-kape-900 tabular leading-tight">
                            {time(slot.start_time)} – {time(slot.end_time)}
                          </p>
                          <p className="text-sm text-kape-700 mt-0.5">
                            <span className="tabular">
                              {slot.booked_count} of {slot.capacity}
                            </span>{" "}
                            booked
                          </p>
                        </div>
                        <span
                          className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                            slot.is_full
                              ? "bg-sili-50 text-sili-700"
                              : "bg-dahon-50 text-dahon-700"
                          }`}
                        >
                          {slot.is_full ? "Full" : `${slot.remaining} left`}
                        </span>
                      </div>

                      <div className="mt-3">
                        <FillBar slot={slot} />
                      </div>

                      <div className="mt-4 pt-4 border-t border-dashed border-rice-200 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-sm font-semibold text-kape-900">
                            Capacity
                          </span>
                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={() => bumpCapacity(slot, -1)}
                              disabled={busy || atFloor}
                              aria-label={`Lower capacity for ${time(slot.start_time)}`}
                              className="h-11 w-11 rounded-l-card border border-rice-200 bg-white text-lg font-bold text-kape-900 hover:bg-rice-100 disabled:opacity-40"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={Math.max(1, slot.booked_count)}
                              step="1"
                              aria-label={`Capacity for ${time(slot.start_time)}`}
                              value={capValue}
                              onChange={(e) =>
                                setCapDraft({
                                  ...capDraft,
                                  [slot.slot_id]: e.target.value,
                                })
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && capChanged)
                                  saveCapacity(slot);
                              }}
                              className={`h-11 w-16 border-y border-rice-200 bg-rice-50 text-center text-base font-semibold text-kape-900 tabular focus:bg-white ${noSpinner}`}
                            />
                            <button
                              type="button"
                              onClick={() => bumpCapacity(slot, 1)}
                              disabled={busy}
                              aria-label={`Raise capacity for ${time(slot.start_time)}`}
                              className="h-11 w-11 rounded-r-card border border-rice-200 bg-white text-lg font-bold text-kape-900 hover:bg-rice-100 disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                          {capChanged && (
                            <button
                              type="button"
                              onClick={() => saveCapacity(slot)}
                              disabled={busy}
                              className="bg-calamansi-500 hover:bg-calamansi-600 disabled:opacity-50 text-kape-900 text-sm font-semibold rounded-card px-4 py-2.5 transition-colors"
                            >
                              {busy ? "Saving…" : "Save"}
                            </button>
                          )}
                        </div>

                        <div className="sm:ml-auto">
                          {slot.booked_count === 0 ? (
                            <button
                              type="button"
                              onClick={() => removeSlot(slot)}
                              disabled={busy}
                              className="w-full sm:w-auto text-sm font-semibold text-sili-700 bg-white border border-sili-100 hover:bg-sili-50 disabled:opacity-40 rounded-card px-4 py-2.5 transition-colors"
                            >
                              Remove
                            </button>
                          ) : (
                            <span className="text-sm text-kape-700/70">
                              Has orders, can&apos;t be removed
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {earlier.length > 0 && (
            <details className="mt-8 group">
              <summary className="cursor-pointer list-none flex items-center gap-2 font-display text-base font-bold text-kape-900 rounded">
                <span className="text-kape-700 transition-transform group-open:rotate-90">
                  ›
                </span>
                Earlier today
                <span className="text-sm font-normal text-kape-700 tabular">
                  ({earlier.length})
                </span>
              </summary>
              <p className="text-sm text-kape-700 mt-1 mb-3">
                Past pickup times are hidden from students.
              </p>
              <ul className="space-y-2">
                {earlier.map((slot) => (
                  <li
                    key={slot.slot_id}
                    className="bg-white/60 rounded-card border border-rice-200 px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <span className="text-sm font-semibold text-kape-900/60 tabular">
                      {time(slot.start_time)} – {time(slot.end_time)}
                    </span>
                    <span className="text-sm text-kape-700/70 tabular">
                      {slot.booked_count} of {slot.capacity} booked
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
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
