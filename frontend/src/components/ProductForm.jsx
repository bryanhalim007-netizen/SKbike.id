import { useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { resolveImage, uploadImage, addProduct, updateProduct, CATEGORIES } from "../lib/api";
import { X, Upload, Loader2, Crop as CropIcon, ZoomIn } from "lucide-react";
import { toast } from "sonner";

const STATUSES = ["Tersedia", "Stok Terbatas", "Inden"];

// Rasio & resolusi output dikunci sesuai tampilan kartu katalog (aspect-[4/3]).
const CROP_ASPECT = 4 / 3;
const OUT_W = 800;
const OUT_H = 600;

const EMPTY = {
  name: "", code: "", category: CATEGORIES[0], description: "", price: 0, cost_price: 0, stock: 0, status: "Tersedia", image_url: "",
  specs: { frame: "", transmisi: "", rem: "", ukuran_roda: "", baterai_motor: "" },
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
  const [form, setForm] = useState(product ? { ...EMPTY, ...product, specs: { ...EMPTY.specs, ...(product.specs || {}) } } : EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  // Crop state
  const [cropSrc, setCropSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setSpec = (k, v) => setForm((f) => ({ ...f, specs: { ...f.specs, [k]: v } }));

  const onFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    };
    reader.readAsDataURL(file);
    e.target.value = ""; // izinkan pilih file yang sama lagi
  };

  const applyCrop = async () => {
    if (!cropSrc || !croppedAreaPixels) return;
    setUploading(true);
    try {
      const blob = await getCroppedBlob(cropSrc, croppedAreaPixels);
      const croppedFile = new File([blob], "product.jpg", { type: "image/jpeg" });
      const url = await uploadImage(croppedFile);
      set("image_url", url);
      toast.success("Gambar diunggah");
      setCropSrc(null);
    } catch {
      toast.error("Gagal mengunggah gambar");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, price: Number(form.price), cost_price: Number(form.cost_price), stock: Number(form.stock) };
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

          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1.5">Harga Modal (Rp)</label>
            <input data-testid="admin-cost-price-input" type="number" min="0" value={form.cost_price} onChange={(e) => set("cost_price", e.target.value)} className={field} />
            <p className="mt-1 text-[10px] text-slate-500">Harga beli / modal (internal, tidak tampil ke pembeli).</p>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1.5">Harga Jual (Rp)</label>
            <input data-testid="admin-price-input" type="number" min="0" value={form.price} onChange={(e) => set("price", e.target.value)} className={field} />
            <p className="mt-1 text-[10px] text-slate-500">Harga yang ditampilkan di katalog & keranjang.</p>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1.5">Stok</label>
            <input data-testid="admin-stock-input" type="number" min="0" value={form.stock} onChange={(e) => set("stock", e.target.value)} className={field} />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1.5">Deskripsi</label>
            <textarea data-testid="admin-description-input" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} className={field} />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1.5">Gambar Produk</label>
            <div className="flex items-center gap-4">
              <div className="h-[90px] w-[120px] shrink-0 rounded-lg border border-slate-700 bg-[#0A0D14] overflow-hidden flex items-center justify-center">
                {form.image_url ? <img src={resolveImage(form.image_url)} alt="preview" className="h-full w-full object-cover" /> : <span className="text-[10px] text-slate-600">Preview 4:3</span>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={onFileSelected} className="hidden" data-testid="admin-image-file-input" />
              <div>
                <button type="button" data-testid="admin-upload-button" onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-[#161F2E] px-4 py-2.5 text-sm text-white hover:border-[#FF2E2E] transition-colors disabled:opacity-60">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? "Mengunggah..." : "Unggah Gambar"}
                </button>
                <p className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-500"><CropIcon className="h-3 w-3 text-[#FF2E2E]" /> Akan dipotong otomatis rasio 4:3 (800×600) sesuai katalog.</p>
              </div>
            </div>
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
