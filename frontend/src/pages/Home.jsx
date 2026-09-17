import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { getProducts, resolveImage } from "../lib/api";
import { ProductCard } from "../components/ProductCard";
import { Zap, ShieldCheck, Wrench, Truck, ChevronRight, ArrowRight, Star, MessageCircle, MapPin } from "lucide-react";

const HERO_IMG = "https://images.unsplash.com/photo-1535369643553-a33e0d1ac81d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NjZ8MHwxfHNlYXJjaHw0fHxtb3VudGFpbiUyMGJpa2UlMjBiaWN5Y2xlJTIwYWN0aW9uJTIwY3ljbGluZ3xlbnwwfHx8fDE3ODkxOTYxMjJ8MA&ixlib=rb-4.1.0&q=85";

const HERO_STATS = [
  { value: "8", label: "Kategori", plus: true },
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

export default function Home() {
  const { waNumber, categories = [] } = useOutletContext();
  const tiles = categories.filter((c) => c.show_on_home);
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    getProducts({ sort: "newest" })
      .then((list) => {
        const all = list || [];
        const feat = all.filter((p) => p.featured);
        setFeatured((feat.length ? feat : all).slice(0, 8));
      })
      .catch(() => setFeatured([]));
  }, []);

  const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent("Halo Admin SK Bike, saya ingin bertanya tentang produk sepeda yang tersedia.")}`;

  return (
    <>
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
              <span className="text-white">Toko Sepeda Ketapang</span><br /><span className="text-[#FF2E2E]">Siap Antar Kabupaten Ketapang, Kalimantan Barat</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed">
              Koleksi lengkap sepeda gunung, BMX, sepeda anak, sepeda lipat, dan sepeda listrik pilihan. Hubungi admin kami langsung via WhatsApp untuk info stok & harga terbaik.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/katalog" className="ripple-soft group inline-flex items-center gap-2 skew-tag bg-[#FF2E2E] px-8 py-4 text-sm font-bold uppercase tracking-wide text-white cyan-glow hover:scale-105 transition-transform">
                Jelajahi Katalog <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href={waLink} target="_blank" rel="noopener noreferrer" data-testid="hero-wa-link" className="group inline-flex items-center gap-2 rounded-full border border-[#25D366]/50 bg-[#25D366]/10 px-6 py-4 text-sm font-bold uppercase tracking-wide text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors">
                <MessageCircle className="h-4 w-4" /> Chat Admin
              </a>
            </div>

            <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-slate-800 bg-[#0B0E16]/70 px-4 py-2 backdrop-blur-sm">
              <span className="flex">
                {[0, 1, 2, 3, 4].map((i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
              </span>
              <span className="text-xs text-slate-300"><span className="font-bold text-white">4.9/5</span> dari 1000+ rider puas</span>
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

      {/* Belanja per Kategori */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 py-16">
        <div className="mb-10 text-center sm:text-left">
          <span className="flex items-center justify-center sm:justify-start gap-2 text-xs font-mono-tech uppercase tracking-widest text-[#FF2E2E]"><span className="h-3 w-1 bg-[#FF2E2E]" /> Temukan Sepedamu</span>
          <h2 className="mt-2 font-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white uppercase italic">Belanja per Kategori</h2>
          <p className="mt-2 text-slate-400">Pilih kategori favoritmu dan lihat koleksi lengkapnya.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
          {tiles.map((c, i) => (
            <Link
              key={c.name}
              to={`/katalog?kategori=${encodeURIComponent(c.name)}`}
              data-testid={`home-category-tile-${c.name.toLowerCase().replace(/\s+/g, "-")}`}
              className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-[#161F2E] card-hover animate-fade-up"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                {c.image_url ? (
                  <img src={resolveImage(c.image_url)} alt={c.name} loading="lazy" className="h-full w-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" />
                ) : (
                  <div className="h-full w-full speed-lines bg-[#161F2E] flex items-center justify-center"><span className="font-heading text-4xl font-black italic uppercase text-slate-700/60 group-hover:text-[#FF2E2E]/40 transition-colors">{c.name.slice(0, 2)}</span></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0D14] via-[#0A0D14]/40 to-transparent" />
                {c.tag && <span className="absolute top-0 left-0 skew-tag bg-[#FF2E2E] pl-5 pr-4 py-1 text-[10px] font-mono-tech font-bold uppercase tracking-wider text-white">{c.tag}</span>}
                <span className="absolute bottom-0 left-0 h-1 w-2/3 bg-gradient-to-r from-[#FF2E2E] to-transparent" />
              </div>
              <div className="flex items-center justify-between p-4">
                <h3 className="font-heading text-base sm:text-lg font-bold text-white uppercase italic group-hover:text-[#FF2E2E] transition-colors">{c.name}</h3>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-700 text-slate-300 group-hover:border-[#FF2E2E] group-hover:text-[#FF2E2E] group-hover:translate-x-1 transition-all">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 sm:px-8 pb-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="flex items-center gap-2 text-xs font-mono-tech uppercase tracking-widest text-[#FF2E2E]"><span className="h-3 w-1 bg-[#FF2E2E]" /> Koleksi Terbaru</span>
              <h2 className="mt-2 font-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white uppercase italic">Produk Unggulan</h2>
              <p className="mt-2 text-slate-400">Beberapa sepeda pilihan terbaru dari SK Bike.</p>
            </div>
            <Link
              to="/katalog"
              data-testid="home-view-catalog-link"
              className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-700 bg-[#161F2E] px-6 py-3 text-sm font-semibold text-white hover:border-[#FF2E2E] hover:text-[#FF2E2E] transition-colors"
            >
              Lihat Katalog Lengkap <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {featured.map((p, i) => (
              <ProductCard key={p.id} product={p} waNumber={waNumber} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* WhatsApp CTA Band */}
      <section className="border-t border-slate-800/80">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-14">
          <div className="relative overflow-hidden rounded-3xl border border-[#FF2E2E]/30 bg-gradient-to-br from-[#161F2E] to-[#0B0E16] p-8 sm:p-12">
            <div className="absolute inset-0 speed-lines opacity-30" />
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#FF2E2E]/10 blur-3xl" />
            <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="max-w-xl">
                <span className="flex items-center gap-2 text-xs font-mono-tech uppercase tracking-widest text-[#FF2E2E]"><MapPin className="h-4 w-4" /> Ketapang, Kalimantan Barat</span>
                <h2 className="mt-3 font-heading text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white uppercase italic">Butuh Bantuan Memilih Sepeda?</h2>
                <p className="mt-3 text-slate-400">Tim SK Bike siap membantu memilih sepeda yang tepat sesuai kebutuhan & budget kamu. Konsultasi gratis via WhatsApp!</p>
              </div>
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="cta-wa-link"
                className="group inline-flex shrink-0 items-center gap-3 rounded-full bg-[#25D366] px-8 py-4 text-sm font-bold uppercase tracking-wide text-white wa-glow hover:scale-105 transition-transform"
              >
                <MessageCircle className="h-5 w-5" /> Chat Admin Sekarang <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
