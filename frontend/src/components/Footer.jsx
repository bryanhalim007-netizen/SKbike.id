import { Link } from "react-router-dom";
import { MapPin, MessageCircle, Instagram, Clock, ChevronRight } from "lucide-react";
import skLogo from "../assets/sk-logo.png";

const WA_NUMBER = "628125559681";
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Halo Admin SK Bike, saya ingin bertanya tentang produk.")}`;
const IG_LINK = "https://instagram.com/skbike_ketapang";

const FALLBACK_CATEGORIES = ["Sepeda Gunung", "Sepeda Listrik", "BMX", "Road Bike", "Sepeda Lipat", "Sepeda Anak"];

export function Footer({ categories = [] }) {
  const CATEGORIES = categories.length ? categories.slice(0, 8).map((c) => c.name) : FALLBACK_CATEGORIES;
  return (
    <footer className="relative border-t border-slate-800/80 bg-[#0B0E16] overflow-hidden">
      <div className="absolute inset-0 speed-lines opacity-20 pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3">
              <img src={skLogo} alt="SK Bike Store" className="h-12 w-auto rounded-md" />
              <div className="leading-none">
                <p className="font-heading text-lg font-extrabold text-white italic">SK <span className="text-[#FF2E2E]">BIKE</span></p>
                <p className="text-[9px] uppercase tracking-[0.25em] text-slate-500">Since 2020</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-400 leading-relaxed">Toko sepeda terlengkap di Ketapang. Sepeda gunung, listrik, BMX & lainnya dengan harga terbaik.</p>
            <div className="mt-5 flex items-center gap-3">
              <a href={WA_LINK} target="_blank" rel="noopener noreferrer" data-testid="footer-wa-link" aria-label="WhatsApp" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-[#161F2E] text-[#25D366] hover:border-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors">
                <MessageCircle className="h-5 w-5" />
              </a>
              <a href={IG_LINK} target="_blank" rel="noopener noreferrer" data-testid="footer-ig-link" aria-label="Instagram" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-[#161F2E] text-[#FF2E2E] hover:border-[#FF2E2E] hover:bg-[#FF2E2E] hover:text-white transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Navigasi */}
          <div>
            <p className="font-heading text-sm font-bold uppercase tracking-widest text-white">Navigasi</p>
            <span className="mt-2 block h-0.5 w-8 bg-[#FF2E2E]" />
            <ul className="mt-4 space-y-2.5 text-sm">
              {[{ to: "/", label: "Beranda" }, { to: "/katalog", label: "Katalog" }, { to: "/find-us", label: "Find Us" }].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="group inline-flex items-center gap-1.5 text-slate-400 hover:text-[#FF2E2E] transition-colors">
                    <ChevronRight className="h-3.5 w-3.5 text-[#FF2E2E] group-hover:translate-x-0.5 transition-transform" /> {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Kategori */}
          <div>
            <p className="font-heading text-sm font-bold uppercase tracking-widest text-white">Kategori</p>
            <span className="mt-2 block h-0.5 w-8 bg-[#FF2E2E]" />
            <ul className="mt-4 space-y-2.5 text-sm">
              {CATEGORIES.map((c) => (
                <li key={c}>
                  <Link to={`/katalog?kategori=${encodeURIComponent(c)}`} className="group inline-flex items-center gap-1.5 text-slate-400 hover:text-[#FF2E2E] transition-colors">
                    <ChevronRight className="h-3.5 w-3.5 text-[#FF2E2E] group-hover:translate-x-0.5 transition-transform" /> {c}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Kontak */}
          <div>
            <p className="font-heading text-sm font-bold uppercase tracking-widest text-white">Kunjungi Kami</p>
            <span className="mt-2 block h-0.5 w-8 bg-[#FF2E2E]" />
            <ul className="mt-4 space-y-3.5 text-sm">
              <li className="flex items-start gap-2.5 text-slate-400">
                <MapPin className="h-4 w-4 shrink-0 text-[#FF2E2E] mt-0.5" /> Jl Pawan 1, Ketapang, Kalimantan Barat
              </li>
              <li className="flex items-start gap-2.5 text-slate-400">
                <MessageCircle className="h-4 w-4 shrink-0 text-[#25D366] mt-0.5" /> +62 812-5555-9681
              </li>
              <li className="flex items-start gap-2.5 text-slate-400">
                <Clock className="h-4 w-4 shrink-0 text-[#FF2E2E] mt-0.5" /> Setiap hari, 08.00 - 21.00 WIB
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800/80 pt-6">
          <p className="text-xs text-slate-600">© 2020 SK BIKE STORE. Semua hak dilindungi.</p>
          <p className="text-xs text-slate-600">Dibuat dengan semangat bersepeda di Ketapang</p>
        </div>
      </div>
    </footer>
  );
}
