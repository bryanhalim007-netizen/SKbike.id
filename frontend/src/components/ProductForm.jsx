import { useRef, useState, useEffect } from "react";
import Cropper from "react-easy-crop";
import { resolveImage, uploadImage, addProduct, updateProduct, listSuppliers, CATEGORIES } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { X, Upload, Loader2, Crop as CropIcon, ZoomIn, Palette, Plus, Trash2, Ruler, Tag, Factory, ImagePlus } from "lucide-react";
import { toast } from "sonner";

const STATUSES = ["Tersedia", "Stok Terbatas", "Inden"];

// Rasio & resolusi output dikunci sesuai tampilan kartu katalog (aspect-[4/3]).
const CROP_ASPECT = 4 / 3;
const OUT_W = 800;
const OUT_H = 600;

// Warna default yang dapat dipilih admin sebagai simbol warna produk di toko.
const PRESET_COLORS = [
  { name: "Hitam", hex: "#111827" },
  { name: "Putih", hex: "#F8FAFC" },
  { name: "Merah", hex: "#EF4444" },
  { name: "Oranye", hex: "#F97316" },
  { name: "Kuning", hex: "#EAB308" },
  { name: "Hijau", hex: "#22C55E" },
  { name: "Biru", hex: "#3B82F6" },
  { name: "Ungu", hex: "#A855F7" },
  { name: "Abu-abu", hex: "#94A3B8" },
];
const DEFAULT_HEX = "#94A3B8";

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`.toUpperCase();
}

function hexToHue(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
  if (!m) return 0;
  const r = parseInt(m[1], 16) / 255, g = parseInt(m[2], 16) / 255, b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60; if (h < 0) h += 360;
  }
  return Math.round(h);
}

const EMPTY = {
  name: "", code: "", category: CATEGORIES[0], description: "", status: "Tersedia", image_url: "", supplier: "",
  specs: { frame: "", transmisi: "", rem: "", ukuran_roda: "", baterai_motor: "" },
  sizes: [{ label: "Standar", code: "", cost_price: 0, price: 0, colors: [{ color: "Standar", stock: 0, hex: DEFAULT_HEX, image_url: "" }] }],
};

function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (err) => reject(err));
    image.src = url;
  });
}

async function getCroppedBlob(imageSrc, pixelCrop, outW = OUT_W, outH = OUT_H) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, outW, outH
  );
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9));
}

export function ProductForm({ product, onClose, onSaved }) {
  const { user } = useAuth();
  const isSuper = !!user?.is_super;

  // Map any product (nested sizes, legacy variants-only, or new) into the
  // unified nested shape: sizes[] -> each with its own price/code + colors[].
  const initSizes = () => {
    if (product?.sizes?.length) {
      return product.sizes.map((s) => ({
        label: "", code: "", cost_price: 0, price: 0, ...s,
        colors: (s.colors && s.colors.length)
          ? s.colors.map((c) => ({ color: "", stock: 0, hex: DEFAULT_HEX, image_url: "", ...c }))
          : [{ color: "Standar", stock: 0, hex: DEFAULT_HEX, image_url: "" }],
      }));
    }
    if (product?.variants?.length) {
      return [{
        label: "Standar", code: product.code || "", cost_price: product.cost_price || 0, price: product.price || 0,
        colors: product.variants.map((c) => ({ color: "", stock: 0, hex: DEFAULT_HEX, image_url: "", ...c })),
      }];
    }
    return EMPTY.sizes.map((s) => ({ ...s, colors: s.colors.map((c) => ({ ...c })) }));
  };

  const [form, setForm] = useState(product
    ? { ...EMPTY, ...product, specs: { ...EMPTY.specs, ...(product.specs || {}) }, sizes: initSizes() }
    : { ...EMPTY, sizes: initSizes() });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  useEffect(() => { listSuppliers().then(setSuppliers).catch(() => {}); }, []);
  const fileRef = useRef();
  const cropTargetRef = useRef({ type: "main" });

  // Crop state
  const [cropSrc, setCropSrc] = useState(null);
  const [cropTarget, setCropTarget] = useState({ type: "main" });
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setSpec = (k, v) => setForm((f) => ({ ...f, specs: { ...f.specs, [k]: v } }));

  // Nested size + color handlers
  const addSize = () => setForm((f) => ({ ...f, sizes: [...f.sizes, { label: "", code: "", cost_price: 0, price: 0, colors: [{ color: "", stock: 0, hex: "#3B82F6", image_url: "" }] }] }));
  const setSize = (i, k, v) => setForm((f) => ({ ...f, sizes: f.sizes.map((x, idx) => idx === i ? { ...x, [k]: v } : x) }));
  const removeSize = (i) => setForm((f) => ({ ...f, sizes: f.sizes.filter((_, idx) => idx !== i) }));
  const addColor = (si) => setForm((f) => ({ ...f, sizes: f.sizes.map((s, idx) => idx === si ? { ...s, colors: [...(s.colors || []), { color: "", stock: 0, hex: "#3B82F6", image_url: "" }] } : s) }));
  const setColor = (si, ci, k, v) => setForm((f) => ({ ...f, sizes: f.sizes.map((s, idx) => idx === si ? { ...s, colors: s.colors.map((c, cidx) => cidx === ci ? { ...c, [k]: v } : c) } : s) }));
  const removeColor = (si, ci) => setForm((f) => ({ ...f, sizes: f.sizes.map((s, idx) => idx === si ? { ...s, colors: s.colors.filter((_, cidx) => cidx !== ci) } : s) }));

  const sizeStock = (s) => (s.colors || []).reduce((a, c) => a + (Number(c.stock) || 0), 0);
  const totalStock = form.sizes.reduce((t, s) => t + sizeStock(s), 0);
  const minPrice = form.sizes.length ? Math.min(...form.sizes.map((s) => Number(s.price) || 0)) : 0;
  const rupiah = (n) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");

  const onFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropTarget(cropTargetRef.current);
      setCropSrc(reader.result);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    };
    reader.readAsDataURL(file);
    e.target.value = ""; // izinkan pilih file yang sama lagi
  };

  // Buka pemilih file dengan target: gambar utama atau foto warna tertentu.
  const openFilePicker = (target) => {
    cropTargetRef.current = target;
    fileRef.current?.click();
  };

  const applyCrop = async () => {
    if (!cropSrc || !croppedAreaPixels) return;
    setUploading(true);
    try {
      const blob = await getCroppedBlob(cropSrc, croppedAreaPixels);
      const croppedFile = new File([blob], "product.jpg", { type: "image/jpeg" });
      const url = await uploadImage(croppedFile);
      if (cropTarget?.type === "color") {
        setColor(cropTarget.si, cropTarget.ci, "image_url", url);
        toast.success("Foto warna diunggah");
      } else {
        set("image_url", url);
        toast.success("Gambar diunggah");
      }
      setCropSrc(null);
    } catch {
      toast.error("Gagal mengunggah gambar");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const sizes = (form.sizes || []).map((s) => ({
      label: String(s.label || "").trim(),
      code: String(s.code || "").trim(),
      cost_price: Number(s.cost_price) || 0,
      price: Number(s.price) || 0,
      colors: (s.colors || [])
        .map((c) => ({ color: String(c.color || "").trim(), stock: Number(c.stock) || 0, hex: c.hex || DEFAULT_HEX, image_url: c.image_url || "" }))
        .filter((c) => c.color),
    })).filter((s) => s.label && s.colors.length);
    if (sizes.length === 0) { toast.error("Tambahkan minimal 1 ukuran dengan 1 warna"); return; }
    // Gambar katalog utama: pakai foto warna pertama yang tersedia (tidak ada lagi upload gambar utama terpisah).
    const firstColorPhoto = sizes.flatMap((s) => s.colors).map((c) => c.image_url).find(Boolean) || "";
    const mainImage = form.image_url || firstColorPhoto;
    setSaving(true);
    try {
      const payload = {
        name: form.name, code: form.code, category: form.category, description: form.description,
        status: form.status, image_url: mainImage, supplier: form.supplier, specs: form.specs,
        sizes: isSuper ? sizes : sizes.map(({ cost_price, ...rest }) => rest),
      };
      if (product) {
        await updateProduct(product.id, payload);
        toast.success("Produk diperbarui");
      } else {
        await addProduct(payload);
        toast.success("Produk ditambahkan");
      }
      onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.detail ? String(err.response.data.detail) : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const field = "w-full rounded-lg border border-slate-700 bg-[#0A0D14] px-3 py-2.5 text-sm text-white outline-none focus:border-[#FF2E2E] transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-sm" onClick={onClose}>
      <form
        data-testid="admin-product-form"
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-[#111723] p-6 max-h-[90vh] overflow-y-auto animate-fade-up"
      >
        <button type="button" onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors">
          <X className="h-5 w-5" />
        </button>
        <h2 className="font-heading text-xl font-bold text-white mb-5">{product ? "Edit Sepeda" : "Tambah Sepeda Baru"}</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1.5">Nama Sepeda</label>
            <input data-testid="admin-name-input" required value={form.name} onChange={(e) => set("name", e.target.value)} className={field} />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1.5">Kode Barang</label>
            <input data-testid="admin-code-input" placeholder="cth: MTB-001" value={form.code} onChange={(e) => set("code", e.target.value)} className={field} />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1.5">Kategori</label>
            <select data-testid="admin-category-select" value={form.category} onChange={(e) => set("category", e.target.value)} className={field}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1.5">Status</label>
            <select data-testid="admin-status-select" value={form.status} onChange={(e) => set("status", e.target.value)} className={field}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-400 mb-1.5"><Factory className="h-3.5 w-3.5 text-[#FF7A33]" /> PT / Produsen (Supplier)</label>
            <select data-testid="admin-supplier-select" value={form.supplier || ""} onChange={(e) => set("supplier", e.target.value)} className={field}>
              <option value="">— Pilih Supplier —</option>
              {form.supplier && !suppliers.some((s) => s.nama === form.supplier) && (
                <option value={form.supplier}>{form.supplier} (lama)</option>
              )}
              {suppliers.map((s) => <option key={s.id} value={s.nama}>{s.nama}</option>)}
            </select>
            <p className="mt-1 text-[10px] text-slate-500">Pilih dari daftar supplier di tab <span className="text-slate-400 font-semibold">Pembelian → Supplier</span>. Hanya tampil di panel admin, tidak di katalog publik.</p>
          </div>

          <div className="sm:col-span-2 rounded-xl border border-slate-800 bg-[#0A0D14]/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <label className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#FF7A33]"><Ruler className="h-4 w-4" /> Ukuran, Harga & Warna</label>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span>Mulai <span className="font-bold text-white" data-testid="form-min-price">{rupiah(minPrice)}</span></span>
                <span>Total stok <span className="font-bold text-white" data-testid="variant-total-stock">{totalStock}</span></span>
              </div>
            </div>
            <p className="mb-3 text-[11px] text-slate-500">Tiap ukuran punya kode & harga sendiri, serta daftar warna + stok sendiri (boleh lebih dari 2 warna).</p>

            <div className="space-y-4">
              {form.sizes.map((s, i) => (
                <div key={i} data-testid={`size-row-${i}`} className="rounded-xl border border-slate-700 bg-[#0A0D14]/70 p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Ukuran</label>
                        <input data-testid={`size-label-${i}`} placeholder="cth: M / 26 inci" value={s.label} onChange={(e) => setSize(i, "label", e.target.value)} className={`${field} !py-1.5 !px-2.5 !text-xs`} />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Kode</label>
                        <input data-testid={`size-code-${i}`} placeholder="cth: MTB-M" value={s.code} onChange={(e) => setSize(i, "code", e.target.value)} className={`${field} !py-1.5 !px-2.5 !text-xs`} />
                      </div>
                      {isSuper && (
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Modal (Rp)</label>
                        <input data-testid={`size-cost-${i}`} type="number" min="0" placeholder="0" value={s.cost_price} onChange={(e) => setSize(i, "cost_price", e.target.value)} className={`${field} !py-1.5 !px-2.5 !text-xs`} />
                      </div>
                      )}
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Harga Jual (Rp)</label>
                        <input data-testid={`size-price-${i}`} type="number" min="0" placeholder="0" value={s.price} onChange={(e) => setSize(i, "price", e.target.value)} className={`${field} !py-1.5 !px-2.5 !text-xs`} />
                      </div>
                    </div>
                    <button type="button" data-testid={`size-remove-${i}`} onClick={() => removeSize(i)} disabled={form.sizes.length <= 1} className="mt-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:border-red-500 hover:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>

                  <div className="mt-3 rounded-lg border border-slate-800 bg-[#111723]/60 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#FF2E2E]"><Palette className="h-3.5 w-3.5" /> Warna & Stok</span>
                      <span className="text-[10px] text-slate-500">Stok ukuran ini: <span className="font-bold text-white" data-testid={`size-stock-${i}`}>{sizeStock(s)}</span></span>
                    </div>
                    <div className="space-y-2">
                      {(s.colors || []).map((c, ci) => (
                        <div key={ci} data-testid={`size-${i}-color-${ci}`} className="rounded-lg border border-slate-800 bg-[#0A0D14]/60 p-2.5">
                          <div className="flex items-end gap-2">
                            <div className="relative h-8 w-8 shrink-0">
                              <span data-testid={`size-${i}-color-swatch-${ci}`} className="block h-8 w-8 rounded-lg border border-slate-600" style={{ backgroundColor: c.hex || DEFAULT_HEX }} />
                              <input type="color" aria-label="Pilih warna" data-testid={`size-${i}-color-picker-${ci}`} value={c.hex || DEFAULT_HEX} onChange={(e) => setColor(i, ci, "hex", e.target.value.toUpperCase())} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                            </div>
                            <div className="flex-1">
                              <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Nama Warna</label>
                              <input data-testid={`size-${i}-color-name-${ci}`} placeholder="cth: Merah" value={c.color} onChange={(e) => setColor(i, ci, "color", e.target.value)} className={`${field} !py-1.5 !px-2.5 !text-xs`} />
                            </div>
                            <div className="w-20">
                              <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Stok</label>
                              <input data-testid={`size-${i}-color-stock-${ci}`} type="number" min="0" placeholder="0" value={c.stock} onChange={(e) => setColor(i, ci, "stock", e.target.value)} className={`${field} !py-1.5 !px-2.5 !text-xs`} />
                            </div>
                            <button type="button" data-testid={`size-${i}-color-remove-${ci}`} onClick={() => removeColor(i, ci)} disabled={(s.colors || []).length <= 1} className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:border-red-500 hover:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {PRESET_COLORS.map((pc) => (
                              <button key={pc.hex} type="button" title={pc.name} data-testid={`size-${i}-color-preset-${ci}-${pc.name}`} onClick={() => setColor(i, ci, "hex", pc.hex)} className={`h-4 w-4 rounded-full border transition-transform hover:scale-110 ${(c.hex || "").toUpperCase() === pc.hex.toUpperCase() ? "border-white ring-2 ring-[#FF2E2E]" : "border-slate-600"}`} style={{ backgroundColor: pc.hex }} />
                            ))}
                            <div className="flex flex-1 items-center gap-2 min-w-[140px]">
                              <input type="range" min={0} max={360} step={1} aria-label="Hue" data-testid={`size-${i}-color-hue-${ci}`} value={hexToHue(c.hex || DEFAULT_HEX)} onChange={(e) => setColor(i, ci, "hex", hslToHex(Number(e.target.value), 85, 55))} className="w-full h-2 cursor-pointer appearance-none rounded-full" style={{ background: "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)" }} />
                              <span className="font-mono-tech text-[10px] text-slate-400 shrink-0 w-14 text-right">{(c.hex || DEFAULT_HEX).toUpperCase()}</span>
                            </div>
                          </div>
                          <div className="mt-2.5 flex items-center gap-2.5 border-t border-slate-800/70 pt-2.5">
                            <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md border border-slate-700 bg-[#111723] flex items-center justify-center">
                              {c.image_url ? (
                                <img src={resolveImage(c.image_url)} alt={c.color || "warna"} className="h-full w-full object-cover" data-testid={`size-${i}-color-photo-${ci}`} />
                              ) : (
                                <ImagePlus className="h-4 w-4 text-slate-600" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] uppercase tracking-wider text-slate-500">Foto Warna Ini</p>
                              <p className="text-[10px] text-slate-600">Muncul saat pembeli menekan warna ini di toko.</p>
                            </div>
                            <button type="button" data-testid={`size-${i}-color-upload-${ci}`} onClick={() => openFilePicker({ type: "color", si: i, ci })} disabled={uploading} className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:border-[#FF2E2E] hover:text-[#FF2E2E] transition-colors disabled:opacity-50">
                              <Upload className="h-3 w-3" /> {c.image_url ? "Ganti" : "Unggah"}
                            </button>
                            {c.image_url && (
                              <button type="button" data-testid={`size-${i}-color-photo-remove-${ci}`} onClick={() => setColor(i, ci, "image_url", "")} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:border-red-500 hover:text-red-400 transition-colors"><X className="h-3.5 w-3.5" /></button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button type="button" data-testid={`size-${i}-add-color`} onClick={() => addColor(i)} className="mt-2 flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:border-[#FF2E2E] hover:text-[#FF2E2E] transition-colors"><Plus className="h-3 w-3" /> Tambah Warna</button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" data-testid="size-add" onClick={addSize} className="mt-3 flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-[#FF7A33] hover:text-[#FF7A33] transition-colors"><Plus className="h-3.5 w-3.5" /> Tambah Ukuran</button>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1.5">Deskripsi</label>
            <textarea data-testid="admin-description-input" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} className={field} />
          </div>

          <div className="sm:col-span-2 border-t border-slate-800 pt-4">
            <p className="text-xs uppercase tracking-wider text-[#FF2E2E] mb-3">Spesifikasi</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <input placeholder="Frame" data-testid="admin-spec-frame" value={form.specs.frame} onChange={(e) => setSpec("frame", e.target.value)} className={field} />
              <input placeholder="Transmisi" data-testid="admin-spec-transmisi" value={form.specs.transmisi} onChange={(e) => setSpec("transmisi", e.target.value)} className={field} />
              <input placeholder="Rem" data-testid="admin-spec-rem" value={form.specs.rem} onChange={(e) => setSpec("rem", e.target.value)} className={field} />
              <input placeholder="Ukuran Roda" data-testid="admin-spec-roda" value={form.specs.ukuran_roda} onChange={(e) => setSpec("ukuran_roda", e.target.value)} className={field} />
              <input placeholder="Baterai / Motor (untuk E-Bike)" data-testid="admin-spec-baterai" value={form.specs.baterai_motor} onChange={(e) => setSpec("baterai_motor", e.target.value)} className={`${field} sm:col-span-2`} />
            </div>
          </div>
        </div>

        <input ref={fileRef} type="file" accept="image/*" onChange={onFileSelected} className="hidden" data-testid="admin-image-file-input" />

        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm text-slate-300 hover:text-white transition-colors">Batal</button>
          <button data-testid="admin-save-product-button" type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-[#FF2E2E] px-6 py-2.5 text-sm font-bold text-white hover:brightness-110 transition-[filter] disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>

      {/* Crop Modal */}
      {cropSrc && (
        <div
          data-testid="image-crop-modal"
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0A0D14]/90 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#111723] p-5 animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2"><CropIcon className="h-5 w-5 text-[#FF2E2E]" /> Potong Gambar (4:3)</h3>
              <button type="button" data-testid="crop-cancel-x" onClick={() => setCropSrc(null)} className="text-slate-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative h-72 sm:h-80 w-full overflow-hidden rounded-xl bg-black">
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={CROP_ASPECT}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
                objectFit="contain"
              />
            </div>

            <div className="mt-4 flex items-center gap-3">
              <ZoomIn className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                data-testid="crop-zoom-slider"
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-[#FF2E2E]"
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">Geser & perbesar gambar. Area potong terkunci pada rasio 4:3 agar pas dengan tampilan katalog.</p>

            <div className="mt-5 flex justify-end gap-3">
              <button type="button" data-testid="crop-cancel-btn" onClick={() => setCropSrc(null)} className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm text-slate-300 hover:text-white transition-colors">Batal</button>
              <button
                type="button"
                data-testid="crop-apply-btn"
                onClick={applyCrop}
                disabled={uploading || !croppedAreaPixels}
                className="flex items-center gap-2 rounded-xl bg-[#FF2E2E] px-6 py-2.5 text-sm font-bold text-white hover:brightness-110 transition-[filter] disabled:opacity-60"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CropIcon className="h-4 w-4" />}
                {uploading ? "Mengunggah..." : "Terapkan & Unggah"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
