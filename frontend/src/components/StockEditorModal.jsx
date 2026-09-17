import { useState } from "react";
import { updateProductVariants, updateProduct, resolveImage } from "../lib/api";
import { toast } from "sonner";
import { X, Plus, Minus, Trash2, Save, Loader2, PlusCircle, PackageX, Boxes, Ruler } from "lucide-react";

const LOW_STOCK = 3;
const DEFAULT_HEX = "#94A3B8";

export function StockEditorModal({ product, onClose, onSaved }) {
  const isNested = Array.isArray(product.sizes) && product.sizes.length > 0;
  const [saving, setSaving] = useState(false);

  // --- Nested (size -> colors) state ---
  const [sizes, setSizes] = useState(() =>
    isNested
      ? product.sizes.map((s) => ({
          ...s,
          colors: (s.colors && s.colors.length) ? s.colors.map((c) => ({ color: "", stock: 0, hex: DEFAULT_HEX, ...c })) : [{ color: "Standar", stock: 0, hex: DEFAULT_HEX }],
        }))
      : []
  );
  const setColorStock = (si, ci, val) =>
    setSizes((prev) => prev.map((s, i) => (i === si ? { ...s, colors: s.colors.map((c, ci2) => (ci2 === ci ? { ...c, stock: val } : c)) } : s)));
  const adjustNested = (si, ci, d) =>
    setSizes((prev) => prev.map((s, i) => (i === si ? { ...s, colors: s.colors.map((c, ci2) => (ci2 === ci ? { ...c, stock: Math.max(0, (Number(c.stock) || 0) + d) } : c)) } : s)));

  // --- Legacy (flat variants) state ---
  const [variants, setVariants] = useState(
    !isNested ? (product.variants?.length ? product.variants.map((v) => ({ ...v })) : [{ color: "Standar", stock: product.stock || 0 }]) : []
  );
  const setVar = (i, k, val) => setVariants((prev) => prev.map((x, idx) => (idx === i ? { ...x, [k]: val } : x)));
  const adjust = (i, d) => setVariants((prev) => prev.map((x, idx) => (idx === i ? { ...x, stock: Math.max(0, (Number(x.stock) || 0) + d) } : x)));
  const addColor = () => setVariants((prev) => [...prev, { color: "", stock: 0 }]);
  const removeColor = (i) => setVariants((prev) => prev.filter((_, idx) => idx !== i));

  const total = isNested
    ? sizes.reduce((t, s) => t + s.colors.reduce((a, c) => a + (Number(c.stock) || 0), 0), 0)
    : variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);

  const dot = (st) => `h-2.5 w-2.5 rounded-full shrink-0 ${st === 0 ? "bg-red-500" : st <= LOW_STOCK ? "bg-amber-400" : "bg-[#10B981]"}`;

  const save = async () => {
    setSaving(true);
    try {
      let updated;
      if (isNested) {
        const payloadSizes = sizes.map((s) => ({
          label: s.label, code: s.code || "", cost_price: Number(s.cost_price) || 0, price: Number(s.price) || 0,
          colors: s.colors.map((c) => ({ color: String(c.color || "").trim(), stock: Number(c.stock) || 0, hex: c.hex || DEFAULT_HEX, image_url: c.image_url || "" })).filter((c) => c.color),
        }));
        updated = await updateProduct(product.id, { sizes: payloadSizes });
      } else {
        const payload = variants.map((v) => ({ color: String(v.color || "").trim(), stock: Number(v.stock) || 0, hex: v.hex || DEFAULT_HEX })).filter((v) => v.color);
        if (payload.length === 0) { toast.error("Minimal satu warna"); setSaving(false); return; }
        updated = await updateProductVariants(product.id, payload);
      }
      toast.success(`Stok "${product.name}" disimpan`);
      onSaved(updated);
      onClose();
    } catch {
      toast.error("Gagal menyimpan stok");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="stock-editor-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-sm" onClick={() => !saving && onClose()}>
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-[#111723] p-6 max-h-[85vh] overflow-y-auto animate-fade-up">
        <button type="button" onClick={() => !saving && onClose()} className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"><X className="h-5 w-5" /></button>

        <div className="flex items-center gap-3 mb-5">
          <div className="h-14 w-16 shrink-0 rounded-lg bg-[#0A0D14] overflow-hidden border border-slate-800 flex items-center justify-center">
            {product.image_url ? <img src={resolveImage(product.image_url)} alt={product.name} className="h-full w-full object-cover" /> : <PackageX className="h-5 w-5 text-slate-600" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#FF2E2E]"><Boxes className="h-3.5 w-3.5" /> Kelola Stok</p>
            <h2 className="font-heading text-lg font-bold text-white truncate">{product.name}</h2>
            <p className="text-[11px] text-slate-500">{product.category}{product.code ? ` • ${product.code}` : ""}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Total</p>
            <p data-testid="stock-editor-total" className={`font-heading text-2xl font-black ${total === 0 ? "text-red-400" : total <= LOW_STOCK ? "text-amber-400" : "text-white"}`}>{total}</p>
          </div>
        </div>

        {isNested ? (
          <div className="space-y-4">
            {sizes.map((s, si) => (
              <div key={si} data-testid={`stock-size-${si}`} className="rounded-xl border border-slate-700 bg-[#0A0D14]/60 p-3">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="flex items-center gap-1.5 text-sm font-bold text-white"><Ruler className="h-4 w-4 text-[#FF7A33]" /> {s.label}</span>
                  <span className="text-[11px] text-slate-500">Stok: <span className="font-bold text-white">{s.colors.reduce((a, c) => a + (Number(c.stock) || 0), 0)}</span></span>
                </div>
                <div className="space-y-2">
                  {s.colors.map((c, ci) => {
                    const st = Number(c.stock) || 0;
                    return (
                      <div key={ci} data-testid={`stock-size-${si}-color-${ci}`} className="flex items-center gap-2">
                        <span className={dot(st)} style={{ backgroundColor: c.hex || undefined }} />
                        <span className="flex-1 flex items-center gap-2 text-sm text-white truncate">
                          <span className="h-3 w-3 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: c.hex || DEFAULT_HEX }} />
                          {c.color}
                        </span>
                        <div className="flex items-center gap-1">
                          <button data-testid={`stock-size-${si}-dec-${ci}`} onClick={() => adjustNested(si, ci, -1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-white hover:border-[#FF2E2E]"><Minus className="h-3.5 w-3.5" /></button>
                          <input data-testid={`stock-size-${si}-qty-${ci}`} type="number" min="0" value={c.stock} onChange={(e) => setColorStock(si, ci, e.target.value)} className="w-16 rounded-lg border border-slate-700 bg-[#0A0D14] px-2 py-2 text-center text-sm text-white outline-none focus:border-[#FF2E2E]" />
                          <button data-testid={`stock-size-${si}-inc-${ci}`} onClick={() => adjustNested(si, ci, 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-white hover:border-[#FF2E2E]"><Plus className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <p className="text-[11px] text-slate-500">Untuk menamb/menghapus ukuran atau warna & mengubah harga, gunakan tombol <span className="text-slate-300 font-semibold">Edit</span> produk.</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {variants.map((v, i) => {
                const st = Number(v.stock) || 0;
                return (
                  <div key={i} data-testid={`stock-editor-variant-${i}`} className="flex items-center gap-2">
                    <span className={dot(st)} />
                    <input data-testid={`stock-editor-color-${i}`} value={v.color} onChange={(e) => setVar(i, "color", e.target.value)} placeholder="Warna" className="flex-1 rounded-lg border border-slate-700 bg-[#0A0D14] px-3 py-2 text-sm text-white outline-none focus:border-[#FF2E2E]" />
                    <div className="flex items-center gap-1">
                      <button data-testid={`stock-editor-dec-${i}`} onClick={() => adjust(i, -1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-white hover:border-[#FF2E2E]"><Minus className="h-3.5 w-3.5" /></button>
                      <input data-testid={`stock-editor-qty-${i}`} type="number" min="0" value={v.stock} onChange={(e) => setVar(i, "stock", e.target.value)} className="w-16 rounded-lg border border-slate-700 bg-[#0A0D14] px-2 py-2 text-center text-sm text-white outline-none focus:border-[#FF2E2E]" />
                      <button data-testid={`stock-editor-inc-${i}`} onClick={() => adjust(i, 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-white hover:border-[#FF2E2E]"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <button data-testid={`stock-editor-remove-${i}`} onClick={() => removeColor(i)} disabled={variants.length <= 1} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:border-red-500 hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-start pt-4 mt-2 border-t border-slate-800">
              <button data-testid="stock-editor-add-color" onClick={addColor} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-[#FF2E2E] transition-colors"><PlusCircle className="h-3.5 w-3.5" /> Tambah warna</button>
            </div>
          </>
        )}

        <div className="flex justify-end pt-4 mt-2 border-t border-slate-800">
          <button data-testid="stock-editor-save" onClick={save} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-[#FF2E2E] px-5 py-2.5 text-sm font-bold text-white hover:scale-105 transition-all disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan Stok
          </button>
        </div>
      </div>
    </div>
  );
}
