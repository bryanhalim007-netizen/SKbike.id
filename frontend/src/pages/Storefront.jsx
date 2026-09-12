import { useEffect, useState } from "react";
import { CATEGORIES as CATS, getConfig, getProducts } from "../lib/api";
import { Navbar } from "../components/Navbar";
import { ProductCard } from "../components/ProductCard";
import { WhatsAppPopout } from "../components/WhatsAppPopout";
import skLogo from "../assets/sk-logo.png";
import { Search, Zap, ShieldCheck, Wrench, Truck, MapPin, ArrowDownWideNarrow, ArrowUpNarrowWide, Clock, ChevronRight, Instagram, MessageCircle, Navigation } from "lucide-react";

const CATEGORIES = ["Semua", ...CATS];
const SORT_OPTIONS = [
  { key: "newest", label: "Terbaru", icon: Clock },
  { key: "price_asc", label: "Murah - Mahal", icon: ArrowUpNarrowWide },
  { key: "price_desc", label: "Mahal - Murah", icon: ArrowDownWideNarrow },
];
const HERO_IMG = "https://images.unsplash.com/photo-1535369643553-a33e0d1ac81d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NjZ8MHwxfHNlYXJjaHw0fHxtb3VudGFpbiUyMGJpa2UlMjBiaWN5Y2xlJTIwYWN0aW9uJTIwY3ljbGluZ3xlbnwwfHx8fDE3ODkxOTYxMjJ8MA&ixlib=rb-4.1.0&q=85";

const HERO_STATS = [
  { value: "8", label: "Kategori", plus: false },
  { value: "50", label: "Model Sepeda", plus: true },
  { value: "1000", label: "Rider Puas", plus: true },
];
const MARQUEE = ["Performance", "Speed", "Durability", "Adventure", "Precision", "SK Bike"];

const PERKS = [
  { icon: Zap, title: "Performa Tinggi", desc: "Komponen premium untuk setiap medan." },
  { icon: ShieldCheck, title: "Agen Resmi", desc: "Jaminan kualitas & servis terpercaya." },
  { icon: Wrench, title: "Servis Profesional", desc: "Mekanik ahli & suku cadang lengkap." },
  { icon: Truck, title: "Kirim Seluruh Ketapang", desc: "Pengiriman aman sampai tujuan." },
];

