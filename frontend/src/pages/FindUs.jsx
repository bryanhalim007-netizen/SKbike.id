import { useOutletContext } from "react-router-dom";
import { MapPin, Clock, Instagram, MessageCircle, Navigation } from "lucide-react";

export default function FindUs() {
  const { waNumber } = useOutletContext();

  return (
    <section className="bg-[#0B0E16] min-h-[70vh]">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-12 sm:py-16">
        <div className="mb-10">
          <span className="flex items-center gap-2 text-xs font-mono-tech uppercase tracking-widest text-[#FF2E2E]"><span className="h-3 w-1 bg-[#FF2E2E]" /> Kunjungi Kami</span>
          <h1 className="mt-2 font-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white uppercase italic">Find Us</h1>
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
  );
}
