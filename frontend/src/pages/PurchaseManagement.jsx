import { useEffect, useState, useCallback, useMemo } from "react";
import {
  listSuppliers, createSupplier, updateSupplier, deleteSupplier,
  listPurchaseOrders, createPurchaseOrder, deletePurchaseOrder, receivePurchaseOrder, purchaseSummary,
  adminProducts, resolveImage,
} from "../lib/api";
import { toast } from "sonner";
import {
  Truck, Building2, Plus, Trash2, X, Loader2, Search, PackageX, Save, Pencil,
  ShoppingBag, Wallet, Users, Boxes, ChevronRight, Package as PackageIcon, PackageCheck, Clock,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "../components/ui/alert-dialog";

const rupiah = (n) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");
const parseNum = (t) => { const d = String(t ?? "").replace(/[^0-9]/g, ""); return d ? parseInt(d, 10) : 0; };
const fld = "w-full rounded-lg border border-slate-700 bg-[#0A0D14] px-3 py-2.5 text-sm text-white outline-none focus:border-[#FF2E2E] transition-colors";
const lbl = "block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5";

function StatCard({ icon: Icon, label, value, tone }) {
  const tones = {
    red: "bg-[#FF2E2E]/10 border-[#FF2E2E]/20 text-[#FF2E2E]",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    green: "bg-[#10B981]/10 border-[#10B981]/20 text-[#10B981]",
  };
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#161F2E] p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
        <div className="min-w-0"><p className="text-xs uppercase tracking-wider text-slate-500">{label}</p><p className="font-heading text-lg font-bold text-white leading-tight break-words">{value}</p></div>
      </div>
    </div>
  );
}

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

