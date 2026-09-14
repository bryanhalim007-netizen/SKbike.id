import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { CATEGORIES as CATS, getProducts } from "../lib/api";
import { ProductCard } from "../components/ProductCard";
import { Search, ArrowDownWideNarrow, ArrowUpNarrowWide, Clock, Wallet, X, SlidersHorizontal, ArrowUp } from "lucide-react";

const CATEGORIES = ["Semua", ...CATS];
const SORT_OPTIONS = [
  { key: "newest", label: "Terbaru", icon: Clock },
  { key: "price_asc", label: "Murah - Mahal", icon: ArrowUpNarrowWide },
  { key: "price_desc", label: "Mahal - Murah", icon: ArrowDownWideNarrow },
];

// Preset rentang harga (dalam Rupiah). null = tanpa batas.
const PRICE_RANGES = [
  { key: "all", label: "Semua Harga", min: null, max: null },
  { key: "u1", label: "< Rp 1 Jt", min: null, max: 1000000 },
  { key: "1-3", label: "Rp 1 - 3 Jt", min: 1000000, max: 3000000 },
  { key: "3-5", label: "Rp 3 - 5 Jt", min: 3000000, max: 5000000 },
  { key: "5-10", label: "Rp 5 - 10 Jt", min: 5000000, max: 10000000 },
  { key: "o10", label: "> Rp 10 Jt", min: 10000000, max: null },
];

const rupiah = (n) => new Intl.NumberFormat("id-ID").format(Number(n) || 0);

// Harga Jual tidak diekspos ke publik -> filter rentang harga dinonaktifkan (kode tetap disimpan).
const SHOW_PRICE_FILTER = false;

