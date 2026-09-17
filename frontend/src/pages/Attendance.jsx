import { useEffect, useState, useCallback, useMemo } from "react";
import { listEmployees, createEmployee, deleteEmployee, updateEmployee, listAttendance, markAttendance, uploadImage, resolveImage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { UserPlus, Trash2, Loader2, X, ClipboardList, CalendarCheck, Phone, MapPin, Briefcase, User, Pencil, Save, Check, Upload, FileText, CalendarDays, ChevronLeft, ChevronRight, CheckCheck, BarChart3, Download } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { BackupControls } from "../components/BackupControls";

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
  const [form, setForm] = useState({ nama: "", umur: "", jabatan: "", no_hp: "", alamat: "", cv_url: "", ktp_url: "", foto_url: "" });
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [detail, setDetail] = useState(null); // { emp, history, loading }
  const [marking, setMarking] = useState(null); // employee id being marked
  const [editTarget, setEditTarget] = useState(null); // employee being edited
  const [editForm, setEditForm] = useState({ nama: "", umur: "", jabatan: "", no_hp: "", alamat: "", cv_url: "", ktp_url: "", foto_url: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploading, setUploading] = useState({}); // testid -> bool
  const [calTarget, setCalTarget] = useState(null); // employee for calendar view
  const [calMonth, setCalMonth] = useState(() => wibToday().slice(0, 7)); // "YYYY-MM"
  const [calData, setCalData] = useState({}); // date -> status
  const [calLoading, setCalLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [recap, setRecap] = useState(null);

  const openCalendar = async (emp) => {
    setCalTarget(emp);
    setCalMonth(wibToday().slice(0, 7));
    setCalLoading(true);
    try {
      const history = await listAttendance(emp.id);
      const map = {};
      for (const h of history) map[h.date] = h.status;
      setCalData(map);
    } catch { toast.error("Gagal memuat absensi"); setCalData({}); }
    finally { setCalLoading(false); }
  };
  const shiftMonth = (delta) => {
    const [y, m] = calMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const handleUpload = async (file, onSet, key) => {
    if (!file) return;
    setUploading((u) => ({ ...u, [key]: true }));
    try { const url = await uploadImage(file); onSet(url); toast.success("Berkas diunggah"); }
    catch { toast.error("Gagal mengunggah berkas"); }
    finally { setUploading((u) => ({ ...u, [key]: false })); }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try { setEmployees(await listEmployees()); }
    catch { toast.error("Gagal memuat data pegawai"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markAllHadir = async () => {
    if (employees.length === 0) return;
    setMarkingAll(true);
    try {
      await Promise.all(employees.map((e) => markAttendance({ employee_id: e.id, date: wibToday(), status: "Hadir" })));
      setEmployees((prev) => prev.map((e) => ({ ...e, today_status: "Hadir" })));
      toast.success("Semua pegawai ditandai Hadir hari ini");
    } catch { toast.error("Sebagian gagal ditandai"); } finally { setMarkingAll(false); }
  };
  const openRecap = async (month) => {
    setRecap({ month, rows: [], loading: true });
    try {
      const rows = await Promise.all(employees.map(async (e) => {
        const hist = await listAttendance(e.id);
        const c = { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 };
        hist.forEach((h) => { if ((h.date || "").startsWith(month) && c[h.status] != null) c[h.status]++; });
        return { nama: e.nama, jabatan: e.jabatan || "", ...c };
      }));
      setRecap({ month, rows, loading: false });
    } catch { setRecap({ month, rows: [], loading: false }); toast.error("Gagal memuat rekap"); }
  };
  const exportRecapCSV = () => {
    if (!recap?.rows?.length) return;
    const head = ["Nama", "Jabatan", "Hadir", "Izin", "Sakit", "Alpa"];
    const rows = recap.rows.map((r) => [r.nama, r.jabatan, r.Hadir, r.Izin, r.Sakit, r.Alpa]);
    const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `rekap-absensi-${recap.month}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    toast.success("Rekap diekspor (CSV)");
  };

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
        cv_url: form.cv_url || null,
        ktp_url: form.ktp_url || null,
        foto_url: form.foto_url || null,
      });
      toast.success("Pegawai ditambahkan");
      setForm({ nama: "", umur: "", jabatan: "", no_hp: "", alamat: "", cv_url: "", ktp_url: "", foto_url: "" });
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

  const openEdit = (emp) => {
    setEditTarget(emp);
    setEditForm({
      nama: emp.nama || "",
      umur: emp.umur != null ? String(emp.umur) : "",
      jabatan: emp.jabatan || "",
      no_hp: emp.no_hp || "",
      alamat: emp.alamat || "",
      cv_url: emp.cv_url || "",
      ktp_url: emp.ktp_url || "",
      foto_url: emp.foto_url || "",
    });
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editForm.nama.trim()) { toast.error("Nama pegawai wajib diisi"); return; }
    setSavingEdit(true);
    try {
      const updated = await updateEmployee(editTarget.id, {
        nama: editForm.nama.trim(),
        umur: editForm.umur ? Number(editForm.umur) : null,
        jabatan: editForm.jabatan.trim() || null,
        no_hp: editForm.no_hp.trim() || null,
        alamat: editForm.alamat.trim() || null,
        cv_url: editForm.cv_url || null,
        ktp_url: editForm.ktp_url || null,
        foto_url: editForm.foto_url || null,
      });
      setEmployees((prev) => prev.map((emp) => (emp.id === updated.id ? { ...emp, ...updated } : emp)));
      setDetail((d) => (d && d.emp.id === updated.id ? { ...d, emp: { ...d.emp, ...updated } } : d));
      toast.success("Data pegawai diperbarui");
      setEditTarget(null);
    } catch (err) {
      toast.error(err?.response?.data?.detail ? String(err.response.data.detail) : "Gagal memperbarui data");
    } finally { setSavingEdit(false); }
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

  const renderUpload = ({ label, value, onSet, testid }) => (
    <div>
      <label className={labelCls}>{label} <span className="normal-case tracking-normal text-slate-600 font-normal">(opsional)</span></label>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-slate-700 bg-[#0A0D14] px-3 py-2.5 text-sm text-slate-300 hover:border-[#FF2E2E] transition-colors">
          {uploading[testid] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          <span>{value ? "Ganti berkas" : "Pilih berkas"}</span>
          <input data-testid={testid} type="file" accept="image/*,.pdf" className="hidden" onChange={(ev) => handleUpload(ev.target.files?.[0], onSet, testid)} />
        </label>
        {value && (
          <a href={resolveImage(value)} target="_blank" rel="noreferrer" data-testid={`${testid}-link`} className="flex items-center gap-1 text-xs font-semibold text-[#10B981] hover:underline"><FileText className="h-4 w-4" /> Lihat</a>
        )}
      </div>
    </div>
  );

  const renderPhotoUpload = ({ value, onSet, testid }) => (
    <div className="flex items-center gap-3">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-slate-700 bg-[#0A0D14] flex items-center justify-center">
        {value ? <img src={resolveImage(value)} alt="Foto profil" className="h-full w-full object-cover" data-testid={`${testid}-preview`} /> : <User className="h-6 w-6 text-slate-600" />}
      </div>
      <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-slate-700 bg-[#0A0D14] px-3 py-2.5 text-sm text-slate-300 hover:border-[#FF2E2E] transition-colors">
        {uploading[testid] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        <span>{value ? "Ganti foto" : "Upload foto"}</span>
        <input data-testid={testid} type="file" accept="image/*" className="hidden" onChange={(ev) => handleUpload(ev.target.files?.[0], onSet, testid)} />
      </label>
      {value && <button type="button" data-testid={`${testid}-remove`} onClick={() => onSet("")} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:border-red-500 hover:text-red-400 transition-colors"><X className="h-4 w-4" /></button>}
    </div>
  );

  const EmployeeRow = ({ e, readOnly }) => (
    <div data-testid={`employee-row-${e.id}`} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-5 py-4 hover:bg-[#161F2E]/50 transition-colors">
      <button data-testid={`employee-open-${e.id}`} onClick={() => openDetail(e)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
        {e.foto_url ? (
          <img src={resolveImage(e.foto_url)} alt={e.nama} data-testid={`employee-avatar-${e.id}`} className="h-10 w-10 shrink-0 rounded-xl object-cover border border-[#FF2E2E]/20" />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF2E2E]/10 border border-[#FF2E2E]/20 text-[#FF2E2E] font-heading font-bold">{(e.nama || "?")[0].toUpperCase()}</span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate hover:text-[#FF6B6B] transition-colors">{e.nama}</p>
          <p className="text-xs text-slate-500 truncate">{e.jabatan || "Pegawai"}{e.umur ? ` • ${e.umur} th` : ""}</p>
        </div>
      </button>
      <div className="flex items-center gap-2">
        {readOnly ? (
          <div className="flex items-center gap-2">
            {e.today_status ? <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[e.today_status]}`}>{e.today_status}</span> : <span className="text-xs text-slate-600">Belum absen</span>}
            <button
              data-testid={`attendance-hadir-${e.id}`}
              onClick={() => mark(e, "Hadir")}
              disabled={marking === e.id}
              title="Tandai Hadir"
              className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors disabled:opacity-50 ${e.today_status === "Hadir" ? "bg-[#10B981]/20 border-[#10B981] text-[#10B981]" : "border-slate-700 text-slate-400 hover:border-[#10B981] hover:text-[#10B981]"}`}
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              data-testid={`attendance-alpa-${e.id}`}
              onClick={() => mark(e, "Alpa")}
              disabled={marking === e.id}
              title="Tandai Alpa"
              className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors disabled:opacity-50 ${e.today_status === "Alpa" ? "bg-red-500/20 border-red-500 text-red-400" : "border-slate-700 text-slate-400 hover:border-red-500 hover:text-red-400"}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
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
        <button data-testid={`employee-calendar-${e.id}`} onClick={() => openCalendar(e)} title="Cek Absensi" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-[#10B981] hover:text-[#10B981] transition-colors"><CalendarDays className="h-4 w-4" /></button>
        <button data-testid={`employee-edit-${e.id}`} onClick={() => openEdit(e)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-[#FF2E2E] hover:text-[#FF2E2E] transition-colors"><Pencil className="h-4 w-4" /></button>
        <button data-testid={`employee-delete-${e.id}`} onClick={() => setDeleteTarget(e)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-red-500 hover:text-red-400 transition-colors"><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  );

  return (
    <div data-testid="attendance-panel">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white flex items-center gap-2"><ClipboardList className="h-6 w-6 text-[#FF2E2E]" /> Absensi Pegawai</h1>
          <p className="mt-1 text-slate-400 text-sm">{isSuper ? `Kelola semua pegawai dari seluruh admin: tambah, edit, & catat kehadiran (${fmtDate(wibToday())}).` : `Kelola pegawai Anda & catat kehadiran harian (${fmtDate(wibToday())}).`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start">
          {!isSuper && (
            <button data-testid="attendance-mark-all-hadir" onClick={markAllHadir} disabled={markingAll || employees.length === 0} className="flex items-center gap-2 rounded-full border border-[#10B981]/40 bg-[#10B981]/10 px-4 py-2.5 text-sm font-semibold text-[#10B981] hover:bg-[#10B981]/20 transition-colors disabled:opacity-50">
              {markingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />} Tandai Semua Hadir
            </button>
          )}
          <button data-testid="attendance-recap-button" onClick={() => openRecap(wibToday().slice(0, 7))} className="flex items-center gap-2 rounded-full border border-slate-700 bg-[#161F2E] px-4 py-2.5 text-sm font-semibold text-white hover:border-[#FF2E2E] hover:text-[#FF2E2E] transition-colors"><BarChart3 className="h-4 w-4" /> Rekap Bulanan</button>
          {isSuper && <BackupControls onImported={load} />}
        </div>
      </div>

      <form onSubmit={submitCreate} className="mb-6 rounded-2xl border border-slate-800 bg-[#111723] p-5">
          <h2 className="font-heading font-bold text-white flex items-center gap-2 mb-4"><UserPlus className="h-5 w-5 text-[#FF2E2E]" /> Tambah Pegawai</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="sm:col-span-2 lg:col-span-5"><label className={labelCls}>Foto Profil <span className="normal-case tracking-normal text-slate-600 font-normal">(opsional)</span></label>{renderPhotoUpload({ value: form.foto_url, onSet: (url) => setForm((f) => ({ ...f, foto_url: url })), testid: "employee-foto" })}</div>
            <div className="lg:col-span-2"><label className={labelCls}>Nama</label><input data-testid="employee-nama" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Nama pegawai" className={inputCls} /></div>
            <div><label className={labelCls}>Umur</label><input data-testid="employee-umur" inputMode="numeric" value={form.umur} onChange={(e) => setForm({ ...form, umur: e.target.value.replace(/[^0-9]/g, "").slice(0, 3) })} placeholder="Th" className={inputCls} /></div>
            <div><label className={labelCls}>Jabatan</label><input data-testid="employee-jabatan" value={form.jabatan} onChange={(e) => setForm({ ...form, jabatan: e.target.value })} placeholder="cth. Mekanik" className={inputCls} /></div>
            <div><label className={labelCls}>No. HP</label><input data-testid="employee-nohp" value={form.no_hp} onChange={(e) => setForm({ ...form, no_hp: e.target.value })} placeholder="08xx" className={inputCls} /></div>
            <div className="sm:col-span-2 lg:col-span-4"><label className={labelCls}>Alamat</label><input data-testid="employee-alamat" value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} placeholder="Alamat tempat tinggal" className={inputCls} /></div>
            <div className="sm:col-span-2 lg:col-span-2">{renderUpload({ label: "Upload CV", value: form.cv_url, onSet: (url) => setForm((f) => ({ ...f, cv_url: url })), testid: "employee-cv" })}</div>
            <div className="sm:col-span-2 lg:col-span-2">{renderUpload({ label: "Upload KTP", value: form.ktp_url, onSet: (url) => setForm((f) => ({ ...f, ktp_url: url })), testid: "employee-ktp" })}</div>
            <button data-testid="employee-submit" type="submit" disabled={creating} className="lg:self-end flex items-center justify-center gap-2 rounded-xl bg-[#FF2E2E] py-2.5 px-4 text-sm font-bold uppercase tracking-wide text-white cyan-glow hover:scale-[1.01] transition-transform disabled:opacity-50">
              {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />} Tambah
            </button>
          </div>
        </form>

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
              {detail.emp.foto_url ? (
                <img src={resolveImage(detail.emp.foto_url)} alt={detail.emp.nama} className="h-14 w-14 rounded-2xl object-cover border border-[#FF2E2E]/20" />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF2E2E]/10 border border-[#FF2E2E]/20 text-[#FF2E2E] font-heading text-2xl font-bold">{(detail.emp.nama || "?")[0].toUpperCase()}</span>
              )}
              <div className="min-w-0">
                <h2 className="font-heading text-lg font-bold text-white">{detail.emp.nama}</h2>
                <p className="text-xs text-slate-400">{detail.emp.jabatan || "Pegawai"}</p>
              </div>
              <button data-testid="employee-detail-edit" onClick={() => openEdit(detail.emp)} className="ml-auto mr-6 flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-[#FF2E2E] hover:text-[#FF2E2E] transition-colors"><Pencil className="h-3.5 w-3.5" /> Edit</button>
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#0A0D14] px-4 py-2.5"><User className="h-4 w-4 text-slate-500 shrink-0" /><span className="text-slate-500 w-20">Umur</span><span className="text-white">{detail.emp.umur ? `${detail.emp.umur} tahun` : "-"}</span></div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#0A0D14] px-4 py-2.5"><Briefcase className="h-4 w-4 text-slate-500 shrink-0" /><span className="text-slate-500 w-20">Jabatan</span><span className="text-white">{detail.emp.jabatan || "-"}</span></div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#0A0D14] px-4 py-2.5"><Phone className="h-4 w-4 text-slate-500 shrink-0" /><span className="text-slate-500 w-20">No. HP</span><span className="text-white">{detail.emp.no_hp || "-"}</span></div>
              <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-[#0A0D14] px-4 py-2.5"><MapPin className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" /><span className="text-slate-500 w-20 shrink-0">Alamat</span><span className="text-white">{detail.emp.alamat || "-"}</span></div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#0A0D14] px-4 py-2.5"><FileText className="h-4 w-4 text-slate-500 shrink-0" /><span className="text-slate-500 w-20">CV</span>{detail.emp.cv_url ? <a data-testid="detail-cv-link" href={resolveImage(detail.emp.cv_url)} target="_blank" rel="noreferrer" className="text-[#10B981] font-semibold hover:underline">Lihat berkas</a> : <span className="text-white">-</span>}</div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#0A0D14] px-4 py-2.5"><FileText className="h-4 w-4 text-slate-500 shrink-0" /><span className="text-slate-500 w-20">KTP</span>{detail.emp.ktp_url ? <a data-testid="detail-ktp-link" href={resolveImage(detail.emp.ktp_url)} target="_blank" rel="noreferrer" className="text-[#10B981] font-semibold hover:underline">Lihat berkas</a> : <span className="text-white">-</span>}</div>
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

      {/* Edit modal */}
      {editTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-sm" onClick={() => !savingEdit && setEditTarget(null)}>
          <form onSubmit={submitEdit} data-testid="employee-edit-modal" onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-[#111723] p-6 max-h-[90vh] overflow-y-auto animate-fade-up">
            <button type="button" onClick={() => setEditTarget(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2 mb-5"><Pencil className="h-5 w-5 text-[#FF2E2E]" /> Edit Pegawai</h2>
            <div className="space-y-3">
              <div><label className={labelCls}>Foto Profil</label>{renderPhotoUpload({ value: editForm.foto_url, onSet: (url) => setEditForm((f) => ({ ...f, foto_url: url })), testid: "edit-employee-foto" })}</div>
              <div><label className={labelCls}>Nama</label><input data-testid="edit-employee-nama" value={editForm.nama} onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })} placeholder="Nama pegawai" className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Umur</label><input data-testid="edit-employee-umur" inputMode="numeric" value={editForm.umur} onChange={(e) => setEditForm({ ...editForm, umur: e.target.value.replace(/[^0-9]/g, "").slice(0, 3) })} placeholder="Th" className={inputCls} /></div>
                <div><label className={labelCls}>Jabatan</label><input data-testid="edit-employee-jabatan" value={editForm.jabatan} onChange={(e) => setEditForm({ ...editForm, jabatan: e.target.value })} placeholder="cth. Mekanik" className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>No. HP</label><input data-testid="edit-employee-nohp" value={editForm.no_hp} onChange={(e) => setEditForm({ ...editForm, no_hp: e.target.value })} placeholder="08xx" className={inputCls} /></div>
              <div><label className={labelCls}>Alamat</label><input data-testid="edit-employee-alamat" value={editForm.alamat} onChange={(e) => setEditForm({ ...editForm, alamat: e.target.value })} placeholder="Alamat tempat tinggal" className={inputCls} /></div>
              {renderUpload({ label: "Upload CV", value: editForm.cv_url, onSet: (url) => setEditForm((f) => ({ ...f, cv_url: url })), testid: "edit-employee-cv" })}
              {renderUpload({ label: "Upload KTP", value: editForm.ktp_url, onSet: (url) => setEditForm((f) => ({ ...f, ktp_url: url })), testid: "edit-employee-ktp" })}
            </div>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setEditTarget(null)} className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors">Batal</button>
              <button data-testid="edit-employee-save" type="submit" disabled={savingEdit} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#FF2E2E] py-2.5 text-sm font-bold uppercase tracking-wide text-white cyan-glow hover:scale-[1.01] transition-transform disabled:opacity-50">
                {savingEdit ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cek Absensi — Calendar modal */}
      {calTarget && (() => {
        const [cy, cm] = calMonth.split("-").map(Number);
        const monthLabel = new Date(cy, cm - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
        const startDow = new Date(cy, cm - 1, 1).getDay();
        const daysInMonth = new Date(cy, cm, 0).getDate();
        const today = wibToday();
        const cells = [];
        for (let i = 0; i < startDow; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);
        const STYLE = {
          Hadir: { cls: "bg-[#10B981]/15 border-[#10B981]/50 text-[#10B981]", icon: <Check className="h-4 w-4" /> },
          Alpa: { cls: "bg-red-500/15 border-red-500/50 text-red-400", icon: <X className="h-4 w-4" /> },
          Izin: { cls: "bg-amber-500/15 border-amber-500/50 text-amber-400", icon: <span className="text-[9px] font-bold">IZIN</span> },
          Sakit: { cls: "bg-blue-500/15 border-blue-500/50 text-blue-400", icon: <span className="text-[9px] font-bold">SAKIT</span> },
        };
        const present = Object.entries(calData).filter(([k, v]) => k.startsWith(calMonth) && v === "Hadir").length;
        const absent = Object.entries(calData).filter(([k, v]) => k.startsWith(calMonth) && v === "Alpa").length;
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-sm" onClick={() => setCalTarget(null)}>
            <div data-testid="attendance-calendar-modal" onClick={(e) => e.stopPropagation()} className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-[#111723] p-6 max-h-[90vh] overflow-y-auto animate-fade-up">
              <button onClick={() => setCalTarget(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
              <div className="flex items-center gap-3 mb-5">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981]"><CalendarDays className="h-6 w-6" /></span>
                <div className="min-w-0">
                  <h2 className="font-heading text-lg font-bold text-white truncate">Cek Absensi — {calTarget.nama}</h2>
                  <p className="text-xs text-slate-400">{calTarget.jabatan || "Pegawai"}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <button data-testid="cal-prev-month" onClick={() => shiftMonth(-1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-[#FF2E2E] hover:text-[#FF2E2E] transition-colors"><ChevronLeft className="h-4 w-4" /></button>
                <p data-testid="cal-month-label" className="font-heading font-bold text-white capitalize">{monthLabel}</p>
                <button data-testid="cal-next-month" onClick={() => shiftMonth(1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-[#FF2E2E] hover:text-[#FF2E2E] transition-colors"><ChevronRight className="h-4 w-4" /></button>
              </div>

              {calLoading ? (
                <div className="flex items-center justify-center py-16 text-slate-500"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat...</div>
              ) : (
                <>
                  <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                    {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((w) => (
                      <div key={w} className="text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">{w}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {cells.map((d, i) => {
                      if (d === null) return <div key={`e${i}`} />;
                      const dateKey = `${calMonth}-${String(d).padStart(2, "0")}`;
                      const status = calData[dateKey];
                      const st = STYLE[status];
                      const isToday = dateKey === today;
                      return (
                        <div
                          key={dateKey}
                          data-testid={`cal-day-${dateKey}`}
                          title={status ? `${dateKey}: ${status}` : dateKey}
                          className={`aspect-square rounded-lg border flex flex-col items-center justify-center gap-0.5 ${st ? st.cls : "border-slate-800 text-slate-600"} ${isToday ? "ring-2 ring-[#FF2E2E]/60" : ""}`}
                        >
                          <span className="text-[10px] font-semibold leading-none">{d}</span>
                          {st ? st.icon : null}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                    <span className="flex items-center gap-1.5 text-[#10B981]"><Check className="h-4 w-4" /> Hadir <span className="font-bold">({present})</span></span>
                    <span className="flex items-center gap-1.5 text-red-400"><X className="h-4 w-4" /> Alpa <span className="font-bold">({absent})</span></span>
                    <span className="flex items-center gap-1.5 text-amber-400"><span className="h-3 w-3 rounded-sm bg-amber-500/40 border border-amber-500/50" /> Izin</span>
                    <span className="flex items-center gap-1.5 text-blue-400"><span className="h-3 w-3 rounded-sm bg-blue-500/40 border border-blue-500/50" /> Sakit</span>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {recap && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-sm" onClick={() => setRecap(null)}>
          <div data-testid="attendance-recap-modal" onClick={(e) => e.stopPropagation()} className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-[#111723] p-6 max-h-[90vh] overflow-y-auto animate-fade-up">
            <button onClick={() => setRecap(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2 mb-4"><BarChart3 className="h-5 w-5 text-[#FF2E2E]" /> Rekap Absensi Bulanan</h2>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <input data-testid="recap-month-input" type="month" value={recap.month} onChange={(e) => openRecap(e.target.value)} className="rounded-lg border border-slate-700 bg-[#0A0D14] px-3 py-2 text-sm text-white outline-none focus:border-[#FF2E2E]" />
              <button data-testid="recap-export-csv" onClick={exportRecapCSV} disabled={!recap.rows.length} className="flex items-center gap-2 rounded-full border border-slate-700 bg-[#161F2E] px-4 py-2 text-sm font-semibold text-white hover:border-[#10B981] hover:text-[#10B981] transition-colors disabled:opacity-50 sm:ml-auto"><Download className="h-4 w-4" /> Export CSV</button>
            </div>
            {recap.loading ? (
              <div className="flex items-center justify-center py-12 text-slate-500"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat...</div>
            ) : recap.rows.length === 0 ? (
              <p className="py-12 text-center text-slate-500 text-sm">Belum ada pegawai.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500"><th className="px-4 py-3">Pegawai</th><th className="px-4 py-3 text-center text-[#10B981]">Hadir</th><th className="px-4 py-3 text-center text-amber-400">Izin</th><th className="px-4 py-3 text-center text-blue-400">Sakit</th><th className="px-4 py-3 text-center text-red-400">Alpa</th></tr></thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {recap.rows.map((r, i) => (
                      <tr key={i} data-testid={`recap-row-${i}`} className="hover:bg-[#161F2E]/50">
                        <td className="px-4 py-3"><p className="font-semibold text-white">{r.nama}</p><p className="text-[11px] text-slate-500">{r.jabatan || "Pegawai"}</p></td>
                        <td className="px-4 py-3 text-center font-mono-tech text-[#10B981]">{r.Hadir}</td>
                        <td className="px-4 py-3 text-center font-mono-tech text-amber-400">{r.Izin}</td>
                        <td className="px-4 py-3 text-center font-mono-tech text-blue-400">{r.Sakit}</td>
                        <td className="px-4 py-3 text-center font-mono-tech text-red-400">{r.Alpa}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>        <AlertDialogContent className="bg-[#111723] border-slate-700">
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
