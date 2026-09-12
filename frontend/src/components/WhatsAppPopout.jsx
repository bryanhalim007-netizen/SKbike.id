import { useState, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";

const QUICK_OPTIONS = [
  "Halo Admin, saya ingin tanya stok & harga sepeda.",
  "Halo, saya mau konsultasi garansi produk.",
  "Halo, saya ingin menjadwalkan test ride.",
  "Halo, saya tertarik dengan sepeda listrik SK Bike.",
];

export function WhatsAppPopout({ number }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const send = (msg) => {
    const text = encodeURIComponent(msg || custom || "Halo Admin SK Bike Studio!");
    window.open(`https://wa.me/${number}?text=${text}`, "_blank");
    setOpen(false);
    setCustom("");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {open && (
        <div
          data-testid="whatsapp-popout-modal"
          className="mb-4 w-[92vw] max-w-sm rounded-2xl border border-slate-700/60 bg-[#111723] shadow-2xl animate-fade-up overflow-hidden"
        >
          <div className="flex items-center gap-3 bg-[#25D366] px-5 py-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-heading font-bold text-white leading-tight">Admin SK Bike</p>
              <p className="text-xs text-white/90 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-white inline-block" /> Online sekarang
              </p>
            </div>
            <button data-testid="whatsapp-popout-close" onClick={() => setOpen(false)} className="text-white/90 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-5 space-y-2.5">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-3">Pertanyaan Cepat</p>
            {QUICK_OPTIONS.map((opt, i) => (
              <button
                key={i}
                data-testid={`wa-quick-option-${i}`}
                onClick={() => send(opt)}
                className="w-full text-left text-sm text-slate-200 rounded-xl border border-slate-700/60 bg-[#161F2E] px-4 py-3 hover:border-[#25D366] hover:bg-[#1C273A] transition-colors"
              >
                {opt}
              </button>
            ))}
            <div className="flex items-center gap-2 pt-2">
              <input
                data-testid="wa-custom-input"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Tulis pesan sendiri..."
                className="flex-1 rounded-xl border border-slate-700/60 bg-[#0A0D14] px-4 py-3 text-sm text-white outline-none focus:border-[#25D366]"
              />
              <button
                data-testid="wa-custom-send"
                onClick={() => send()}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#25D366] text-white hover:brightness-110 transition-[filter]"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        data-testid="floating-whatsapp-trigger"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] wa-glow hover:scale-105 transition-transform"
        aria-label="Hubungi via WhatsApp"
      >
        {!open && <span className="absolute inset-0 rounded-full bg-[#25D366] pulse-ring" />}
        {open ? <X className="h-7 w-7 text-white relative" /> : <MessageCircle className="h-8 w-8 text-white relative" />}
      </button>
    </div>
  );
}
