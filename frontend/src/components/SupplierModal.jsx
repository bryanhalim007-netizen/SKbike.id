import { useState } from "react";
import { createSupplier, updateSupplier } from "../lib/api";
import { toast } from "sonner";
import { Building2, X, Loader2, Save } from "lucide-react";

const fld = "w-full rounded-lg border border-slate-700 bg-[#0A0D14] px-3 py-2.5 text-sm text-white outline-none focus:border-[#FF2E2E] transition-colors";
const lbl = "block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5";

export function SupplierModal({ supplier, onClose, onSaved }) {
  const isEdit = !!supplier?.id;
  const [form, setForm] = useState({ nama: supplier?.nama || "", telepon: supplier?.telepon || "", alamat: supplier?.alamat || "", catatan: supplier?.catatan || "" });
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!form.nama.trim()) { toast.error("Nama supplier wajib diisi"); return; }
    setSaving(true);
    try {
      if (isEdit) { await updateSupplier(supplier.id, form); toast.success("Supplier diperbarui"); }
      else { await createSupplier(form); toast.success("Supplier ditambahkan"); }
      onSaved();
    } catch (e) { toast.error(e?.response?.data?.detail ? String(e.response.data.detail) : "Gagal menyimpan"); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-sm" onClick={() => !saving && onClose()}>
      <div data-testid="supplier-modal" onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-[#111723] p-6 animate-fade-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
        <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2 mb-5"><Building2 className="h-5 w-5 text-[#FF2E2E]" /> {isEdit ? "Edit Supplier" : "Tambah Supplier"}</h2>
        <div className="space-y-3">
          <div><label className={lbl}>Nama Supplier</label><input data-testid="supplier-nama" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="cth. PT Sepeda Jaya" className={fld} /></div>
          <div><label className={lbl}>Telepon</label><input data-testid="supplier-telepon" value={form.telepon} onChange={(e) => setForm({ ...form, telepon: e.target.value })} placeholder="08xxxx" className={fld} /></div>
          <div><label className={lbl}>Alamat</label><input data-testid="supplier-alamat" value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} placeholder="Alamat / kota" className={fld} /></div>
          <div><label className={lbl}>Catatan</label><input data-testid="supplier-catatan" value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} placeholder="cth. spesialis sparepart" className={fld} /></div>
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors">Batal</button>
          <button data-testid="supplier-save" onClick={submit} disabled={saving} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#FF2E2E] py-2.5 text-sm font-bold text-white hover:scale-[1.01] transition-transform disabled:opacity-50">
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
