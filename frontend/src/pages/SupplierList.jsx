import { useEffect, useState, useCallback, useMemo } from "react";
import { listSuppliers, adminProducts, listPurchaseOrders, exportSupplier, setPurchaseOrderPaid, resolveImage } from "../lib/api";
import { toast } from "sonner";
import {
  Factory, Building2, Loader2, ChevronDown, Phone, MapPin, StickyNote, PackageX, Boxes,
  Search, Wallet, ShoppingBag, Clock, PackageCheck, ArrowDownWideNarrow, FileSpreadsheet, CircleDollarSign, CheckCircle2,
} from "lucide-react";

const rupiah = (n) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");

function StatusBadge({ status }) {
  if (status === "sebagian") {
    return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/40"><PackageCheck className="h-3 w-3" /> Sebagian</span>;
  }
  const dipesan = status === "dipesan";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${dipesan ? "bg-amber-500/15 text-amber-300 border border-amber-500/40" : "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/40"}`}>
      {dipesan ? <><Clock className="h-3 w-3" /> Dipesan</> : <><PackageCheck className="h-3 w-3" /> Diterima</>}
    </span>
  );
}

export default function SupplierList() {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("spend");
  const [exportingId, setExportingId] = useState(null);
  const [payBusy, setPayBusy] = useState(null);

  const togglePaid = async (o) => {
    const next = !o.paid;
    setPayBusy(o.id);
    setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, paid: next } : x)));
    try {
      await setPurchaseOrderPaid(o.id, next);
      toast.success(next ? "Pembelian ditandai LUNAS" : "Pembelian ditandai BELUM LUNAS");
    } catch {
      toast.error("Gagal memperbarui status bayar");
      setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, paid: o.paid } : x)));
    } finally { setPayBusy(null); }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sup, prod, po] = await Promise.all([listSuppliers(), adminProducts(), listPurchaseOrders()]);
      setSuppliers(sup);
      setProducts(prod);
      setOrders(po);
    } catch {
      toast.error("Gagal memuat data supplier");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const productsOf = (nama) => products.filter((p) => (p.supplier || "").trim() === String(nama || "").trim());
  const ordersOf = (id) => orders.filter((o) => o.supplier_id === id);
  const spendOf = (id) => ordersOf(id).reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const pendingOf = (id) => ordersOf(id).filter((o) => ["dipesan", "sebagian"].includes(o.status));
  const unpaidOf = (id) => ordersOf(id).filter((o) => !o.paid);
  const unpaidTotalOf = (id) => unpaidOf(id).reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const doExport = async (s) => {
    setExportingId(s.id);
    try {
      const blob = await exportSupplier(s.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safe = (s.nama || "supplier").replace(/[^a-z0-9\-_ ]/gi, "").trim().replace(/\s+/g, "-") || "supplier";
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `supplier-${safe}-${stamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Data supplier diekspor (Excel)");
    } catch {
      toast.error("Gagal mengekspor data supplier");
    } finally {
      setExportingId(null);
    }
  };

  const q = search.trim().toLowerCase();
  const matchProduct = (p) => p.name.toLowerCase().includes(q) || (p.code || "").toLowerCase().includes(q);
  const filtered = useMemo(() => {
    let list = !q ? suppliers : suppliers.filter((s) =>
      s.nama.toLowerCase().includes(q) ||
      (s.telepon || "").toLowerCase().includes(q) ||
      productsOf(s.nama).some(matchProduct)
    );
    list = [...list].sort((a, b) =>
      sortBy === "products"
        ? productsOf(b.nama).length - productsOf(a.nama).length
        : spendOf(b.id) - spendOf(a.id)
    );
    return list;
  }, [q, suppliers, products, orders, sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div data-testid="supplier-list-panel">
      <div className="mb-6">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white flex items-center gap-2"><Factory className="h-7 w-7 text-[#FF2E2E]" /> Supplier</h1>
        <p className="mt-1 text-slate-400 text-sm">Daftar supplier beserta produk yang didaftarkan dengan nama supplier tersebut. Tekan nama supplier untuk melihat detail.</p>
      </div>

      <div className="mb-5 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            data-testid="supplier-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari supplier, telepon, atau produk..."
            className="w-full rounded-full border border-slate-700 bg-[#161F2E] pl-11 pr-4 py-3 text-sm text-white outline-none focus:border-[#FF2E2E] transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <span className="hidden sm:flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500"><ArrowDownWideNarrow className="h-3.5 w-3.5" /> Urutkan</span>
          <button
            data-testid="supplier-sort-spend"
            onClick={() => setSortBy("spend")}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${sortBy === "spend" ? "bg-[#FF2E2E] text-white" : "border border-slate-700 bg-[#161F2E] text-slate-400 hover:border-slate-500"}`}
          >Total Belanja</button>
          <button
            data-testid="supplier-sort-products"
            onClick={() => setSortBy("products")}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${sortBy === "products" ? "bg-[#FF2E2E] text-white" : "border border-slate-700 bg-[#161F2E] text-slate-400 hover:border-slate-500"}`}
          >Jumlah Produk</button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat...</div>
      ) : filtered.length === 0 ? (
        <div data-testid="supplier-no-results" className="rounded-2xl border border-slate-800 bg-[#111723] py-16 text-center text-slate-500 text-sm">
          {suppliers.length === 0
            ? <>Belum ada supplier. Tambahkan supplier di menu <span className="text-slate-300 font-semibold">Pembelian → Supplier</span>.</>
            : <>Tidak ada supplier atau produk yang cocok dengan "<span className="text-slate-300 font-semibold">{search}</span>".</>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const items = productsOf(s.nama);
            const supMatch = !q || s.nama.toLowerCase().includes(q) || (s.telepon || "").toLowerCase().includes(q);
            const displayItems = supMatch ? items : items.filter(matchProduct);
            const supOrders = ordersOf(s.id);
            const spend = spendOf(s.id);
            const pending = pendingOf(s.id);
            const unpaid = unpaidOf(s.id);
            const unpaidTotal = unpaidTotalOf(s.id);
            const open = openId === s.id || (q && !supMatch);
            return (
              <div key={s.id} data-testid={`supplier-group-${s.id}`} className="rounded-2xl border border-slate-800 bg-[#111723] overflow-hidden">
                <button
                  data-testid={`supplier-toggle-${s.id}`}
                  onClick={() => setOpenId(open ? null : s.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-[#161F2E]/60 transition-colors"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400"><Building2 className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate flex items-center gap-2">
                      {s.nama}
                      {pending.length > 0 && (
                        <span data-testid={`supplier-pending-badge-${s.id}`} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40 shrink-0">
                          <Clock className="h-3 w-3" /> Menunggu Barang
                        </span>
                      )}
                      {unpaid.length > 0 && (
                        <span data-testid={`supplier-unpaid-badge-${s.id}`} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-red-500/15 text-red-300 border border-red-500/40 shrink-0">
                          <CircleDollarSign className="h-3 w-3" /> {unpaid.length} Belum Lunas
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-500">{items.length} produk • {supOrders.length} pembelian</p>
                  </div>
                  <span className="hidden sm:flex flex-col items-end shrink-0">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">Total Belanja</span>
                    <span data-testid={`supplier-spend-${s.id}`} className="font-mono-tech text-sm font-bold text-[#10B981]">{rupiah(spend)}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-[#FF2E2E]/10 border border-[#FF2E2E]/20 px-2.5 py-0.5 text-xs font-bold text-[#FF2E2E]">{items.length}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
                </button>

                {open && (
                  <div data-testid={`supplier-detail-${s.id}`} className="border-t border-slate-800 px-5 py-4">
                    <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      {pending.length > 0 ? (
                        <div data-testid={`supplier-pending-alert-${s.id}`} className="flex-1 flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
                          <Clock className="h-4 w-4 shrink-0" />
                          <span><span className="font-bold">{pending.length} pembelian</span> menunggu barang datang. Stok belum ditambahkan sampai barang ditandai <span className="font-bold">Diterima</span> di menu Pembelian.</span>
                        </div>
                      ) : <div className="flex-1" />}
                      <button
                        data-testid={`supplier-export-${s.id}`}
                        onClick={() => doExport(s)}
                        disabled={exportingId === s.id}
                        className="flex items-center justify-center gap-2 rounded-full border border-slate-700 bg-[#161F2E] px-5 py-2.5 text-sm font-semibold text-white hover:border-[#10B981] hover:text-[#10B981] transition-colors disabled:opacity-60 shrink-0"
                      >
                        {exportingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} Export Excel
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                      <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-[#0A0D14] px-3 py-2.5 text-sm">
                        <Phone className="h-4 w-4 shrink-0 text-[#10B981]" />
                        <span className="text-slate-300 truncate">{s.telepon || "-"}</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-[#0A0D14] px-3 py-2.5 text-sm">
                        <MapPin className="h-4 w-4 shrink-0 text-blue-400" />
                        <span className="text-slate-300 truncate">{s.alamat || "-"}</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-[#0A0D14] px-3 py-2.5 text-sm">
                        <StickyNote className="h-4 w-4 shrink-0 text-amber-400" />
                        <span className="text-slate-300 truncate">{s.catatan || "-"}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center gap-3 rounded-xl border border-[#10B981]/20 bg-[#10B981]/10 px-4 py-3">
                        <Wallet className="h-5 w-5 shrink-0 text-[#10B981]" />
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">Total Belanja</p>
                          <p className="font-heading text-base font-bold text-white truncate">{rupiah(spend)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3">
                        <ShoppingBag className="h-5 w-5 shrink-0 text-blue-400" />
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">Jumlah Pembelian</p>
                          <p className="font-heading text-base font-bold text-white truncate">{supOrders.length}</p>
                        </div>
                      </div>
                    </div>

                    {unpaid.length > 0 && (
                      <div data-testid={`supplier-payable-${s.id}`} className="mb-4 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                        <CircleDollarSign className="h-5 w-5 shrink-0 text-red-400" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">Hutang / Belum Dibayar</p>
                          <p className="font-heading text-base font-bold text-red-300 truncate">{rupiah(unpaidTotal)}</p>
                        </div>
                        <span className="shrink-0 text-xs text-slate-400">{unpaid.length} dari {supOrders.length} pembelian</span>
                      </div>
                    )}

                    <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Pembelian terbaru</p>
                    {supOrders.length === 0 ? (
                      <div className="mb-4 rounded-xl border border-dashed border-slate-700 py-6 text-center text-slate-600 text-sm flex flex-col items-center gap-2">
                        <ShoppingBag className="h-6 w-6" /> Belum ada pembelian dari supplier ini. Catat di menu <span className="text-slate-400 font-semibold">Pembelian</span>.
                      </div>
                    ) : (
                      <div className="mb-4 rounded-xl border border-slate-800 bg-[#0A0D14] overflow-hidden divide-y divide-slate-800/70">
                        {supOrders.slice(0, 5).map((o) => (
                          <div key={o.id} data-testid={`supplier-order-${o.id}`} className="flex items-center gap-3 px-4 py-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FF2E2E]/10 border border-[#FF2E2E]/20 text-[#FF2E2E]"><ShoppingBag className="h-4 w-4" /></span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-white truncate flex items-center gap-2">{o.tanggal || "-"} <StatusBadge status={o.status} /></p>
                              <p className="text-[11px] text-slate-500 truncate">{o.items?.length || 0} item{o.catatan ? ` • ${o.catatan}` : ""}</p>
                            </div>
                            <button
                              data-testid={`supplier-order-paid-${o.id}`}
                              onClick={() => togglePaid(o)}
                              disabled={payBusy === o.id}
                              title={o.paid ? "Tandai belum lunas" : "Tandai lunas"}
                              className={`shrink-0 flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors disabled:opacity-50 ${o.paid ? "border-[#10B981]/50 bg-[#10B981]/10 text-[#10B981]" : "border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20"}`}
                            >
                              {payBusy === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : o.paid ? <CheckCircle2 className="h-3 w-3" /> : <CircleDollarSign className="h-3 w-3" />}
                              {o.paid ? "Lunas" : "Belum"}
                            </button>
                            <span className="shrink-0 font-mono-tech text-sm font-bold text-[#10B981]">{rupiah(o.total)}</span>
                          </div>
                        ))}
                        {supOrders.length > 5 && (
                          <div className="px-4 py-2 text-center text-[11px] text-slate-500">+{supOrders.length - 5} pembelian lainnya</div>
                        )}
                      </div>
                    )}

                    <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Produk dari supplier ini</p>
                    {displayItems.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-700 py-8 text-center text-slate-600 text-sm flex flex-col items-center gap-2">
                        <PackageX className="h-6 w-6" /> {items.length === 0 ? "Belum ada produk yang memakai supplier ini. Pilih supplier ini saat menambah/edit sepeda." : "Tidak ada produk yang cocok dengan pencarian."}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-800 bg-[#0A0D14] overflow-hidden divide-y divide-slate-800/70">
                        {displayItems.map((p) => (
                          <div key={p.id} data-testid={`supplier-product-${p.id}`} className="flex items-center gap-3 px-4 py-3">
                            <span className="h-11 w-11 shrink-0 rounded-lg bg-[#111723] overflow-hidden flex items-center justify-center border border-slate-800">
                              {p.image_url ? <img src={resolveImage(p.image_url)} alt={p.name} className="h-full w-full object-cover" /> : <PackageX className="h-4 w-4 text-slate-600" />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                              <p className="text-[11px] text-slate-500 truncate">{p.category}{p.code ? ` • ${p.code}` : ""}</p>
                            </div>
                            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#111723] px-2.5 py-1 font-mono-tech text-xs text-slate-200"><Boxes className="h-3.5 w-3.5" /> {p.stock}</span>
                            <span className="shrink-0 font-mono-tech text-sm font-bold text-[#FF2E2E]">{rupiah(p.price)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
