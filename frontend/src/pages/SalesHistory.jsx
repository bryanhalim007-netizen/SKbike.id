import { useEffect, useState, useCallback, useMemo } from "react";
import { listSales, salesSummary, salesDaily, updateSaleStatus, updateSale, deleteSale, returnSale, uploadImage, resolveImage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { History, Loader2, Share2, User, X, ReceiptText, PackageCheck, Clock, Check, TrendingUp, Pencil, Trash2, Image as ImageIcon, MessageCircle, Download, Save, ImageUp, RotateCcw, Undo2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { BackupControls } from "../components/BackupControls";

const rupiah = (n) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");

const buildSaleText = (s) => [
  "*SK BIKE STORE*",
  "————————————",
  s.nama_barang ? `Barang: ${s.nama_barang}` : null,
  s.kode_barang ? `Kode: ${s.kode_barang}` : null,
  s.ukuran_warna ? `Ukuran/Warna: ${s.ukuran_warna}` : null,
  `Harga: ${rupiah(s.harga_jual)}`,
  s.metode_pembayaran ? `Pembayaran: ${s.metode_pembayaran}` : null,
  s.sudah_diambil ? `Status: ${s.sudah_diambil} diambil` : null,
  s.metode_pengambilan ? `Kurir: ${s.metode_pengambilan}` : null,
  s.alamat_pengiriman ? `Alamat: ${s.alamat_pengiriman}` : null,
  s.nama_pembeli ? `Pembeli: ${s.nama_pembeli}` : null,
  s.tanggal_penjualan ? `Tanggal: ${s.tanggal_penjualan}` : null,
  "————————————",
  "Terima kasih telah berbelanja 🚲",
].filter(Boolean).join("\n");

const buildReceiptCanvas = (s) => {
  const rows = [
    ["Tanggal", s.tanggal_penjualan || "-"],
    ["Pembeli", s.nama_pembeli || "-"],
    ["Barang", s.nama_barang || "-"],
    s.kode_barang ? ["Kode", s.kode_barang] : null,
    s.ukuran_warna ? ["Ukuran/Warna", s.ukuran_warna] : null,
    ["Pembayaran", s.metode_pembayaran || "-"],
    ["Status", `${s.sudah_diambil || "-"} diambil`],
    s.metode_pengambilan ? ["Kurir", s.metode_pengambilan] : null,
    s.alamat_pengiriman ? ["Alamat", s.alamat_pengiriman] : null,
  ].filter(Boolean);
  const W = 720, padX = 48, headerH = 150, rowH = 52, priceH = 110, footerH = 70;
  const H = headerH + rows.length * rowH + priceH + footerH;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0F1524"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#FF2E2E"; ctx.fillRect(0, 0, W, 8);
  ctx.fillStyle = "#FFFFFF"; ctx.font = "bold 42px Arial"; ctx.textBaseline = "top";
  ctx.fillText("SK BIKE STORE", padX, 44);
  ctx.fillStyle = "#94a3b8"; ctx.font = "20px Arial";
  ctx.fillText("Struk Penjualan", padX, 96);
  let y = headerH;
  ctx.font = "22px Arial";
  for (const [label, value] of rows) {
    ctx.fillStyle = "#64748b"; ctx.fillText(label, padX, y);
    ctx.fillStyle = "#e2e8f0"; ctx.textAlign = "right";
    const val = String(value); const maxW = W - padX * 2 - 180;
    let text = val;
    while (ctx.measureText(text).width > maxW && text.length > 4) text = text.slice(0, -2);
    if (text !== val) text = text.slice(0, -1) + "…";
    ctx.fillText(text, W - padX, y); ctx.textAlign = "left";
    ctx.strokeStyle = "#1e293b"; ctx.beginPath(); ctx.moveTo(padX, y + 38); ctx.lineTo(W - padX, y + 38); ctx.stroke();
    y += rowH;
  }
  y += 12;
  ctx.fillStyle = "#94a3b8"; ctx.font = "22px Arial"; ctx.fillText("TOTAL", padX, y + 24);
  ctx.fillStyle = "#FF2E2E"; ctx.font = "bold 46px Arial"; ctx.textAlign = "right";
  ctx.fillText(rupiah(s.harga_jual), W - padX, y + 12); ctx.textAlign = "left";
  ctx.fillStyle = "#64748b"; ctx.font = "18px Arial";
  ctx.fillText("Terima kasih telah berbelanja di SK Bike Store", padX, H - footerH + 18);
  return canvas;
};
const rupiahShort = (n) => {
  const v = Number(n) || 0;
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}M`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}jt`;
  if (v >= 1e3) return `${Math.round(v / 1e3)}rb`;
  return String(v);
};
const isTaken = (s) => s.sudah_diambil === "Sudah";

const RANGES = [
  { key: 7, label: "7 Hari" },
  { key: 14, label: "14 Hari" },
  { key: 30, label: "30 Hari" },
];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-700 bg-[#0A0D14] px-3 py-2 shadow-xl">
      <p className="text-xs font-bold text-white mb-1">{label}</p>
      <p className="text-xs text-[#10B981] font-mono-tech">Omzet: {rupiah(d.revenue)}</p>
      <p className="text-xs text-[#FF6B6B] font-mono-tech">Margin: {rupiah(d.margin)}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">{d.transactions} transaksi</p>
    </div>
  );
}

