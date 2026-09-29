import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Footer from "../components/Footer";

const STEPS = ["Pending", "Preparing", "Ready", "Claimed"];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const timer = setTimeout(() => setSlow(true), 4000);

    try {
      const user = await login(email, password);
      if (user.role === "VENDOR") navigate("/vendor", { replace: true });
      else if (user.role === "ADMIN") navigate("/admin", { replace: true });
      else navigate("/", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not sign in. Check your connection and try again.",
      );
    } finally {
      clearTimeout(timer);
      setSlow(false);
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-rice-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-7">
          <div
            className="mx-auto h-12 w-12 rounded-card bg-ube-700 text-rice-50 font-display text-2xl font-extrabold flex items-center justify-center"
            aria-hidden="true"
          >
            C
          </div>
          <p className="font-display text-sm font-bold text-ube-700 mt-4 tracking-wide">
            CSU Canteen
          </p>
          <h1 className="font-display text-[28px] leading-tight font-extrabold text-kape-900 mt-1">
            Sign in and skip the queue
          </h1>
          <p className="text-sm text-kape-700 mt-2 max-w-[34ch] mx-auto">
            Order ahead, reserve a pickup time, and pay in cash at the stall.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-card border border-rice-200 shadow-sm p-6 space-y-4"
        >
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-kape-900 mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-card border border-rice-200 bg-rice-50 px-3.5 py-2.5 text-base text-kape-900 placeholder:text-kape-700/40 focus:border-ube-600 focus:bg-white transition"
              placeholder="you@carsu.edu.ph"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-kape-900 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-card border border-rice-200 bg-rice-50 pl-3.5 pr-16 py-2.5 text-base text-kape-900 placeholder:text-kape-700/40 focus:border-ube-600 focus:bg-white transition"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 px-3.5 text-xs font-semibold text-ube-700 hover:text-ube-900 rounded-card"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="text-sm text-sili-700 bg-sili-50 border border-sili-100 rounded-card px-3.5 py-2.5"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-calamansi-500 hover:bg-calamansi-600 disabled:bg-rice-100 disabled:text-kape-700/50 text-kape-900 font-semibold rounded-card py-3 text-sm transition"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>

          {slow && (
            <p role="status" className="text-xs text-kape-700 text-center">
              Waking up the server. The first sign-in can take up to a minute.
            </p>
          )}

          <div className="pt-1 space-y-1.5 text-center">
            <p className="text-sm text-kape-700">
              New student?{" "}
              <Link
                to="/register"
                className="text-ube-700 font-semibold hover:underline rounded"
              >
                Create an account
              </Link>
            </p>
            <p className="text-xs text-kape-700/70">
              Stall accounts are set up by the canteen office.
            </p>
          </div>
        </form>

        <ol
          className="mt-6 flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-kape-700/60"
          aria-label="Every order moves through four states"
        >
          {STEPS.map((step, i) => (
            <li key={step} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true">›</span>}
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <Footer className="mt-10" />
      </div>
    </div>
  );
}