export default function PurchaseManagement() {
  const [tab, setTab] = useState("po");
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState({ total_orders: 0, total_spend: 0, month_orders: 0, month_spend: 0, supplier_count: 0 });
  const [loading, setLoading] = useState(true);
  const [showPO, setShowPO] = useState(false);
  const [supplierModal, setSupplierModal] = useState(null); // {} for new, {..} for edit
  const [viewPO, setViewPO] = useState(null);
  const [deletePO, setDeletePO] = useState(null);
  const [deleteSup, setDeleteSup] = useState(null);
  const [receiveTarget, setReceiveTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sup, po, prod, sum] = await Promise.all([listSuppliers(), listPurchaseOrders(), adminProducts(), purchaseSummary()]);
      setSuppliers(sup); setOrders(po); setProducts(prod); setSummary(sum);
    } catch { toast.error("Gagal memuat data pembelian"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const supplierName = (id) => suppliers.find((s) => s.id === id)?.nama;

  const onPOSaved = () => { setShowPO(false); load(); };
  const onSupplierSaved = () => { setSupplierModal(null); load(); };

  const confirmDeletePO = async () => {
    const id = deletePO?.id; setDeletePO(null);
    try { await deletePurchaseOrder(id); toast.success("Pembelian dihapus, stok dikembalikan"); load(); }
    catch (e) { toast.error(e?.response?.data?.detail ? String(e.response.data.detail) : "Gagal menghapus"); }
  };
  const confirmDeleteSup = async () => {
    const id = deleteSup?.id; setDeleteSup(null);
    try { await deleteSupplier(id); toast.success("Supplier dihapus"); load(); }
    catch (e) { toast.error(e?.response?.data?.detail ? String(e.response.data.detail) : "Gagal menghapus"); }
  };

  const receivePO = async (po, items) => {
    try { await receivePurchaseOrder(po.id, items); toast.success("Barang diterima, stok ditambahkan"); setReceiveTarget(null); setViewPO(null); load(); }
    catch (e) { toast.error(e?.response?.data?.detail ? String(e.response.data.detail) : "Gagal memproses"); }
  };

  return (
    <div data-testid="purchase-panel">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white flex items-center gap-2"><Truck className="h-7 w-7 text-[#FF2E2E]" /> Supplier & Pembelian</h1>
          <p className="mt-1 text-slate-400 text-sm">Catat kulakan/restock, harga beli, dan kelola data supplier. Stok bertambah otomatis saat pembelian dicatat.</p>
        </div>
        <button data-testid="add-po-button" onClick={() => setShowPO(true)} className="flex items-center justify-center gap-2 rounded-full bg-[#FF2E2E] px-6 py-3 text-sm font-bold text-white cyan-glow hover:scale-105 transition-transform">
          <Plus className="h-4 w-4" /> Catat Pembelian
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Wallet} label="Belanja Bulan Ini" value={rupiah(summary.month_spend)} tone="green" />
        <StatCard icon={ShoppingBag} label="Total Belanja" value={rupiah(summary.total_spend)} tone="blue" />
        <StatCard icon={Boxes} label="Total Pembelian" value={summary.total_orders} tone="amber" />
        <StatCard icon={Users} label="Jumlah Supplier" value={summary.supplier_count} tone="red" />
      </div>

      <div className="mb-6 flex gap-2">
        <button data-testid="tab-po" onClick={() => setTab("po")} className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-colors ${tab === "po" ? "bg-[#FF2E2E] text-white" : "border border-slate-700 bg-[#161F2E] text-slate-400 hover:border-slate-500"}`}><ShoppingBag className="h-4 w-4" /> Pembelian</button>
        <button data-testid="tab-supplier" onClick={() => setTab("supplier")} className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-colors ${tab === "supplier" ? "bg-[#FF2E2E] text-white" : "border border-slate-700 bg-[#161F2E] text-slate-400 hover:border-slate-500"}`}><Building2 className="h-4 w-4" /> Supplier</button>
      </div>

      {tab === "po" && summary.pending_orders > 0 && (
        <div data-testid="pending-banner" className="mb-4 flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <Clock className="h-5 w-5 shrink-0" />
          <span><span className="font-bold">{summary.pending_orders} pesanan</span> menunggu barang datang ({rupiah(summary.pending_spend)}). Stok belum ditambahkan sampai barang ditandai <span className="font-bold">Diterima</span>.</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat...</div>
      ) : tab === "po" ? (
        orders.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-[#111723] py-16 text-center text-slate-500 text-sm">Belum ada pembelian. Klik "Catat Pembelian" untuk mulai restock.</div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-[#111723] overflow-hidden divide-y divide-slate-800/70">
            {orders.map((po) => (
              <button key={po.id} data-testid={`po-row-${po.id}`} onClick={() => setViewPO(po)} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-[#161F2E]/60 transition-colors">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FF2E2E]/10 border border-[#FF2E2E]/20 text-[#FF2E2E]"><ShoppingBag className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate flex items-center gap-2">{po.supplier_name || "Tanpa Supplier"} <StatusBadge status={po.status} /></p>
                  <p className="text-[11px] text-slate-500 truncate">{po.tanggal} • {po.items?.length || 0} item{po.catatan ? ` • ${po.catatan}` : ""}</p>
                </div>
                <span className="shrink-0 font-mono-tech font-bold text-[#10B981]">{rupiah(po.total)}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
              </button>
            ))}
          </div>
        )
      ) : (
        <div>
          <div className="mb-4 flex justify-end">
            <button data-testid="add-supplier-button" onClick={() => setSupplierModal({})} className="flex items-center gap-2 rounded-full border border-slate-700 bg-[#161F2E] px-5 py-2.5 text-sm font-semibold text-white hover:border-[#FF2E2E] hover:text-[#FF2E2E] transition-colors"><Plus className="h-4 w-4" /> Tambah Supplier</button>
          </div>
          {suppliers.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-[#111723] py-16 text-center text-slate-500 text-sm">Belum ada supplier.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suppliers.map((s) => (
                <div key={s.id} data-testid={`supplier-card-${s.id}`} className="rounded-2xl border border-slate-800 bg-[#111723] p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400"><Building2 className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">{s.nama}</p>
                      {s.telepon && <p className="text-xs text-slate-400">{s.telepon}</p>}
                      {s.alamat && <p className="text-xs text-slate-500 mt-0.5">{s.alamat}</p>}
                      {s.catatan && <p className="text-[11px] text-slate-600 mt-1 italic">{s.catatan}</p>}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button data-testid={`supplier-edit-${s.id}`} onClick={() => setSupplierModal(s)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-[#FF2E2E] hover:text-[#FF2E2E] transition-colors"><Pencil className="h-4 w-4" /></button>
                      <button data-testid={`supplier-delete-${s.id}`} onClick={() => setDeleteSup(s)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-red-500 hover:text-red-400 transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showPO && <POFormModal suppliers={suppliers} products={products} onClose={() => setShowPO(false)} onSaved={onPOSaved} />}
      {supplierModal && <SupplierModal supplier={supplierModal} onClose={() => setSupplierModal(null)} onSaved={onSupplierSaved} />}
      {viewPO && <POViewModal po={viewPO} supplierName={supplierName} onClose={() => setViewPO(null)} onDelete={() => { setDeletePO(viewPO); setViewPO(null); }} onReceive={() => { setReceiveTarget(viewPO); setViewPO(null); }} />}
      {receiveTarget && <ReceiveModal po={receiveTarget} onClose={() => setReceiveTarget(null)} onSubmit={(items) => receivePO(receiveTarget, items)} />}

      <AlertDialog open={!!deletePO} onOpenChange={(o) => !o && setDeletePO(null)}>
        <AlertDialogContent className="bg-[#111723] border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Hapus pembelian ini?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Stok yang ditambahkan dari pembelian ini akan <span className="text-white font-semibold">dikembalikan (dikurangi)</span> otomatis.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800">Batal</AlertDialogCancel>
            <AlertDialogAction data-testid="confirm-delete-po" onClick={confirmDeletePO} className="bg-red-600 hover:bg-red-700 text-white">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteSup} onOpenChange={(o) => !o && setDeleteSup(null)}>
        <AlertDialogContent className="bg-[#111723] border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Hapus supplier ini?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400"><span className="text-white font-semibold">{deleteSup?.nama}</span> akan dihapus. Riwayat pembelian tetap tersimpan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800">Batal</AlertDialogCancel>
            <AlertDialogAction data-testid="confirm-delete-supplier" onClick={confirmDeleteSup} className="bg-red-600 hover:bg-red-700 text-white">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SupplierModal({ supplier, onClose, onSaved }) {
  const isEdit = !!supplier?.id;
  const [form, setForm] = useState({ nama: supplier?.nama || "", telepon: supplier?.telepon || "", alamat: supplier?.alamat || "", catatan: supplier?.catatan || "" });
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!form.nama.trim()) { toast.error("Nama supplier wajib diisi"); return; }
    setSaving(true);
    try {
      if (isEdit) { await updateSupplier(supplier.id, form); toast.success("Supplier diperbarui"); }
      else { await createSupplier(form); toast.success("Supplier ditambahkan"); }
      onSaved();
    } catch (e) { toast.error(e?.response?.data?.detail ? String(e.response.data.detail) : "Gagal menyimpan"); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-sm" onClick={() => !saving && onClose()}>
      <div data-testid="supplier-modal" onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-[#111723] p-6 animate-fade-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
        <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2 mb-5"><Building2 className="h-5 w-5 text-[#FF2E2E]" /> {isEdit ? "Edit Supplier" : "Tambah Supplier"}</h2>
        <div className="space-y-3">
          <div><label className={lbl}>Nama Supplier</label><input data-testid="supplier-nama" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="cth. PT Sepeda Jaya" className={fld} /></div>
          <div><label className={lbl}>Telepon</label><input data-testid="supplier-telepon" value={form.telepon} onChange={(e) => setForm({ ...form, telepon: e.target.value })} placeholder="08xxxx" className={fld} /></div>
          <div><label className={lbl}>Alamat</label><input data-testid="supplier-alamat" value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} placeholder="Alamat / kota" className={fld} /></div>
          <div><label className={lbl}>Catatan</label><input data-testid="supplier-catatan" value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} placeholder="cth. spesialis sparepart" className={fld} /></div>
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors">Batal</button>
          <button data-testid="supplier-save" onClick={submit} disabled={saving} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#FF2E2E] py-2.5 text-sm font-bold text-white hover:scale-[1.01] transition-transform disabled:opacity-50">
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

function POViewModal({ po, onClose, onDelete, onReceive }) {
  const dipesan = po.status === "dipesan";
  const partial = po.status === "sebagian";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-sm" onClick={onClose}>
      <div data-testid="po-view-modal" onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-[#111723] max-h-[90vh] overflow-y-auto animate-fade-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white z-10"><X className="h-5 w-5" /></button>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF2E2E]/10 border border-[#FF2E2E]/20 text-[#FF2E2E]"><ShoppingBag className="h-6 w-6" /></span>
            <div className="min-w-0">
              <h2 className="font-heading text-lg font-bold text-white truncate flex items-center gap-2">{po.supplier_name || "Tanpa Supplier"} <StatusBadge status={po.status} /></h2>
              <p className="text-xs text-slate-400">{po.tanggal}{po.created_by ? ` • oleh ${po.created_by}` : ""}</p>
            </div>
          </div>
          {dipesan && <p className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 flex items-center gap-2"><Clock className="h-4 w-4 shrink-0" /> Barang belum sampai. Stok belum ditambahkan ke gudang/toko.</p>}
          {partial && <p className="mb-3 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs text-blue-200 flex items-center gap-2"><PackageCheck className="h-4 w-4 shrink-0" /> Sebagian barang sudah diterima. Sisanya masih dalam pengiriman.</p>}
          {po.catatan && <p className="mb-3 rounded-lg border border-slate-800 bg-[#0A0D14] px-3 py-2 text-xs text-slate-300">{po.catatan}</p>}
          <div className="space-y-2">
            {po.items?.map((it, i) => {
              const recv = Number(it.received_qty || 0);
              const remaining = Number(it.qty || 0) - recv;
              return (
              <div key={i} className="flex justify-between gap-2 rounded-lg border border-slate-800 bg-[#0A0D14] px-3 py-2 text-sm">
                <div className="min-w-0 text-slate-300">
                  {it.name}{it.size ? <span className="text-[#FF7A33]"> • {it.size}</span> : ""}{it.color ? <span className="text-[#FF7A33]"> • {it.color}</span> : ""}
                  <span className="block text-[11px] text-slate-500">{it.qty} x {rupiah(it.unit_cost)}{it.product_id ? "" : " (non-katalog)"}</span>
                  {(recv > 0 || remaining > 0) && (po.status !== "diterima") && (
                    <span className="block text-[11px] mt-0.5"><span className="text-[#10B981] font-semibold">{recv} diterima</span>{remaining > 0 ? <span className="text-amber-400"> • sisa {remaining}</span> : ""}</span>
                  )}
                </div>
                <span className="font-mono-tech text-white shrink-0">{rupiah(it.line_total)}</span>
              </div>
            );})}
          </div>
          <div className="mt-4 flex justify-between border-t border-dashed border-slate-700 pt-3">
            <span className="font-bold text-white">TOTAL</span>
            <span className="font-heading text-xl font-black text-[#10B981]">{rupiah(po.total)}</span>
          </div>
          {(dipesan || partial) && (
            <button data-testid="po-view-receive" onClick={onReceive} className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl bg-[#10B981] py-3 text-sm font-bold text-white hover:brightness-110 transition-[filter]"><PackageCheck className="h-4 w-4" /> Terima Barang{partial ? " (Sisa)" : ""}</button>
          )}
          <button data-testid="po-view-delete" onClick={onDelete} className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl border border-red-500/40 py-2.5 text-sm font-bold text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 className="h-4 w-4" /> Hapus Pembelian{dipesan ? "" : " (kembalikan stok)"}</button>
        </div>
      </div>
    </div>
  );
}

function POFormModal({ suppliers, products, onClose, onSaved }) {
  const [supplierId, setSupplierId] = useState("");
  const [catatan, setCatatan] = useState("");
  const [updateCost, setUpdateCost] = useState(true);
  const [arrived, setArrived] = useState(true);
  const [items, setItems] = useState([]); // {key, product_id, name, code, color, size, qty, unit_cost, variants}
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => !q ? [] : products.filter((p) => p.name.toLowerCase().includes(q) || (p.code || "").toLowerCase().includes(q)).slice(0, 8), [q, products]);

  const addProduct = (p) => {
    const key = `${p.id}-${Date.now()}`;
    const variants = p.variants || [];
    setItems((prev) => [...prev, { key, product_id: p.id, name: p.name, code: p.code || "", color: variants.length ? variants[0].color : null, size: null, qty: 1, unit_cost: Number(p.cost_price) || 0, variants }]);
    setSearch("");
  };
  const addManual = () => setItems((prev) => [...prev, { key: `m-${Date.now()}`, product_id: null, name: "", code: "", color: null, size: null, qty: 1, unit_cost: 0, variants: [] }]);
  const setItem = (key, patch) => setItems((prev) => prev.map((it) => it.key === key ? { ...it, ...patch } : it));
  const removeItem = (key) => setItems((prev) => prev.filter((it) => it.key !== key));

  const total = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unit_cost) || 0), 0);

  const submit = async () => {
    const valid = items.filter((it) => (it.product_id || it.name.trim()) && (Number(it.qty) || 0) > 0);
    if (valid.length === 0) { toast.error("Tambahkan minimal satu item pembelian"); return; }
    setSaving(true);
    try {
      await createPurchaseOrder({
        supplier_id: supplierId || null,
        catatan: catatan.trim() || null,
        update_cost: updateCost,
        status: arrived ? "diterima" : "dipesan",
        items: valid.map((it) => ({ product_id: it.product_id, name: it.name.trim() || "Item", code: it.code, color: it.color, size: it.size, qty: Number(it.qty) || 1, unit_cost: Number(it.unit_cost) || 0 })),
      });
      toast.success(arrived ? "Pembelian dicatat, stok diperbarui" : "Pesanan dicatat (barang belum sampai)");
      onSaved();
    } catch (e) { toast.error(e?.response?.data?.detail ? String(e.response.data.detail) : "Gagal menyimpan pembelian"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-sm" onClick={() => !saving && onClose()}>
      <div data-testid="po-form-modal" onClick={(e) => e.stopPropagation()} className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-[#111723] max-h-[92vh] overflow-y-auto animate-fade-up">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-[#111723] px-6 py-4 border-b border-slate-800">
          <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-[#FF2E2E]" /> Catat Pembelian / Restock</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Supplier</label>
              <select data-testid="po-supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={fld}>
                <option value="">— Tanpa Supplier —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Catatan (opsional)</label>
              <input data-testid="po-catatan" value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="cth. Nota #123 / kulakan mingguan" className={fld} />
            </div>
          </div>

          <div>
            <label className={lbl}>Cari produk untuk restock</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input data-testid="po-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ketik nama / kode produk..." className={`${fld} pl-9`} />
            </div>
            {filtered.length > 0 && (
              <div className="mt-2 rounded-xl border border-slate-700 bg-[#0A0D14] divide-y divide-slate-800/70 overflow-hidden">
                {filtered.map((p) => (
                  <button key={p.id} data-testid={`po-pick-${p.id}`} onClick={() => addProduct(p)} className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[#161F2E] transition-colors">
                    <span className="h-9 w-9 shrink-0 rounded-lg bg-[#111723] overflow-hidden flex items-center justify-center border border-slate-800">
                      {p.image_url ? <img src={resolveImage(p.image_url)} alt="" className="h-full w-full object-cover" /> : <PackageX className="h-4 w-4 text-slate-600" />}
                    </span>
                    <span className="min-w-0 flex-1"><span className="block text-sm text-white truncate">{p.name}</span><span className="block text-[11px] text-slate-500">Stok {p.stock} {p.code ? `• ${p.code}` : ""}</span></span>
                    <Plus className="h-4 w-4 text-[#FF2E2E]" />
                  </button>
                ))}
              </div>
            )}
            <button data-testid="po-add-manual" onClick={addManual} className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-[#FF2E2E] transition-colors"><Plus className="h-3.5 w-3.5" /> Tambah item manual (non-katalog)</button>
          </div>

          <div className="space-y-2">
            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 py-8 text-center text-slate-600 text-sm flex flex-col items-center gap-2"><PackageIcon className="h-7 w-7" /> Belum ada item. Cari produk di atas untuk menambah.</div>
            ) : items.map((it) => (
              <div key={it.key} data-testid={`po-item-${it.key}`} className="rounded-xl border border-slate-800 bg-[#0A0D14] p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  {it.product_id ? (
                    <p className="text-sm font-semibold text-white">{it.name}{it.code ? <span className="text-[11px] text-slate-500 font-mono-tech"> • {it.code}</span> : ""}</p>
                  ) : (
                    <input value={it.name} onChange={(e) => setItem(it.key, { name: e.target.value })} placeholder="Nama item non-katalog" className="flex-1 rounded-lg border border-slate-700 bg-[#111723] px-2 py-1.5 text-sm text-white outline-none focus:border-[#FF2E2E]" />
                  )}
                  <button data-testid={`po-item-remove-${it.key}`} onClick={() => removeItem(it.key)} className="text-slate-500 hover:text-red-400 shrink-0"><X className="h-4 w-4" /></button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {it.variants && it.variants.length > 1 && (
                    <select data-testid={`po-item-color-${it.key}`} value={it.color || ""} onChange={(e) => setItem(it.key, { color: e.target.value })} className="rounded-lg border border-slate-700 bg-[#111723] px-2 py-1.5 text-xs text-white outline-none focus:border-[#FF2E2E]">
                      {it.variants.map((v) => <option key={v.color} value={v.color}>{v.color}</option>)}
                    </select>
                  )}
                  <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-[#111723] px-2">
                    <span className="text-[11px] text-slate-500">Qty</span>
                    <input data-testid={`po-item-qty-${it.key}`} value={it.qty} onChange={(e) => setItem(it.key, { qty: parseNum(e.target.value) })} inputMode="numeric" className="w-14 bg-transparent py-1.5 text-center text-sm text-white outline-none" />
                  </div>
                  <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-[#111723] px-2">
                    <span className="text-[11px] text-slate-500">Harga beli Rp</span>
                    <input data-testid={`po-item-cost-${it.key}`} value={it.unit_cost ? Number(it.unit_cost).toLocaleString("id-ID") : ""} onChange={(e) => setItem(it.key, { unit_cost: parseNum(e.target.value) })} inputMode="numeric" placeholder="0" className="w-28 bg-transparent py-1.5 text-right text-sm text-white outline-none" />
                  </div>
                  <span className="ml-auto text-sm font-bold text-[#10B981] font-mono-tech">{rupiah((Number(it.qty) || 0) * (Number(it.unit_cost) || 0))}</span>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className={lbl}>Status Barang</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" data-testid="po-status-arrived" onClick={() => setArrived(true)} className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-semibold transition-colors ${arrived ? "border-[#10B981] bg-[#10B981]/15 text-[#10B981]" : "border-slate-700 bg-[#0A0D14] text-slate-400 hover:border-slate-500"}`}><PackageCheck className="h-4 w-4" /> Sudah Sampai</button>
              <button type="button" data-testid="po-status-ordered" onClick={() => setArrived(false)} className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-semibold transition-colors ${!arrived ? "border-amber-500 bg-amber-500/15 text-amber-300" : "border-slate-700 bg-[#0A0D14] text-slate-400 hover:border-slate-500"}`}><Clock className="h-4 w-4" /> Belum Sampai</button>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">{arrived ? "Stok langsung ditambahkan ke gudang/toko." : "Stok belum ditambahkan. Tandai 'Diterima' saat barang datang."}</p>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input data-testid="po-update-cost" type="checkbox" checked={updateCost} onChange={(e) => setUpdateCost(e.target.checked)} className="h-4 w-4 rounded border-slate-600 bg-[#0A0D14] accent-[#FF2E2E]" />
            Perbarui harga modal produk dengan harga beli terbaru
          </label>
        </div>

        <div className="sticky bottom-0 flex items-center gap-3 bg-[#111723] px-6 py-4 border-t border-slate-800">
          <div className="flex-1">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">Total Belanja</p>
            <p data-testid="po-total" className="font-heading text-xl font-black text-[#10B981]">{rupiah(total)}</p>
          </div>
          <button onClick={onClose} className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 hover:text-white transition-colors">Batal</button>
          <button data-testid="po-submit" onClick={submit} disabled={saving || items.length === 0} className="flex items-center gap-2 rounded-xl bg-[#FF2E2E] px-6 py-3 text-sm font-bold text-white hover:scale-[1.01] transition-transform disabled:opacity-50">
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} {arrived ? "Simpan & Restock" : "Simpan Pesanan"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReceiveModal({ po, onClose, onSubmit }) {
  const pending = (po.items || []).map((it) => ({ ...it, remaining: Number(it.qty || 0) - Number(it.received_qty || 0) })).filter((it) => it.remaining > 0);
  const [qtys, setQtys] = useState(() => Object.fromEntries(pending.map((it) => [it.id, it.remaining])));
  const [saving, setSaving] = useState(false);

  const setQty = (id, val, max) => setQtys((q) => ({ ...q, [id]: Math.max(0, Math.min(parseNum(val), max)) }));
  const receiveAll = () => setQtys(Object.fromEntries(pending.map((it) => [it.id, it.remaining])));

  const submit = async () => {
    const items = pending.map((it) => ({ item_id: it.id, qty: Number(qtys[it.id] || 0) })).filter((x) => x.qty > 0);
    if (items.length === 0) { toast.error("Isi jumlah barang yang diterima"); return; }
    setSaving(true);
    try { await onSubmit(items); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-sm" onClick={() => !saving && onClose()}>
      <div data-testid="po-receive-modal" onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-[#111723] max-h-[90vh] overflow-y-auto animate-fade-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white z-10"><X className="h-5 w-5" /></button>
        <div className="p-6">
          <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2 mb-1"><PackageCheck className="h-5 w-5 text-[#10B981]" /> Terima Barang</h2>
          <p className="text-xs text-slate-400 mb-4">Isi jumlah yang benar-benar sampai. Sisanya tetap tercatat sebagai "dalam pengiriman".</p>
          <div className="space-y-2">
            {pending.map((it) => (
              <div key={it.id} data-testid={`receive-item-${it.id}`} className="rounded-xl border border-slate-800 bg-[#0A0D14] p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-white">{it.name}{it.color ? <span className="text-[#FF7A33]"> • {it.color}</span> : ""}{it.size ? <span className="text-[#FF7A33]"> • {it.size}</span> : ""}</p>
                  <span className="shrink-0 text-[11px] text-slate-500">Dipesan {it.qty} • diterima {it.received_qty || 0}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-amber-400">Sisa dikirim: {it.remaining}</span>
                  <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-[#111723] px-2">
                    <span className="text-[11px] text-slate-500">Terima</span>
                    <input data-testid={`receive-qty-${it.id}`} value={qtys[it.id] ?? 0} onChange={(e) => setQty(it.id, e.target.value, it.remaining)} inputMode="numeric" className="w-14 bg-transparent py-1.5 text-center text-sm text-white outline-none" />
                    <span className="text-[11px] text-slate-600">/ {it.remaining}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button data-testid="receive-all" onClick={receiveAll} className="mt-3 text-xs font-semibold text-slate-400 hover:text-[#10B981] transition-colors">Terima semua sisa</button>
          <div className="mt-5 flex gap-2">
            <button onClick={onClose} className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors">Batal</button>
            <button data-testid="receive-submit" onClick={submit} disabled={saving} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#10B981] py-2.5 text-sm font-bold text-white hover:brightness-110 transition-[filter] disabled:opacity-50">
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <PackageCheck className="h-5 w-5" />} Terima & Tambah Stok
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

