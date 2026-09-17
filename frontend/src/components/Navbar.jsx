import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { ShieldCheck, Menu, X, ShoppingCart } from "lucide-react";
import skLogo from "../assets/sk-logo.png";
import { useCart } from "../context/CartContext";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { totalItems, setOpen: setCartOpen } = useCart();

  const linkClass = ({ isActive }) =>
    `nav-link transition-colors ${isActive ? "text-[#FF2E2E]" : "text-slate-300 hover:text-white"}`;

  return (
    <header className="sticky top-0 z-40 glass border-b border-slate-800/80">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex h-16 sm:h-20 items-center justify-between">
          <Link
            to="/"
            data-testid="nav-logo"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 group"
          >
            <img src={skLogo} alt="SK Bike Store" className="h-9 sm:h-11 w-auto rounded-md" />
            <span className="flex flex-col leading-none">
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#FF2E2E]">Bike Store</span>
              <span className="text-[9px] uppercase tracking-[0.25em] text-slate-400">Since 2020</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-9 text-sm font-semibold uppercase tracking-wide">
            <NavLink to="/" end data-testid="nav-home-link" className={linkClass}>Beranda</NavLink>
            <NavLink to="/katalog" data-testid="nav-catalog-link" className={linkClass}>Katalog</NavLink>
            <NavLink to="/find-us" data-testid="nav-findus-link" className={linkClass}>Find Us</NavLink>
            <NavLink
              to="/promo"
              data-testid="nav-promo-link"
              className={({ isActive }) => `nav-link beep flex items-center gap-2 ${isActive ? "text-white" : "text-[#FF2E2E]"} hover:text-white transition-colors`}
            >
              <span className="beep-dot h-2 w-2 rounded-full bg-[#FF2E2E]" />
              Promo
            </NavLink>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="nav-cart-button"
              onClick={() => setCartOpen(true)}
              aria-label="Buka keranjang"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-[#161F2E] text-white hover:border-[#FF2E2E] hover:text-[#FF2E2E] transition-colors"
            >
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span
                  data-testid="nav-cart-badge"
                  className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#FF2E2E] px-1 text-[11px] font-bold text-white shadow"
                >
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </button>
            <Link
              to="/admin/login"
              data-testid="nav-admin-button"
              className="flex items-center gap-2 rounded-full border border-slate-700 bg-[#161F2E] px-4 py-2 text-sm font-semibold text-white hover:border-[#FF2E2E] hover:text-[#FF2E2E] transition-colors"
            >
              <ShieldCheck className="h-4 w-4" /> <span className="hidden sm:inline">Admin Panel</span><span className="sm:hidden">Admin</span>
            </Link>
            <button
              type="button"
              data-testid="nav-mobile-toggle"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-[#161F2E] text-white hover:border-[#FF2E2E] transition-colors"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menu Mobile */}
      {open && (
        <nav data-testid="nav-mobile-menu" className="md:hidden border-t border-slate-800/80 bg-[#0B0E16] px-5 py-4 flex flex-col gap-1 text-sm font-semibold uppercase tracking-wide">
          <NavLink to="/" end onClick={() => setOpen(false)} className={({ isActive }) => `py-3 border-b border-slate-800/60 ${isActive ? "text-[#FF2E2E]" : "text-slate-300"}`}>Beranda</NavLink>
          <NavLink to="/katalog" onClick={() => setOpen(false)} className={({ isActive }) => `py-3 border-b border-slate-800/60 ${isActive ? "text-[#FF2E2E]" : "text-slate-300"}`}>Katalog</NavLink>
          <NavLink to="/find-us" onClick={() => setOpen(false)} className={({ isActive }) => `py-3 border-b border-slate-800/60 ${isActive ? "text-[#FF2E2E]" : "text-slate-300"}`}>Find Us</NavLink>
          <NavLink
            to="/promo"
            onClick={() => setOpen(false)}
            data-testid="nav-promo-link-mobile"
            className="py-3 flex items-center gap-2 text-[#FF2E2E]"
          >
            <span className="beep-dot h-2 w-2 rounded-full bg-[#FF2E2E]" /> Promo
          </NavLink>
        </nav>
      )}
    </header>
  );
}
