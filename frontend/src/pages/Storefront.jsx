import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Navbar } from "../components/Navbar";
import { ProductCard } from "../components/ProductCard";
import { WhatsAppPopout } from "../components/WhatsAppPopout";
import { Search, Zap, ShieldCheck, Wrench, Truck } from "lucide-react";

const CATEGORIES = ["Semua", "Sepeda Gunung", "BMX", "Sepeda Anak", "Sepeda Lipat", "Sepeda Listrik"];
const HERO_IMG = "https://images.unsplash.com/photo-1535369643553-a33e0d1ac81d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NjZ8MHwxfHNlYXJjaHw0fHxtb3VudGFpbiUyMGJpa2UlMjBiaWN5Y2xlJTIwYWN0aW9uJTIwY3ljbGluZ3xlbnwwfHx8fDE3ODkxOTYxMjJ8MA&ixlib=rb-4.1.0&q=85";

const PERKS = [
  { icon: Zap, title: "Performa Tinggi", desc: "Komponen premium untuk setiap medan." },
  { icon: ShieldCheck, title: "Garansi Resmi", desc: "Jaminan kualitas & servis terpercaya." },
  { icon: Wrench, title: "Servis Profesional", desc: "Mekanik ahli & suku cadang lengkap." },
  { icon: Truck, title: "Kirim Seluruh Indonesia", desc: "Pengiriman aman sampai tujuan." },
];

export default function Storefront() {
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState("Semua");
  const [search, setSearch] = useState("");
  const [waNumber, setWaNumber] = useState("628125559681");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/config").then(({ data }) => setWaNumber(data.whatsapp_number)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get("/products").then(({ data }) => setProducts(data)).finally(() => setLoading(false));
  }, []);

  const filtered = products.filter((p) => {
    const matchCat = category === "Semua" || p.category === category;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[#0A0D14]">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-800/80">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="Sepeda" className="h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0D14] via-[#0A0D14]/85 to-[#0A0D14]/40" />
        </div>
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8 py-24 sm:py-32">
          <div className="max-w-2xl">
            <span className="inline-block rounded-full border border-[#FF2E2E]/30 bg-[#FF2E2E]/10 px-4 py-1.5 text-xs font-mono-tech uppercase tracking-widest text-[#FF2E2E]">
              Sepeda & Sepeda Listrik
            </span>
            <h1 className="mt-6 font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] text-white">
              Kendarai Batasmu.<br /><span className="text-[#FF2E2E]">Taklukan Medanmu.</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed">
              Koleksi lengkap sepeda gunung, BMX, sepeda anak, sepeda lipat, dan sepeda listrik pilihan. Hubungi admin kami langsung via WhatsApp untuk info stok & harga terbaik.
            </p>
            <a href="#katalog" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#FF2E2E] px-7 py-3.5 text-sm font-bold text-[#0A0D14] cyan-glow hover:scale-105 transition-transform">
              Jelajahi Katalog
            </a>
          </div>
        </div>
      </section>

      {/* Perks */}
      <section id="keunggulan" className="border-b border-slate-800/80 bg-[#111723]">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-10 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {PERKS.map((p, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FF2E2E]/10 border border-[#FF2E2E]/20">
                <p.icon className="h-5 w-5 text-[#FF2E2E]" />
              </div>
              <div>
                <p className="font-heading font-bold text-white text-sm">{p.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Catalog */}
      <section id="katalog" className="mx-auto max-w-7xl px-5 sm:px-8 py-16">
        <div id="kategori" className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div>
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">Katalog Sepeda</h2>
            <p className="mt-2 text-slate-400">Pilih kategori dan temukan sepeda impianmu.</p>
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

        <div className="flex flex-wrap gap-2.5 mb-10">
          {CATEGORIES.map((cat) => {
            const slug = cat.toLowerCase().replace(/\s+/g, "-");
            const active = category === cat;
            return (
              <button
                key={cat}
                data-testid={`category-filter-tab-${slug}`}
                onClick={() => setCategory(cat)}
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors border ${
                  active
                    ? "bg-[#FF2E2E] text-[#0A0D14] border-[#FF2E2E] cyan-glow"
                    : "bg-[#161F2E] text-slate-300 border-slate-700 hover:border-[#FF2E2E]/50"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500">Memuat katalog...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">Tidak ada sepeda pada kategori ini.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((p, i) => (
              <ProductCard key={p.id} product={p} waNumber={waNumber} index={i} />
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-slate-800/80 bg-[#111723]">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-10 text-center">
          <p className="font-heading text-xl font-extrabold text-white">SK <span className="text-[#FF2E2E]">BIKE STUDIO</span></p>
          <p className="mt-2 text-sm text-slate-400">Hubungi kami via WhatsApp untuk informasi harga & pemesanan.</p>
          <p className="mt-4 text-xs text-slate-600">© 2026 SK BIKE. Semua hak dilindungi.</p>
        </div>
      </footer>

      <WhatsAppPopout number={waNumber} />
    </div>
  );
}
