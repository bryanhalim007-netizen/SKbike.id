import { useState } from "react";
import { resolveImage } from "../lib/api";
import { MessageCircle, Info, Box, Cpu, Disc, Settings2, Ruler, X } from "lucide-react";

const STATUS_STYLES = {
  "Tersedia": "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40",
  "Stok Terbatas": "bg-[#FF5500]/15 text-[#FF7A33] border-[#FF5500]/40",
  "Inden": "bg-slate-500/15 text-slate-300 border-slate-500/40",
};

export function ProductCard({ product, waNumber, index = 0 }) {
  const [detail, setDetail] = useState(false);
  const specs = product.specs || {};

  const inquire = () => {
    const msg = encodeURIComponent(
      `Halo Admin SK Bike, saya tertarik dengan *${product.name}* (${product.category}). Mohon info stok & harga. Terima kasih!`
    );
    window.open(`https://wa.me/${waNumber}?text=${msg}`, "_blank");
  };

  const specRows = [
    { icon: Settings2, label: "Frame", value: specs.frame },
    { icon: Cpu, label: "Transmisi", value: specs.transmisi },
    { icon: Disc, label: "Rem", value: specs.rem },
    { icon: Ruler, label: "Ukuran Roda", value: specs.ukuran_roda },
    { icon: Box, label: "Baterai / Motor", value: specs.baterai_motor },
  ].filter((s) => s.value && s.value !== "-");

  return (
    <>
      <div
        data-testid={`product-card-${product.id}`}
        className="group card-hover flex flex-col rounded-2xl border border-slate-800/80 bg-[#161F2E] overflow-hidden hover:border-[#FF2E2E]/60 animate-fade-up"
        style={{ animationDelay: `${index * 60}ms` }}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-[#0A0D14]">
          {product.image_url ? (
            <img
              src={resolveImage(product.image_url)}
              alt={product.name}
              className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-600 text-sm">Tanpa Gambar</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0D14]/70 via-transparent to-transparent" />
          <span className="absolute top-0 left-0 skew-tag bg-[#FF2E2E] pl-5 pr-4 py-1.5 text-[10px] font-mono-tech font-bold uppercase tracking-wider text-white">
            {product.category}
          </span>
          <span
            data-testid={`product-stock-${product.id}`}
            className={`absolute top-3 right-3 rounded-full border px-3 py-1 text-[11px] font-medium ${STATUS_STYLES[product.status] || STATUS_STYLES["Inden"]}`}
          >
            {product.status}
          </span>
          <span className="absolute bottom-0 left-0 h-1 w-2/3 bg-gradient-to-r from-[#FF2E2E] to-transparent" />
        </div>

        <div className="flex flex-1 flex-col p-5">
          <h3 data-testid={`product-title-${product.id}`} className="font-heading text-lg font-bold text-white leading-snug uppercase italic group-hover:text-[#FF2E2E] transition-colors">
            {product.name}
          </h3>
          <p className="mt-2 text-sm text-slate-400 line-clamp-2">{product.description}</p>

          <div data-testid={`product-specs-${product.id}`} className="mt-4 space-y-1.5">
            {specRows.slice(0, 2).map((s) => (
              <div key={s.label} className="flex items-center gap-2 text-xs text-slate-400">
                <s.icon className="h-3.5 w-3.5 text-[#FF2E2E]" />
                <span className="text-slate-500">{s.label}:</span>
                <span className="text-slate-300 font-mono-tech truncate">{s.value}</span>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-5 flex gap-2">
            <button
              data-testid={`btn-wa-inquire-${product.id}`}
              onClick={inquire}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 transition-[filter]"
            >
              <MessageCircle className="h-4 w-4" /> Tanya via WA
            </button>
            <button
              data-testid={`btn-product-detail-${product.id}`}
              onClick={() => setDetail(true)}
              className="flex items-center justify-center rounded-xl border border-slate-700 bg-[#0A0D14] px-3 py-2.5 text-slate-300 hover:border-[#FF2E2E] hover:text-[#FF2E2E] transition-colors"
              aria-label="Detail spesifikasi"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-sm" onClick={() => setDetail(false)}>
          <div
            data-testid={`product-detail-modal-${product.id}`}
            className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-[#111723] overflow-hidden animate-fade-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setDetail(false)} className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#0A0D14]/70 text-white hover:text-[#FF2E2E] transition-colors">
              <X className="h-5 w-5" />
            </button>
            {product.image_url && (
              <img src={resolveImage(product.image_url)} alt={product.name} className="h-56 w-full object-cover" />
            )}
            <div className="p-6">
              <span className="text-[11px] font-mono-tech uppercase tracking-wider text-[#FF2E2E]">{product.category}</span>
              <h3 className="font-heading text-2xl font-extrabold text-white mt-1">{product.name}</h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">{product.description}</p>

              <div className="mt-5 rounded-xl border border-slate-800 divide-y divide-slate-800">
                {specRows.map((s) => (
                  <div key={s.label} className="flex items-center gap-3 px-4 py-3">
                    <s.icon className="h-4 w-4 text-[#FF2E2E]" />
                    <span className="text-xs text-slate-500 w-28">{s.label}</span>
                    <span className="text-sm text-slate-200 font-mono-tech">{s.value}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={inquire}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white hover:brightness-110 transition-[filter]"
              >
                <MessageCircle className="h-4 w-4" /> Tanya Ketersediaan via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
