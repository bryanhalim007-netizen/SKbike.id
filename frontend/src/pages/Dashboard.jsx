import { useCallback, useEffect, useMemo, useState } from "react";
import { salesDashboard, getLowStock, listPurchaseOrders, resolveImage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { BackupControls } from "../components/BackupControls";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import skLogo from "../assets/sk-logo.png";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import {
  TrendingUp, Wallet, Coins, Receipt, Package, Calculator, Loader2, CalendarRange, BarChart3, X, FileDown,
  Trophy, CreditCard, ArrowUpRight, ArrowDownRight, Minus, AlertTriangle, PackageX, Truck,
} from "lucide-react";

const rupiah = (n) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");
const rupiahShort = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`;
  return String(v);
};

const RANGES = [
  { key: "today", label: "Hari Ini" },
  { key: "yesterday", label: "Kemarin" },
  { key: "7d", label: "7 Hari" },
  { key: "30d", label: "30 Hari" },
  { key: "month", label: "Bulan Ini" },
  { key: "custom", label: "Custom" },
];

function DeltaBadge({ delta }) {
  if (!delta) return null;
  const { dir, value, isNew } = delta;
  const cls = dir === "up" ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/30"
    : dir === "down" ? "text-red-400 bg-red-400/10 border-red-400/30"
    : "text-slate-400 bg-slate-500/10 border-slate-600/40";
  const Icon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;
  const text = dir === "flat" ? "0%" : `${dir === "up" ? "+" : "-"}${value}%`;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${cls}`} title="vs periode sebelumnya">
      <Icon className="h-3 w-3" /> {isNew ? "Baru" : text}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent, testid, onClick, delta }) {
  return (
    <button
      type="button"
      data-testid={testid}
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-2xl border border-slate-800 bg-[#161F2E] p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-600 hover:shadow-lg hover:shadow-black/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2E2E]/60 cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">{label}</p>
          <p className="mt-2 font-heading text-xl sm:text-2xl font-black text-white leading-tight break-words">{value}</p>
          <div className="mt-1 flex items-center gap-2">
            {sub && <p className="text-xs text-slate-400">{sub}</p>}
            <DeltaBadge delta={delta} />
          </div>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-110" style={{ backgroundColor: `${accent}1A`, borderColor: `${accent}33`, color: accent }}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-[10px] uppercase tracking-wider text-slate-600 group-hover:text-slate-400 transition-colors">Klik untuk detail</p>
      <span className="absolute bottom-0 left-0 h-1 w-full opacity-60" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
    </button>
  );
}

function StatDetailModal({ metric, chart, onClose }) {
  if (!metric) return null;
  const { icon: Icon, label, value, accent, description, rows, chartKey, chartType, money } = metric;
  const data = chart || [];
  const hasData = data.some((d) => Number(d[chartKey]) > 0);
  const singleDay = data.length <= 1;
  const fmt = (v) => (money ? rupiah(v) : v);
  const MetricTip = ({ active, payload, label: lb }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-slate-700 bg-[#0A0D14] px-3 py-2 shadow-xl">
        <p className="text-[11px] font-bold text-white mb-0.5">{lb}</p>
        <p className="text-[11px]" style={{ color: accent }}>{label}: <span className="font-mono-tech font-bold">{fmt(payload[0].value)}</span></p>
      </div>
    );
  };
  return (
    <div
      data-testid="stat-detail-overlay"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        data-testid="stat-detail-modal"
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-[#111723] shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="absolute top-0 left-0 h-1 w-full" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
        <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border" style={{ backgroundColor: `${accent}1A`, borderColor: `${accent}33`, color: accent }}>
              <Icon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">{label}</p>
              <p className="font-heading text-2xl font-black text-white leading-tight">{value}</p>
            </div>
          </div>
          <button data-testid="stat-detail-close" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">
          <p className="text-sm text-slate-300 leading-relaxed">{description}</p>

          {/* Per-metric chart */}
          <div className="mt-4 rounded-xl border border-slate-800 bg-[#0A0D14]/60 p-3" data-testid="stat-detail-chart">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-slate-500"><BarChart3 className="h-3.5 w-3.5" style={{ color: accent }} /> Grafik {label}</p>
            {hasData ? (
              <div style={{ width: "100%", height: 200 }}>
                <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                  {chartType === "bar" ? (
                    <BarChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                      <Tooltip content={<MetricTip />} cursor={{ fill: "#ffffff08" }} />
                      <Bar dataKey={chartKey} name={label} fill={accent} radius={[5, 5, 0, 0]} maxBarSize={44} />
                    </BarChart>
                  ) : (
                    <AreaChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`grad-${chartKey}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={accent} stopOpacity={0.5} />
                          <stop offset="95%" stopColor={accent} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={money ? rupiahShort : undefined} width={money ? 44 : 32} />
                      <Tooltip content={<MetricTip />} />
                      <Area type="monotone" dataKey={chartKey} name={label} stroke={accent} strokeWidth={2.5} fill={`url(#grad-${chartKey})`} dot={singleDay} />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-slate-600">
                <BarChart3 className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-xs">Belum ada data pada periode ini.</p>
              </div>
            )}
          </div>

          {rows?.length > 0 && (
            <div className="mt-4 space-y-2">
              {rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#161F2E] px-3 py-2">
                  <span className="text-xs text-slate-400">{r.label}</span>
                  <span className="text-sm font-bold text-white font-mono-tech">{r.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-700 bg-[#0A0D14] px-3 py-2 shadow-xl">
      <p className="text-xs font-bold text-white mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-[11px]" style={{ color: p.color }}>
          {p.name}: <span className="font-mono-tech font-bold">{p.dataKey === "transactions" ? p.value : rupiah(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const isSuper = !!user?.is_super;
  const [range, setRange] = useState("today");
  const [custom, setCustom] = useState({ start: "", end: "" });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartMode, setChartMode] = useState("revenue"); // revenue | transactions
  const [selectedStat, setSelectedStat] = useState(null);
  const [supply, setSupply] = useState({ out_of_stock: [], low_stock: [], count: 0 });
  const [pendingPOs, setPendingPOs] = useState([]);
  useEffect(() => {
    getLowStock().then(setSupply).catch(() => {});
    listPurchaseOrders().then((po) => setPendingPOs(po.filter((o) => ["dipesan", "sebagian"].includes(o.status)))).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (range === "custom" && (!custom.start || !custom.end)) return;
    setLoading(true);
    try {
      const res = await salesDashboard({ range, start: custom.start, end: custom.end });
      setData(res);
    } catch (e) {
      const d = e?.response?.data?.detail;
      toast.error(d ? String(d) : "Gagal memuat dashboard");
    } finally {
      setLoading(false);
    }
  }, [range, custom.start, custom.end]);

  useEffect(() => { load(); }, [load]);

  const s = data?.summary || {};
  const chart = data?.chart || [];
  const singleDay = chart.length <= 1;
  const marginPct = useMemo(() => {
    if (!s.revenue) return 0;
    return Math.round((s.gross_profit / s.revenue) * 100);
  }, [s.revenue, s.gross_profit]);

  const periodLabel = data ? (data.start === data.end ? data.start : `${data.start} → ${data.end}`) : "";

  const prev = data?.previous || {};
  const pct = (cur, prv) => {
    cur = Number(cur) || 0; prv = Number(prv) || 0;
    if (prv === 0) return cur > 0 ? { dir: "up", value: 100, isNew: true } : { dir: "flat", value: 0 };
    const diff = ((cur - prv) / prv) * 100;
    return { dir: diff > 0 ? "up" : diff < 0 ? "down" : "flat", value: Math.abs(Math.round(diff)) };
  };
  const topProducts = data?.top_products || [];
  const maxTopRevenue = topProducts.reduce((m, p) => Math.max(m, Number(p.revenue) || 0), 0) || 1;
  const paymentBreakdown = data?.payment_breakdown || [];
  const PAY_COLORS = { Cash: "#10B981", Transfer: "#3B82F6", Split: "#A855F7", Lainnya: "#64748b" };
  const payColor = (m) => PAY_COLORS[m] || "#EAB308";
  const paymentTotal = paymentBreakdown.reduce((sum, p) => sum + (Number(p.revenue) || 0), 0);
  const recentSales = data?.recent || [];
  const fmtTime = (iso) => {
    if (!iso) return "-";
    try {
      const d = new Date(iso);
      return d.toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch { return "-"; }
  };

  const loadImageData = (src) => new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext("2d").drawImage(img, 0, 0);
      try { resolve({ url: c.toDataURL("image/png"), w: img.naturalWidth, h: img.naturalHeight }); }
      catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });

  const doExportPDF = async () => {
    if (!data) { toast.error("Data belum siap"); return; }
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    // Header: logo SK + info toko
    const logo = await loadImageData(skLogo);
    if (logo) {
      const h = 15;
      const w = Math.min(48, h * (logo.w / logo.h));
      doc.addImage(logo.url, "PNG", 14, 10, w, h);
    }
    doc.setFontSize(15);
    doc.setTextColor(255, 46, 46);
    doc.text("SK BIKE STORE", pageW - 14, 14, { align: "right" });
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text("Jl Pawan 1, Ketapang, Kalimantan Barat", pageW - 14, 20, { align: "right" });
    doc.text("WhatsApp: 0812-5559-681  ·  IG: @skbike_ketapang", pageW - 14, 25, { align: "right" });
    doc.setDrawColor(255, 46, 46);
    doc.setLineWidth(0.5);
    doc.line(14, 30, pageW - 14, 30);

    doc.setFontSize(14);
    doc.setTextColor(30);
    doc.text("Laporan Penjualan", 14, 39);
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(`Periode: ${periodLabel}`, 14, 45);
    doc.text(`Dibuat: ${new Date().toLocaleString("id-ID")}`, 14, 50);

    autoTable(doc, {
      startY: 56,
      head: [["Ringkasan", "Nilai"]],
      body: [
        ["Omzet", rupiah(s.revenue)],
        ["Laba Kotor", rupiah(s.gross_profit)],
        ["Total Modal", rupiah(s.cost)],
        ["Margin", `${marginPct}%`],
        ["Transaksi", String(s.transactions ?? 0)],
        ["Unit Terjual", String(s.units_sold ?? 0)],
        ["Rata-rata / Transaksi", rupiah(s.avg_transaction_value)],
      ],
      theme: "grid",
      headStyles: { fillColor: [255, 46, 46] },
      styles: { fontSize: 10 },
    });
    autoTable(doc, {
      startY: (doc.lastAutoTable?.finalY || 60) + 8,
      head: [["Tanggal", "Omzet", "Laba", "Transaksi", "Unit"]],
      body: chart.map((c) => [c.label, rupiah(c.revenue), rupiah(c.profit), String(c.transactions), String(c.units)]),
      theme: "striped",
      headStyles: { fillColor: [255, 46, 46] },
      styles: { fontSize: 8 },
    });
    const ts = new Date().toISOString().slice(0, 10);
    doc.save(`laporan-penjualan-skbike-${ts}.pdf`);
    toast.success("Laporan PDF diunduh");
  };
  const statDetails = useMemo(() => ({
    revenue: {
      icon: Wallet, label: "Omzet", value: rupiah(s.revenue), accent: "#FF2E2E",
      chartKey: "revenue", chartType: "area", money: true,
      description: "Total nilai penjualan (harga jual) dari seluruh transaksi pada periode terpilih.",
      rows: [
        { label: "Periode", value: periodLabel },
        { label: "Jumlah Transaksi", value: s.transactions ?? 0 },
        { label: "Total Modal", value: rupiah(s.cost) },
        { label: "Laba Kotor", value: rupiah(s.gross_profit) },
      ],
    },
    profit: {
      icon: TrendingUp, label: "Laba Kotor", value: rupiah(s.gross_profit), accent: "#10B981",
      chartKey: "profit", chartType: "area", money: true,
      description: "Keuntungan kotor = Omzet dikurangi Total Modal. Margin menunjukkan persentase laba terhadap omzet.",
      rows: [
        { label: "Omzet", value: rupiah(s.revenue) },
        { label: "Total Modal", value: rupiah(s.cost) },
        { label: "Margin", value: `${marginPct}%` },
      ],
    },
    transactions: {
      icon: Receipt, label: "Transaksi", value: s.transactions ?? 0, accent: "#3B82F6",
      chartKey: "transactions", chartType: "bar", money: false,
      description: "Jumlah transaksi penjualan yang tercatat pada periode terpilih.",
      rows: [
        { label: "Unit Terjual", value: s.units_sold ?? 0 },
        { label: "Rata-rata / Transaksi", value: rupiah(s.avg_transaction_value) },
      ],
    },
    units: {
      icon: Package, label: "Unit Terjual", value: s.units_sold ?? 0, accent: "#FF7A33",
      chartKey: "units", chartType: "bar", money: false,
      description: "Total jumlah unit barang yang terjual dari semua transaksi pada periode terpilih.",
      rows: [
        { label: "Jumlah Transaksi", value: s.transactions ?? 0 },
        { label: "Omzet", value: rupiah(s.revenue) },
      ],
    },
    avg: {
      icon: Calculator, label: "Rata-rata Transaksi", value: rupiah(s.avg_transaction_value), accent: "#A855F7",
      chartKey: "avg", chartType: "area", money: true,
      description: "Nilai rata-rata per transaksi = Omzet dibagi Jumlah Transaksi.",
      rows: [
        { label: "Omzet", value: rupiah(s.revenue) },
        { label: "Jumlah Transaksi", value: s.transactions ?? 0 },
      ],
    },
    cost: {
      icon: Coins, label: "Total Modal", value: rupiah(s.cost), accent: "#EAB308",
      chartKey: "cost", chartType: "area", money: true,
      description: "Total harga modal (harga beli) dari seluruh barang yang terjual pada periode terpilih.",
      rows: [
        { label: "Omzet", value: rupiah(s.revenue) },
        { label: "Laba Kotor", value: rupiah(s.gross_profit) },
        { label: "Margin", value: `${marginPct}%` },
      ],
    },
  }), [s.revenue, s.cost, s.gross_profit, s.transactions, s.units_sold, s.avg_transaction_value, marginPct, periodLabel]);

  return (
    <div data-testid="admin-dashboard">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white">Dashboard Penjualan</h1>
          <p className="mt-1 text-slate-400 text-sm">Ringkasan omzet, laba, & transaksi secara realtime dari database.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 self-start">
          {data && (
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-[#161F2E] px-4 py-2 text-xs text-slate-300">
              <CalendarRange className="h-4 w-4 text-[#FF2E2E]" />
              {data.start === data.end ? data.start : `${data.start} → ${data.end}`}
            </span>
          )}
          {isSuper && (
            <button data-testid="dashboard-export-pdf" onClick={doExportPDF} className="flex items-center gap-2 rounded-full border border-slate-700 bg-[#161F2E] px-4 py-2.5 text-sm font-semibold text-white hover:border-[#FF2E2E] hover:text-[#FF2E2E] transition-colors">
              <FileDown className="h-4 w-4" /> PDF
            </button>
          )}
          {isSuper && <BackupControls onImported={load} />}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r.key}
            data-testid={`dashboard-range-${r.key}`}
            onClick={() => setRange(r.key)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${range === r.key ? "border-[#FF2E2E] bg-[#FF2E2E]/15 text-white" : "border-slate-700 bg-[#161F2E] text-slate-400 hover:border-slate-500 hover:text-white"}`}
          >
            {r.label}
          </button>
        ))}
        {range === "custom" && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              data-testid="dashboard-custom-start"
              type="date"
              value={custom.start}
              onChange={(e) => setCustom((c) => ({ ...c, start: e.target.value }))}
              className="rounded-lg border border-slate-700 bg-[#161F2E] px-3 py-2 text-sm text-white outline-none focus:border-[#FF2E2E]"
            />
            <span className="text-slate-500">→</span>
            <input
              data-testid="dashboard-custom-end"
              type="date"
              value={custom.end}
              onChange={(e) => setCustom((c) => ({ ...c, end: e.target.value }))}
              className="rounded-lg border border-slate-700 bg-[#161F2E] px-3 py-2 text-sm text-white outline-none focus:border-[#FF2E2E]"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-500"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Memuat data...</div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <StatCard testid="stat-revenue" icon={Wallet} label="Omzet" value={rupiah(s.revenue)} sub={data?.start === data?.end ? "Periode terpilih" : `${chart.length} hari`} accent="#FF2E2E" onClick={() => setSelectedStat(statDetails.revenue)} delta={pct(s.revenue, prev.revenue)} />
            <StatCard testid="stat-profit" icon={TrendingUp} label="Laba Kotor" value={rupiah(s.gross_profit)} sub={`Margin ${marginPct}%`} accent="#10B981" onClick={() => setSelectedStat(statDetails.profit)} delta={pct(s.gross_profit, prev.gross_profit)} />
            <StatCard testid="stat-transactions" icon={Receipt} label="Transaksi" value={s.transactions ?? 0} accent="#3B82F6" onClick={() => setSelectedStat(statDetails.transactions)} delta={pct(s.transactions, prev.transactions)} />
            <StatCard testid="stat-units" icon={Package} label="Unit Terjual" value={s.units_sold ?? 0} accent="#FF7A33" onClick={() => setSelectedStat(statDetails.units)} delta={pct(s.units_sold, prev.units_sold)} />
            <StatCard testid="stat-avg-tx" icon={Calculator} label="Rata-rata Transaksi" value={rupiah(s.avg_transaction_value)} accent="#A855F7" onClick={() => setSelectedStat(statDetails.avg)} delta={pct(s.avg_transaction_value, prev.avg_transaction_value)} />
            <StatCard testid="stat-cost" icon={Coins} label="Total Modal" value={rupiah(s.cost)} accent="#EAB308" onClick={() => setSelectedStat(statDetails.cost)} delta={pct(s.cost, prev.cost)} />
          </div>

          {(prev.start) && (
            <p data-testid="dashboard-prev-note" className="-mt-2 mb-6 text-[11px] text-slate-500">Badge naik/turun dibandingkan periode sebelumnya ({prev.start === prev.end ? prev.start : `${prev.start} → ${prev.end}`}).</p>
          )}

          {/* Stok menipis & pembelian menunggu barang */}
          {(supply.count > 0 || pendingPOs.length > 0) && (
            <div data-testid="dashboard-supply-widget" className="grid md:grid-cols-2 gap-4 mb-6">
              <div data-testid="dashboard-low-stock" className="rounded-2xl border border-slate-800 bg-[#111723] p-5">
                <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-white mb-3"><AlertTriangle className="h-5 w-5 text-amber-400" /> Stok Menipis & Habis <span className="ml-auto rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-xs font-bold text-amber-400">{supply.count}</span></h2>
                {supply.count === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-500">Semua stok aman 👍</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {[...supply.out_of_stock, ...supply.low_stock].slice(0, 8).map((p) => (
                      <div key={p.id} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-[#0A0D14]/60 px-3 py-2">
                        <span className="h-9 w-9 shrink-0 rounded-md bg-[#161F2E] overflow-hidden flex items-center justify-center border border-slate-800">
                          {p.image_url ? <img src={resolveImage(p.image_url)} alt={p.name} className="h-full w-full object-cover" /> : <PackageX className="h-4 w-4 text-slate-600" />}
                        </span>
                        <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white truncate">{p.name}</p><p className="text-[11px] text-slate-500 truncate">{p.category}</p></div>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${p.stock <= 0 ? "bg-red-500/15 text-red-400 border border-red-500/30" : "bg-amber-500/15 text-amber-400 border border-amber-500/30"}`}>{p.stock <= 0 ? "Habis" : `${p.stock} tersisa`}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div data-testid="dashboard-pending-po" className="rounded-2xl border border-slate-800 bg-[#111723] p-5">
                <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-white mb-3"><Truck className="h-5 w-5 text-blue-400" /> Pembelian Menunggu Barang <span className="ml-auto rounded-full bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-xs font-bold text-blue-400">{pendingPOs.length}</span></h2>
                {pendingPOs.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-500">Tidak ada pembelian yang menunggu barang.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {pendingPOs.slice(0, 8).map((o) => (
                      <div key={o.id} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-[#0A0D14]/60 px-3 py-2">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400"><Truck className="h-4 w-4" /></span>
                        <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white truncate">{o.supplier_name || "Supplier"}</p><p className="text-[11px] text-slate-500 truncate">{o.tanggal || "-"} • {o.items?.length || 0} item</p></div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${o.status === "sebagian" ? "bg-blue-500/15 text-blue-300 border border-blue-500/30" : "bg-amber-500/15 text-amber-400 border border-amber-500/30"}`}>{o.status === "sebagian" ? "Sebagian" : "Dipesan"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Produk Terlaris & Metode Pembayaran */}
          <div className="grid lg:grid-cols-2 gap-4 mb-6">
            <div data-testid="dashboard-top-products" className="rounded-2xl border border-slate-800 bg-[#111723] p-5">
              <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-white mb-4"><Trophy className="h-5 w-5 text-[#FF7A33]" /> Produk Terlaris</h2>
              {topProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500"><Package className="h-8 w-8 mb-2 opacity-40" /><p className="text-xs">Belum ada penjualan pada periode ini.</p></div>
              ) : (
                <div className="space-y-2.5">
                  {topProducts.map((p, i) => (
                    <div key={p.name} data-testid={`top-product-${i}`} className="relative overflow-hidden rounded-lg border border-slate-800 bg-[#0A0D14]/60 px-3 py-2">
                      <span className="absolute inset-y-0 left-0 bg-[#FF7A33]/10" style={{ width: `${Math.max(6, (Number(p.revenue) / maxTopRevenue) * 100)}%` }} />
                      <div className="relative flex items-center gap-2.5">
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-black ${i < 3 ? "bg-[#FF7A33] text-[#0A0D14]" : "bg-slate-700 text-slate-300"}`}>{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                          <p className="text-[11px] text-slate-500">{p.units} unit terjual</p>
                        </div>
                        <span className="shrink-0 font-mono-tech text-sm font-bold text-[#10B981]">{rupiah(p.revenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div data-testid="dashboard-payment-breakdown" className="rounded-2xl border border-slate-800 bg-[#111723] p-5">
              <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-white mb-4"><CreditCard className="h-5 w-5 text-[#3B82F6]" /> Metode Pembayaran</h2>
              {paymentBreakdown.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500"><CreditCard className="h-8 w-8 mb-2 opacity-40" /><p className="text-xs">Belum ada transaksi pada periode ini.</p></div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div style={{ width: 160, height: 160 }} className="shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={paymentBreakdown} dataKey="revenue" nameKey="method" cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2} stroke="none">
                          {paymentBreakdown.map((p) => <Cell key={p.method} fill={payColor(p.method)} />)}
                        </Pie>
                        <Tooltip formatter={(v, n) => [rupiah(v), n]} contentStyle={{ background: "#0A0D14", border: "1px solid #334155", borderRadius: 12, fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full flex-1 space-y-2">
                    {paymentBreakdown.map((p) => {
                      const share = paymentTotal ? Math.round((Number(p.revenue) / paymentTotal) * 100) : 0;
                      return (
                        <div key={p.method} data-testid={`payment-row-${p.method}`} className="flex items-center gap-2.5 rounded-lg border border-slate-800 bg-[#0A0D14]/60 px-3 py-2">
                          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: payColor(p.method) }} />
                          <span className="text-sm font-semibold text-white flex-1">{p.method === "Split" ? "Cash+Transfer" : p.method}</span>
                          <div className="text-right">
                            <p className="font-mono-tech text-sm font-bold text-white">{rupiah(p.revenue)}</p>
                            <p className="text-[10px] text-slate-500">{p.count} transaksi · {share}%</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Transaksi Terbaru */}
          <div data-testid="dashboard-recent" className="rounded-2xl border border-slate-800 bg-[#111723] p-5 mb-6">
            <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-white mb-4"><Receipt className="h-5 w-5 text-[#FF2E2E]" /> Transaksi Terbaru</h2>
            {recentSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-500"><Receipt className="h-8 w-8 mb-2 opacity-40" /><p className="text-xs">Belum ada transaksi pada periode ini.</p></div>
            ) : (
              <div className="divide-y divide-slate-800/70">
                {recentSales.map((r, i) => (
                  <div key={r.id || i} data-testid={`recent-sale-${i}`} className="flex items-center gap-3 py-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FF2E2E]/10 border border-[#FF2E2E]/20 text-[#FF2E2E] text-[11px] font-black">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{r.nama_barang}</p>
                      <p className="text-[11px] text-slate-500 truncate">{r.nama_pembeli ? `${r.nama_pembeli} · ` : ""}{fmtTime(r.created_at)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${r.metode_pembayaran === "Cash" ? "border-[#10B981]/40 text-[#10B981]" : r.metode_pembayaran === "Transfer" ? "border-[#3B82F6]/40 text-[#3B82F6]" : "border-slate-600 text-slate-300"}`}>{r.metode_pembayaran === "Split" ? "Cash+Transfer" : r.metode_pembayaran}</span>
                    <span className="shrink-0 w-28 text-right font-mono-tech text-sm font-bold text-white">{rupiah(r.harga_jual)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chart */}
          <div className="rounded-2xl border border-slate-800 bg-[#111723] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-white"><BarChart3 className="h-5 w-5 text-[#FF2E2E]" /> Grafik {chartMode === "transactions" ? "Transaksi" : "Omzet & Laba"}</h2>
              <div className="flex items-center gap-1.5">
                <button data-testid="chart-mode-revenue" onClick={() => setChartMode("revenue")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${chartMode === "revenue" ? "bg-[#FF2E2E] text-white" : "bg-[#161F2E] text-slate-400 hover:text-white"}`}>Omzet & Laba</button>
                <button data-testid="chart-mode-transactions" onClick={() => setChartMode("transactions")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${chartMode === "transactions" ? "bg-[#FF2E2E] text-white" : "bg-[#161F2E] text-slate-400 hover:text-white"}`}>Transaksi</button>
              </div>
            </div>
            {chart.every((c) => !c.revenue && !c.transactions) ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <BarChart3 className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">Belum ada penjualan pada periode ini.</p>
              </div>
            ) : (
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  {chartMode === "revenue" ? (
                    <AreaChart data={chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF2E2E" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="#FF2E2E" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={rupiahShort} width={48} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="revenue" name="Omzet" stroke="#FF2E2E" strokeWidth={2.5} fill="url(#gRev)" dot={singleDay} />
                      <Area type="monotone" dataKey="profit" name="Laba" stroke="#10B981" strokeWidth={2.5} fill="url(#gProfit)" dot={singleDay} />
                    </AreaChart>
                  ) : (
                    <BarChart data={chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: "#ffffff08" }} />
                      <Bar dataKey="transactions" name="Transaksi" fill="#3B82F6" radius={[6, 6, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
      <StatDetailModal metric={selectedStat} chart={chart} onClose={() => setSelectedStat(null)} />
    </div>
  );
}
