import { useEffect, useRef, useState } from "react";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";

const EMPTY = {
  email: "",
  password: "",
  full_name: "",
  phone: "",
  stall_name: "",
  location: "",
};

const inputClass =
  "w-full rounded-card border border-rice-200 bg-rice-50 px-3.5 py-2.5 text-base text-kape-900 placeholder:text-kape-700/40 focus:border-ube-600 focus:bg-white transition";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

const makePassword = () => {
  const values = new Uint32Array(10);
  crypto.getRandomValues(values);
  return Array.from(values, (n) => CHARS[n % CHARS.length]).join("");
};

function Field({ id, label, className = "", children, ...props }) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-kape-900 mb-1.5"
      >
        {label}
      </label>
      {children || <input id={id} className={inputClass} {...props} />}
    </div>
  );
}

function StallMark({ name, muted }) {
  return (
    <div
      className={`w-12 h-12 rounded-[10px] grid place-items-center shrink-0 font-display text-xl font-extrabold ${
        muted ? "bg-rice-100 text-kape-700/50" : "bg-ube-100 text-ube-700"
      }`}
      aria-hidden="true"
    >
      {(name || "?").trim().charAt(0).toUpperCase()}
    </div>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div
      className={`px-4 py-3.5 ${highlight ? "bg-calamansi-50" : "bg-white"}`}
    >
      <p
        className={`text-xs ${
          highlight ? "text-calamansi-600 font-semibold" : "text-kape-700"
        }`}
      >
        {label}
      </p>
      <p className="font-display text-2xl font-extrabold text-kape-900 tabular mt-0.5">
        {value ?? 0}
      </p>
    </div>
  );
}