export default function Catalog() {
  const { waNumber } = useOutletContext();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("Semua");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [rangeKey, setRangeKey] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setLoading(true);
    getProducts({ sort })
      .then((list) => setProducts(list || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [sort]);

  // Rentang harga efektif: input custom mengambil alih preset bila diisi.
  const activeMin = minPrice !== "" ? Number(minPrice) : PRICE_RANGES.find((r) => r.key === rangeKey)?.min ?? null;
  const activeMax = maxPrice !== "" ? Number(maxPrice) : PRICE_RANGES.find((r) => r.key === rangeKey)?.max ?? null;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchCat = category === "Semua" || p.category === category;
      const matchSearch = !term || p.name.toLowerCase().includes(term) || (p.description || "").toLowerCase().includes(term);
      const price = Number(p.price) || 0;
      const matchMin = activeMin == null || price >= activeMin;
      const matchMax = activeMax == null || price <= activeMax;
      return matchCat && matchSearch && matchMin && matchMax;
    });
  }, [products, category, search, activeMin, activeMax]);

  const priceActive = rangeKey !== "all" || minPrice !== "" || maxPrice !== "";
  const hasFilters = category !== "Semua" || search !== "" || priceActive;

  const pickRange = (key) => {
    setRangeKey(key);
    setMinPrice("");
    setMaxPrice("");
  };

  const resetAll = () => {
    setCategory("Semua");
    setSearch("");
    setRangeKey("all");
    setMinPrice("");
    setMaxPrice("");
  };

  return (
    <section className="mx-auto max-w-7xl px-5 sm:px-8 py-12 sm:py-16">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
        <div>
          <span className="flex items-center gap-2 text-xs font-mono-tech uppercase tracking-widest text-[#FF2E2E]"><span className="h-3 w-1 bg-[#FF2E2E]" /> Koleksi Kami</span>
          <h1 className="mt-2 font-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white uppercase italic">Katalog Sepeda</h1>
          <p className="mt-2 text-slate-400">Cari, filter kategori, dan atur rentang harga sepeda impianmu.</p>
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            data-testid="catalog-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari sepeda..."
            className="w-full rounded-full border border-slate-700 bg-[#161F2E] pl-11 pr-4 py-3 text-sm text-white outline-none focus:border-[#FF2E2E] transition-colors"
          />
        </div>
      </div>

      {/* Panel Filter */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#111723] p-5 sm:p-6 mb-8 space-y-6">
        {/* Kategori */}
        <div>
          <span className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500 mb-3"><SlidersHorizontal className="h-3.5 w-3.5 text-[#FF2E2E]" /> Kategori</span>
          <div className="flex flex-wrap gap-2.5">
            {CATEGORIES.map((cat) => {
              const slug = cat.toLowerCase().replace(/\s+/g, "-").replace(/\//g, "");
              const active = category === cat;
              return (
                <button
                  key={cat}
                  data-testid={`category-filter-tab-${slug}`}
                  onClick={() => setCategory(cat)}
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors border ${
                    active
                      ? "bg-[#FF2E2E] text-white border-[#FF2E2E] cyan-glow"
                      : "bg-[#161F2E] text-slate-300 border-slate-700 hover:border-[#FF2E2E]/50"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Rentang Harga */}
        {SHOW_PRICE_FILTER && (
        <div>
          <span className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500 mb-3"><Wallet className="h-3.5 w-3.5 text-[#FF2E2E]" /> Rentang Harga</span>
          <div className="flex flex-wrap gap-2.5">
            {PRICE_RANGES.map((r) => {
              const active = minPrice === "" && maxPrice === "" && rangeKey === r.key;
              return (
                <button
                  key={r.key}
                  data-testid={`price-range-${r.key}`}
                  onClick={() => pickRange(r.key)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors border ${
                    active
                      ? "bg-[#FF2E2E] text-white border-[#FF2E2E]"
                      : "bg-[#161F2E] text-slate-300 border-slate-700 hover:border-[#FF2E2E]/50"
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-xs uppercase tracking-wider text-slate-500">Atur sendiri (Rp)</span>
            <div className="flex items-center gap-2">
              <input
                data-testid="price-min-input"
                type="number"
                min="0"
                value={minPrice}
                onChange={(e) => { setMinPrice(e.target.value); setRangeKey("all"); }}
                placeholder="Min"
                className="w-28 rounded-lg border border-slate-700 bg-[#161F2E] px-3 py-2 text-sm text-white outline-none focus:border-[#FF2E2E] transition-colors"
              />
              <span className="text-slate-600">—</span>
              <input
                data-testid="price-max-input"
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => { setMaxPrice(e.target.value); setRangeKey("all"); }}
                placeholder="Max"
                className="w-28 rounded-lg border border-slate-700 bg-[#161F2E] px-3 py-2 text-sm text-white outline-none focus:border-[#FF2E2E] transition-colors"
              />
            </div>
          </div>
        </div>
        )}

        {/* Urutkan + Reset */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-800/80 pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-slate-500 mr-1">Urutkan</span>
            {SORT_OPTIONS.map((opt) => {
              const active = sort === opt.key;
              return (
                <button
                  key={opt.key}
                  data-testid={`sort-option-${opt.key}`}
                  onClick={() => setSort(opt.key)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors border ${
                    active
                      ? "bg-[#FF2E2E] text-white border-[#FF2E2E]"
                      : "bg-[#161F2E] text-slate-300 border-slate-700 hover:border-[#FF2E2E]/50"
                  }`}
                >
                  <opt.icon className="h-3.5 w-3.5" /> {opt.label}
                </button>
              );
            })}
          </div>
          {hasFilters && (
            <button
              data-testid="reset-filters-btn"
              onClick={resetAll}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-[#161F2E] px-4 py-2 text-xs font-semibold text-slate-300 hover:border-[#FF2E2E] hover:text-[#FF2E2E] transition-colors self-start sm:self-auto"
            >
              <X className="h-3.5 w-3.5" /> Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Info hasil */}
      <div className="mb-6 flex items-center gap-2 text-sm text-slate-400">
        <span data-testid="catalog-result-count" className="font-semibold text-white">{filtered.length}</span> sepeda ditemukan
        {(activeMin != null || activeMax != null) && (
          <span className="text-slate-500">
            &middot; harga {activeMin != null ? `Rp ${rupiah(activeMin)}` : "Rp 0"} - {activeMax != null ? `Rp ${rupiah(activeMax)}` : "∞"}
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500">Memuat katalog...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          Tidak ada sepeda yang cocok dengan filter.
          {hasFilters && (
            <button onClick={resetAll} className="mt-4 block mx-auto rounded-full bg-[#FF2E2E] px-6 py-2.5 text-sm font-semibold text-white hover:brightness-110 transition-[filter]">
              Reset Filter
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((p, i) => (
            <ProductCard key={p.id} product={p} waNumber={waNumber} index={i} />
          ))}
        </div>
      )}

      {/* Tombol scroll ke atas — muncul di atas pop-up Instagram */}
      {showTop && (
        <button
          type="button"
          data-testid="scroll-to-top-btn"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Kembali ke atas"
          className="fixed right-7 bottom-44 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF2E2E] text-white shadow-lg cyan-glow hover:scale-110 hover:brightness-110 transition-[transform,filter] animate-fade-up"
        >
          <ArrowUp className="h-6 w-6" />
        </button>
      )}
    </section>
  );
}
