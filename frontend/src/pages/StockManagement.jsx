import { useEffect, useState, useCallback, useMemo } from "react";
import { adminProducts, updateProductVariants, resolveImage, CATEGORIES } from "../lib/api";
import { toast } from "sonner";
import {
  Boxes, Search, Plus, Minus, Trash2, Save, Loader2, Palette, PackageX,
  AlertTriangle, TrendingDown, Layers, PlusCircle,
} from "lucide-react";

const LOW_STOCK = 3;

function StatCard({ icon: Icon, label, value, tone }) {
  const tones = {
    red: "bg-[#FF2E2E]/10 border-[#FF2E2E]/20 text-[#FF2E2E]",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    green: "bg-[#10B981]/10 border-[#10B981]/20 text-[#10B981]",
  };
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#161F2E] p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
        <div><p className="text-xs uppercase tracking-wider text-slate-500">{label}</p><p className="font-heading text-xl font-bold text-white">{value}</p></div>
      </div>
    </div>
  );
}

function ProductStockCard({ product, onSaved }) {
  const [variants, setVariants] = useState(product.variants?.length ? product.variants.map((v) => ({ ...v })) : [{ color: "Standar", stock: product.stock || 0 }]);
  const [saving, setSaving] = useState(false);

  const total = variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
  const orig = JSON.stringify((product.variants || []).map((v) => ({ color: v.color, stock: Number(v.stock) || 0 })));
  const curr = JSON.stringify(variants.map((v) => ({ color: String(v.color || "").trim(), stock: Number(v.stock) || 0 })));
  const dirty = orig !== curr;

  const setVar = (i, k, val) => setVariants((prev) => prev.map((x, idx) => idx === i ? { ...x, [k]: val } : x));
  const adjust = (i, d) => setVariants((prev) => prev.map((x, idx) => idx === i ? { ...x, stock: Math.max(0, (Number(x.stock) || 0) + d) } : x));
  const addColor = () => setVariants((prev) => [...prev, { color: "", stock: 0 }]);
  const removeColor = (i) => setVariants((prev) => prev.filter((_, idx) => idx !== i));

  const save = async () => {
    const payload = variants.map((v) => ({ color: String(v.color || "").trim(), stock: Number(v.stock) || 0 })).filter((v) => v.color);
    if (payload.length === 0) { toast.error("Minimal satu warna"); return; }
    setSaving(true);
    try {
      const updated = await updateProductVariants(product.id, payload);
      toast.success(`Stok "${product.name}" disimpan`);
      onSaved(updated);
    } catch { toast.error("Gagal menyimpan stok"); }
    finally { setSaving(false); }
  };

  return (
    <div data-testid={`stock-card-${product.id}`} className="rounded-2xl border border-slate-800 bg-[#111723] overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-slate-800">
        <div className="h-14 w-16 shrink-0 rounded-lg bg-[#0A0D14] overflow-hidden border border-slate-800 flex items-center justify-center">
          {product.image_url ? <img src={resolveImage(product.image_url)} alt={product.name} className="h-full w-full object-cover" /> : <PackageX className="h-5 w-5 text-slate-600" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white truncate">{product.name}</p>
          <p className="text-[11px] text-slate-500">{product.category}{product.code ? ` • ${product.code}` : ""}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Total</p>
          <p data-testid={`stock-total-${product.id}`} className={`font-heading text-lg font-black ${total === 0 ? "text-red-400" : total <= LOW_STOCK ? "text-amber-400" : "text-white"}`}>{total}</p>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {variants.map((v, i) => {
          const st = Number(v.stock) || 0;
          return (
            <div key={i} data-testid={`stock-variant-${product.id}-${i}`} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${st === 0 ? "bg-red-500" : st <= LOW_STOCK ? "bg-amber-400" : "bg-[#10B981]"}`} />
              <input data-testid={`stock-color-input-${product.id}-${i}`} value={v.color} onChange={(e) => setVar(i, "color", e.target.value)} placeholder="Warna" className="flex-1 rounded-lg border border-slate-700 bg-[#0A0D14] px-3 py-2 text-sm text-white outline-none focus:border-[#FF2E2E]" />
              <div className="flex items-center gap-1">
                <button data-testid={`stock-dec-${product.id}-${i}`} onClick={() => adjust(i, -1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-white hover:border-[#FF2E2E]"><Minus className="h-3.5 w-3.5" /></button>
                <input data-testid={`stock-qty-input-${product.id}-${i}`} type="number" min="0" value={v.stock} onChange={(e) => setVar(i, "stock", e.target.value)} className="w-16 rounded-lg border border-slate-700 bg-[#0A0D14] px-2 py-2 text-center text-sm text-white outline-none focus:border-[#FF2E2E]" />
                <button data-testid={`stock-inc-${product.id}-${i}`} onClick={() => adjust(i, 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-white hover:border-[#FF2E2E]"><Plus className="h-3.5 w-3.5" /></button>
              </div>
              <button data-testid={`stock-remove-${product.id}-${i}`} onClick={() => removeColor(i)} disabled={variants.length <= 1} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:border-red-500 hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          );
        })}
        <div className="flex items-center justify-between pt-1">
          <button data-testid={`stock-add-color-${product.id}`} onClick={addColor} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-[#FF2E2E] transition-colors"><PlusCircle className="h-3.5 w-3.5" /> Tambah warna</button>
          <button data-testid={`stock-save-${product.id}`} onClick={save} disabled={!dirty || saving} className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${dirty ? "bg-[#FF2E2E] text-white hover:scale-105" : "bg-slate-800 text-slate-500 cursor-not-allowed"}`}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StockManagement() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Semua");
  const [onlyLow, setOnlyLow] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setProducts(await adminProducts()); }
    catch { toast.error("Gagal memuat produk"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const onSaved = (updated) => setProducts((prev) => prev.map((p) => p.id === updated.id ? updated : p));

  const stats = useMemo(() => {
    const totalUnits = products.reduce((s, p) => s + (p.stock || 0), 0);
    const outCount = products.filter((p) => (p.stock || 0) === 0).length;
    const lowCount = products.filter((p) => (p.stock || 0) > 0 && (p.stock || 0) <= LOW_STOCK).length;
    const colorCount = products.reduce((s, p) => s + (p.variants?.length || 0), 0);
    return { totalUnits, outCount, lowCount, colorCount };
  }, [products]);

  const q = search.trim().toLowerCase();
  const filtered = products.filter((p) => {
    const mq = !q || p.name.toLowerCase().includes(q) || (p.code || "").toLowerCase().includes(q);
    const mc = catFilter === "Semua" || p.category === catFilter;
    const ml = !onlyLow || (p.stock || 0) <= LOW_STOCK;
    return mq && mc && ml;
  });

  return (
    <div data-testid="stock-management-panel">
      <div className="mb-6">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white flex items-center gap-2"><Boxes className="h-7 w-7 text-[#FF2E2E]" /> Management Stok</h1>
        <p className="mt-1 text-slate-400 text-sm">Kelola stok per warna untuk setiap produk. Total stok dihitung otomatis dari semua warna.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Layers} label="Total Unit" value={stats.totalUnits} tone="blue" />
        <StatCard icon={Palette} label="Total Varian Warna" value={stats.colorCount} tone="green" />
        <StatCard icon={TrendingDown} label="Stok Menipis" value={stats.lowCount} tone="amber" />
        <StatCard icon={AlertTriangle} label="Stok Habis" value={stats.outCount} tone="red" />
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input data-testid="stock-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari produk..." className="w-full rounded-full border border-slate-700 bg-[#161F2E] pl-11 pr-4 py-3 text-sm text-white outline-none focus:border-[#FF2E2E]" />
        </div>
        <select data-testid="stock-cat-filter" value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="rounded-full border border-slate-700 bg-[#161F2E] px-4 py-3 text-sm text-white outline-none focus:border-[#FF2E2E]">
          <option value="Semua">Semua Kategori</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button data-testid="stock-low-toggle" onClick={() => setOnlyLow((v) => !v)} className={`flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition-colors ${onlyLow ? "border-amber-500 bg-amber-500/15 text-amber-300" : "border-slate-700 bg-[#161F2E] text-slate-400 hover:border-slate-500"}`}><TrendingDown className="h-4 w-4" /> Stok Menipis</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#111723] py-16 text-center text-slate-500 text-sm">Tidak ada produk.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((p) => <ProductStockCard key={p.id} product={p} onSaved={onSaved} />)}
        </div>
      )}
    </div>
  );
}
