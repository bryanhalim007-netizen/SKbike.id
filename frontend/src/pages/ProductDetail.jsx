import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useOutletContext, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getProduct, getProducts, resolveImage, BACKEND_URL } from "../lib/api";
import { useSeo } from "../hooks/useSeo";
import { ProductCard } from "../components/ProductCard";
import { useCart } from "../context/CartContext";
import { toast } from "sonner";
import {
  ChevronRight, ArrowLeft, ShoppingCart, MessageCircle, Star, Ruler, Settings2, Cpu, Disc, Box,
  Check, Loader2, PackageX, ShieldCheck, Share2, Link2, Send,
} from "lucide-react";

const STATUS_STYLES = {
  "Tersedia": "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40",
  "Stok Terbatas": "bg-[#FF5500]/15 text-[#FF7A33] border-[#FF5500]/40",
  "Inden": "bg-slate-500/15 text-slate-300 border-slate-500/40",
};

export default function ProductDetail() {
  const { id } = useParams();
  const { waNumber } = useOutletContext();
  const navigate = useNavigate();
  const { addItem, setOpen: setCartOpen } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState("");
  const [selColor, setSelColor] = useState(null);
  const [selSize, setSelSize] = useState(null);
  const [related, setRelated] = useState([]);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setSelColor(null);
    setSelSize(null);
    setRelated([]);
    getProduct(id)
      .then((p) => {
        setProduct(p);
        setActiveImage(p.image_url || "");
        getProducts()
          .then((all) => setRelated((all || []).filter((x) => x.id !== p.id && x.category === p.category).slice(0, 4)))
          .catch(() => setRelated([]));
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const shareUrl = `${BACKEND_URL}/api/share/produk/${id}`;
  useSeo(
    product
      ? {
          title: product.name,
          description: product.description || `${product.name} — ${product.category} tersedia di SK Bike Store Ketapang. Chat admin via WhatsApp untuk info harga & stok.`,
          image: resolveImage(product.image_url),
          url: `${window.location.origin}/produk/${id}`,
          type: "product",
        }
      : {}
  );

  const shareWhatsApp = () => {
    const msg = encodeURIComponent(`Cek sepeda ini dari SK Bike: *${product.name}*\n${shareUrl}`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link produk disalin ke clipboard");
    } catch {
      toast.error("Gagal menyalin link");
    }
  };

  const specs = product?.specs || {};
  const colorVariants = useMemo(
    () => (product?.variants || []).filter((v) => (v.color || "").toLowerCase() !== "standar"),
    [product]
  );
  const hasColors = colorVariants.length > 0;
  const sizes = Array.isArray(product?.sizes) ? product.sizes : [];
  const hasSizes = sizes.length > 0;
  const needsSelection = hasColors || hasSizes;
  const pickerColors = hasSizes ? (selSize?.colors || []) : colorVariants;

  const gallery = useMemo(() => {
    if (!product) return [];
    const seen = new Set();
    const arr = [];
    (product.variants || []).forEach((v) => {
      if (v.image_url && !seen.has(v.image_url)) {
        seen.add(v.image_url);
        arr.push({ key: v.color, label: v.color, url: v.image_url, color: v.color });
      }
    });
    // Foto "Utama" hanya ditambahkan bila belum terwakili oleh salah satu foto warna
    if (product.image_url && !seen.has(product.image_url)) {
      arr.unshift({ key: "main", label: "Utama", url: product.image_url });
    }
    return arr;
  }, [product]);

  const specRows = [
    { icon: Settings2, label: "Frame", value: specs.frame },
    { icon: Cpu, label: "Transmisi", value: specs.transmisi },
    { icon: Disc, label: "Rem", value: specs.rem },
    { icon: Ruler, label: "Ukuran Roda", value: specs.ukuran_roda },
    { icon: Box, label: "Baterai / Motor", value: specs.baterai_motor },
  ].filter((s) => s.value && String(s.value).trim() && s.value !== "-");

  const chooseSize = (s) => {
    setSelSize(s);
    const cols = s.colors || [];
    setSelColor(cols.length === 1 ? cols[0] : null);
  };

  const pickColor = (v) => {
    setSelColor(v);
    if (v.image_url) setActiveImage(v.image_url);
  };

  const canConfirm = hasSizes ? (!!selSize && !!selColor) : (!hasColors || !!selColor);

  const doAddToCart = () => {
    if (needsSelection && !canConfirm) { toast.error(hasSizes && !selSize ? "Pilih ukuran & warna dulu" : "Pilih warna dulu"); return; }
    addItem(product, 1, { color: selColor?.color || null, size: selSize?.label || null, code: selSize?.code || product.code });
    toast.success(`${product.name} ditambahkan ke keranjang`, { action: { label: "Lihat", onClick: () => setCartOpen(true) } });
  };

  const doInquire = () => {
    if (needsSelection && !canConfirm) { toast.error(hasSizes && !selSize ? "Pilih ukuran & warna dulu" : "Pilih warna dulu"); return; }
    const parts = [];
    if (selColor?.color) parts.push(`Warna: ${selColor.color}`);
    if (selSize?.label) parts.push(`Ukuran: ${selSize.label}`);
    const detailStr = parts.length ? `\n${parts.join("\n")}` : "";
    const msg = encodeURIComponent(
      `Halo Admin SK Bike, saya tertarik dengan *${product.name}* (${product.category}).${detailStr}\nMohon info stok, harga & ketersediaan. Terima kasih!`
    );
    window.open(`https://wa.me/${waNumber}?text=${msg}`, "_blank");
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-24 flex items-center justify-center text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat produk...
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-24 text-center">
        <PackageX className="mx-auto h-12 w-12 text-slate-700" />
        <h1 className="mt-4 font-heading text-2xl font-black text-white uppercase italic">Produk tidak ditemukan</h1>
        <p className="mt-2 text-slate-400">Sepeda yang kamu cari mungkin sudah dihapus atau tidak tersedia.</p>
        <Link to="/katalog" data-testid="detail-back-to-catalog" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#FF2E2E] px-6 py-3 text-sm font-bold text-white hover:brightness-110 transition-[filter]">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Katalog
        </Link>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-5 sm:px-8 py-8 sm:py-12" data-testid="product-detail-page">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-6">
        <Link to="/" className="hover:text-[#FF2E2E] transition-colors">Beranda</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to="/katalog" className="hover:text-[#FF2E2E] transition-colors">Katalog</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-slate-300 truncate max-w-[50vw]">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Gallery */}
        <div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-slate-800 bg-[#0A0D14]">
            {activeImage ? (
              <AnimatePresence initial={false} mode="popLayout">
                <motion.img
                  key={activeImage}
                  data-testid="detail-main-image"
                  src={resolveImage(activeImage)}
                  alt={product.name}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </AnimatePresence>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-600"><PackageX className="h-12 w-12" /></div>
            )}
            <span className="absolute top-0 left-0 skew-tag bg-[#FF2E2E] pl-6 pr-5 py-1.5 text-[11px] font-mono-tech font-bold uppercase tracking-wider text-white">{product.category}</span>
            {product.featured && (
              <span className="absolute top-4 right-4 flex items-center gap-1 rounded-full border border-amber-400/60 bg-[#0A0D14]/85 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 backdrop-blur-sm">
                <Star className="h-3 w-3 fill-amber-400" /> Unggulan
              </span>
            )}
            <span className="absolute bottom-0 left-0 h-1.5 w-2/3 bg-gradient-to-r from-[#FF2E2E] to-transparent" />
          </div>

          {gallery.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-3" data-testid="detail-gallery-thumbs">
              {gallery.map((g) => {
                const active = activeImage === g.url;
                return (
                  <button
                    key={g.key}
                    type="button"
                    data-testid={`detail-thumb-${g.key}`}
                    onClick={() => setActiveImage(g.url)}
                    title={g.label}
                    className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-xl border transition-all ${active ? "border-[#FF2E2E] ring-2 ring-[#FF2E2E]" : "border-slate-700 hover:border-[#FF2E2E]/60"}`}
                  >
                    <img src={resolveImage(g.url)} alt={g.label} className="h-full w-full object-cover" />
                    <span className="absolute inset-x-0 bottom-0 bg-[#0A0D14]/70 px-1 py-0.5 text-center text-[8px] font-semibold text-white truncate">{g.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex items-center gap-3">
            <span data-testid="detail-status" className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${STATUS_STYLES[product.status] || STATUS_STYLES["Inden"]}`}>{product.status}</span>
            <span className="flex items-center gap-1 text-xs text-slate-400"><ShieldCheck className="h-4 w-4 text-[#FF2E2E]" /> Agen Resmi SK Bike</span>
          </div>

          <h1 data-testid="detail-product-name" className="mt-4 font-heading text-3xl sm:text-4xl font-black tracking-tight text-white uppercase italic leading-[1.05]">{product.name}</h1>

          <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#FF2E2E]/30 bg-[#FF2E2E]/10 px-4 py-3">
            <MessageCircle className="h-4 w-4 text-[#FF2E2E]" />
            <span className="text-sm text-slate-200">Harga terbaik & promo via <span className="font-bold text-white">WhatsApp</span></span>
          </div>

          {product.description && (
            <p className="mt-5 text-slate-400 leading-relaxed">{product.description}</p>
          )}

          {/* Ukuran */}
          {hasSizes && (
            <div className="mt-6" data-testid="detail-sizes">
              <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">Pilih Ukuran</p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => {
                  const active = selSize?.label === s.label;
                  const sStock = (s.colors || []).reduce((a, c) => a + (Number(c.stock) || 0), 0);
                  const soldout = (s.colors || []).length > 0 && sStock <= 0;
                  return (
                    <button
                      key={s.label}
                      type="button"
                      data-testid={`detail-size-${s.label}`}
                      disabled={soldout}
                      onClick={() => chooseSize(s)}
                      className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition-colors ${soldout ? "border-slate-800 text-slate-600 line-through cursor-not-allowed" : active ? "border-[#FF2E2E] bg-[#FF2E2E]/10 text-white" : "border-slate-700 bg-[#161F2E] text-slate-200 hover:border-[#FF2E2E]/60"}`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Warna */}
          {(hasColors || hasSizes) && (
            <div className="mt-6" data-testid="detail-colors">
              <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">Pilih Warna</p>
              {hasSizes && !selSize ? (
                <p className="rounded-xl border border-dashed border-slate-700 px-3 py-3 text-xs text-slate-500">Pilih ukuran dulu untuk melihat warna yang tersedia.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {pickerColors.map((v) => {
                    const out = (v.stock || 0) <= 0;
                    const active = selColor?.color === v.color;
                    return (
                      <button
                        key={v.color}
                        type="button"
                        data-testid={`detail-color-${v.color}`}
                        disabled={out}
                        onClick={() => pickColor(v)}
                        className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm transition-colors ${out ? "border-slate-800 text-slate-600 line-through cursor-not-allowed" : active ? "border-[#FF2E2E] bg-[#FF2E2E]/10 text-white ring-1 ring-[#FF2E2E]" : "border-slate-700 bg-[#161F2E] text-slate-200 hover:border-[#FF2E2E]/60"}`}
                      >
                        <span className="h-4 w-4 rounded-full border border-white/25 shrink-0" style={{ backgroundColor: v.hex || "#94A3B8" }} />
                        {v.color}
                        {out && <span className="text-[10px]">(habis)</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* CTA */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              data-testid="detail-add-cart"
              onClick={doAddToCart}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#FF2E2E] px-6 py-4 text-sm font-bold uppercase tracking-wide text-white cyan-glow hover:scale-[1.02] transition-transform"
            >
              <ShoppingCart className="h-5 w-5" /> Tambah ke Keranjang
            </button>
            <button
              data-testid="detail-wa-inquire"
              onClick={doInquire}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 py-4 text-sm font-bold uppercase tracking-wide text-white wa-glow hover:scale-[1.02] transition-transform"
            >
              <MessageCircle className="h-5 w-5" /> Tanya via WhatsApp
            </button>
          </div>
          {needsSelection && !canConfirm && (
            <p className="mt-2 text-[11px] text-[#FF7A33] flex items-center gap-1"><Check className="h-3 w-3" /> {hasSizes && !selSize ? "Pilih ukuran & warna untuk melanjutkan." : "Pilih warna untuk melanjutkan."}</p>
          )}

          {/* Bagikan */}
          <div className="mt-5 flex items-center gap-3" data-testid="detail-share">
            <span className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-slate-500"><Share2 className="h-3.5 w-3.5" /> Bagikan</span>
            <button data-testid="detail-share-wa" onClick={shareWhatsApp} title="Bagikan via WhatsApp" className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-[#161F2E] text-[#25D366] hover:border-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors">
              <Send className="h-4 w-4" />
            </button>
            <button data-testid="detail-share-copy" onClick={copyLink} title="Salin link produk" className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-[#161F2E] text-slate-300 hover:border-[#FF2E2E] hover:text-[#FF2E2E] transition-colors">
              <Link2 className="h-4 w-4" />
            </button>
          </div>

          {/* Spesifikasi */}
          {specRows.length > 0 && (
            <div className="mt-8" data-testid="detail-specs">
              <p className="font-heading text-sm font-bold uppercase tracking-widest text-white">Spesifikasi</p>
              <span className="mt-2 block h-0.5 w-10 bg-[#FF2E2E]" />
              <div className="mt-4 rounded-2xl border border-slate-800 bg-[#111723] divide-y divide-slate-800/70 overflow-hidden">
                {specRows.map((s) => (
                  <div key={s.label} className="flex items-center gap-3 px-4 py-3.5">
                    <s.icon className="h-4 w-4 text-[#FF2E2E] shrink-0" />
                    <span className="text-xs uppercase tracking-wider text-slate-500 w-32 shrink-0">{s.label}</span>
                    <span className="text-sm text-slate-200 font-mono-tech">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => navigate("/katalog")} className="mt-8 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-[#FF2E2E] transition-colors">
            <ArrowLeft className="h-4 w-4" /> Lihat sepeda lainnya
          </button>
        </div>
      </div>

      {/* Sepeda Serupa */}
      {related.length > 0 && (
        <div className="mt-16" data-testid="detail-related">
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <span className="flex items-center gap-2 text-xs font-mono-tech uppercase tracking-widest text-[#FF2E2E]"><span className="h-3 w-1 bg-[#FF2E2E]" /> {product.category}</span>
              <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-black tracking-tight text-white uppercase italic">Sepeda Serupa</h2>
            </div>
            <Link to="/katalog" className="hidden sm:inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-700 bg-[#161F2E] px-5 py-2.5 text-sm font-semibold text-white hover:border-[#FF2E2E] hover:text-[#FF2E2E] transition-colors">
              Lihat Semua <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((p, i) => (
              <ProductCard key={p.id} product={p} waNumber={waNumber} index={i} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
