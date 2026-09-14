import { useEffect, useState, useCallback, useMemo } from "react";
import { listSales, salesSummary, resolveImage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { History, Loader2, Share2, User, X, ReceiptText } from "lucide-react";

const rupiah = (n) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");

export default function SalesHistory() {
  const { user } = useAuth();
  const isSuper = !!user?.is_super;
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState({ total_transactions: 0, total_revenue: 0, total_margin: 0, today_transactions: 0, today_revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [previewImg, setPreviewImg] = useState(null);

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

  const shareWA = (s) => {
    const lines = [
      "*SK BIKE STORE*",
      s.nama_barang ? `Barang: ${s.nama_barang}` : null,
      s.kode_barang ? `Kode: ${s.kode_barang}` : null,
      s.ukuran_warna ? `Ukuran/Warna: ${s.ukuran_warna}` : null,
      `Harga: ${rupiah(s.harga_jual)}`,
      s.metode_pembayaran ? `Pembayaran: ${s.metode_pembayaran}` : null,
      s.sudah_diambil ? `Status: ${s.sudah_diambil} diambil` : null,
      s.metode_pengambilan ? `Pengambilan: ${s.metode_pengambilan}` : null,
      s.alamat_pengiriman ? `Alamat: ${s.alamat_pengiriman}` : null,
      s.tanggal_penjualan ? `Tanggal: ${s.tanggal_penjualan}` : null,
      s.nama_pembeli ? `Pembeli: ${s.nama_pembeli}` : null,
      s.foto_produk ? `Foto Produk: ${resolveImage(s.foto_produk)}` : null,
      s.bukti_transfer ? `Bukti Transfer: ${resolveImage(s.bukti_transfer)}` : null,
    ].filter(Boolean);
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  };

  const grouped = useMemo(() => {
    const map = new Map();
    for (const s of sales) {
      const key = s.owner_email || "—";
      if (!map.has(key)) map.set(key, { name: s.owner_name || key, list: [] });
      map.get(key).list.push(s);
    }
    return Array.from(map.entries());
  }, [sales]);

  const SaleRow = ({ s }) => (
    <div data-testid={`history-sale-row-${s.id}`} className="flex items-center gap-3 px-4 sm:px-5 py-4 hover:bg-[#161F2E]/50 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-white truncate">{s.nama_barang || "Barang"}</p>
          {s.metode_pembayaran && <span className="rounded-full bg-slate-700/60 px-2 py-0.5 text-[10px] text-slate-300">{s.metode_pembayaran}</span>}
          {s.sudah_diambil && <span className={`rounded-full px-2 py-0.5 text-[10px] ${s.sudah_diambil === "Sudah" ? "bg-[#10B981]/15 text-[#10B981]" : "bg-amber-500/15 text-amber-400"}`}>{s.sudah_diambil} diambil</span>}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {s.tanggal_penjualan || "-"}{s.nama_pembeli ? ` • ${s.nama_pembeli}` : ""}{s.kode_barang ? ` • ${s.kode_barang}` : ""}
        </p>
        {(s.foto_produk || s.bukti_transfer) && (
          <div className="flex gap-2 mt-2">
            {s.foto_produk && <img src={resolveImage(s.foto_produk)} alt="Foto produk" onClick={() => setPreviewImg(resolveImage(s.foto_produk))} data-testid={`history-thumb-produk-${s.id}`} className="h-12 w-12 cursor-pointer rounded-lg border border-slate-700 object-cover hover:border-[#FF2E2E] transition-colors" />}
            {s.bukti_transfer && <img src={resolveImage(s.bukti_transfer)} alt="Bukti transfer" onClick={() => setPreviewImg(resolveImage(s.bukti_transfer))} data-testid={`history-thumb-transfer-${s.id}`} className="h-12 w-12 cursor-pointer rounded-lg border border-slate-700 object-cover hover:border-[#FF2E2E] transition-colors" />}
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-[#FF2E2E] font-mono-tech">{rupiah(s.harga_jual)}</p>
        <p className="text-[11px] text-slate-500">margin {rupiah(s.margin)}</p>
      </div>
      <button data-testid={`history-share-${s.id}`} onClick={() => shareWA(s)} title="Bagikan ke WhatsApp" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-[#10B981] hover:text-[#10B981] transition-colors"><Share2 className="h-4 w-4" /></button>
    </div>
  );

  return (
    <div data-testid="sales-history-panel">
      <div className="mb-6">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white flex items-center gap-2"><History className="h-6 w-6 text-[#FF2E2E]" /> History Penjualan</h1>
        <p className="mt-1 text-slate-400 text-sm">{isSuper ? "Riwayat penjualan dari seluruh admin, dikelompokkan per admin." : "Riwayat penjualan Anda."}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-2xl border border-slate-800 bg-[#161F2E] p-4"><p className="text-xs uppercase tracking-wider text-slate-500">Penjualan Hari Ini</p><p className="font-heading text-xl font-bold text-white mt-1">{summary.today_transactions}</p></div>
        <div className="rounded-2xl border border-slate-800 bg-[#161F2E] p-4"><p className="text-xs uppercase tracking-wider text-slate-500">Omzet Hari Ini</p><p className="font-heading text-lg font-bold text-[#10B981] mt-1">{rupiah(summary.today_revenue)}</p></div>
        <div className="rounded-2xl border border-slate-800 bg-[#161F2E] p-4"><p className="text-xs uppercase tracking-wider text-slate-500">Total Penjualan</p><p className="font-heading text-xl font-bold text-white mt-1">{summary.total_transactions}</p></div>
        <div className="rounded-2xl border border-slate-800 bg-[#161F2E] p-4"><p className="text-xs uppercase tracking-wider text-slate-500">Total Margin</p><p className="font-heading text-lg font-bold text-[#FF6B6B] mt-1">{rupiah(summary.total_margin)}</p></div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat...</div>
      ) : sales.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#111723] py-16 text-center text-slate-500 text-sm flex flex-col items-center gap-2"><ReceiptText className="h-8 w-8 text-slate-600" /> Belum ada penjualan tercatat.</div>
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
          {sales.map((s) => <SaleRow key={s.id} s={s} />)}
        </div>
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
