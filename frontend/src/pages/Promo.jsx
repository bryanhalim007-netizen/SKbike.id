import { useOutletContext } from "react-router-dom";
import { Instagram, Star, MessageCircle, Gift, CheckCircle2, Percent, ExternalLink, ChevronRight } from "lucide-react";

const IG_LINK = "https://www.instagram.com/skbike_ketapang/";
const GOOGLE_REVIEW_LINK = "https://www.google.com/search?q=skbike+ketapang&ie=UTF-8&oe=UTF-8&hl=id-id&client=safari&sei=9rarar6JB-ac4-EP0PrTyQ8&dlnr=1#";

const rupiah = (n) => "Rp " + new Intl.NumberFormat("id-ID").format(n);

const PROMOS = [
  {
    key: "instagram",
    icon: Instagram,
    tag: "Follow Instagram",
    title: "Follow Instagram Kami",
    reward: 25000,
    desc: "Follow akun Instagram resmi SK Bike @skbike_ketapang dan dapatkan potongan harga.",
    action: "Buka Instagram",
    link: IG_LINK,
    accent: "#E1306C",
  },
  {
    key: "google",
    icon: Star,
    tag: "Rating 5 Bintang",
    title: "Beri Rating 5 Bintang di Google",
    reward: 25000,
    desc: "Beri kami ulasan bintang 5 di Google Maps / Google Search dan nikmati potongan tambahan.",
    action: "Beri Rating di Google",
    link: GOOGLE_REVIEW_LINK,
    accent: "#F59E0B",
  },
];

const TERMS = [
  "Potongan berlaku untuk pembelian di SK Bike Store Ketapang.",
  "Maksimal total potongan Rp 50.000 per akun WhatsApp (kedua promo digabung).",
  "Setiap promo hanya dapat diklaim 1 kali per akun WhatsApp.",
  "Wajib menunjukkan bukti (follow / rating) saat konfirmasi ke Admin.",
  "Setelah menyelesaikan tugas, konfirmasi ke Admin melalui WhatsApp untuk mengaktifkan potongan.",
  "SK Bike berhak mengubah atau menghentikan promo sewaktu-waktu. Syarat & Ketentuan Berlaku.",
];

export default function Promo() {
  const { waNumber } = useOutletContext();

  const confirmLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(
    "Halo Admin SK Bike! Saya sudah menyelesaikan tugas promo:\n- [ ] Follow Instagram @skbike_ketapang (potongan Rp 25.000)\n- [ ] Rating 5 bintang di Google (potongan Rp 25.000)\n\nMohon aktifkan potongan harga saya. Terima kasih!"
  )}`;

  return (
    <section className="mx-auto max-w-6xl px-5 sm:px-8 py-10 sm:py-16" data-testid="promo-page">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-[#FF2E2E]/30 bg-gradient-to-br from-[#161F2E] to-[#0B0E16] p-8 sm:p-12">
        <div className="absolute inset-0 speed-lines opacity-30" />
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#FF2E2E]/10 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 skew-tag bg-[#FF2E2E] px-6 py-2 text-xs font-mono-tech font-bold uppercase tracking-widest text-white">
            <Gift className="h-4 w-4" /> Promo Spesial
          </span>
          <h1 className="mt-5 font-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white uppercase italic leading-[1.05]">
            Hemat hingga <span className="text-[#FF2E2E]">{rupiah(50000)}</span>
          </h1>
          <p className="mt-3 max-w-xl text-slate-300">
            Selesaikan tugas sederhana di bawah ini dan dapatkan potongan harga untuk pembelian sepeda impianmu di SK Bike.
          </p>
        </div>
      </div>

      {/* Promo cards */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
        {PROMOS.map((p, i) => (
          <div
            key={p.key}
            data-testid={`promo-card-${p.key}`}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#111723] p-6 card-hover animate-fade-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border" style={{ borderColor: `${p.accent}55`, backgroundColor: `${p.accent}1a`, color: p.accent }}>
                <p.icon className="h-6 w-6" />
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-[#10B981]/40 bg-[#10B981]/10 px-3 py-1.5 text-sm font-bold text-[#10B981]">
                <Percent className="h-4 w-4" /> Potongan {rupiah(p.reward)}
              </span>
            </div>
            <p className="mt-5 text-[11px] font-mono-tech uppercase tracking-widest text-[#FF2E2E]">{p.tag}</p>
            <h2 className="mt-1 font-heading text-xl font-black text-white uppercase italic">{p.title}</h2>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed flex-1">{p.desc}</p>
            <a
              href={p.link}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`promo-action-${p.key}`}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-[#161F2E] px-5 py-3 text-sm font-bold text-white hover:border-[#FF2E2E] hover:text-[#FF2E2E] transition-colors"
            >
              {p.action} <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        ))}
      </div>

      {/* Steps */}
      <div className="mt-8 rounded-2xl border border-slate-800 bg-[#111723] p-6">
        <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-[#10B981]" /> Cara Klaim
        </h3>
        <ol className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            "Follow Instagram &/atau beri rating 5 bintang di Google.",
            "Screenshot bukti follow / rating sebagai konfirmasi.",
            "Kirim bukti ke Admin via WhatsApp untuk aktifkan potongan.",
          ].map((s, i) => (
            <li key={i} className="flex gap-3 rounded-xl border border-slate-800 bg-[#0A0D14] p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FF2E2E] font-heading font-black text-white">{i + 1}</span>
              <span className="text-sm text-slate-300">{s}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Confirm CTA */}
      <div className="mt-8 flex flex-col items-center text-center">
        <p className="text-slate-400">Sudah selesai mengerjakan tugas di atas?</p>
        <a
          href={confirmLink}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="promo-confirm-wa"
          className="mt-3 inline-flex items-center gap-3 rounded-full bg-[#25D366] px-8 py-4 text-sm font-bold uppercase tracking-wide text-white wa-glow hover:scale-105 transition-transform"
        >
          <MessageCircle className="h-5 w-5" /> Konfirmasi ke Admin via WhatsApp <ChevronRight className="h-4 w-4" />
        </a>
      </div>

      {/* Terms */}
      <div className="mt-10 rounded-2xl border border-slate-800 bg-[#0B0E16] p-6" data-testid="promo-terms">
        <h3 className="font-heading text-sm font-bold uppercase tracking-widest text-white">Syarat &amp; Ketentuan</h3>
        <span className="mt-2 block h-0.5 w-10 bg-[#FF2E2E]" />
        <ul className="mt-4 space-y-2.5">
          {TERMS.map((t, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-slate-400">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF2E2E]" />
              {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
