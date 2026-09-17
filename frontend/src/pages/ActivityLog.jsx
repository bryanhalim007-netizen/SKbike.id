import { useEffect, useState, useCallback, useMemo } from "react";
import { listActivity } from "../lib/api";
import { toast } from "sonner";
import { BackupControls } from "../components/BackupControls";
import {
  ScrollText, Loader2, RefreshCw, PlusCircle, PencilLine, Trash2,
  ShoppingCart, Wrench, Package, UserCog, Filter, Search, Download, X,
} from "lucide-react";

const ACTION_META = {
  create: { label: "Buat", Icon: PlusCircle, cls: "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30" },
  update: { label: "Ubah", Icon: PencilLine, cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  delete: { label: "Hapus", Icon: Trash2, cls: "bg-red-500/15 text-red-400 border-red-500/30" },
};
const ENTITY_META = {
  sale: { label: "Penjualan", Icon: ShoppingCart },
  service: { label: "Servis", Icon: Wrench },
  product: { label: "Produk", Icon: Package },
  account: { label: "Akun", Icon: UserCog },
};
const ENTITY_FILTERS = [
  { key: "all", label: "Semua" },
  { key: "sale", label: "Penjualan" },
  { key: "service", label: "Servis" },
  { key: "product", label: "Produk" },
  { key: "account", label: "Akun" },
];

function fmtTime(iso) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

function roleLabel(role) {
  if (role === "super_admin") return "Super Admin";
  if (role === "cashier") return "Kasir";
  return "Admin";
}

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [actor, setActor] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listActivity(200);
      setLogs(data);
    } catch {
      toast.error("Gagal memuat log aktivitas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const actors = useMemo(() => Array.from(new Set(logs.map((l) => l.actor_email).filter(Boolean))), [logs]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (filter !== "all" && l.entity !== filter) return false;
      if (actor !== "all" && l.actor_email !== actor) return false;
      const d = String(l.created_at || "").slice(0, 10);
      if (dateFrom && d && d < dateFrom) return false;
      if (dateTo && d && d > dateTo) return false;
      if (q && ![l.label, l.actor_name, l.actor_email].some((v) => (v || "").toLowerCase().includes(q))) return false;
      return true;
    });
  }, [logs, filter, actor, dateFrom, dateTo, search]);

  const exportCSV = () => {
    const head = ["Waktu", "Aksi", "Entitas", "Keterangan", "Oleh", "Email", "Role"];
    const rows = filtered.map((l) => [fmtTime(l.created_at), l.action, l.entity, l.label, l.actor_name || "", l.actor_email || "", roleLabel(l.actor_role)]);
    const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `log-aktivitas-skbike-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    toast.success(`${filtered.length} baris log diekspor (CSV)`);
  };

  return (
    <div data-testid="activity-log-panel">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-[#FF2E2E]" /> Log Aktivitas
          </h1>
          <p className="mt-1 text-slate-400 text-sm">Riwayat siapa yang membuat, mengubah, atau menghapus tiap transaksi & data.</p>
        </div>
        <button data-testid="activity-refresh" onClick={load} className="flex items-center gap-2 self-start rounded-full border border-slate-700 bg-[#161F2E] px-5 py-2.5 text-sm font-semibold text-white hover:border-[#FF2E2E] hover:text-[#FF2E2E] transition-colors">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Muat Ulang
        </button>
      </div>

      <div className="mb-6 flex justify-end"><BackupControls onImported={load} /></div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-slate-500" />
        {ENTITY_FILTERS.map((f) => (
          <button
            key={f.key}
            data-testid={`activity-filter-${f.key}`}
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${filter === f.key ? "border-[#FF2E2E] bg-[#FF2E2E]/15 text-white" : "border-slate-700 bg-[#161F2E] text-slate-400 hover:border-slate-500"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-col lg:flex-row lg:items-center gap-3" data-testid="activity-advanced-filters">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input data-testid="activity-search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari keterangan / pelaku..." className="w-full rounded-full border border-slate-700 bg-[#161F2E] pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-[#FF2E2E] transition-colors" />
        </div>
        <select data-testid="activity-actor-filter" value={actor} onChange={(e) => setActor(e.target.value)} className="rounded-full border border-slate-700 bg-[#161F2E] px-4 py-2.5 text-sm text-white outline-none focus:border-[#FF2E2E] max-w-[200px]">
          <option value="all">Semua Pelaku</option>
          {actors.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <input data-testid="activity-date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-slate-700 bg-[#161F2E] px-3 py-2.5 text-sm text-white outline-none focus:border-[#FF2E2E]" />
          <span className="text-slate-500 text-xs">s/d</span>
          <input data-testid="activity-date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-slate-700 bg-[#161F2E] px-3 py-2.5 text-sm text-white outline-none focus:border-[#FF2E2E]" />
        </div>
        {(search || actor !== "all" || dateFrom || dateTo) && (
          <button data-testid="activity-clear-filters" onClick={() => { setSearch(""); setActor("all"); setDateFrom(""); setDateTo(""); }} className="flex items-center gap-1 rounded-full border border-slate-700 bg-[#161F2E] px-3 py-2.5 text-xs font-semibold text-slate-400 hover:border-slate-500 hover:text-white transition-colors"><X className="h-3.5 w-3.5" /> Reset</button>
        )}
        <button data-testid="activity-export-csv" onClick={exportCSV} disabled={filtered.length === 0} className="flex items-center gap-2 rounded-full border border-slate-700 bg-[#161F2E] px-4 py-2.5 text-sm font-semibold text-white hover:border-[#10B981] hover:text-[#10B981] transition-colors disabled:opacity-50 lg:ml-auto"><Download className="h-4 w-4" /> Export CSV</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#111723] py-16 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
          <ScrollText className="h-8 w-8 text-slate-600" /> Belum ada aktivitas tercatat.
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-[#111723] overflow-hidden divide-y divide-slate-800/70">
          {filtered.map((l) => {
            const am = ACTION_META[l.action] || ACTION_META.update;
            const em = ENTITY_META[l.entity] || { label: l.entity, Icon: ScrollText };
            const AIcon = am.Icon;
            const EIcon = em.Icon;
            return (
              <div key={l.id} data-testid={`activity-row-${l.id}`} className="flex items-start gap-3 px-4 sm:px-5 py-4 hover:bg-[#161F2E]/50 transition-colors">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0A0D14] border border-slate-800 text-slate-300"><EIcon className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${am.cls}`}><AIcon className="h-3 w-3" /> {am.label}</span>
                    <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-[10px] font-semibold text-slate-300">{em.label}</span>
                    <p className="text-sm font-semibold text-white truncate">{l.label}</p>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    oleh <span className="text-slate-300 font-medium">{l.actor_name || l.actor_email}</span>
                    <span className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${l.actor_role === "super_admin" ? "bg-[#FF2E2E]/15 text-[#FF6B6B]" : l.actor_role === "cashier" ? "bg-[#10B981]/15 text-[#10B981]" : "bg-slate-600/40 text-slate-300"}`}>{roleLabel(l.actor_role)}</span>
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-slate-500 whitespace-nowrap font-mono-tech">{fmtTime(l.created_at)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
