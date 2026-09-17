import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { resolveImage } from "../lib/api";
import { useCart } from "../context/CartContext";
import { toast } from "sonner";
import { MessageCircle, Info, Box, Cpu, Disc, Settings2, Ruler, X, ShoppingCart, Check, Camera, Star } from "lucide-react";

const STATUS_STYLES = {
  "Tersedia": "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40",
  "Stok Terbatas": "bg-[#FF5500]/15 text-[#FF7A33] border-[#FF5500]/40",
  "Inden": "bg-slate-500/15 text-slate-300 border-slate-500/40",
};

const rupiah = (n) => "Rp " + new Intl.NumberFormat("id-ID").format(Number(n) || 0);

export function ProductCard({ product, waNumber, index = 0 }) {
  const navigate = useNavigate();
  const [picker, setPicker] = useState(null); // { mode: "cart" | "wa" }
  const [selColor, setSelColor] = useState(null);
  const [selSize, setSelSize] = useState(null);
  const [activeColor, setActiveColor] = useState(null); // warna yang fotonya sedang ditampilkan
  const { addItem, setOpen: setCartOpen } = useCart();
  const specs = product.specs || {};

  const goDetail = () => navigate(`/produk/${product.id}`);

  const displayImage = activeColor?.image_url ? activeColor.image_url : product.image_url;
  const toggleColorPhoto = (v) => setActiveColor((cur) => (cur?.color === v.color ? null : v));
  const photoVariants = (product.variants || []).filter((v) => v.image_url);

  const colorVariants = (product.variants || []).filter((v) => (v.color || "").toLowerCase() !== "standar");
  const hasColors = colorVariants.length > 0;
  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  const hasSizes = sizes.length > 0;
  const needsSelection = hasColors || hasSizes;
  const minPrice = hasSizes ? Math.min(...sizes.map((s) => Number(s.price) || 0)) : Number(product.price) || 0;

  const pickerColors = hasSizes ? (selSize?.colors || []) : colorVariants;

  const openPicker = (mode) => {
    setSelColor(null);
    setSelSize(null);
    setPicker({ mode });
  };

  const chooseSize = (s) => {
    setSelSize(s);
    const cols = s.colors || [];
    setSelColor(cols.length === 1 ? cols[0] : null);
  };

  const resolvedPrice = hasSizes ? (selSize ? Number(selSize.price) || 0 : 0) : Number(product.price) || 0;
  const resolvedCode = selSize && selSize.code ? selSize.code : (product.code || "");
  const canConfirm = hasSizes ? (!!selSize && !!selColor) : (!hasColors || !!selColor);

  const doAddToCart = (opts = {}) => {
    addItem(product, 1, opts);
    toast.success(`${product.name} ditambahkan ke keranjang`, {
      action: { label: "Lihat", onClick: () => setCartOpen(true) },
    });
  };

  const doInquire = (opts = {}) => {
    const parts = [];
    if (opts.color) parts.push(`Warna: ${opts.color}`);
    if (opts.size) parts.push(`Ukuran: ${opts.size}`);
    const detailStr = parts.length ? `\n${parts.join("\n")}` : "";
    const priceStr = opts.price ? `\nHarga: ${rupiah(opts.price)}` : "";
    const msg = encodeURIComponent(
      `Halo Admin SK Bike, saya tertarik dengan *${product.name}* (${product.category}).${detailStr}${priceStr}\nMohon info stok & ketersediaan. Terima kasih!`
    );
    window.open(`https://wa.me/${waNumber}?text=${msg}`, "_blank");
  };

  const handleAddToCart = () => {
    if (needsSelection) { openPicker("cart"); return; }
    doAddToCart();
  };
  const handleInquire = () => {
    if (needsSelection) { openPicker("wa"); return; }
    doInquire();
  };

  const confirmSelection = () => {
    if (!canConfirm) return;
    const opts = { color: selColor?.color || null, size: selSize?.label || null, price: resolvedPrice, code: resolvedCode };
    if (picker.mode === "cart") doAddToCart(opts);
    else doInquire(opts);
    setPicker(null);
  };

  const specRows = [
    { icon: Settings2, label: "Frame", value: specs.frame },
    { icon: Cpu, label: "Transmisi", value: specs.transmisi },
    { icon: Disc, label: "Rem", value: specs.rem },
    { icon: Ruler, label: "Ukuran Roda", value: specs.ukuran_roda },
    { icon: Box, label: "Baterai / Motor", value: specs.baterai_motor },
  ].filter((s) => s.value && s.value !== "-");

  const wheelSpec = specRows.find((s) => s.label === "Ukuran Roda");
  const cardSpecs = specRows.filter((s) => s.label !== "Ukuran Roda").slice(0, 2);

  return (
    <>
      <div
        data-testid={`product-card-${product.id}`}
        className="group card-hover flex flex-col rounded-2xl border border-slate-800/80 bg-[#161F2E] overflow-hidden hover:border-[#FF2E2E]/60 animate-fade-up"
        style={{ animationDelay: `${index * 60}ms` }}
      >
        <div
          data-testid={`product-image-trigger-${product.id}`}
          onClick={goDetail}
          className="relative aspect-[4/3] overflow-hidden bg-[#0A0D14] cursor-pointer"
        >
          {product.image_url ? (
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                key={displayImage}
                className="absolute inset-0"
                initial={{ x: "55%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "-55%", opacity: 0 }}
                transition={{ type: "tween", ease: [0.4, 0, 0.2, 1], duration: 0.4 }}
              >
                <img
                  src={resolveImage(displayImage)}
                  alt={product.name}
                  className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
              </motion.div>
            </AnimatePresence>
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
          {wheelSpec && (
            <span
              data-testid={`product-wheel-badge-${product.id}`}
              className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-[#FF2E2E]/60 bg-[#0A0D14]/85 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg backdrop-blur-sm"
            >
              <Ruler className="h-3.5 w-3.5 text-[#FF2E2E]" /> {wheelSpec.value}
            </span>
          )}
          <span className="absolute bottom-0 left-0 h-1 w-2/3 bg-gradient-to-r from-[#FF2E2E] to-transparent" />
          {product.featured && (
            <span data-testid={`product-featured-${product.id}`} className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full border border-amber-400/60 bg-[#0A0D14]/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 shadow-lg backdrop-blur-sm">
              <Star className="h-3 w-3 fill-amber-400" /> Unggulan
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <h3 data-testid={`product-title-${product.id}`} onClick={goDetail} className="cursor-pointer font-heading text-lg font-bold text-white leading-snug uppercase italic group-hover:text-[#FF2E2E] transition-colors">
            {product.name}
          </h3>
          <p className="mt-2 text-sm text-slate-400 line-clamp-2">{product.description}</p>

          {minPrice > 0 && (
            <div className="mt-4 flex items-baseline gap-2">
              {hasSizes && <span className="text-[11px] uppercase tracking-wider text-slate-500">Mulai</span>}
              <span data-testid={`product-price-${product.id}`} className="font-heading text-lg font-black text-white italic">{rupiah(minPrice)}</span>
            </div>
          )}

          <div data-testid={`product-specs-${product.id}`} className="mt-3 space-y-1.5">
            {cardSpecs.map((s) => (
              <div key={s.label} className="flex items-center gap-2 text-xs text-slate-400">
                <s.icon className="h-3.5 w-3.5 text-[#FF2E2E]" />
                <span className="text-slate-500">{s.label}:</span>
                <span className="text-slate-300 font-mono-tech truncate">{s.value}</span>
              </div>
            ))}
          </div>

          {hasSizes && (
            <div data-testid={`product-sizes-${product.id}`} className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-500">Ukuran:</span>
              {sizes.map((s) => (
                <span key={s.label} className="rounded-full border border-[#FF7A33]/40 px-2 py-0.5 text-[10px] font-medium text-[#FF7A33]">{s.label}</span>
              ))}
            </div>
          )}

          {hasColors && (
            <div data-testid={`product-colors-${product.id}`} className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-500">Warna:</span>
              {product.variants.map((v) => {
                const out = (v.stock || 0) <= 0;
                const active = activeColor?.color === v.color;
                const hasPhoto = !!v.image_url;
                return (
                  <button
                    key={v.color}
                    type="button"
                    data-testid={`product-color-chip-${product.id}-${v.color}`}
                    onClick={() => hasPhoto && toggleColorPhoto(v)}
                    title={hasPhoto ? `Lihat foto warna ${v.color}` : v.color}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${hasPhoto ? "cursor-pointer" : "cursor-default"} ${active ? "border-[#FF2E2E] bg-[#FF2E2E]/15 text-white ring-1 ring-[#FF2E2E]" : out ? "border-slate-800 text-slate-600 line-through" : "border-[#FF2E2E]/40 text-slate-300 hover:border-[#FF2E2E]"}`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: v.hex || "#94A3B8" }} />
                    {v.color}
                    {hasPhoto && <Camera className="h-2.5 w-2.5 opacity-70" />}
                  </button>
                );
              })}
              {activeColor?.image_url && (
                <button type="button" data-testid={`product-color-reset-${product.id}`} onClick={() => setActiveColor(null)} className="text-[10px] text-slate-500 underline hover:text-slate-300">reset</button>
              )}
            </div>
          )}

          {photoVariants.length > 0 && (
            <div data-testid={`product-gallery-${product.id}`} className="mt-3 flex flex-wrap gap-2">
              {photoVariants.map((v) => {
                const active = activeColor?.color === v.color;
                return (
                  <button
                    key={v.color}
                    type="button"
                    data-testid={`product-gallery-thumb-${product.id}-${v.color}`}
                    onClick={() => toggleColorPhoto(v)}
                    title={`Warna ${v.color}`}
                    className={`relative h-12 w-14 shrink-0 overflow-hidden rounded-lg border transition-all ${active ? "border-[#FF2E2E] ring-2 ring-[#FF2E2E]" : "border-slate-700 hover:border-[#FF2E2E]/60"}`}
                  >
                    <img src={resolveImage(v.image_url)} alt={v.color} className="h-full w-full object-cover" />
                    <span className="absolute bottom-0 inset-x-0 bg-[#0A0D14]/70 px-1 py-0.5 text-center text-[8px] font-semibold text-white truncate">{v.color}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-auto pt-5 space-y-2">
            <button
              data-testid={`btn-add-cart-${product.id}`}
              onClick={handleAddToCart}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF2E2E] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 hover:scale-[1.02] transition-[filter,transform]"
            >
              <ShoppingCart className="h-4 w-4" /> Tambah ke Keranjang
            </button>
            <div className="flex gap-2">
              <button
                data-testid={`btn-wa-inquire-${product.id}`}
                onClick={handleInquire}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 transition-[filter]"
              >
                <MessageCircle className="h-4 w-4" /> Tanya via WA
              </button>
              <button
                data-testid={`btn-product-detail-${product.id}`}
                onClick={goDetail}
                className="flex items-center justify-center rounded-xl border border-slate-700 bg-[#0A0D14] px-3 py-2.5 text-slate-300 hover:border-[#FF2E2E] hover:text-[#FF2E2E] transition-colors"
                aria-label="Detail produk"
              >
                <Info className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Option picker — force color & size selection */}
      {picker && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-sm" onClick={() => setPicker(null)}>
          <div
            data-testid={`product-option-modal-${product.id}`}
            className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-[#111723] p-6 animate-fade-up max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button data-testid={`option-close-${product.id}`} onClick={() => setPicker(null)} className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#0A0D14]/70 text-slate-300 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
            <p className="text-[11px] font-mono-tech uppercase tracking-wider text-[#FF2E2E]">{product.category}</p>
            <h3 className="font-heading text-xl font-extrabold text-white mt-1">{product.name}</h3>
            <p className="mt-2 text-sm text-slate-400">Silakan pilih {hasSizes ? "ukuran & warna" : "warna"} terlebih dahulu.</p>

            {hasSizes && (
              <div className="mt-5">
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Ukuran</p>
                <div className="grid grid-cols-2 gap-2">
                  {sizes.map((s) => {
                    const active = selSize?.label === s.label;
                    const sStock = (s.colors || []).reduce((a, c) => a + (Number(c.stock) || 0), 0);
                    const soldout = sStock <= 0;
                    return (
                      <button
                        key={s.label}
                        data-testid={`option-size-${product.id}-${s.label}`}
                        disabled={soldout}
                        onClick={() => chooseSize(s)}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-colors ${soldout ? "border-slate-800 text-slate-600 line-through cursor-not-allowed" : active ? "border-[#FF2E2E] bg-[#FF2E2E]/10" : "border-slate-700 bg-[#0A0D14] hover:border-slate-500"}`}
                      >
                        <span className="text-sm font-bold text-white">{s.label}</span>
                        {sStock <= 3 && sStock > 0 && <span className="text-[10px] text-[#FF7A33]">sisa {sStock}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {(hasSizes || hasColors) && (
              <div className="mt-5">
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Warna</p>
                {hasSizes && !selSize ? (
                  <p data-testid={`option-color-hint-${product.id}`} className="rounded-xl border border-dashed border-slate-700 px-3 py-3 text-xs text-slate-500">Pilih ukuran terlebih dahulu untuk melihat warna yang tersedia.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {pickerColors.map((v) => {
                      const out = (v.stock || 0) <= 0;
                      const active = selColor?.color === v.color;
                      return (
                        <button
                          key={v.color}
                          data-testid={`option-color-${product.id}-${v.color}`}
                          disabled={out}
                          onClick={() => setSelColor(v)}
                          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${out ? "border-slate-800 text-slate-600 line-through cursor-not-allowed" : active ? "border-[#FF2E2E] bg-[#FF2E2E]/10 text-white" : "border-slate-700 bg-[#0A0D14] text-slate-300 hover:border-slate-500"}`}
                        >
                          <span className="h-4 w-4 rounded-full border border-white/25 shrink-0" style={{ backgroundColor: v.hex || "#94A3B8" }} />
                          {v.color}
                          {out && <span className="text-[10px]">(habis)</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end">
              <button
                data-testid={`option-confirm-${product.id}`}
                onClick={confirmSelection}
                disabled={!canConfirm}
                className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-[filter,transform] ${canConfirm ? (picker.mode === "cart" ? "bg-[#FF2E2E] hover:brightness-110 hover:scale-[1.02]" : "bg-[#25D366] hover:brightness-110 hover:scale-[1.02]") : "bg-slate-700 opacity-60 cursor-not-allowed"}`}
              >
                {picker.mode === "cart" ? <ShoppingCart className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                {picker.mode === "cart" ? "Tambah ke Keranjang" : "Tanya via WA"}
              </button>
            </div>
            {!canConfirm && <p className="mt-2 text-[11px] text-[#FF7A33] flex items-center gap-1"><Check className="h-3 w-3" /> {hasSizes && !selSize ? "Pilih ukuran & warna untuk melanjutkan." : "Pilih warna untuk melanjutkan."}</p>}
          </div>
        </div>
      )}
    </>
  );
}
