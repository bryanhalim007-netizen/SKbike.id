import { useEffect, useRef, useState } from "react";
import { api, resolveImage, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { X, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["Sepeda Gunung", "BMX", "Sepeda Anak", "Sepeda Lipat", "Sepeda Listrik"];
const STATUSES = ["Tersedia", "Stok Terbatas", "Inden"];

const EMPTY = {
  name: "", category: "Sepeda Gunung", description: "", price: 0, stock: 0, status: "Tersedia", image_url: "",
  specs: { frame: "", transmisi: "", rem: "", ukuran_roda: "", baterai_motor: "" },
};

export function ProductForm({ product, onClose, onSaved }) {
  const { authHeaders } = useAuth();
  const [form, setForm] = useState(product ? { ...EMPTY, ...product, specs: { ...EMPTY.specs, ...(product.specs || {}) } } : EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setSpec = (k, v) => setForm((f) => ({ ...f, specs: { ...f.specs, [k]: v } }));

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/admin/upload", fd, {
        headers: { ...authHeaders(), "Content-Type": "multipart/form-data" },
      });
      set("image_url", data.image_url);
      toast.success("Gambar diunggah");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Gagal mengunggah gambar");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, price: Number(form.price), stock: Number(form.stock) };
      if (product) {
        await api.put(`/admin/products/${product.id}`, payload, { headers: authHeaders() });
        toast.success("Produk diperbarui");
      } else {
        await api.post("/admin/products", payload, { headers: authHeaders() });
        toast.success("Produk ditambahkan");
      }
      onSaved();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Gagal menyimpan");
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
          <div className="sm:col-span-2">
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1.5">Nama Sepeda</label>
            <input data-testid="admin-name-input" required value={form.name} onChange={(e) => set("name", e.target.value)} className={field} />
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
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1.5">Harga (Rp)</label>
            <input data-testid="admin-price-input" type="number" min="0" value={form.price} onChange={(e) => set("price", e.target.value)} className={field} />
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
              <div className="h-20 w-20 shrink-0 rounded-lg border border-slate-700 bg-[#0A0D14] overflow-hidden flex items-center justify-center">
                {form.image_url ? <img src={resolveImage(form.image_url)} alt="preview" className="h-full w-full object-cover" /> : <span className="text-[10px] text-slate-600">Preview</span>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={upload} className="hidden" data-testid="admin-image-file-input" />
              <button type="button" data-testid="admin-upload-button" onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-[#161F2E] px-4 py-2.5 text-sm text-white hover:border-[#FF2E2E] transition-colors disabled:opacity-60">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Mengunggah..." : "Unggah Gambar"}
              </button>
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
          <button data-testid="admin-save-product-button" type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-[#FF2E2E] px-6 py-2.5 text-sm font-bold text-[#0A0D14] hover:brightness-110 transition-[filter] disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
}
