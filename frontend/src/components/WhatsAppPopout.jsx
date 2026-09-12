import { useState, useEffect } from "react";
import { MessageCircle, X, Send, Package, ShieldCheck, Zap, Bike, Instagram } from "lucide-react";

const QUICK_OPTIONS = [
  { icon: Package, label: "Tanya Stok & Harga", desc: "Cek ketersediaan sepeda", message: "Halo Admin SK Bike, saya ingin tanya stok & harga sepeda." },
  { icon: ShieldCheck, label: "Konsultasi Service", desc: "Info servis & perbaikan", message: "Halo, saya mau konsultasi service sepeda." },
  { icon: Zap, label: "Sepeda Listrik", desc: "Tanya E-Bike SK Bike", message: "Halo, saya tertarik dengan sepeda listrik SK Bike." },
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
    const text = encodeURIComponent(msg || custom || "Halo Admin SK Bike Store!");
    window.open(`https://wa.me/${number}?text=${text}`, "_blank");
    setOpen(false);
    setCustom("");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {open && (
        <div
          data-testid="whatsapp-popout-modal"
          className="mb-4 w-[92vw] max-w-sm rounded-3xl border border-slate-700/60 bg-[#0B141A] shadow-2xl animate-fade-up overflow-y-auto max-h-[80vh]"
        >
          {/* Header */}
          <div className="relative overflow-hidden px-5 pt-5 pb-6 bg-gradient-to-br from-[#25D366] to-[#0E7A54]">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
            <div className="absolute right-10 top-8 h-12 w-12 rounded-full bg-white/10" />
            <button
              data-testid="whatsapp-popout-close"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/15 text-white hover:bg-black/30 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="relative flex items-center gap-3">
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg">
                  <Bike className="h-6 w-6 text-[#0E7A54]" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-[#4ADE80] ring-2 ring-[#128C7E]" />
              </div>
              <div>
                <p className="font-heading font-bold text-white leading-tight text-lg">Admin SK Bike</p>
                <p className="text-xs text-white/90 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-white inline-block animate-pulse" /> Biasanya membalas dalam beberapa menit
                </p>
              </div>
            </div>
          </div>

          {/* Intro bubble */}
          <div className="px-5 pt-5">
            <div className="relative inline-block max-w-[85%] rounded-2xl rounded-tl-sm bg-[#1F2C34] px-4 py-3 text-sm text-slate-100 shadow">
              Halo! Selamat datang di SK Bike. Ada yang bisa kami bantu hari ini?
              <span className="block mt-1 text-[10px] text-slate-400">Admin • sekarang</span>
            </div>
          </div>

          {/* Quick options */}
          <div className="p-5 space-y-2.5">
            <p className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Pilih topik cepat</p>
            {QUICK_OPTIONS.map((opt, i) => (
              <button
                key={opt.label}
                data-testid={`wa-quick-option-${i}`}
                onClick={() => send(opt.message)}
                className="group flex w-full items-center gap-3 rounded-2xl border border-slate-700/60 bg-[#111B21] px-4 py-3 text-left hover:border-[#25D366] hover:bg-[#16242C] transition-colors"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#25D366]/15 text-[#25D366] group-hover:bg-[#25D366] group-hover:text-white transition-colors">
                  <opt.icon className="h-4 w-4" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-white">{opt.label}</span>
                  <span className="block text-xs text-slate-400">{opt.desc}</span>
                </span>
                <Send className="h-4 w-4 text-slate-600 group-hover:text-[#25D366] transition-colors" />
              </button>
            ))}

            <div className="flex items-center gap-2 pt-2">
              <input
                data-testid="wa-custom-input"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Tulis pesan sendiri..."
                className="flex-1 rounded-full border border-slate-700/60 bg-[#111B21] px-4 py-3 text-sm text-white outline-none focus:border-[#25D366] transition-colors"
              />
              <button
                data-testid="wa-custom-send"
                onClick={() => send()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white hover:brightness-110 hover:scale-105 transition-[filter,transform]"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
            <p className="text-center text-[10px] text-slate-600 pt-1">Terhubung langsung via WhatsApp</p>
          </div>
        </div>
      )}

      <div className="mb-3 flex items-center gap-3">
        <span className="hidden sm:block rounded-full bg-[#111723] border border-slate-700/60 px-4 py-2 text-sm font-medium text-white shadow-lg">@skbike_ketapang</span>
        <a
          href="https://instagram.com/skbike_ketapang"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="floating-instagram-trigger"
          className="flex h-16 w-16 items-center justify-center rounded-full text-white hover:scale-110 transition-transform"
          style={{ background: "linear-gradient(45deg, #F58529, #DD2A7B, #8134AF, #515BD4)", boxShadow: "0 0 22px rgba(221, 42, 123, 0.5)" }}
          aria-label="Kunjungi Instagram SK Bike"
        >
          <Instagram className="h-8 w-8" />
        </a>
      </div>

      <div className="flex items-center gap-3">
        {!open && (
          <span className="hidden sm:block rounded-full bg-[#111723] border border-slate-700/60 px-4 py-2 text-sm font-medium text-white shadow-lg animate-fade-up">
            Butuh bantuan? Chat kami
          </span>
        )}
        <button
          data-testid="floating-whatsapp-trigger"
          onClick={() => setOpen((o) => !o)}
          className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] wa-glow hover:scale-110 transition-transform"
          aria-label="Hubungi via WhatsApp"
        >
          {!open && <span className="absolute inset-0 rounded-full bg-[#25D366] pulse-ring" />}
          {open ? <X className="h-7 w-7 text-white relative" /> : <MessageCircle className="h-8 w-8 text-white relative" />}
        </button>
      </div>
    </div>
  );
}
