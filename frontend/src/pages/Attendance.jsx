import { useEffect, useState, useCallback, useMemo } from "react";
import { listEmployees, createEmployee, deleteEmployee, listAttendance, markAttendance } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { UserPlus, Trash2, Loader2, X, ClipboardList, CalendarCheck, Phone, MapPin, Briefcase, User } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "../components/ui/alert-dialog";

const STATUSES = ["Hadir", "Izin", "Sakit", "Alpa"];
const STATUS_STYLE = {
  Hadir: "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40",
  Izin: "bg-amber-500/15 text-amber-400 border-amber-500/40",
  Sakit: "bg-blue-500/15 text-blue-400 border-blue-500/40",
  Alpa: "bg-red-500/15 text-red-400 border-red-500/40",
};
const wibToday = () => {
  const d = new Date(Date.now() + new Date().getTimezoneOffset() * 60000 + 7 * 3600000);
  return d.toISOString().slice(0, 10);
};
const fmtDate = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
};

export default function Attendance() {
  const { user } = useAuth();
  const isSuper = !!user?.is_super;
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nama: "", umur: "", jabatan: "", no_hp: "", alamat: "" });
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [detail, setDetail] = useState(null); // { emp, history, loading }
  const [marking, setMarking] = useState(null); // employee id being marked

  const load = useCallback(async () => {
    setLoading(true);
    try { setEmployees(await listEmployees()); }
    catch { toast.error("Gagal memuat data pegawai"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submitCreate = async (e) => {
    e.preventDefault();
    if (!form.nama.trim()) { toast.error("Nama pegawai wajib diisi"); return; }
    setCreating(true);
    try {
      await createEmployee({
        nama: form.nama.trim(),
        umur: form.umur ? Number(form.umur) : null,
        jabatan: form.jabatan.trim() || null,
        no_hp: form.no_hp.trim() || null,
        alamat: form.alamat.trim() || null,
      });
      toast.success("Pegawai ditambahkan");
      setForm({ nama: "", umur: "", jabatan: "", no_hp: "", alamat: "" });
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail ? String(err.response.data.detail) : "Gagal menambah pegawai");
    } finally { setCreating(false); }
  };

  const confirmDelete = async () => {
    const id = deleteTarget?.id;
    setDeleteTarget(null);
    try { await deleteEmployee(id); toast.success("Pegawai dihapus"); load(); }
    catch (err) { toast.error(err?.response?.data?.detail ? String(err.response.data.detail) : "Gagal menghapus"); }
  };

  const mark = async (emp, status) => {
    setMarking(emp.id);
    try {
      await markAttendance({ employee_id: emp.id, date: wibToday(), status });
      setEmployees((prev) => prev.map((e) => (e.id === emp.id ? { ...e, today_status: status } : e)));
      toast.success(`${emp.nama}: ${status}`);
    } catch (err) {
      toast.error(err?.response?.data?.detail ? String(err.response.data.detail) : "Gagal menyimpan absensi");
    } finally { setMarking(null); }
  };

  const openDetail = async (emp) => {
    setDetail({ emp, history: [], loading: true });
    try { const history = await listAttendance(emp.id); setDetail({ emp, history, loading: false }); }
    catch { setDetail({ emp, history: [], loading: false }); toast.error("Gagal memuat riwayat"); }
  };

  const grouped = useMemo(() => {
    const map = new Map();
    for (const e of employees) {
      const key = e.owner_email || "—";
      if (!map.has(key)) map.set(key, { name: e.owner_name || key, list: [] });
      map.get(key).list.push(e);
    }
    return Array.from(map.entries());
  }, [employees]);

  const inputCls = "w-full rounded-lg border border-slate-700 bg-[#0A0D14] px-3 py-2.5 text-sm text-white outline-none focus:border-[#FF2E2E] transition-colors";
  const labelCls = "block text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5";

  const EmployeeRow = ({ e, readOnly }) => (
    <div data-testid={`employee-row-${e.id}`} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-5 py-4 hover:bg-[#161F2E]/50 transition-colors">
      <button data-testid={`employee-open-${e.id}`} onClick={() => openDetail(e)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF2E2E]/10 border border-[#FF2E2E]/20 text-[#FF2E2E] font-heading font-bold">{(e.nama || "?")[0].toUpperCase()}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate hover:text-[#FF6B6B] transition-colors">{e.nama}</p>
          <p className="text-xs text-slate-500 truncate">{e.jabatan || "Pegawai"}{e.umur ? ` • ${e.umur} th` : ""}</p>
        </div>
      </button>
      <div className="flex items-center gap-2">
        {readOnly ? (
          e.today_status ? <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[e.today_status]}`}>{e.today_status}</span> : <span className="text-xs text-slate-600">Belum absen</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s}
                data-testid={`attendance-mark-${e.id}-${s}`}
                onClick={() => mark(e, s)}
                disabled={marking === e.id}
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${e.today_status === s ? STATUS_STYLE[s] : "border-slate-700 text-slate-400 hover:border-slate-500"}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {!readOnly && (
          <button data-testid={`employee-delete-${e.id}`} onClick={() => setDeleteTarget(e)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-red-500 hover:text-red-400 transition-colors"><Trash2 className="h-4 w-4" /></button>
        )}
      </div>
    </div>
  );

  return (
    <div data-testid="attendance-panel">
      <div className="mb-6">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white flex items-center gap-2"><ClipboardList className="h-6 w-6 text-[#FF2E2E]" /> Absensi Pegawai</h1>
        <p className="mt-1 text-slate-400 text-sm">{isSuper ? "Melihat semua pegawai & absensi dari seluruh admin (hanya-baca)." : `Kelola pegawai Anda & catat kehadiran harian (${fmtDate(wibToday())}).`}</p>
      </div>

      {!isSuper && (
        <form onSubmit={submitCreate} className="mb-6 rounded-2xl border border-slate-800 bg-[#111723] p-5">
          <h2 className="font-heading font-bold text-white flex items-center gap-2 mb-4"><UserPlus className="h-5 w-5 text-[#FF2E2E]" /> Tambah Pegawai</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2"><label className={labelCls}>Nama</label><input data-testid="employee-nama" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Nama pegawai" className={inputCls} /></div>
            <div><label className={labelCls}>Umur</label><input data-testid="employee-umur" inputMode="numeric" value={form.umur} onChange={(e) => setForm({ ...form, umur: e.target.value.replace(/[^0-9]/g, "").slice(0, 3) })} placeholder="Th" className={inputCls} /></div>
            <div><label className={labelCls}>Jabatan</label><input data-testid="employee-jabatan" value={form.jabatan} onChange={(e) => setForm({ ...form, jabatan: e.target.value })} placeholder="cth. Mekanik" className={inputCls} /></div>
            <div><label className={labelCls}>No. HP</label><input data-testid="employee-nohp" value={form.no_hp} onChange={(e) => setForm({ ...form, no_hp: e.target.value })} placeholder="08xx" className={inputCls} /></div>
            <div className="sm:col-span-2 lg:col-span-4"><label className={labelCls}>Alamat</label><input data-testid="employee-alamat" value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} placeholder="Alamat tempat tinggal" className={inputCls} /></div>
            <button data-testid="employee-submit" type="submit" disabled={creating} className="lg:self-end flex items-center justify-center gap-2 rounded-xl bg-[#FF2E2E] py-2.5 px-4 text-sm font-bold uppercase tracking-wide text-white cyan-glow hover:scale-[1.01] transition-transform disabled:opacity-50">
              {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />} Tambah
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat...</div>
      ) : employees.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#111723] py-16 text-center text-slate-500 text-sm">{isSuper ? "Belum ada pegawai dari admin manapun." : "Belum ada pegawai. Tambahkan pegawai pertama Anda."}</div>
      ) : isSuper ? (
        <div className="space-y-6">
          {grouped.map(([email, group]) => (
            <div key={email} data-testid={`attendance-group-${email}`}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FF2E2E]/10 text-[#FF2E2E]"><User className="h-4 w-4" /></span>
                <p className="text-sm font-bold text-white">{group.name}</p>
                <span className="text-xs text-slate-500">{email} • {group.list.length} pegawai</span>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#111723] overflow-hidden divide-y divide-slate-800/70">
                {group.list.map((e) => <EmployeeRow key={e.id} e={e} readOnly />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-[#111723] overflow-hidden divide-y divide-slate-800/70">
          {employees.map((e) => <EmployeeRow key={e.id} e={e} readOnly={false} />)}
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-sm" onClick={() => setDetail(null)}>
          <div data-testid="employee-detail-modal" onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-[#111723] p-6 max-h-[90vh] overflow-y-auto animate-fade-up">
            <button onClick={() => setDetail(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            <div className="flex items-center gap-3 mb-5">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF2E2E]/10 border border-[#FF2E2E]/20 text-[#FF2E2E] font-heading text-2xl font-bold">{(detail.emp.nama || "?")[0].toUpperCase()}</span>
              <div>
                <h2 className="font-heading text-lg font-bold text-white">{detail.emp.nama}</h2>
                <p className="text-xs text-slate-400">{detail.emp.jabatan || "Pegawai"}</p>
              </div>
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#0A0D14] px-4 py-2.5"><User className="h-4 w-4 text-slate-500 shrink-0" /><span className="text-slate-500 w-20">Umur</span><span className="text-white">{detail.emp.umur ? `${detail.emp.umur} tahun` : "-"}</span></div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#0A0D14] px-4 py-2.5"><Briefcase className="h-4 w-4 text-slate-500 shrink-0" /><span className="text-slate-500 w-20">Jabatan</span><span className="text-white">{detail.emp.jabatan || "-"}</span></div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#0A0D14] px-4 py-2.5"><Phone className="h-4 w-4 text-slate-500 shrink-0" /><span className="text-slate-500 w-20">No. HP</span><span className="text-white">{detail.emp.no_hp || "-"}</span></div>
              <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-[#0A0D14] px-4 py-2.5"><MapPin className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" /><span className="text-slate-500 w-20 shrink-0">Alamat</span><span className="text-white">{detail.emp.alamat || "-"}</span></div>
            </div>

            <div className="mt-5">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-2"><CalendarCheck className="h-4 w-4 text-[#FF2E2E]" /> Riwayat Kehadiran</p>
              {detail.loading ? (
                <div className="flex items-center justify-center py-6 text-slate-500"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Memuat...</div>
              ) : detail.history.length === 0 ? (
                <p className="py-6 text-center text-slate-500 text-sm">Belum ada catatan kehadiran.</p>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {detail.history.map((h) => (
                    <div key={h.id || h.date} data-testid={`attendance-history-${h.date}`} className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#0A0D14] px-3 py-2">
                      <span className="text-xs text-slate-300">{fmtDate(h.date)}</span>
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[h.status] || "border-slate-700 text-slate-400"}`}>{h.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[#111723] border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Hapus pegawai ini?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400"><span className="text-white font-semibold">{deleteTarget?.nama}</span> beserta riwayat kehadirannya akan dihapus permanen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800">Batal</AlertDialogCancel>
            <AlertDialogAction data-testid="employee-confirm-delete" onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
