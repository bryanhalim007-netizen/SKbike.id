import { Link } from "react-router-dom";
import { Bike, ShieldCheck } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 glass border-b border-slate-800/80">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex h-16 sm:h-20 items-center justify-between">
          <Link to="/" data-testid="nav-logo" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FF2E2E] cyan-glow">
              <Bike className="h-6 w-6 text-[#0A0D14]" />
            </div>
            <div className="leading-none">
              <span className="font-heading text-xl font-extrabold tracking-tight text-white">SK BIKE</span>
              <span className="block text-[10px] uppercase tracking-[0.3em] text-[#FF2E2E]">Bike Store</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-9 text-sm font-semibold uppercase tracking-wide text-slate-300">
            <a href="#katalog" data-testid="nav-catalog-link" className="nav-link hover:text-white transition-colors">Katalog</a>
            <a href="#kategori" className="nav-link hover:text-white transition-colors">Kategori</a>
            <a href="#keunggulan" className="nav-link hover:text-white transition-colors">Keunggulan</a>
          </nav>

          <Link
            to="/admin/login"
            data-testid="nav-admin-button"
            className="flex items-center gap-2 rounded-full border border-slate-700 bg-[#161F2E] px-4 py-2 text-sm font-semibold text-white hover:border-[#FF2E2E] hover:text-[#FF2E2E] transition-colors"
          >
            <ShieldCheck className="h-4 w-4" /> Admin Panel
          </Link>
        </div>
      </div>
    </header>
  );
}
