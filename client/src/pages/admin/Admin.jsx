import { useEffect, useState } from "react";
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
  "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

export default function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const { logout } = useAuth();

  const load = () => {
    setLoading(true);
    Promise.all([api.get("/admin/overview"), api.get("/admin/vendors")])
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
  }, []);

  const flash = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 3000);
  };

  const onboard = async (e) => {
    e.preventDefault();
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
      flash(data.message);
      setForm(EMPTY);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create the stall.");
    } finally {
      setSaving(false);
    }
  };

  const verify = async (vendor) => {
    setBusyId(vendor.vendor_id);
    setError("");
    try {
      const { data } = await api.patch(
        `/admin/vendors/${vendor.vendor_id}/verify`,
      );
      flash(data.message);
      load();
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
      flash(data.message);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update the stall.");
    } finally {
      setBusyId(null);
    }
  };

  const card = (label, value, accent) => (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`text-2xl font-semibold mt-1 ${
          accent ? "text-amber-600" : "text-slate-800"
        }`}
      >
        {value}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-emerald-700 leading-tight">
              CSU Canteen — Admin
            </h1>
            <p className="text-xs text-slate-500">Stalls and verification</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={load}
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              Refresh
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

      <main className="max-w-5xl mx-auto px-4 py-6">
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {card("Users", stats.total_users)}
            {card("Stalls", stats.total_stalls)}
            {card("Awaiting verification", stats.unverified_stalls, true)}
            {card("Orders placed", stats.total_orders)}
          </div>
        )}

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

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-700">
            Stalls{" "}
            <span className="text-slate-400 font-normal">
              ({vendors.length})
            </span>
          </h2>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="text-sm text-white bg-emerald-600 hover:bg-emerald-700 font-medium rounded-lg px-3 py-2"
          >
            {showForm ? "Close" : "+ Onboard a stall"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={onboard}
            className="bg-white rounded-xl border border-slate-200 p-4 mb-5"
          >
            <p className="text-xs text-slate-500 mb-4">
              Creates the vendor&apos;s login and their stall together. The
              stall stays hidden from students until you verify it.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-slate-500">Stall name</label>
                <input
                  className={inputClass}
                  value={form.stall_name}
                  onChange={(e) =>
                    setForm({ ...form, stall_name: e.target.value })
                  }
                  placeholder="e.g. Tess Lutong Bahay"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Location</label>
                <input
                  className={inputClass}
                  value={form.location}
                  onChange={(e) =>
                    setForm({ ...form, location: e.target.value })
                  }
                  placeholder="e.g. Main Canteen, Stall 7"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Owner name</label>
                <input
                  className={inputClass}
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({ ...form, full_name: e.target.value })
                  }
                  placeholder="e.g. Aling Tess"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">
                  Contact number (optional)
                </label>
                <input
                  className={inputClass}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="09XXXXXXXXX"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Login email</label>
                <input
                  type="email"
                  className={inputClass}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="vendors may use a personal email"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">
                  Temporary password (min 8 characters)
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="give this to the vendor"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-5 py-2"
                >
                  {saving ? "Creating…" : "Create stall"}
                </button>
              </div>
            </div>
          </form>
        )}

        {loading && <p className="text-slate-400 text-sm">Loading…</p>}

        {!loading && vendors.length === 0 && (
          <p className="text-sm text-slate-400 bg-white border border-dashed border-slate-200 rounded-xl p-6 text-center">
            No stalls yet. Onboard the first one above.
          </p>
        )}

        <div className="space-y-3">
          {vendors.map((v) => {
            const busy = busyId === v.vendor_id;
            return (
              <div
                key={v.vendor_id}
                className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="min-w-0 sm:w-72">
                  <p className="font-semibold text-slate-800">{v.stall_name}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {v.location || "No location set"}
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-1">
                    {v.User?.full_name} · {v.User?.email}
                    {v.User?.phone ? ` · ${v.User.phone}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      v.is_verified
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {v.is_verified ? "Verified" : "Unverified"}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      v.is_open
                        ? "bg-slate-100 text-slate-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {v.is_open ? "Open" : "Closed"}
                  </span>
                </div>

                <div className="flex items-center gap-2 sm:ml-auto">
                  {!v.is_verified && (
                    <button
                      onClick={() => verify(v)}
                      disabled={busy}
                      className="text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg px-4 py-2"
                    >
                      Verify
                    </button>
                  )}
                  {v.is_open ? (
                    <button
                      onClick={() => setOpen(v, false)}
                      disabled={busy}
                      className="text-sm font-medium text-red-600 border border-red-300 hover:bg-red-50 disabled:opacity-40 rounded-lg px-4 py-2"
                    >
                      Close stall
                    </button>
                  ) : (
                    <button
                      onClick={() => setOpen(v, true)}
                      disabled={busy}
                      className="text-sm font-medium text-emerald-700 border border-emerald-300 hover:bg-emerald-50 disabled:opacity-40 rounded-lg px-4 py-2"
                    >
                      Open stall
                    </button>
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
