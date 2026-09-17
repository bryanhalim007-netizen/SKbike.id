import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { resolveImage } from "../lib/api";
import { X, PackageX, Boxes, Tag, Layers, Wallet, Coins, CircleDot, Ruler, Camera } from "lucide-react";

const rupiah = (n) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");
const LOW_STOCK = 3;

const SPEC_LABELS = {
  frame: "Frame",
  transmisi: "Transmisi",
  rem: "Rem",
  ukuran_roda: "Ukuran Roda",
  baterai_motor: "Baterai / Motor",
};

function Info({ icon: Icon, label, value, tone = "text-white" }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0A0D14] p-3">
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500"><Icon className="h-3 w-3" /> {label}</p>
      <p className={`mt-0.5 font-heading text-sm font-bold ${tone} break-words`}>{value}</p>
    </div>
  );
}

export function ProductDetailModal({ product, onClose, onManageStock }) {
  const [activeColor, setActiveColor] = useState(null);
  const variants = product.variants?.length ? product.variants : [{ color: "Standar", stock: product.stock || 0 }];
  const total = variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
  const specs = product.specs || {};
  const specEntries = Object.entries(SPEC_LABELS).filter(([k]) => (specs[k] || "").toString().trim() && specs[k] !== "-");
  const displayImage = activeColor?.image_url ? activeColor.image_url : product.image_url;
  const toggleColorPhoto = (v) => { if (v.image_url) setActiveColor((cur) => (cur?.color === v.color ? null : v)); };

  return (
    <div data-testid="product-detail-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-[#111723] max-h-[88vh] overflow-y-auto animate-fade-up">
        <button type="button" data-testid="product-detail-close" onClick={onClose} className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#0A0D14]/70 text-slate-300 hover:text-white transition-colors"><X className="h-5 w-5" /></button>

        <div className="relative h-56 w-full bg-[#0A0D14] overflow-hidden flex items-center justify-center border-b border-slate-800">
          {product.image_url ? (
            <AnimatePresence initial={false} mode="popLayout">
              <motion.img
                key={displayImage}
                src={resolveImage(displayImage)}
                alt={product.name}
                initial={{ x: "55%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "-55%", opacity: 0 }}
                transition={{ type: "tween", ease: [0.4, 0, 0.2, 1], duration: 0.4 }}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </AnimatePresence>
          ) : (
            <PackageX className="h-10 w-10 text-slate-700" />
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#111723] via-[#111723]/70 to-transparent p-5">
            <span className="inline-block rounded-full bg-[#FF2E2E]/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">{product.category}</span>
            <h2 className="mt-2 font-heading text-2xl font-black text-white leading-tight">{product.name}</h2>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Info icon={Tag} label="Kode" value={product.code || "-"} tone="text-slate-200 font-mono-tech" />
            <Info icon={Wallet} label={product.sizes?.length ? "Mulai Dari" : "Harga Jual"} value={rupiah(product.price)} tone="text-[#FF2E2E] font-mono-tech" />
            <Info icon={Coins} label="Harga Modal" value={rupiah(product.cost_price)} tone="text-amber-300 font-mono-tech" />
            <Info icon={CircleDot} label="Status" value={product.status || "-"} />
          </div>

          {Array.isArray(product.sizes) && product.sizes.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-[#0A0D14] p-4">
              <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#FF7A33] mb-3"><Ruler className="h-4 w-4" /> Ukuran & Harga</p>
              <div className="divide-y divide-slate-800">
                {product.sizes.map((s, i) => (
                  <div key={i} data-testid={`detail-size-${i}`} className="flex items-center justify-between py-2 gap-3">
                    <span className="text-sm font-bold text-white">{s.label}</span>
                    {s.code ? <span className="text-[11px] font-mono-tech text-slate-500">{s.code}</span> : <span />}
                    <span className="ml-auto flex items-center gap-3">
                      {s.cost_price != null && <span className="text-xs font-mono-tech text-amber-300">Modal {rupiah(s.cost_price)}</span>}
                      <span className="text-sm font-mono-tech text-[#FF2E2E]">{rupiah(s.price)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-800 bg-[#0A0D14] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#10B981]"><Boxes className="h-4 w-4" /> Stok Barang</p>
              <span className="text-xs text-slate-400">Total <span data-testid="detail-total-stock" className={`font-heading text-lg font-black ${total === 0 ? "text-red-400" : total <= LOW_STOCK ? "text-amber-400" : "text-white"}`}>{total}</span></span>
            </div>
            <div className="flex flex-wrap gap-2">
              {variants.map((v, i) => {
                const st = Number(v.stock) || 0;
                const active = activeColor?.color === v.color;
                const hasPhoto = !!v.image_url;
                return (
                  <button
                    key={i}
                    type="button"
                    data-testid={`detail-variant-${i}`}
                    onClick={() => toggleColorPhoto(v)}
                    title={hasPhoto ? `Lihat foto warna ${v.color}` : v.color}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${hasPhoto ? "cursor-pointer" : "cursor-default"} ${active ? "border-[#FF2E2E] bg-[#FF2E2E]/15 text-white ring-1 ring-[#FF2E2E]" : st === 0 ? "border-red-500/40 bg-red-500/10 text-red-300" : st <= LOW_STOCK ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-slate-700 bg-[#161F2E] text-slate-200"}`}
                  >
                    <span className="h-3 w-3 rounded-full border border-white/25 shrink-0" style={{ backgroundColor: v.hex || "#94A3B8" }} />
                    {v.color} <span className="font-mono-tech font-bold">{st}</span>
                    {hasPhoto && <Camera className="h-3 w-3 opacity-70" />}
                  </button>
                );
              })}
              {activeColor?.image_url && (
                <button type="button" data-testid="detail-variant-reset" onClick={() => setActiveColor(null)} className="text-[11px] text-slate-500 underline hover:text-slate-300 self-center">reset foto</button>
              )}
            </div>
            {onManageStock && (
              <button data-testid="detail-manage-stock" onClick={() => onManageStock(product)} className="mt-4 flex items-center gap-1.5 rounded-lg bg-[#10B981]/15 border border-[#10B981]/30 px-4 py-2 text-xs font-bold text-[#10B981] hover:bg-[#10B981]/25 transition-colors">
                <Boxes className="h-3.5 w-3.5" /> Kelola Stok
              </button>
            )}
          </div>

          {product.description && (
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-1.5">Deskripsi</p>
              <p className="text-sm text-slate-300 leading-relaxed">{product.description}</p>
            </div>
          )}

          {specEntries.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-500 mb-2"><Layers className="h-3.5 w-3.5" /> Spesifikasi</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {specEntries.map(([k, ]) => (
                  <div key={k} className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#0A0D14] px-3 py-2">
                    <span className="text-xs text-slate-500">{SPEC_LABELS[k]}</span>
                    <span className="text-sm text-slate-200 text-right">{specs[k]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