export default function Storefront() {
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState("Semua");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [waNumber, setWaNumber] = useState("628125559681");

  useEffect(() => {
    getConfig().then((c) => c?.whatsapp_number && setWaNumber(c.whatsapp_number)).catch(() => {});
  }, []);

  useEffect(() => {
    getProducts({ sort }).then(setProducts).catch(() => setProducts([]));
  }, [sort]);

  const filtered = products.filter((p) => {
    const matchCat = category === "Semua" || p.category === category;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.description || "").toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[#0A0D14]">
      <Navbar />

      <section className="relative overflow-hidden border-b border-slate-800/80">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="Sepeda" className="h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0D14] via-[#0A0D14]/90 to-[#0A0D14]/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0D14] via-[#0A0D14]/30 to-transparent sm:hidden" />
          <div className="absolute inset-0 speed-lines opacity-40" />
          <div className="absolute -right-1/4 top-0 h-full w-1/2 red-beam animate-glow hidden sm:block" />
        </div>

        <span className="pointer-events-none select-none absolute -bottom-8 right-2 font-heading text-[22vw] font-black leading-none text-outline hidden lg:block italic">SPORT</span>

        <div className="relative mx-auto max-w-7xl px-5 sm:px-8 py-16 sm:py-24 lg:py-32">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 skew-tag bg-[#FF2E2E] px-6 py-2 text-xs font-mono-tech font-bold uppercase tracking-widest text-white">
              Sepeda &amp; Sepeda Listrik
            </span>
            <h1 className="mt-6 font-heading text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight leading-[0.95] uppercase italic">
              <span className="text-white">Toko Sepeda Ketapang</span><br /><span className="text-[#FF2E2E]">Siap Antar Area Kalimantan Barat</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed">
              Koleksi lengkap sepeda gunung, BMX, sepeda anak, sepeda lipat, dan sepeda listrik pilihan. Hubungi admin kami langsung via WhatsApp untuk info stok & harga terbaik.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a href="#katalog" className="ripple-soft group inline-flex items-center gap-2 skew-tag bg-[#FF2E2E] px-8 py-4 text-sm font-bold uppercase tracking-wide text-white cyan-glow hover:scale-105 transition-transform">
                Jelajahi Katalog <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <span className="text-sm text-slate-400">atau chat admin via WhatsApp</span>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-6 sm:gap-x-10 gap-y-4 border-t border-slate-800/80 pt-6">
              {HERO_STATS.map((s) => (
                <div key={s.label}>
                  <p className="font-heading text-2xl sm:text-3xl font-black text-white italic">{s.value}{s.plus && <span className="text-[#FF2E2E]">+</span>}</p>
                  <p className="text-[11px] uppercase tracking-widest text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative border-t border-slate-800/80 bg-[#0B0E16] overflow-hidden">
          <div className="flex whitespace-nowrap animate-marquee py-3">
            {[0, 1].map((k) => (
              <div key={k} className="flex items-center">
                {MARQUEE.map((w) => (
                  <span key={w + k} className="flex items-center gap-4 px-6 font-heading text-sm font-bold uppercase tracking-widest text-slate-600">
                    {w} <span className="h-1.5 w-1.5 rounded-full bg-[#FF2E2E]" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="keunggulan" className="border-b border-slate-800/80 bg-[#111723]">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-10 grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-6 sm:gap-6">
          {PERKS.map((p) => (
            <div key={p.title} className="group flex items-start gap-3 border-l-2 border-slate-800 hover:border-[#FF2E2E] pl-4 transition-colors">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#FF2E2E]/10 border border-[#FF2E2E]/20 group-hover:bg-[#FF2E2E] transition-colors">
                <p.icon className="h-5 w-5 text-[#FF2E2E] group-hover:text-white transition-colors" />
              </div>
              <div>
                <p className="font-heading font-bold text-white text-sm uppercase tracking-wide">{p.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="katalog" className="mx-auto max-w-7xl px-5 sm:px-8 py-16">
        <div id="kategori" className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div>
            <span className="flex items-center gap-2 text-xs font-mono-tech uppercase tracking-widest text-[#FF2E2E]"><span className="h-3 w-1 bg-[#FF2E2E]" /> Koleksi Kami</span>
            <h2 className="mt-2 font-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white uppercase italic">Katalog Sepeda</h2>
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

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-10">
          <div className="flex flex-wrap gap-2.5">
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
                      ? "bg-[#FF2E2E] text-white border-[#FF2E2E] cyan-glow"
                      : "bg-[#161F2E] text-slate-300 border-slate-700 hover:border-[#FF2E2E]/50"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
            <span className="w-full lg:w-auto text-xs uppercase tracking-wider text-slate-500 lg:mr-1">Urutkan</span>
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
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">Tidak ada sepeda pada kategori ini.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((p, i) => (
              <ProductCard key={p.id} product={p} waNumber={waNumber} index={i} />
            ))}
          </div>
        )}
      </section>

      <section id="find-us" className="border-t border-slate-800/80 bg-[#0B0E16]">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-16">
          <div className="mb-10">
            <span className="flex items-center gap-2 text-xs font-mono-tech uppercase tracking-widest text-[#FF2E2E]"><span className="h-3 w-1 bg-[#FF2E2E]" /> Kunjungi Kami</span>
            <h2 className="mt-2 font-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white uppercase italic">Find Us</h2>
            <p className="mt-2 text-slate-400">Hubungi atau kunjungi toko SK Bike secara langsung.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-stretch">
            <div className="flex flex-col gap-4">
              <a
                href={`https://wa.me/${waNumber}?text=${encodeURIComponent("Halo Admin SK Bike, saya ingin bertanya.")}`}
                target="_blank" rel="noopener noreferrer"
                data-testid="findus-whatsapp-link"
                className="group flex items-center gap-4 rounded-2xl border border-slate-800 bg-[#161F2E] p-5 hover:border-[#25D366] transition-colors"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#25D366]/15 text-[#25D366] group-hover:bg-[#25D366] group-hover:text-white transition-colors"><MessageCircle className="h-6 w-6" /></span>
                <span className="flex-1">
                  <span className="block text-xs uppercase tracking-wider text-slate-500">WhatsApp</span>
                  <span className="block font-heading font-bold text-white">+62 812-5559-681</span>
                </span>
                <span className="text-xs font-semibold text-[#25D366] uppercase">Chat</span>
              </a>

              <a
                href="https://instagram.com/skbike_ketapang"
                target="_blank" rel="noopener noreferrer"
                data-testid="findus-instagram-link"
                className="group flex items-center gap-4 rounded-2xl border border-slate-800 bg-[#161F2E] p-5 hover:border-[#DD2A7B] transition-colors"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: "linear-gradient(45deg, #F58529, #DD2A7B, #8134AF, #515BD4)" }}><Instagram className="h-6 w-6" /></span>
                <span className="flex-1">
                  <span className="block text-xs uppercase tracking-wider text-slate-500">Instagram</span>
                  <span className="block font-heading font-bold text-white">@skbike_ketapang</span>
                </span>
                <span className="text-xs font-semibold text-[#DD2A7B] uppercase">Follow</span>
              </a>

              <div className="flex items-start gap-4 rounded-2xl border border-slate-800 bg-[#161F2E] p-5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FF2E2E]/10 text-[#FF2E2E]"><MapPin className="h-6 w-6" /></span>
                <div className="flex-1">
                  <span className="block text-xs uppercase tracking-wider text-slate-500">Lokasi Toko</span>
                  <span className="block font-heading font-bold text-white">SK Bike</span>
                  <span className="block text-sm text-slate-400 mt-1">Baru, Benua Kayong, Ketapang, Kalimantan Barat</span>
                  <span className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><Clock className="h-3.5 w-3.5 text-[#FF2E2E]" /> Sabtu 09.00–17.00 &amp; 19.00–21.00</span>
                </div>
              </div>

              <a
                href="https://maps.app.goo.gl/zCZa9Ljg1gitDEZr7"
                target="_blank" rel="noopener noreferrer"
                data-testid="findus-directions-link"
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#FF2E2E] px-6 py-4 text-sm font-bold uppercase tracking-wide text-white cyan-glow hover:scale-[1.02] transition-transform"
              >
                <Navigation className="h-4 w-4" /> Petunjuk Arah di Google Maps
              </a>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-800 min-h-[340px]">
              <iframe
                title="Lokasi SK Bike"
                data-testid="findus-map"
                src="https://maps.google.com/maps?q=5X27%2BRQ%20Baru%20Ketapang%20Kalimantan%20Barat&z=16&output=embed"
                className="h-full w-full min-h-[340px]"
                style={{ border: 0, filter: "invert(90%) hue-rotate(180deg)" }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800/80 bg-[#111723]">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-10 text-center">
          <img src={skLogo} alt="SK Bike Store" className="mx-auto h-12 w-auto rounded-md" />
          <p className="mt-3 font-heading text-xl font-extrabold text-white">SK <span className="text-[#FF2E2E]">BIKE STORE</span></p>
          <p className="mt-2 text-sm text-slate-400">Hubungi kami via WhatsApp untuk informasi harga & pemesanan.</p>
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-200">
            <MapPin className="h-4 w-4 text-[#FF2E2E]" /> Jl Pawan 1, Ketapang, Kalimantan Barat
          </p>
          <p className="mt-4 text-xs text-slate-600">© 2020 SK BIKE. Semua hak dilindungi.</p>
        </div>
      </footer>

      <WhatsAppPopout number={waNumber} />
    </div>
  );
}
