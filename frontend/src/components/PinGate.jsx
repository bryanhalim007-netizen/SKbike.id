import { useState } from "react";
import { Lock, Delete, Loader2 } from "lucide-react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"];

export function PinGate({ verify, title, onUnlock, testid = "pin-gate" }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  const submit = async (value) => {
    setChecking(true);
    try {
      const ok = await verify(value);
      if (ok) { onUnlock(); return; }
    } catch { /* fall through to error */ }
    finally { setChecking(false); }
    setError(true);
    setPin("");
    setTimeout(() => setError(false), 600);
  };

  const press = (k) => {
    if (checking) return;
    setError(false);
    if (k === "clear") { setPin(""); return; }
    if (k === "back") { setPin((p) => p.slice(0, -1)); return; }
    setPin((p) => {
      const next = (p + k).slice(0, 4);
      if (next.length === 4) submit(next);
      return next;
    });
  };

  return (
    <div data-testid={testid} className="flex items-center justify-center py-16">
      <div className={`w-full max-w-xs rounded-2xl border bg-[#111723] p-7 text-center transition-transform ${error ? "border-red-500 animate-shake" : "border-slate-800"}`}>
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF2E2E]/10 border border-[#FF2E2E]/20 text-[#FF2E2E]">
          {checking ? <Loader2 className="h-6 w-6 animate-spin" /> : <Lock className="h-6 w-6" />}
        </span>
        <h2 className="font-heading text-lg font-bold text-white">Terkunci</h2>
        <p className="mt-1 text-xs text-slate-400">Masukkan PIN untuk membuka <span className="text-white font-semibold">{title}</span></p>

        <div className="my-6 flex justify-center gap-3">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`h-3.5 w-3.5 rounded-full border transition-colors ${pin.length > i ? "bg-[#FF2E2E] border-[#FF2E2E]" : "border-slate-600"}`} />
          ))}
        </div>
        {error && <p data-testid={`${testid}-error`} className="mb-3 text-xs font-semibold text-red-400">PIN salah, coba lagi</p>}

        <div className="grid grid-cols-3 gap-2.5">
          {KEYS.map((k) => (
            <button
              key={k}
              data-testid={`${testid}-key-${k}`}
              onClick={() => press(k)}
              disabled={checking}
              className="flex items-center justify-center rounded-xl border border-slate-700 bg-[#161F2E] py-3.5 text-white font-semibold hover:border-[#FF2E2E] active:bg-[#FF2E2E]/20 transition-colors disabled:opacity-50"
            >
              {k === "back" ? <Delete className="h-5 w-5" /> : k === "clear" ? <span className="text-xs text-slate-400">Hapus</span> : k}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