function VendorRow({ vendor, busy, onVerify, onSetOpen }) {
  const v = vendor;

  return (
    <li className="bg-white rounded-card border border-rice-200 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <StallMark name={v.stall_name} muted={!v.is_open} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-lg font-bold leading-tight text-kape-900 truncate">
              {v.stall_name}
            </h3>
            <div className="flex items-center gap-1.5 shrink-0">
              {!v.is_verified && (
                <span className="text-xs font-semibold bg-calamansi-50 text-calamansi-600 px-2.5 py-1 rounded-full">
                  Unverified
                </span>
              )}
              <span
                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  v.is_open
                    ? "bg-dahon-50 text-dahon-700"
                    : "bg-sili-50 text-sili-700"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    v.is_open ? "bg-dahon-600" : "bg-sili-600"
                  }`}
                  aria-hidden="true"
                />
                {v.is_open ? "Open" : "Closed"}
              </span>
            </div>
          </div>
          <p className="text-sm text-kape-700 truncate">
            {v.location || "No location set"}
          </p>
        </div>
      </div>

      <dl className="mt-4 pt-3 border-t border-dashed border-rice-200 grid gap-x-6 gap-y-1.5 sm:grid-cols-3 text-sm">
        <div className="min-w-0">
          <dt className="text-xs text-kape-700/70">Owner</dt>
          <dd className="text-kape-900 truncate">{v.User?.full_name || "—"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-kape-700/70">Login email</dt>
          <dd className="text-kape-900 truncate">{v.User?.email || "—"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-kape-700/70">Contact</dt>
          <dd className="truncate">
            {v.User?.phone ? (
              <a
                href={`tel:${v.User.phone}`}
                className="text-ube-700 font-semibold hover:underline underline-offset-2 rounded"
              >
                {v.User.phone}
              </a>
            ) : (
              <span className="text-kape-700/60">Not given</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:justify-end">
        {!v.is_verified && (
          <button
            type="button"
            onClick={() => onVerify(v)}
            disabled={busy}
            className="text-sm font-semibold text-kape-900 bg-calamansi-500 hover:bg-calamansi-600 disabled:opacity-50 rounded-card px-5 py-2.5 transition-colors"
          >
            {busy ? "Saving…" : "Verify stall"}
          </button>
        )}
        {v.is_open ? (
          <button
            type="button"
            onClick={() => onSetOpen(v, false)}
            disabled={busy}
            className="text-sm font-semibold text-sili-700 bg-white border border-sili-100 hover:bg-sili-50 disabled:opacity-40 rounded-card px-5 py-2.5 transition-colors"
          >
            Close stall
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSetOpen(v, true)}
            disabled={busy}
            className="text-sm font-semibold text-dahon-700 bg-white border border-dahon-100 hover:bg-dahon-50 disabled:opacity-40 rounded-card px-5 py-2.5 transition-colors"
          >
            Open stall
          </button>
        )}
      </div>
    </li>
  );
}

export default function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [created, setCreated] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const noticeTimer = useRef(null);
  const { logout } = useAuth();

  const load = () => {
    setLoading(true);
    return Promise.all([api.get("/admin/overview"), api.get("/admin/vendors")])
      .then(([o, v]) => {
        setStats(o.data);
        setVendors(v.data.vendors);
        setError("");
      })
      .catch((err) =>
        setError(err.response?.data?.message || "Could not load the panel."),
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
    noticeTimer.current = setTimeout(() => setNotice(""), 3000);
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const onboard = async (e) => {
    e.preventDefault();
    if (saving) return;
    setError("");

    if (!form.email || !form.password || !form.full_name || !form.stall_name) {
      setError("Email, password, owner name, and stall name are required.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.post("/admin/vendors/onboard", {
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        stall_name: form.stall_name.trim(),
        location: form.location.trim() || null,
      });
      setCreated({
        stall: form.stall_name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      flash(data.message || "Stall created.");
      setForm(EMPTY);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create the stall.");
    } finally {
      setSaving(false);
    }
  };

  const copyCredentials = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(
        `CSU Canteen vendor login\nStall: ${created.stall}\nEmail: ${created.email}\nPassword: ${created.password}\nSign in at ${window.location.origin}/login`,
      );
      flash("Login details copied.");
    } catch {
      setError("Could not copy. Write the details down instead.");
    }
  };

  const verify = async (vendor) => {
    setBusyId(vendor.vendor_id);
    setError("");
    try {
      const { data } = await api.patch(
        `/admin/vendors/${vendor.vendor_id}/verify`,
      );
      flash(data.message || `${vendor.stall_name} verified.`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not verify the stall.");
    } finally {
      setBusyId(null);
    }
  };

  const setOpen = async (vendor, value) => {
    setBusyId(vendor.vendor_id);
    setError("");
    try {
      const { data } = await api.patch(
        `/admin/vendors/${vendor.vendor_id}/status`,
        { is_open: value },
      );
      flash(
        data.message ||
          `${vendor.stall_name} is now ${value ? "open" : "closed"}.`,
      );
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update the stall.");
    } finally {
      setBusyId(null);
    }
  };

  const pending = vendors.filter((v) => !v.is_verified);
  const verified = vendors.filter((v) => v.is_verified);

  const rowProps = (v) => ({
    vendor: v,
    busy: busyId === v.vendor_id,
    onVerify: verify,
    onSetOpen: setOpen,
  });

  return (
    <div className="min-h-screen bg-rice-50">
      <header className="bg-rice-50/95 backdrop-blur border-b border-rice-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-display text-xs font-bold text-ube-700">
              CSU Canteen
            </p>
            <p className="font-display text-lg font-extrabold leading-tight text-kape-900">
              Admin
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <button
              type="button"
              onClick={load}
              className="text-sm font-semibold text-ube-700 hover:text-ube-900 rounded"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={logout}
              className="text-sm text-kape-700 hover:text-kape-900 rounded"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 pb-28">
        <h1 className="font-display text-[28px] leading-tight font-extrabold text-kape-900">
          Stalls and verification
        </h1>
        <p className="text-sm text-kape-700 mt-1">
          New stalls stay hidden from students until you verify them.
        </p>

        {stats && (
          <section
            aria-label="Overview"
            className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-px bg-rice-200 border border-rice-200 rounded-card overflow-hidden"
          >
            <Stat label="Users" value={stats.total_users} />
            <Stat label="Stalls" value={stats.total_stalls} />
            <Stat
              label="Awaiting verification"
              value={stats.unverified_stalls}
              highlight={stats.unverified_stalls > 0}
            />
            <Stat label="Orders placed" value={stats.total_orders} />
          </section>
        )}

        {created && (
          <div className="mt-6 bg-dahon-50 border border-dahon-100 rounded-card p-4 sm:p-5">
            <p className="text-sm font-semibold text-dahon-700">
              {created.stall} was created. Give these login details to the
              vendor.
            </p>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
              <div className="bg-white rounded-card border border-dahon-100 px-3.5 py-2.5 min-w-0">
                <dt className="text-xs text-kape-700/70">Email</dt>
                <dd className="font-semibold text-kape-900 truncate">
                  {created.email}
                </dd>
              </div>
              <div className="bg-white rounded-card border border-dahon-100 px-3.5 py-2.5">
                <dt className="text-xs text-kape-700/70">Password</dt>
                <dd className="font-semibold text-kape-900 tabular tracking-wide">
                  {created.password}
                </dd>
              </div>
            </dl>
            <p className="text-xs text-dahon-700 mt-2">
              This password is shown only once. The stall still needs to be
              verified below.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={copyCredentials}
                className="text-sm font-semibold text-white bg-dahon-600 hover:bg-dahon-700 rounded-card px-4 py-2.5 transition-colors"
              >
                Copy details
              </button>
              <button
                type="button"
                onClick={() => setCreated(null)}
                className="text-sm font-semibold text-kape-900 bg-white border border-rice-200 hover:bg-rice-50 rounded-card px-4 py-2.5"
              >
                Done
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 flex items-end justify-between gap-4">
          <h2 className="font-display text-xl font-bold text-kape-900">
            Stalls{" "}
            <span className="text-base font-normal text-kape-700 tabular">
              ({vendors.length})
            </span>
          </h2>
          <button
            type="button"
            onClick={() => {
              setShowForm((s) => !s);
              setError("");
            }}
            aria-expanded={showForm}
            className={`shrink-0 text-sm font-semibold rounded-card px-4 py-2.5 transition-colors ${
              showForm
                ? "text-kape-900 bg-white border border-rice-200 hover:bg-rice-100"
                : "text-kape-900 bg-calamansi-500 hover:bg-calamansi-600"
            }`}
          >
            {showForm ? "Close" : "+ Onboard a stall"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={onboard}
            className="mt-4 bg-white rounded-card border border-rice-200 p-5"
            autoComplete="off"
          >
            <p className="text-sm text-kape-700">
              Creates the vendor&apos;s login and their stall together.
            </p>

            <h3 className="mt-5 font-display text-base font-bold text-kape-900">
              Stall
            </h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field
                id="stall-name"
                label="Stall name"
                value={form.stall_name}
                onChange={set("stall_name")}
                placeholder="e.g. Tess Lutong Bahay"
              />
              <Field
                id="stall-location"
                label="Location"
                value={form.location}
                onChange={set("location")}
                placeholder="e.g. Main Canteen, Stall 7"
              />
            </div>

            <h3 className="mt-6 font-display text-base font-bold text-kape-900">
              Owner and login
            </h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field
                id="owner-name"
                label="Owner name"
                value={form.full_name}
                onChange={set("full_name")}
                placeholder="e.g. Aling Tess"
              />
              <Field
                id="owner-phone"
                label="Contact number (optional)"
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={set("phone")}
                placeholder="09XXXXXXXXX"
              />
              <Field
                id="owner-email"
                label="Login email"
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="A personal email is fine"
              />
              <Field id="owner-password" label="Temporary password">
                <div className="flex gap-2">
                  <input
                    id="owner-password"
                    type="text"
                    autoComplete="new-password"
                    spellCheck={false}
                    className={`${inputClass} tabular tracking-wide`}
                    value={form.password}
                    onChange={set("password")}
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setForm({ ...form, password: makePassword() })
                    }
                    className="shrink-0 text-sm font-semibold text-ube-700 bg-white border border-rice-200 hover:bg-rice-100 rounded-card px-3.5"
                  >
                    Generate
                  </button>
                </div>
              </Field>
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto bg-calamansi-500 hover:bg-calamansi-600 disabled:bg-rice-100 disabled:text-kape-700/50 text-kape-900 text-sm font-semibold rounded-card px-6 py-3 transition-colors"
              >
                {saving ? "Creating…" : "Create stall"}
              </button>
            </div>
          </form>
        )}

        {loading && vendors.length === 0 && (
          <p className="text-kape-700/60 text-sm mt-8">Loading stalls…</p>
        )}

        {!loading && vendors.length === 0 && (
          <div className="mt-6 border border-dashed border-rice-200 rounded-card px-5 py-10 text-center">
            <p className="font-display text-lg font-bold text-kape-900">
              No stalls yet
            </p>
            <p className="text-sm text-kape-700 mt-1">
              Onboard the first stall to get started.
            </p>
          </div>
        )}

        {pending.length > 0 && (
          <section className="mt-6" aria-labelledby="pending-heading">
            <h3
              id="pending-heading"
              className="flex items-center gap-2 font-display text-base font-bold text-kape-900 mb-3"
            >
              <span
                className="w-2.5 h-2.5 rounded-full bg-calamansi-500"
                aria-hidden="true"
              />
              Waiting for verification
              <span className="text-sm font-normal text-kape-700 tabular">
                ({pending.length})
              </span>
            </h3>
            <ul className="space-y-3">
              {pending.map((v) => (
                <VendorRow key={v.vendor_id} {...rowProps(v)} />
              ))}
            </ul>
          </section>
        )}

        {verified.length > 0 && (
          <section className="mt-8" aria-labelledby="verified-heading">
            <h3
              id="verified-heading"
              className="flex items-center gap-2 font-display text-base font-bold text-kape-900 mb-3"
            >
              <span
                className="w-2.5 h-2.5 rounded-full bg-dahon-600"
                aria-hidden="true"
              />
              Verified
              <span className="text-sm font-normal text-kape-700 tabular">
                ({verified.length})
              </span>
            </h3>
            <ul className="space-y-3">
              {verified.map((v) => (
                <VendorRow key={v.vendor_id} {...rowProps(v)} />
              ))}
            </ul>
          </section>
        )}
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
