import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import skLogo from "../assets/sk-logo.png";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 glass border-b border-slate-800/80">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex h-16 sm:h-20 items-center justify-between">
          <Link
            to="/"
            data-testid="nav-logo"
            onClick={() => {
              if (window.location.hash) {
                window.history.replaceState(null, "", window.location.pathname);
              }
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-2.5 group"
          >
            <img src={skLogo} alt="SK Bike Store" className="h-9 sm:h-11 w-auto rounded-md" />
            <span className="block text-[10px] uppercase tracking-[0.3em] text-[#FF2E2E]">Bike Store</span>
          </Link>

          <nav className="hidden md:flex items-center gap-9 text-sm font-semibold uppercase tracking-wide text-slate-300">
            <a href="#katalog" data-testid="nav-catalog-link" className="nav-link hover:text-white transition-colors">Katalog</a>
            <a href="#find-us" data-testid="nav-findus-link" className="nav-link hover:text-white transition-colors">Find Us</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/admin/login"
              data-testid="nav-admin-button"
              className="flex items-center gap-2 rounded-full border border-slate-700 bg-[#161F2E] px-4 py-2 text-sm font-semibold text-white hover:border-[#FF2E2E] hover:text-[#FF2E2E] transition-colors"
            >
              <ShieldCheck className="h-4 w-4" /> <span className="hidden sm:inline">Admin Panel</span><span className="sm:hidden">Admin</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
