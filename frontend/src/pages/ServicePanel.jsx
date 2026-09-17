import { useEffect, useState, useCallback } from "react";
import { listServices, createService, updateService, deleteService, servicesSummary, listEmployees, SERVICE_STATUSES } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { BackupControls } from "../components/BackupControls";
import {
  Plus, Pencil, Trash2, X, Wrench, Bike, User, ClipboardList, Search,
  Wallet, PackageCheck, Clock, Loader2, HardHat, MessageCircle, LayoutGrid, Rows3, FileText,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "../components/ui/alert-dialog";

const rupiah = (n) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");

const STATUS_STYLES = {
  "Antri": "bg-slate-500/15 text-slate-300 border-slate-500/40",
  "Dikerjakan": "bg-blue-500/15 text-blue-300 border-blue-500/40",
  "Menunggu Sparepart": "bg-[#FF5500]/15 text-[#FF7A33] border-[#FF5500]/40",
  "Selesai": "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40",
  "Diambil": "bg-emerald-600/15 text-emerald-300 border-emerald-600/40",
};

const EMPTY = {
  nomor_servis: "", nama_customer: "", no_hp: "", sepeda: "", keluhan: "", kondisi_awal: "",
  teknisi: "", sparepart: "", harga_sparepart: "", biaya_jasa: "",
  estimasi_selesai: "", status: "Antri",
};

function StatCard({ icon: Icon, label, value, tone = "red", testid }) {
  const tones = {
    red: "bg-[#FF2E2E]/10 border-[#FF2E2E]/20 text-[#FF2E2E]",
    green: "bg-[#10B981]/10 border-[#10B981]/20 text-[#10B981]",
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  };
  return (
    <div data-testid={testid} className="rounded-2xl border border-slate-800 bg-[#161F2E] p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
          <p className="font-heading text-base sm:text-xl font-bold text-white leading-tight break-words">{value}</p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <label className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "w-full rounded-xl border border-slate-700 bg-[#0A0D14] px-4 py-2.5 text-sm text-white outline-none focus:border-[#FF2E2E] transition-colors placeholder:text-slate-600";

const parseSpareRows = (str) => {
  const rows = [];
  for (const part of String(str || "").split(";")) {
    const p = part.trim();
    if (!p) continue;
    if (p.includes(":")) {
      const idx = p.lastIndexOf(":");
      const name = p.slice(0, idx).trim();
      const priceRaw = p.slice(idx + 1).replace(/[^0-9]/g, "");
      rows.push({ name, price: priceRaw ? parseInt(priceRaw, 10) : 0 });
    } else {
      rows.push({ name: p, price: 0 });
    }
  }
  return rows.length ? rows : [{ name: "", price: 0 }];
};
const serializeSpareRows = (rows) => rows.filter((r) => r.name.trim()).map((r) => `${r.name.trim()}:${Number(r.price) || 0}`).join("; ");

function ServiceForm({ service, technicians, onClose, onSaved }) {
  const [form, setForm] = useState(service ? { ...EMPTY, ...service, harga_sparepart: service.harga_sparepart || "", biaya_jasa: service.biaya_jasa || "" } : EMPTY);
  const [spareRows, setSpareRows] = useState(parseSpareRows(service?.sparepart));
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const spareTotal = spareRows.reduce((s, r) => s + (Number(r.price) || 0), 0);
  const setSpare = (i, k, val) => setSpareRows((prev) => prev.map((x, idx) => (idx === i ? { ...x, [k]: val } : x)));
  const setSparePrice = (i, val) => { const d = String(val).replace(/[^0-9]/g, ""); setSpare(i, "price", d ? parseInt(d, 10) : 0); };
  const addSpare = () => setSpareRows((prev) => [...prev, { name: "", price: 0 }]);
  const removeSpare = (i) => setSpareRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.nama_customer?.trim()) { toast.error("Nama customer wajib diisi"); return; }
    setSaving(true);
    const payload = {
      ...form,
      sparepart: serializeSpareRows(spareRows),
      harga_sparepart: spareTotal,
      biaya_jasa: Number(form.biaya_jasa) || 0,
    };
    try {
      if (service) { await updateService(service.id, payload); toast.success("Servis diperbarui"); }
      else { await createService(payload); toast.success("Servis ditambahkan • sparepart masuk ke omset"); }
      onSaved();
    } catch {
      toast.error("Gagal menyimpan servis");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-sm" onClick={onClose}>
      <div data-testid="service-form-modal" onClick={(e) => e.stopPropagation()} className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-[#111723] max-h-[90vh] overflow-y-auto animate-fade-up">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-800 bg-[#111723] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF2E2E]/10 border border-[#FF2E2E]/20 text-[#FF2E2E]"><Wrench className="h-5 w-5" /></span>
            <h2 className="font-heading text-lg font-bold text-white">{service ? "Edit Service Order" : "Service Order Baru"}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6">
          <Field label="Nomor Servis">
            <input data-testid="service-input-nomor" value={form.nomor_servis} onChange={set("nomor_servis")} placeholder="Otomatis jika kosong (SVC-...)" className={inputCls} />
          </Field>
          <Field label="Status">
            <select data-testid="service-input-status" value={form.status} onChange={set("status")} className={inputCls}>
              {SERVICE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Nama Customer *">
            <input data-testid="service-input-customer" value={form.nama_customer} onChange={set("nama_customer")} placeholder="Nama pelanggan" className={inputCls} />
          </Field>
          <Field label="No. HP Customer">
            <input data-testid="service-input-nohp" value={form.no_hp} onChange={set("no_hp")} placeholder="08xx (untuk notifikasi WhatsApp)" className={inputCls} />
          </Field>
          <Field label="Sepeda">
            <input data-testid="service-input-sepeda" value={form.sepeda} onChange={set("sepeda")} placeholder="Merk / tipe sepeda" className={inputCls} />
          </Field>
          <Field label="Keluhan" full>
            <textarea data-testid="service-input-keluhan" value={form.keluhan} onChange={set("keluhan")} rows={2} placeholder="Keluhan pelanggan" className={inputCls} />
          </Field>
          <Field label="Kondisi Awal" full>
            <textarea data-testid="service-input-kondisi" value={form.kondisi_awal} onChange={set("kondisi_awal")} rows={2} placeholder="Kondisi sepeda saat diterima" className={inputCls} />
          </Field>
          <Field label="Teknisi">
            <input data-testid="service-input-teknisi" list="teknisi-list" value={form.teknisi} onChange={set("teknisi")} placeholder="Nama teknisi / mekanik" className={inputCls} />
            <datalist id="teknisi-list">
              {technicians.map((t) => <option key={t} value={t} />)}
            </datalist>
          </Field>
          <Field label="Estimasi Selesai">
            <input data-testid="service-input-estimasi" type="date" value={form.estimasi_selesai || ""} onChange={set("estimasi_selesai")} className={inputCls} />
          </Field>
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Sparepart Digunakan</span>
              <span className="text-[11px] text-[#10B981]">Total → Omset: <span className="font-bold font-mono-tech" data-testid="service-sparepart-total">{rupiah(spareTotal)}</span></span>
            </div>
            <div className="space-y-2">
              {spareRows.map((r, i) => (
                <div key={i} data-testid={`service-spare-row-${i}`} className="flex items-center gap-2">
                  <input data-testid={`service-spare-name-${i}`} value={r.name} onChange={(e) => setSpare(i, "name", e.target.value)} placeholder="Nama barang" className={`${inputCls} flex-1`} />
                  <div className="relative w-36 sm:w-44 shrink-0">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-500">Rp</span>
                    <input data-testid={`service-spare-price-${i}`} value={r.price ? r.price.toLocaleString("id-ID") : ""} onChange={(e) => setSparePrice(i, e.target.value)} inputMode="numeric" placeholder="0" className={`${inputCls} pl-8 text-right`} />
                  </div>
                  <button type="button" data-testid={`service-spare-remove-${i}`} onClick={() => removeSpare(i)} disabled={spareRows.length <= 1} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:border-red-500 hover:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            <button type="button" data-testid="service-spare-add" onClick={addSpare} className="mt-2 flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-[#FF2E2E] hover:text-[#FF2E2E] transition-colors"><Plus className="h-3.5 w-3.5" /> Tambah sparepart</button>
          </div>
          <Field label="Harga Sparepart (→ Omset)">
            <input data-testid="service-input-harga-sparepart" value={rupiah(spareTotal)} readOnly className={`${inputCls} bg-[#0A0D14]/40 cursor-not-allowed text-[#10B981] font-mono-tech`} />
            <span className="text-[11px] text-[#10B981]">Otomatis dari total harga sparepart di atas</span>
          </Field>
          <Field label="Biaya Jasa (→ Kantong Mekanik)">
            <input data-testid="service-input-biaya-jasa" type="number" min="0" value={form.biaya_jasa} onChange={set("biaya_jasa")} placeholder="0" className={inputCls} />
            <span className="text-[11px] text-amber-400">Masuk ke kantong mekanik/teknisi</span>
          </Field>

          <div className="sm:col-span-2 flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-full border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors">Batal</button>
            <button data-testid="service-submit-button" type="submit" disabled={saving} className="flex items-center gap-2 rounded-full bg-[#FF2E2E] px-6 py-2.5 text-sm font-bold text-white hover:scale-105 transition-transform disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />} Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ServicePanel() {
  const { user } = useAuth();
  const isSuper = !!user?.is_super;
  const [services, setServices] = useState([]);
  const [summary, setSummary] = useState({ total_services: 0, active_services: 0, total_jasa: 0, total_sparepart: 0, mechanics: [] });
  const [technicians, setTechnicians] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("table");

  const load = useCallback(async () => {
    try {
      const [list, sum] = await Promise.all([listServices(), servicesSummary()]);
      setServices(list);
      setSummary(sum);
    } catch {
      toast.error("Gagal memuat data servis");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    listEmployees().then((emps) => setTechnicians(emps.map((e) => e.nama).filter(Boolean))).catch(() => {});
  }, [load]);

  const onSaved = () => { setShowForm(false); setEditing(null); load(); };

  const notifyWA = (s) => {
    const total = (Number(s.harga_sparepart) || 0) + (Number(s.biaya_jasa) || 0);
    const msg = [
      "*SK BIKE STORE — Info Servis*",
      s.nomor_servis ? `No. Servis: ${s.nomor_servis}` : null,
      s.nama_customer ? `Customer: ${s.nama_customer}` : null,
      s.sepeda ? `Sepeda: ${s.sepeda}` : null,
      `Status: ${s.status}`,
      s.estimasi_selesai ? `Estimasi selesai: ${s.estimasi_selesai}` : null,
      total ? `Estimasi biaya: ${rupiah(total)}` : null,
      "Terima kasih 🚲",
    ].filter(Boolean).join("\n");
    const phone = String(s.no_hp || "").replace(/[^0-9]/g, "").replace(/^0/, "62");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const invoicePDF = (s) => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    doc.setFontSize(16); doc.setTextColor(255, 46, 46); doc.text("SK BIKE STORE", 14, 16);
    doc.setFontSize(9); doc.setTextColor(90);
    doc.text("Jl Pawan 1, Ketapang, Kalimantan Barat", 14, 22);
    doc.text("WhatsApp: 0812-5559-681  ·  IG: @skbike_ketapang", 14, 27);
    doc.setDrawColor(255, 46, 46); doc.setLineWidth(0.5); doc.line(14, 31, pageW - 14, 31);
    doc.setFontSize(13); doc.setTextColor(30); doc.text("Nota Servis", 14, 40);
    const info = [
      ["No. Servis", s.nomor_servis || "-"], ["Tanggal", new Date().toLocaleDateString("id-ID")],
      ["Customer", s.nama_customer || "-"], ["No. HP", s.no_hp || "-"], ["Sepeda", s.sepeda || "-"],
      ["Teknisi", s.teknisi || "-"], ["Status", s.status || "-"], ["Keluhan", s.keluhan || "-"],
    ];
    autoTable(doc, { startY: 45, body: info, theme: "plain", styles: { fontSize: 10 }, columnStyles: { 0: { fontStyle: "bold", cellWidth: 40 } } });
    const spares = parseSpareRows(s.sparepart).filter((r) => r.name.trim());
    const spareTotal = spares.reduce((a, r) => a + (Number(r.price) || 0), 0);
    autoTable(doc, {
      startY: (doc.lastAutoTable?.finalY || 45) + 4,
      head: [["Sparepart", "Harga"]],
      body: spares.length ? spares.map((r) => [r.name, rupiah(r.price)]) : [["(tidak ada sparepart)", rupiah(0)]],
      theme: "grid", headStyles: { fillColor: [255, 46, 46] }, styles: { fontSize: 10 },
    });
    const jasa = Number(s.biaya_jasa) || 0;
    autoTable(doc, {
      startY: (doc.lastAutoTable?.finalY || 60) + 2,
      body: [["Total Sparepart", rupiah(spareTotal)], ["Biaya Jasa", rupiah(jasa)], ["TOTAL", rupiah(spareTotal + jasa)]],
      theme: "plain", styles: { fontSize: 11, fontStyle: "bold" }, columnStyles: { 1: { halign: "right" } },
    });
    doc.setFontSize(9); doc.setTextColor(120);
    doc.text("Terima kasih telah mempercayakan servis di SK Bike Store 🚲", 14, (doc.lastAutoTable?.finalY || 80) + 10);
    doc.save(`nota-servis-${s.nomor_servis || "skbike"}.pdf`);
    toast.success("Nota servis PDF diunduh");
  };

  const confirmDelete = async () => {
    try { await deleteService(deleteId); toast.success("Servis dihapus"); }
    catch { toast.error("Gagal menghapus servis"); }
    setDeleteId(null);
    load();
  };

  const q = search.trim().toLowerCase();
  const filtered = services.filter((s) => {
    const matchesQ = !q || [s.nomor_servis, s.nama_customer, s.sepeda, s.teknisi, s.keluhan, s.sparepart, s.status].some((v) => (v || "").toString().toLowerCase().includes(q));
    const matchesStatus = statusFilter === "Semua" || s.status === statusFilter;
    return matchesQ && matchesStatus;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white flex items-center gap-2"><Wrench className="h-7 w-7 text-[#FF2E2E]" /> Service Bengkel</h1>
          <p className="mt-1 text-slate-400 text-sm">Kelola order servis. Harga sparepart otomatis masuk omset, biaya jasa masuk kantong mekanik.</p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <div className="inline-flex items-center rounded-full border border-slate-700 bg-[#161F2E] p-0.5">
            <button data-testid="service-view-table" onClick={() => setView("table")} className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${view === "table" ? "bg-[#FF2E2E] text-white" : "text-slate-400 hover:text-white"}`}><Rows3 className="h-4 w-4" /> Tabel</button>
            <button data-testid="service-view-kanban" onClick={() => setView("kanban")} className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${view === "kanban" ? "bg-[#FF2E2E] text-white" : "text-slate-400 hover:text-white"}`}><LayoutGrid className="h-4 w-4" /> Papan</button>
          </div>
          <button data-testid="service-add-button" onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 rounded-full bg-[#FF2E2E] px-5 py-3 text-sm font-bold text-white cyan-glow hover:scale-105 transition-transform">
            <Plus className="h-4 w-4" /> Baru
          </button>
        </div>
      </div>

      {isSuper && <div className="mb-8 flex justify-end"><BackupControls onImported={load} /></div>}

      <div className={`grid grid-cols-2 ${isSuper ? "lg:grid-cols-4" : "lg:grid-cols-2 max-w-2xl"} gap-4 mb-8`}>
        <StatCard icon={ClipboardList} label="Total Servis" value={summary.total_services} tone="blue" testid="service-stat-total" />
        <StatCard icon={Clock} label="Servis Aktif" value={summary.active_services} tone="amber" testid="service-stat-active" />
        {isSuper && <StatCard icon={Wallet} label="Omset Sparepart" value={rupiah(summary.total_sparepart)} tone="green" testid="service-stat-sparepart" />}
        {isSuper && <StatCard icon={HardHat} label="Total Biaya Jasa" value={rupiah(summary.total_jasa)} tone="red" testid="service-stat-jasa" />}
      </div>

      {isSuper && summary.mechanics?.length > 0 && (
        <div data-testid="mechanic-payout-panel" className="mb-8 rounded-2xl border border-slate-800 bg-[#111723] p-5">
          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-4"><Wallet className="h-4 w-4 text-amber-400" /> Kantong Mekanik (Biaya Jasa)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {summary.mechanics.map((m) => (
              <div key={m.teknisi} data-testid={`mechanic-card-${m.teknisi}`} className="rounded-xl border border-slate-800 bg-[#0A0D14] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400"><HardHat className="h-4 w-4" /></span>
                  <span className="font-semibold text-white truncate">{m.teknisi}</span>
                </div>
                <p className="font-heading text-xl font-black text-amber-400">{rupiah(m.total_jasa)}</p>
                <p className="text-xs text-slate-500 mt-1">{m.jumlah_servis} servis • sparepart {rupiah(m.total_sparepart)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input data-testid="service-search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari no. servis / customer / sepeda / teknisi..." className="w-full rounded-full border border-slate-700 bg-[#161F2E] pl-11 pr-4 py-3 text-sm text-white outline-none focus:border-[#FF2E2E] transition-colors" />
        </div>
        <select data-testid="service-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-full border border-slate-700 bg-[#161F2E] px-4 py-3 text-sm text-white outline-none focus:border-[#FF2E2E] transition-colors">
          <option value="Semua">Semua Status</option>
          {SERVICE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {view === "kanban" && (
        <div data-testid="service-kanban" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-4">
          {SERVICE_STATUSES.map((st) => {
            const col = filtered.filter((s) => s.status === st);
            return (
              <div key={st} data-testid={`kanban-col-${st}`} className="rounded-2xl border border-slate-800 bg-[#111723] p-3">
                <div className="flex items-center justify-between mb-2"><span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STATUS_STYLES[st]}`}>{st}</span><span className="text-xs text-slate-500">{col.length}</span></div>
                <div className="space-y-2 max-h-[30rem] overflow-y-auto">
                  {col.length === 0 ? <p className="py-4 text-center text-[11px] text-slate-600">—</p> : col.map((s) => (
                    <div key={s.id} data-testid={`kanban-card-${s.id}`} className="rounded-xl border border-slate-800 bg-[#0A0D14] p-3">
                      <p className="text-sm font-semibold text-white truncate">{s.nama_customer || "-"}</p>
                      <p className="text-[11px] text-slate-500 truncate flex items-center gap-1"><Bike className="h-3 w-3" />{s.sepeda || "-"}</p>
                      {s.teknisi && <p className="text-[11px] text-slate-400 mt-0.5">Teknisi: {s.teknisi}</p>}
                      <p className="mt-1 font-mono-tech text-xs"><span className="text-[#10B981]">{rupiah(s.harga_sparepart)}</span> <span className="text-slate-600">+</span> <span className="text-amber-400">{rupiah(s.biaya_jasa)}</span></p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <button data-testid={`kanban-edit-${s.id}`} onClick={() => { setEditing(s); setShowForm(true); }} className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-slate-700 py-1.5 text-[11px] text-slate-300 hover:border-[#FF2E2E] hover:text-[#FF2E2E] transition-colors"><Pencil className="h-3 w-3" /> Edit</button>
                        <button data-testid={`kanban-wa-${s.id}`} onClick={() => notifyWA(s)} title="Kabari via WhatsApp" className="flex items-center justify-center rounded-lg border border-slate-700 px-2 py-1.5 text-slate-300 hover:border-[#10B981] hover:text-[#10B981] transition-colors"><MessageCircle className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className={`rounded-2xl border border-slate-800 bg-[#111723] overflow-hidden ${view === "kanban" ? "hidden" : ""}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-4 font-medium">No. Servis</th>
                <th className="px-5 py-4 font-medium">Customer</th>
                <th className="px-5 py-4 font-medium">Sepeda</th>
                <th className="px-5 py-4 font-medium">Teknisi</th>
                <th className="px-5 py-4 font-medium">Sparepart</th>
                <th className="px-5 py-4 font-medium">Jasa</th>
                <th className="px-5 py-4 font-medium">Estimasi</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {loading ? (
                <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-500"><Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Memuat...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-500">{services.length === 0 ? "Belum ada order servis. Buat yang pertama." : "Tidak ada servis yang cocok."}</td></tr>
              ) : filtered.map((s) => (
                <tr key={s.id} data-testid={`service-row-${s.id}`} className="hover:bg-[#161F2E]/60 transition-colors align-top">
                  <td className="px-5 py-4 font-mono-tech text-slate-300 whitespace-nowrap">{s.nomor_servis}</td>
                  <td className="px-5 py-4"><div className="flex items-center gap-2 text-white"><User className="h-3.5 w-3.5 text-slate-500" />{s.nama_customer || "-"}</div>{s.keluhan && <p className="text-xs text-slate-500 mt-0.5 max-w-[180px] line-clamp-2">{s.keluhan}</p>}</td>
                  <td className="px-5 py-4 text-slate-400"><div className="flex items-center gap-2"><Bike className="h-3.5 w-3.5 text-slate-500" />{s.sepeda || "-"}</div></td>
                  <td className="px-5 py-4 text-slate-300">{s.teknisi || "-"}</td>
                  <td className="px-5 py-4 text-[#10B981] font-mono-tech whitespace-nowrap">{rupiah(s.harga_sparepart)}</td>
                  <td className="px-5 py-4 text-amber-400 font-mono-tech whitespace-nowrap">{rupiah(s.biaya_jasa)}</td>
                  <td className="px-5 py-4 text-slate-400 whitespace-nowrap">{s.estimasi_selesai || "-"}</td>
                  <td className="px-5 py-4"><span className={`inline-block rounded-full border px-3 py-1 text-[11px] font-medium whitespace-nowrap ${STATUS_STYLES[s.status] || STATUS_STYLES["Antri"]}`}>{s.status}</span></td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button data-testid={`service-invoice-${s.id}`} onClick={() => invoicePDF(s)} title="Cetak nota servis (PDF)" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-blue-400 hover:text-blue-400 transition-colors"><FileText className="h-4 w-4" /></button>
                      <button data-testid={`service-wa-${s.id}`} onClick={() => notifyWA(s)} title="Kabari customer via WhatsApp" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-[#10B981] hover:text-[#10B981] transition-colors"><MessageCircle className="h-4 w-4" /></button>
                      <button data-testid={`service-edit-${s.id}`} onClick={() => { setEditing(s); setShowForm(true); }} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-[#FF2E2E] hover:text-[#FF2E2E] transition-colors"><Pencil className="h-4 w-4" /></button>
                      <button data-testid={`service-delete-${s.id}`} onClick={() => setDeleteId(s.id)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-red-500 hover:text-red-400 transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && <ServiceForm service={editing} technicians={technicians} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={onSaved} />}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="bg-[#111723] border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Hapus order servis ini?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Tindakan ini tidak dapat dibatalkan. Penjualan sparepart terkait juga akan dihapus dari omset.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800">Batal</AlertDialogCancel>
            <AlertDialogAction data-testid="service-confirm-delete" onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