function SalesChart() {
  const [range, setRange] = useState(14);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    salesDaily(range)
      .then((d) => { if (alive) setData(d); })
      .catch(() => toast.error("Gagal memuat grafik penjualan"))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [range]);

  const totals = useMemo(() => {
    const revenue = data.reduce((s, d) => s + (d.revenue || 0), 0);
    const tx = data.reduce((s, d) => s + (d.transactions || 0), 0);
    const days = data.filter((d) => d.transactions > 0).length || 1;
    return { revenue, tx, avg: revenue / days };
  }, [data]);

  return (
    <div data-testid="sales-daily-chart" className="rounded-2xl border border-slate-800 bg-[#111723] p-5 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2"><TrendingUp className="h-5 w-5 text-[#10B981]" /> Tren Penjualan Harian</h2>
          <p className="text-xs text-slate-500 mt-0.5">Omzet {rupiah(totals.revenue)} • {totals.tx} transaksi • rata-rata {rupiah(Math.round(totals.avg))}/hari aktif</p>
        </div>
        <div className="inline-flex items-center rounded-full border border-slate-700 bg-[#0A0D14] p-0.5 self-start">
          {RANGES.map((r) => (
            <button
              key={r.key}
              data-testid={`chart-range-${r.key}`}
              onClick={() => setRange(r.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${range === r.key ? "bg-[#FF2E2E] text-white" : "text-slate-400 hover:text-white"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-500"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat grafik...</div>
      ) : totals.tx === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-sm gap-2"><TrendingUp className="h-8 w-8 text-slate-600" /> Belum ada penjualan pada rentang ini.</div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="marGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6B6B" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#FF6B6B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#1e293b" }} interval="preserveStartEnd" minTickGap={20} />
              <YAxis tickFormatter={rupiahShort} tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#FF2E2E", strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: "#10B981" }} />
              <Area type="monotone" dataKey="margin" stroke="#FF6B6B" strokeWidth={2} fill="url(#marGrad)" dot={false} activeDot={{ r: 4, fill: "#FF6B6B" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="flex items-center gap-5 mt-3 pl-2">
        <span className="flex items-center gap-1.5 text-xs text-slate-400"><span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" /> Omzet</span>
        <span className="flex items-center gap-1.5 text-xs text-slate-400"><span className="h-2.5 w-2.5 rounded-full bg-[#FF6B6B]" /> Margin</span>
      </div>
    </div>
  );
}


export default function SalesHistory() {
  const { user } = useAuth();
  const isSuper = !!user?.is_super;
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState({ total_transactions: 0, total_revenue: 0, total_margin: 0, today_transactions: 0, today_revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [previewImg, setPreviewImg] = useState(null);
  const [pickupFilter, setPickupFilter] = useState("Semua"); // Semua | Sudah | Belum
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [payFilter, setPayFilter] = useState("Semua");
  const [updatingId, setUpdatingId] = useState(null);
  const [detailSale, setDetailSale] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, sum] = await Promise.all([listSales(), salesSummary()]);
      setSales(list);
      setSummary(sum);
    } catch { toast.error("Gagal memuat riwayat penjualan"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (s, status) => {
    if ((s.sudah_diambil || "") === status) return;
    setUpdatingId(s.id);
    setSales((prev) => prev.map((x) => x.id === s.id ? { ...x, sudah_diambil: status } : x));
    try {
      await updateSaleStatus(s.id, { sudah_diambil: status });
      toast.success(status === "Sudah" ? "Ditandai sudah diambil" : "Ditandai belum diambil");
    } catch {
      toast.error("Gagal memperbarui status");
      setSales((prev) => prev.map((x) => x.id === s.id ? { ...x, sudah_diambil: s.sudah_diambil } : x));
    } finally { setUpdatingId(null); }
  };

  const dayOf = (s) => String(s.created_at || "").slice(0, 10);
  const filteredSales = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sales.filter((s) => {
      if (pickupFilter === "Sudah" && !isTaken(s)) return false;
      if (pickupFilter === "Belum" && isTaken(s)) return false;
      if (payFilter !== "Semua" && (s.metode_pembayaran || "") !== payFilter) return false;
      const d = dayOf(s);
      if (dateFrom && d && d < dateFrom) return false;
      if (dateTo && d && d > dateTo) return false;
      if (q && ![s.nama_barang, s.nama_pembeli, s.kode_barang, s.metode_pembayaran].some((v) => (v || "").toLowerCase().includes(q))) return false;
      return true;
    });
  }, [sales, pickupFilter, payFilter, dateFrom, dateTo, search]);

  const exportCSV = () => {
    const head = ["Tanggal", "Pembeli", "Barang", "Kode", "Ukuran/Warna", "Pembayaran", "Status", "Kurir", "Harga Jual", ...(isSuper ? ["Modal", "Margin"] : [])];
    const rows = filteredSales.map((s) => [
      s.tanggal_penjualan || dayOf(s), s.nama_pembeli || "", s.nama_barang || "", s.kode_barang || "",
      s.ukuran_warna || "", s.metode_pembayaran || "", s.sudah_diambil ? `${s.sudah_diambil} diambil` : "",
      s.metode_pengambilan || "", s.harga_jual ?? 0, ...(isSuper ? [s.harga_modal ?? 0, s.margin ?? 0] : []),
    ]);
    const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `penjualan-skbike-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    toast.success(`${filteredSales.length} transaksi diekspor (CSV)`);
  };

  const takenCount = useMemo(() => sales.filter(isTaken).length, [sales]);
  const notTakenCount = sales.length - takenCount;

  const shareTextWA = (s) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(buildSaleText(s))}`, "_blank");
  };

  const shareImageWA = async (s) => {
    try {
      const canvas = buildReceiptCanvas(s);
      const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
      if (!blob) throw new Error("no blob");
      const file = new File([blob], `struk-skbike-${(s.nama_pembeli || "pelanggan").replace(/\s+/g, "-")}.png`, { type: "image/png" });
      const text = buildSaleText(s);
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text, title: "Struk SK Bike Store" });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
      toast.success("Gambar struk diunduh — lampirkan ke WhatsApp");
    } catch (e) {
      if (e?.name === "AbortError") return;
      toast.error("Gagal membuat gambar struk");
    }
  };

  const onSaleSaved = (updated) => {
    setSales((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
    setDetailSale((d) => (d && d.id === updated.id ? { ...d, ...updated } : d));
    salesSummary().then(setSummary).catch(() => {});
  };

  const onSaleDeleted = (id) => {
    setSales((prev) => prev.filter((x) => x.id !== id));
    setDetailSale(null);
    salesSummary().then(setSummary).catch(() => {});
  };

  const grouped = useMemo(() => {
    const map = new Map();
    for (const s of filteredSales) {
      const key = s.owner_email || "—";
      if (!map.has(key)) map.set(key, { name: s.owner_name || key, list: [] });
      map.get(key).list.push(s);
    }
    return Array.from(map.entries());
  }, [filteredSales]);

  const SaleRow = ({ s }) => {
    const taken = isTaken(s);
    const busy = updatingId === s.id;
    const stop = (e) => e.stopPropagation();
    return (
    <div data-testid={`history-sale-row-${s.id}`} onClick={() => setDetailSale(s)} role="button" className="flex items-center gap-3 px-4 sm:px-5 py-4 hover:bg-[#161F2E]/50 transition-colors cursor-pointer">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-sm font-semibold truncate ${s.returned ? "text-slate-500 line-through" : "text-white"}`}>{s.nama_barang || "Barang"}</p>
          {s.metode_pembayaran && <span className="rounded-full bg-slate-700/60 px-2 py-0.5 text-[10px] text-slate-300">{s.metode_pembayaran}</span>}
          {s.returned && <span data-testid={`history-returned-badge-${s.id}`} className="inline-flex items-center gap-1 rounded-full bg-red-500/15 text-red-300 border border-red-500/40 px-2 py-0.5 text-[10px] font-bold"><Undo2 className="h-3 w-3" /> Diretur</span>}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {s.tanggal_penjualan || "-"}{s.nama_pembeli ? ` • ${s.nama_pembeli}` : ""}{s.kode_barang ? ` • ${s.kode_barang}` : ""}
        </p>
        {/* Editable pickup status */}
        <div data-testid={`history-pickup-toggle-${s.id}`} onClick={stop} className="mt-2 inline-flex items-center rounded-lg border border-slate-700 bg-[#0A0D14] p-0.5">
          <button
            data-testid={`history-mark-belum-${s.id}`}
            disabled={busy}
            onClick={(e) => { stop(e); setStatus(s, "Belum"); }}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${!taken ? "bg-amber-500/20 text-amber-300" : "text-slate-500 hover:text-slate-300"}`}
          >
            <Clock className="h-3 w-3" /> Belum diambil
          </button>
          <button
            data-testid={`history-mark-sudah-${s.id}`}
            disabled={busy}
            onClick={(e) => { stop(e); setStatus(s, "Sudah"); }}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${taken ? "bg-[#10B981]/20 text-[#10B981]" : "text-slate-500 hover:text-slate-300"}`}
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Sudah diambil
          </button>
        </div>
        {(s.foto_produk || s.bukti_transfer) && (
          <div className="flex gap-2 mt-2">
            {s.foto_produk && <img src={resolveImage(s.foto_produk)} alt="Foto produk" onClick={(e) => { stop(e); setPreviewImg(resolveImage(s.foto_produk)); }} data-testid={`history-thumb-produk-${s.id}`} className="h-12 w-12 cursor-pointer rounded-lg border border-slate-700 object-cover hover:border-[#FF2E2E] transition-colors" />}
            {s.bukti_transfer && <img src={resolveImage(s.bukti_transfer)} alt="Bukti transfer" onClick={(e) => { stop(e); setPreviewImg(resolveImage(s.bukti_transfer)); }} data-testid={`history-thumb-transfer-${s.id}`} className="h-12 w-12 cursor-pointer rounded-lg border border-slate-700 object-cover hover:border-[#FF2E2E] transition-colors" />}
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-[#FF2E2E] font-mono-tech">{rupiah(s.harga_jual)}</p>
        {isSuper && <p className="text-[11px] text-slate-500">margin {rupiah(s.margin)}</p>}
      </div>
      <div className="flex flex-col gap-1.5 shrink-0" onClick={stop}>
        <button data-testid={`history-edit-${s.id}`} onClick={() => setDetailSale(s)} title="Detail & Edit" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-[#FF2E2E] hover:text-[#FF2E2E] transition-colors"><Pencil className="h-4 w-4" /></button>
        <button data-testid={`history-share-${s.id}`} onClick={() => shareImageWA(s)} title="Bagikan gambar ke WhatsApp" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-[#10B981] hover:text-[#10B981] transition-colors"><Share2 className="h-4 w-4" /></button>
      </div>
    </div>
    );
  };

  return (
    <div data-testid="sales-history-panel">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white flex items-center gap-2"><History className="h-6 w-6 text-[#FF2E2E]" /> History Penjualan</h1>
          <p className="mt-1 text-slate-400 text-sm">{isSuper ? "Riwayat penjualan dari seluruh admin, dikelompokkan per admin." : "Riwayat penjualan Anda."}</p>
        </div>
        {isSuper && <BackupControls onImported={load} />}
      </div>

      <div className="mb-5 flex flex-wrap gap-2" data-testid="history-pickup-filter">
        {[
          { key: "Semua", label: "Semua", count: sales.length, Icon: ReceiptText },
          { key: "Belum", label: "Belum Diambil", count: notTakenCount, Icon: Clock },
          { key: "Sudah", label: "Sudah Diambil", count: takenCount, Icon: PackageCheck },
        ].map(({ key, label, count, Icon }) => (
          <button
            key={key}
            data-testid={`history-filter-${key}`}
            onClick={() => setPickupFilter(key)}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${pickupFilter === key ? "border-[#FF2E2E] bg-[#FF2E2E]/15 text-white" : "border-slate-700 bg-[#161F2E] text-slate-400 hover:border-slate-500"}`}
          >
            <Icon className="h-4 w-4" /> {label}
            <span className={`rounded-full px-2 py-0.5 text-[11px] ${pickupFilter === key ? "bg-[#FF2E2E]/30 text-white" : "bg-slate-700/60 text-slate-300"}`}>{count}</span>
          </button>
        ))}
      </div>

      <div className="mb-5 flex flex-col lg:flex-row lg:items-center gap-3" data-testid="history-advanced-filters">
        <div className="relative flex-1 max-w-xs">
          <ReceiptText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input data-testid="history-search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari barang / pembeli / kode..." className="w-full rounded-full border border-slate-700 bg-[#161F2E] pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-[#FF2E2E] transition-colors" />
        </div>
        <div className="flex items-center gap-2">
          <input data-testid="history-date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-slate-700 bg-[#161F2E] px-3 py-2.5 text-sm text-white outline-none focus:border-[#FF2E2E]" />
          <span className="text-slate-500 text-xs">s/d</span>
          <input data-testid="history-date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-slate-700 bg-[#161F2E] px-3 py-2.5 text-sm text-white outline-none focus:border-[#FF2E2E]" />
        </div>
        <select data-testid="history-payment-filter" value={payFilter} onChange={(e) => setPayFilter(e.target.value)} className="rounded-full border border-slate-700 bg-[#161F2E] px-4 py-2.5 text-sm text-white outline-none focus:border-[#FF2E2E]">
          {["Semua", "Cash", "Transfer", "Split", "Servis"].map((m) => <option key={m} value={m}>{m === "Semua" ? "Semua Pembayaran" : m === "Split" ? "Cash+Transfer" : m}</option>)}
        </select>
        {(search || dateFrom || dateTo || payFilter !== "Semua") && (
          <button data-testid="history-clear-filters" onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setPayFilter("Semua"); }} className="rounded-full border border-slate-700 bg-[#161F2E] px-3 py-2.5 text-xs font-semibold text-slate-400 hover:border-slate-500 hover:text-white transition-colors">Reset</button>
        )}
        <button data-testid="history-export-csv" onClick={exportCSV} disabled={filteredSales.length === 0} className="flex items-center gap-2 rounded-full border border-slate-700 bg-[#161F2E] px-4 py-2.5 text-sm font-semibold text-white hover:border-[#10B981] hover:text-[#10B981] transition-colors disabled:opacity-50 lg:ml-auto"><Download className="h-4 w-4" /> Export CSV</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat...</div>
      ) : filteredSales.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#111723] py-16 text-center text-slate-500 text-sm flex flex-col items-center gap-2"><ReceiptText className="h-8 w-8 text-slate-600" /> {sales.length === 0 ? "Belum ada penjualan tercatat." : `Tidak ada penjualan dengan status "${pickupFilter === "Sudah" ? "sudah diambil" : "belum diambil"}".`}</div>
      ) : isSuper ? (
        <div className="space-y-6">
          {grouped.map(([email, group]) => (
            <div key={email} data-testid={`history-group-${email}`}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FF2E2E]/10 text-[#FF2E2E]"><User className="h-4 w-4" /></span>
                <p className="text-sm font-bold text-white">{group.name}</p>
                <span className="text-xs text-slate-500">{email} • {group.list.length} transaksi</span>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#111723] overflow-hidden divide-y divide-slate-800/70">
                {group.list.map((s) => <SaleRow key={s.id} s={s} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-[#111723] overflow-hidden divide-y divide-slate-800/70">
          {filteredSales.map((s) => <SaleRow key={s.id} s={s} />)}
        </div>
      )}

      {detailSale && (
        <SaleDetailModal
          sale={detailSale}
          isSuper={isSuper}
          onClose={() => setDetailSale(null)}
          onSaved={onSaleSaved}
          onDeleted={onSaleDeleted}
          onShareText={shareTextWA}
          onShareImage={shareImageWA}
          onPreview={setPreviewImg}
        />
      )}

      {previewImg && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90" onClick={() => setPreviewImg(null)}>
          <button onClick={() => setPreviewImg(null)} className="absolute top-5 right-5 text-white/80 hover:text-white"><X className="h-6 w-6" /></button>
          <img data-testid="history-image-preview" src={previewImg} alt="Preview" onClick={(e) => e.stopPropagation()} className="max-h-[90vh] max-w-full rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
}

function SaleDetailModal({ sale, isSuper, onClose, onSaved, onDeleted, onShareText, onShareImage, onPreview }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingField, setUploadingField] = useState(null);
  const [form, setForm] = useState({ ...sale });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const jual = Number(form.harga_jual) || 0;
  const modal = Number(form.harga_modal) || 0;
  const margin = jual - modal;

  const onUpload = (field) => async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingField(field);
    try {
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, [field]: url }));
      toast.success("Foto diunggah");
    } catch { toast.error("Gagal mengunggah foto"); }
    finally { setUploadingField(null); }
  };

  const save = async () => {
    setSaving(true);
    const payload = {
      tanggal_penjualan: form.tanggal_penjualan || null,
      nama_pembeli: form.nama_pembeli || null,
      nama_barang: form.nama_barang || null,
      kode_barang: form.kode_barang || null,
      ukuran_warna: form.ukuran_warna || null,
      kode_huruf: form.kode_huruf || null,
      harga_modal: modal,
      harga_jual: jual,
      margin,
      metode_pembayaran: form.metode_pembayaran || null,
      sudah_diambil: form.sudah_diambil || null,
      metode_pengambilan: form.metode_pengambilan || null,
      alamat_pengiriman: form.alamat_pengiriman || null,
      foto_produk: form.foto_produk || null,
      bukti_transfer: form.bukti_transfer || null,
    };
    try {
      const updated = await updateSale(sale.id, payload);
      toast.success("Transaksi diperbarui");
      onSaved(updated);
      setEditing(false);
    } catch { toast.error("Gagal menyimpan perubahan"); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    if (!window.confirm("Hapus transaksi ini? Tindakan tidak dapat dibatalkan.")) return;
    setDeleting(true);
    try {
      await deleteSale(sale.id);
      toast.success("Transaksi dihapus");
      onDeleted(sale.id);
    } catch { toast.error("Gagal menghapus transaksi"); }
    finally { setDeleting(false); }
  };

  const [returning, setReturning] = useState(false);
  const doReturn = async () => {
    const next = !sale.returned;
    if (next && !window.confirm("Tandai transaksi ini sebagai RETUR? Nilainya akan dikeluarkan dari omset & laba.")) return;
    setReturning(true);
    try {
      const updated = await returnSale(sale.id, next);
      toast.success(next ? "Transaksi ditandai RETUR" : "Retur dibatalkan");
      onSaved(updated);
      onClose();
    } catch { toast.error("Gagal memperbarui status retur"); }
    finally { setReturning(false); }
  };

  const fld = "w-full rounded-lg border border-slate-700 bg-[#0A0D14] px-3 py-2 text-sm text-white outline-none focus:border-[#FF2E2E] transition-colors";
  const lbl = "block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1";

  const Row = ({ label, value }) => (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-slate-800/70">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className="text-sm text-slate-200 text-right break-words">{value || "-"}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-sm" onClick={() => !saving && !deleting && onClose()}>
      <div data-testid="sale-detail-modal" onClick={(e) => e.stopPropagation()} className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-[#111723] max-h-[92vh] overflow-y-auto animate-fade-up">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-[#111723] px-5 py-4 border-b border-slate-800">
          <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2"><ReceiptText className="h-5 w-5 text-[#FF2E2E]" /> {editing ? "Edit Transaksi" : "Detail Transaksi"}</h2>
          <button data-testid="sale-detail-close" onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {!editing ? (
            <>
              <div className="rounded-xl border border-slate-800 bg-[#0A0D14] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider text-slate-500">Total</span>
                  <span className="font-heading text-2xl font-black text-[#FF2E2E] font-mono-tech">{rupiah(sale.harga_jual)}</span>
                </div>
                {isSuper && <p className="text-[11px] text-slate-500">Modal {rupiah(sale.harga_modal)} • Margin {rupiah(sale.margin)}</p>}
              </div>
              <div>
                <Row label="Tanggal" value={sale.tanggal_penjualan} />
                <Row label="Pembeli" value={sale.nama_pembeli} />
                <Row label="Barang" value={sale.nama_barang} />
                <Row label="Kode" value={sale.kode_barang} />
                <Row label="Ukuran / Warna" value={sale.ukuran_warna} />
                <Row label="Pembayaran" value={sale.metode_pembayaran} />
                <Row label="Status" value={sale.sudah_diambil ? `${sale.sudah_diambil} diambil` : null} />
                <Row label="Kurir" value={sale.metode_pengambilan} />
                <Row label="Alamat" value={sale.alamat_pengiriman} />
                <Row label="Kasir" value={sale.owner_email} />
              </div>
              {(sale.foto_produk || sale.bukti_transfer) && (
                <div className="flex gap-3">
                  {sale.foto_produk && <img src={resolveImage(sale.foto_produk)} onClick={() => onPreview(resolveImage(sale.foto_produk))} alt="Produk" className="h-20 w-20 rounded-lg border border-slate-700 object-cover cursor-pointer hover:border-[#FF2E2E]" />}
                  {sale.bukti_transfer && <img src={resolveImage(sale.bukti_transfer)} onClick={() => onPreview(resolveImage(sale.bukti_transfer))} alt="Transfer" className="h-20 w-20 rounded-lg border border-slate-700 object-cover cursor-pointer hover:border-[#FF2E2E]" />}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button data-testid="sale-detail-share-text" onClick={() => onShareText(sale)} className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-[#0A0D14] py-2.5 text-sm font-semibold text-slate-200 hover:border-[#10B981] hover:text-[#10B981] transition-colors"><MessageCircle className="h-4 w-4" /> Share Teks</button>
                <button data-testid="sale-detail-share-image" onClick={() => onShareImage(sale)} className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-[#0A0D14] py-2.5 text-sm font-semibold text-slate-200 hover:border-[#10B981] hover:text-[#10B981] transition-colors"><ImageIcon className="h-4 w-4" /> Share Gambar</button>
              </div>
              <div className="flex gap-2 pt-1">
                <button data-testid="sale-detail-edit" onClick={() => { setForm({ ...sale }); setEditing(true); }} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[#FF2E2E] py-2.5 text-sm font-bold text-white hover:scale-[1.01] transition-transform"><Pencil className="h-4 w-4" /> Edit Transaksi</button>
                <button data-testid="sale-detail-return" onClick={doReturn} disabled={returning} title={sale.returned ? "Batalkan retur" : "Tandai retur / refund"} className={`flex items-center justify-center gap-1.5 rounded-lg border px-4 py-2.5 text-sm font-bold transition-colors disabled:opacity-50 ${sale.returned ? "border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981]/20" : "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"}`}>{returning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}<span className="hidden sm:inline">{sale.returned ? "Batal Retur" : "Retur"}</span></button>
                <button data-testid="sale-detail-delete" onClick={remove} disabled={deleting} className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50">{deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Tanggal</label><input data-testid="edit-tanggal" value={form.tanggal_penjualan || ""} onChange={set("tanggal_penjualan")} className={fld} /></div>
                <div><label className={lbl}>Pembeli</label><input data-testid="edit-pembeli" value={form.nama_pembeli || ""} onChange={set("nama_pembeli")} className={fld} /></div>
                <div className="col-span-2"><label className={lbl}>Nama Barang</label><input data-testid="edit-barang" value={form.nama_barang || ""} onChange={set("nama_barang")} className={fld} /></div>
                <div><label className={lbl}>Kode</label><input data-testid="edit-kode" value={form.kode_barang || ""} onChange={set("kode_barang")} className={fld} /></div>
                <div><label className={lbl}>Ukuran / Warna</label><input data-testid="edit-ukuran" value={form.ukuran_warna || ""} onChange={set("ukuran_warna")} className={fld} /></div>
                {isSuper && <div><label className={lbl}>Harga Modal</label><input data-testid="edit-modal" type="number" value={form.harga_modal ?? ""} onChange={set("harga_modal")} className={fld} /></div>}
                <div><label className={lbl}>Harga Jual</label><input data-testid="edit-jual" type="number" value={form.harga_jual ?? ""} onChange={set("harga_jual")} className={fld} /></div>
                <div><label className={lbl}>Pembayaran</label><input data-testid="edit-pembayaran" value={form.metode_pembayaran || ""} onChange={set("metode_pembayaran")} className={fld} /></div>
                <div>
                  <label className={lbl}>Status</label>
                  <select data-testid="edit-status" value={form.sudah_diambil || "Belum"} onChange={set("sudah_diambil")} className={fld}>
                    <option value="Belum">Belum</option>
                    <option value="Sudah">Sudah</option>
                  </select>
                </div>
                <div><label className={lbl}>Kurir</label><input data-testid="edit-kurir" value={form.metode_pengambilan || ""} onChange={set("metode_pengambilan")} className={fld} /></div>
                <div className="col-span-2"><label className={lbl}>Alamat</label><textarea data-testid="edit-alamat" rows={2} value={form.alamat_pengiriman || ""} onChange={set("alamat_pengiriman")} className={`${fld} resize-none`} /></div>
              </div>
              {isSuper && <div className="rounded-lg border border-slate-800 bg-[#0A0D14] px-3 py-2 text-xs text-slate-400">Margin otomatis: <span className="font-mono-tech text-[#10B981]">{rupiah(margin)}</span></div>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Foto Produk</label>
                  <div className="flex items-center gap-2">
                    {form.foto_produk && <img src={resolveImage(form.foto_produk)} alt="produk" className="h-12 w-12 rounded-lg object-cover border border-slate-700" />}
                    <label className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-600 px-3 py-2 text-xs text-slate-300 hover:border-[#FF2E2E] cursor-pointer">{uploadingField === "foto_produk" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageUp className="h-3.5 w-3.5" />} Ubah<input type="file" accept="image/*" onChange={onUpload("foto_produk")} className="hidden" /></label>
                  </div>
                </div>
                <div>
                  <label className={lbl}>Bukti Transfer</label>
                  <div className="flex items-center gap-2">
                    {form.bukti_transfer && <img src={resolveImage(form.bukti_transfer)} alt="transfer" className="h-12 w-12 rounded-lg object-cover border border-slate-700" />}
                    <label className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-600 px-3 py-2 text-xs text-slate-300 hover:border-[#FF2E2E] cursor-pointer">{uploadingField === "bukti_transfer" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageUp className="h-3.5 w-3.5" />} Ubah<input type="file" accept="image/*" onChange={onUpload("bukti_transfer")} className="hidden" /></label>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button data-testid="sale-detail-cancel" onClick={() => setEditing(false)} disabled={saving} className="flex-1 rounded-lg border border-slate-700 py-2.5 text-sm font-semibold text-slate-300 hover:text-white transition-colors disabled:opacity-50">Batal</button>
                <button data-testid="sale-detail-save" onClick={save} disabled={saving || uploadingField} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[#FF2E2E] py-2.5 text-sm font-bold text-white hover:scale-[1.01] transition-transform disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
