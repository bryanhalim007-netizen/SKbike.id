import { useEffect, useState, useCallback, useRef } from "react";
import { listCategoriesAdmin, createCategory, updateCategory, deleteCategory, reorderCategories, uploadImage, resolveImage } from "../lib/api";
import { toast } from "sonner";
import { Tags, Plus, Pencil, Archive, ArchiveRestore, Trash2, Loader2, X, Save, Eye, EyeOff, ImagePlus, GripVertical, ImageOff } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "./ui/alert-dialog";

const fld = "w-full rounded-lg border border-slate-700 bg-[#0A0D14] px-3 py-2.5 text-sm text-white outline-none focus:border-[#FF2E2E] transition-colors";
const lbl = "block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5";

function CategoryModal({ category, onClose, onSaved }) {
  const isEdit = !!category?.id;
  const [form, setForm] = useState({ name: category?.name || "", tag: category?.tag || "", image_url: category?.image_url || "", show_on_home: category?.show_on_home ?? true });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { const url = await uploadImage(file); setForm((f) => ({ ...f, image_url: url })); toast.success("Gambar diunggah"); }
    catch { toast.error("Gagal mengunggah gambar"); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const submit = async () => {
    if (!form.name.trim()) { toast.error("Nama kategori wajib diisi"); return; }
    setSaving(true);
    try {
      if (isEdit) { await updateCategory(category.id, form); toast.success("Kategori diperbarui"); }
      else { await createCategory(form); toast.success("Kategori ditambahkan"); }
      onSaved();
    } catch (e) { toast.error(e?.response?.data?.detail ? String(e.response.data.detail) : "Gagal menyimpan kategori"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-sm" onClick={() => !saving && onClose()}>
      <div data-testid="category-modal" onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-[#111723] p-6 animate-fade-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
        <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2 mb-5"><Tags className="h-5 w-5 text-[#FF2E2E]" /> {isEdit ? "Edit Kategori" : "Kategori Baru"}</h2>
        <div className="space-y-3">
          <div><label className={lbl}>Nama Kategori</label><input data-testid="category-name-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="cth. Sepeda Gravel" className={fld} autoFocus /></div>
          <div><label className={lbl}>Label Singkat (tampil di tile toko)</label><input data-testid="category-tag-input" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="cth. Gravel" className={fld} /></div>
          <div>
            <label className={lbl}>Gambar Kategori</label>
            <div className="flex items-center gap-3">
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-slate-700 bg-[#0A0D14] flex items-center justify-center">
                {form.image_url ? <img src={resolveImage(form.image_url)} alt="" className="h-full w-full object-cover" /> : <ImageOff className="h-5 w-5 text-slate-600" />}
              </div>
              <div className="flex-1 space-y-2">
                <input data-testid="category-image-input" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="URL gambar atau unggah" className={fld} />
                <button type="button" data-testid="category-upload-button" onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-[#FF2E2E] hover:text-[#FF2E2E] transition-colors disabled:opacity-50">
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />} Unggah Gambar
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
              </div>
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-lg border border-slate-700 bg-[#0A0D14] px-3 py-2.5 cursor-pointer">
            <input data-testid="category-show-home-checkbox" type="checkbox" checked={form.show_on_home} onChange={(e) => setForm({ ...form, show_on_home: e.target.checked })} className="h-4 w-4 accent-[#FF2E2E]" />
            <span className="text-sm text-slate-200">Tampilkan sebagai tile di Beranda toko</span>
          </label>
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors">Batal</button>
          <button data-testid="category-save-button" onClick={submit} disabled={saving} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#FF2E2E] py-2.5 text-sm font-bold text-white hover:scale-[1.01] transition-transform disabled:opacity-50">
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

export function CategorySettings() {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const dragIndex = useRef(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setCats(await listCategoriesAdmin()); }
    catch { toast.error("Gagal memuat kategori"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const patch = async (c, updates, okMsg) => {
    setBusyId(c.id);
    try {
      const updated = await updateCategory(c.id, updates);
      setCats((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
      toast.success(okMsg);
    } catch (e) { toast.error(e?.response?.data?.detail ? String(e.response.data.detail) : "Gagal memperbarui kategori"); }
    finally { setBusyId(null); }
  };

  const confirmDelete = async () => {
    const c = deleteTarget;
    setDeleteTarget(null);
    try { await deleteCategory(c.id); toast.success(`Kategori "${c.name}" dihapus`); load(); }
    catch (e) { toast.error(e?.response?.data?.detail ? String(e.response.data.detail) : "Gagal menghapus kategori"); }
  };

  const active = cats.filter((c) => !c.archived);
  const archived = cats.filter((c) => c.archived);

  const onDragStart = (idx) => (e) => { dragIndex.current = idx; e.dataTransfer.effectAllowed = "move"; };
  const onDragOver = (idx) => (e) => {
    e.preventDefault();
    setDragOverIdx(idx);
    const from = dragIndex.current;
    if (from === null || from === idx) return;
    setCats((prev) => {
      const act = prev.filter((c) => !c.archived);
      const [moved] = act.splice(from, 1);
      act.splice(idx, 0, moved);
      return [...act, ...prev.filter((c) => c.archived)];
    });
    dragIndex.current = idx;
  };
  const onDragEnd = () => { dragIndex.current = null; setDragOverIdx(null); };

  const saveOrder = async () => {
    setSavingOrder(true);
    try { await reorderCategories(cats.map((c) => c.id)); toast.success("Urutan kategori disimpan"); }
    catch { toast.error("Gagal menyimpan urutan"); }
    finally { setSavingOrder(false); }
  };

  const Row = ({ c, idx }) => (
    <div
      data-testid={`category-row-${c.id}`}
      draggable={!c.archived}
      onDragStart={c.archived ? undefined : onDragStart(idx)}
      onDragOver={c.archived ? undefined : onDragOver(idx)}
      onDragEnd={onDragEnd}
      onDrop={onDragEnd}
      className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${dragOverIdx === idx && !c.archived ? "bg-[#FF2E2E]/10" : "hover:bg-[#161F2E]/50"} ${c.archived ? "opacity-60" : ""}`}
    >
      {!c.archived && <span title="Seret untuk menata urutan" className="flex h-8 w-6 shrink-0 cursor-grab items-center justify-center text-slate-500 hover:text-[#FF2E2E] active:cursor-grabbing"><GripVertical className="h-4 w-4" /></span>}
      <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md border border-slate-800 bg-[#0A0D14] flex items-center justify-center">
        {c.image_url ? <img src={resolveImage(c.image_url)} alt={c.name} className="h-full w-full object-cover" /> : <ImageOff className="h-4 w-4 text-slate-600" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white truncate flex items-center gap-2">
          {c.name}
          {c.tag && <span className="rounded bg-[#FF2E2E]/15 px-1.5 py-0.5 text-[10px] font-mono-tech font-bold uppercase text-[#FF6B6B]">{c.tag}</span>}
          {c.archived && <span className="rounded-full bg-slate-600/40 px-2 py-0.5 text-[10px] font-semibold text-slate-300">Diarsipkan</span>}
        </p>
        <p className="text-[11px] text-slate-500">{c.product_count} produk{!c.archived && (c.show_on_home ? " • tampil di Beranda" : " • hanya di Katalog")}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {!c.archived && (
          <button data-testid={`category-toggle-home-${c.id}`} onClick={() => patch(c, { show_on_home: !c.show_on_home }, c.show_on_home ? `"${c.name}" disembunyikan dari Beranda` : `"${c.name}" tampil di Beranda`)} disabled={busyId === c.id} title={c.show_on_home ? "Sembunyikan dari Beranda" : "Tampilkan di Beranda"} className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors disabled:opacity-50 ${c.show_on_home ? "border-[#10B981]/50 bg-[#10B981]/10 text-[#10B981]" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}>
            {busyId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : c.show_on_home ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        )}
        <button data-testid={`category-edit-${c.id}`} onClick={() => setModal(c)} title="Edit kategori" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-[#FF2E2E] hover:text-[#FF2E2E] transition-colors"><Pencil className="h-4 w-4" /></button>
        <button data-testid={`category-archive-${c.id}`} onClick={() => patch(c, { archived: !c.archived }, c.archived ? `"${c.name}" diaktifkan kembali` : `"${c.name}" diarsipkan`)} disabled={busyId === c.id} title={c.archived ? "Aktifkan kembali" : "Arsipkan (sembunyikan dari toko)"} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-400 transition-colors disabled:opacity-50">
          {c.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
        </button>
        {c.archived && (
          <button data-testid={`category-delete-${c.id}`} onClick={() => setDeleteTarget(c)} disabled={c.product_count > 0} title={c.product_count > 0 ? "Masih dipakai produk" : "Hapus permanen"} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-red-500 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><Trash2 className="h-4 w-4" /></button>
        )}
      </div>
    </div>
  );

  return (
    <div data-testid="category-settings-section" className="mt-6 rounded-2xl border border-slate-800 bg-[#111723] p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
        <h2 className="font-heading font-bold text-white flex items-center gap-2"><Tags className="h-5 w-5 text-[#FF2E2E]" /> Kategori Produk</h2>
        <div className="flex items-center gap-2">
          <button data-testid="category-save-order-button" onClick={saveOrder} disabled={savingOrder || loading || active.length === 0} className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-[#FF2E2E] transition-colors disabled:opacity-50">
            {savingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan Urutan
          </button>
          <button data-testid="add-category-button" onClick={() => setModal({})} className="flex items-center gap-2 rounded-xl bg-[#FF2E2E] px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:scale-[1.01] transition-transform"><Plus className="h-4 w-4" /> Kategori Baru</button>
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-4">Buat kategori baru, atur urutan tab kategori di Katalog (seret-lepas), pilih kategori yang tampil sebagai tile di Beranda (ikon mata), atau <span className="text-amber-400 font-semibold">arsipkan</span> kategori agar tersembunyi dari toko & tidak bisa dipilih saat menambah produk.</p>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-slate-500"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat kategori...</div>
      ) : (
        <>
          <div className="rounded-xl border border-slate-800 divide-y divide-slate-800/70">
            {active.length === 0 && <div className="py-8 text-center text-slate-500 text-sm">Belum ada kategori aktif.</div>}
            {active.map((c, idx) => <Row key={c.id} c={c} idx={idx} />)}
          </div>
          {archived.length > 0 && (
            <div className="mt-4">
              <button data-testid="toggle-archived-categories" onClick={() => setShowArchived((v) => !v)} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white transition-colors">
                <Archive className="h-3.5 w-3.5" /> {showArchived ? "Sembunyikan" : "Lihat"} {archived.length} kategori diarsipkan
              </button>
              {showArchived && (
                <div data-testid="archived-categories-list" className="mt-3 rounded-xl border border-dashed border-slate-700 divide-y divide-slate-800/70">
                  {archived.map((c) => <Row key={c.id} c={c} idx={-1} />)}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {modal && <CategoryModal category={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[#111723] border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Hapus kategori ini?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Kategori <span className="text-white font-semibold">{deleteTarget?.name}</span> akan dihapus permanen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800">Batal</AlertDialogCancel>
            <AlertDialogAction data-testid="category-confirm-delete" onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
