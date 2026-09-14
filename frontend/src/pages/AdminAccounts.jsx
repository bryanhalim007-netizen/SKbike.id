import { useEffect, useState, useCallback } from "react";
import { listAdmins, createAdmin, deleteAdmin, changeAdminPassword, getPins, updatePins } from "../lib/api";
import { toast } from "sonner";
import { UserPlus, Trash2, KeyRound, ShieldCheck, Loader2, X, Mail, Lock, Save } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "../components/ui/alert-dialog";

export default function AdminAccounts() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: "", name: "", password: "" });
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [pwTarget, setPwTarget] = useState(null); // admin object
  const [newPw, setNewPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pins, setPins] = useState({ produk: "", kasir: "" });
  const [savingPins, setSavingPins] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setAdmins(await listAdmins()); }
    catch { toast.error("Gagal memuat daftar admin"); }
    finally { setLoading(false); }
  }, []);

  const loadPins = useCallback(async () => {
    try { setPins(await getPins()); } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); loadPins(); }, [load, loadPins]);

  const savePins = async () => {
    if (!/^\d{4}$/.test(pins.produk) || !/^\d{4}$/.test(pins.kasir)) {
      toast.error("PIN harus 4 angka");
      return;
    }
    setSavingPins(true);
    try {
      const updated = await updatePins({ produk: pins.produk, kasir: pins.kasir });
      setPins(updated);
      toast.success("PIN akses diperbarui");
    } catch (err) {
      toast.error(err?.response?.data?.detail ? String(err.response.data.detail) : "Gagal menyimpan PIN");
    } finally { setSavingPins(false); }
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || form.password.length < 6) { toast.error("Isi email & kata sandi (min. 6 karakter)"); return; }
    setCreating(true);
    try {
      await createAdmin({ email: form.email.trim(), name: form.name.trim() || "Admin", password: form.password });
      toast.success("Admin baru dibuat");
      setForm({ email: "", name: "", password: "" });
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail ? String(err.response.data.detail) : "Gagal membuat admin");
    } finally { setCreating(false); }
  };

  const confirmDelete = async () => {
    const id = deleteTarget?.id;
    setDeleteTarget(null);
    try { await deleteAdmin(id); toast.success("Admin dihapus"); load(); }
    catch (err) { toast.error(err?.response?.data?.detail ? String(err.response.data.detail) : "Gagal menghapus admin"); }
  };

  const submitPassword = async () => {
    if (newPw.length < 6) { toast.error("Kata sandi minimal 6 karakter"); return; }
    setSavingPw(true);
    try {
      await changeAdminPassword(pwTarget.id, newPw);
      toast.success(`Kata sandi ${pwTarget.email} diperbarui`);
      setPwTarget(null); setNewPw("");
    } catch (err) {
      toast.error(err?.response?.data?.detail ? String(err.response.data.detail) : "Gagal mengubah kata sandi");
    } finally { setSavingPw(false); }
  };

  const inputCls = "w-full rounded-lg border border-slate-700 bg-[#0A0D14] px-3 py-2.5 text-sm text-white outline-none focus:border-[#FF2E2E] transition-colors";
  const labelCls = "block text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5";

  return (
    <div data-testid="admin-accounts">
      <div className="mb-6">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-[#FF2E2E]" /> Kelola Admin</h1>
        <p className="mt-1 text-slate-400 text-sm">Buat akun admin baru, ubah kata sandi, atau hapus admin. Khusus admin utama.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Create form */}
        <form onSubmit={submitCreate} className="rounded-2xl border border-slate-800 bg-[#111723] p-5 h-fit">
          <h2 className="font-heading font-bold text-white flex items-center gap-2 mb-4"><UserPlus className="h-5 w-5 text-[#FF2E2E]" /> Admin Baru</h2>
          <div className="space-y-3">
            <div><label className={labelCls}>Email</label><input data-testid="new-admin-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="admin@contoh.com" className={inputCls} /></div>
            <div><label className={labelCls}>Nama</label><input data-testid="new-admin-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama admin" className={inputCls} /></div>
            <div><label className={labelCls}>Kata Sandi</label><input data-testid="new-admin-password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min. 6 karakter" className={inputCls} /></div>
          </div>
          <button data-testid="new-admin-submit" type="submit" disabled={creating} className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-[#FF2E2E] py-3 text-sm font-bold uppercase tracking-wide text-white cyan-glow hover:scale-[1.01] transition-transform disabled:opacity-50">
            {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
            {creating ? "Menyimpan..." : "Buat Admin"}
          </button>
        </form>

        {/* List */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-[#111723] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat...</div>
          ) : (
            <div className="divide-y divide-slate-800/70">
              {admins.map((a) => (
                <div key={a.id} data-testid={`admin-row-${a.id}`} className="flex items-center gap-3 px-4 sm:px-5 py-4 hover:bg-[#161F2E]/50 transition-colors">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF2E2E]/10 border border-[#FF2E2E]/20 text-[#FF2E2E]"><Mail className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white truncate">{a.name}</p>
                      {a.is_super && <span className="rounded-full bg-[#FF2E2E]/15 px-2 py-0.5 text-[10px] font-semibold text-[#FF6B6B]">Admin Utama</span>}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{a.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button data-testid={`admin-change-pw-${a.id}`} onClick={() => { setPwTarget(a); setNewPw(""); }} title="Ubah Kata Sandi" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-400 transition-colors"><KeyRound className="h-4 w-4" /></button>
                    <button data-testid={`admin-delete-${a.id}`} onClick={() => setDeleteTarget(a)} disabled={a.is_super} title={a.is_super ? "Admin utama tidak dapat dihapus" : "Hapus admin"} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-red-500 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-slate-700 disabled:hover:text-slate-300"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PIN akses management */}
      <div className="mt-6 rounded-2xl border border-slate-800 bg-[#111723] p-5">
        <h2 className="font-heading font-bold text-white flex items-center gap-2 mb-1"><Lock className="h-5 w-5 text-[#FF2E2E]" /> PIN Akses Tab</h2>
        <p className="text-xs text-slate-400 mb-4">Atur PIN 4 angka untuk membuka tab Dashboard Produk & Kasir.</p>
        <div className="grid sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className={labelCls}>PIN Dashboard Produk</label>
            <input data-testid="pin-produk-input" inputMode="numeric" maxLength={4} value={pins.produk} onChange={(e) => setPins({ ...pins, produk: e.target.value.replace(/[^0-9]/g, "").slice(0, 4) })} placeholder="4 angka" className={`${inputCls} tracking-[0.4em] font-mono-tech`} />
          </div>
          <div>
            <label className={labelCls}>PIN Kasir</label>
            <input data-testid="pin-kasir-input" inputMode="numeric" maxLength={4} value={pins.kasir} onChange={(e) => setPins({ ...pins, kasir: e.target.value.replace(/[^0-9]/g, "").slice(0, 4) })} placeholder="4 angka" className={`${inputCls} tracking-[0.4em] font-mono-tech`} />
          </div>
          <button data-testid="save-pins-button" onClick={savePins} disabled={savingPins} className="flex items-center justify-center gap-2 rounded-xl bg-[#FF2E2E] py-2.5 text-sm font-bold uppercase tracking-wide text-white cyan-glow hover:scale-[1.01] transition-transform disabled:opacity-50">
            {savingPins ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            {savingPins ? "Menyimpan..." : "Simpan PIN"}
          </button>
        </div>
      </div>

      {/* Change password modal */}
      {pwTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-sm" onClick={() => setPwTarget(null)}>
          <div data-testid="change-pw-modal" onClick={(e) => e.stopPropagation()} className="relative w-full max-w-sm rounded-2xl border border-slate-700 bg-[#111723] p-6 animate-fade-up">
            <button onClick={() => setPwTarget(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2 mb-1"><KeyRound className="h-5 w-5 text-amber-400" /> Ubah Kata Sandi</h2>
            <p className="text-xs text-slate-500 mb-4 break-all">{pwTarget.email}</p>
            <label className={labelCls}>Kata Sandi Baru</label>
            <input data-testid="change-pw-input" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Min. 6 karakter" className={inputCls} autoFocus />
            <div className="flex gap-2 mt-5">
              <button onClick={() => setPwTarget(null)} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:text-white transition-colors">Batal</button>
              <button data-testid="change-pw-submit" onClick={submitPassword} disabled={savingPw} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#FF2E2E] py-2.5 text-sm font-bold text-white hover:brightness-110 transition disabled:opacity-50">
                {savingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[#111723] border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Hapus admin ini?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Akun <span className="text-white font-semibold">{deleteTarget?.email}</span> akan dihapus permanen dan tidak bisa login lagi.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800">Batal</AlertDialogCancel>
            <AlertDialogAction data-testid="admin-confirm-delete" onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
