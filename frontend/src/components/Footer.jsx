import { MapPin } from "lucide-react";
import skLogo from "../assets/sk-logo.png";

export function Footer() {
  return (
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
  );
}
