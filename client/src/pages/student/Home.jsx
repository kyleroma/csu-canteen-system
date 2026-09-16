import { useAuth } from "../../context/AuthContext";

export default function StudentHome() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-emerald-700">CSU Canteen</h1>
          <button
            onClick={logout}
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold text-slate-800">
          Hello, {user?.full_name}
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Signed in as {user?.role.toLowerCase()} · {user?.email}
        </p>
      </main>
    </div>
  );
}
