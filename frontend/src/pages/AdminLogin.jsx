import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import skLogo from "../assets/sk-logo.jpg";

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await login(email, password);
    setLoading(false);
    if (res.ok) {
      toast.success("Berhasil masuk");
      navigate("/admin");
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="min-h-screen grid-texture bg-[#0A0D14] flex items-center justify-center p-5">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <img src={skLogo} alt="SK Bike Store" className="h-12 w-auto rounded-md" />
          <span className="block text-[10px] uppercase tracking-[0.3em] text-[#FF2E2E]">Bike Store</span>
        </Link>

        <form
          data-testid="admin-login-form"
          onSubmit={submit}
          className="rounded-2xl border border-slate-700/60 bg-[#111723] p-8 shadow-2xl"
        >
          <div className="flex items-center gap-2 mb-6">
            <Lock className="h-5 w-5 text-[#FF2E2E]" />
            <h1 className="font-heading text-xl font-bold text-white">Masuk Admin Panel</h1>
          </div>

          {error && (
            <div data-testid="admin-login-error" className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">Email</label>
          <input
            data-testid="admin-username-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-700 bg-[#0A0D14] px-4 py-3 text-white outline-none focus:border-[#FF2E2E] transition-colors mb-4"
            placeholder="admin@skbike.com"
          />

          <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">Kata Sandi</label>
          <input
            data-testid="admin-password-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-700 bg-[#0A0D14] px-4 py-3 text-white outline-none focus:border-[#FF2E2E] transition-colors mb-6"
            placeholder="••••••••"
          />

          <button
            data-testid="admin-login-submit-button"
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF2E2E] px-4 py-3 text-sm font-bold text-[#0A0D14] hover:brightness-110 transition-[filter] disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
