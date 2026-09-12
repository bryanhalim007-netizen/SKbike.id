import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { resolveImage } from "../lib/api";
import * as store from "../lib/store";
import { useAuth } from "../context/AuthContext";
import { ProductForm } from "../components/ProductForm";
import {
  Bike, LogOut, Plus, Pencil, Trash2, Package, Layers, CheckCircle2, Wallet, ExternalLink, Search, Download, Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "../components/ui/alert-dialog";

const rupiah = (n) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");

function StatCard({ icon: Icon, label, value, testid }) {
  return (
    <div data-testid={testid} className="rounded-2xl border border-slate-800 bg-[#161F2E] p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FF2E2E]/10 border border-[#FF2E2E]/20">
          <Icon className="h-5 w-5 text-[#FF2E2E]" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
          <p className="font-heading text-base sm:text-xl font-bold text-white leading-tight break-words">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({ total_products: 0, total_categories: 0, in_stock: 0, inventory_value: 0 });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Semua");
  const fileInputRef = useRef(null);
  const [pendingImport, setPendingImport] = useState(null);

  const load = useCallback(() => {
    setProducts(store.getProducts({ sort: "newest" }));
    setStats(store.getStats());
  }, []);

  useEffect(() => {
    if (!user) { navigate("/admin/login"); return; }
    load();
  }, [user, load, navigate]);

  const onSaved = () => { setShowForm(false); setEditing(null); load(); };

  const confirmDelete = () => {
    store.deleteProduct(deleteId);
    toast.success("Produk dihapus");
    setDeleteId(null);
    load();
  };

  const handleExport = () => {
    const data = store.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `skbike-data-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Data diekspor (${data.products.length} produk)`);
  };

  const handleFilePick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPendingImport({ text: reader.result, name: file.name });
    reader.onerror = () => toast.error("Gagal membaca file");
    reader.readAsText(file);
  };

  const runImport = (mode) => {
    const res = store.importData(pendingImport.text, { mode });
    if (res.ok) {
      toast.success(mode === "merge" ? `${res.count} produk digabung` : `${res.count} produk diimpor`);
      load();
    } else {
      toast.error(res.error);
    }
    setPendingImport(null);
  };

  if (!user) return <div className="min-h-screen bg-[#0A0D14] flex items-center justify-center text-slate-500">Memuat...</div>;

  const q = search.trim().toLowerCase();
  const catOrder = (c) => { const i = store.CATEGORIES.indexOf(c); return i === -1 ? 999 : i; };
  const filtered = products
    .filter((p) => {
      const matchesQ = !q || p.name.toLowerCase().includes(q) || (p.code || "").toLowerCase().includes(q);
      const matchesCat = catFilter === "Semua" || p.category === catFilter;
      return matchesQ && matchesCat;
    })
    .sort((a, b) => catOrder(a.category) - catOrder(b.category) || a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen bg-[#0A0D14]">
      <header className="sticky top-0 z-40 glass border-b border-slate-800/80">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 flex h-16 sm:h-20 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FF2E2E]">
              <Bike className="h-6 w-6 text-white" />
            </div>
            <div className="leading-none">
              <span className="font-heading text-lg font-extrabold text-white">SK BIKE Admin</span>
              <span className="block text-[10px] uppercase tracking-[0.25em] text-[#FF2E2E]">{user?.email}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="hidden sm:flex items-center gap-1.5 text-sm text-slate-300 hover:text-[#FF2E2E] transition-colors">
              <ExternalLink className="h-4 w-4" /> Lihat Toko
            </Link>
            <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleFilePick} className="hidden" data-testid="admin-import-file-input" />
            <button data-testid="admin-export-button" onClick={handleExport} className="hidden sm:flex items-center gap-2 rounded-full border border-slate-700 bg-[#161F2E] px-4 py-2 text-sm font-semibold text-white hover:border-[#FF2E2E]/60 hover:text-[#FF2E2E] transition-colors">
              <Download className="h-4 w-4" /> Ekspor
            </button>
            <button data-testid="admin-import-button" onClick={() => fileInputRef.current?.click()} className="hidden sm:flex items-center gap-2 rounded-full border border-slate-700 bg-[#161F2E] px-4 py-2 text-sm font-semibold text-white hover:border-[#FF2E2E]/60 hover:text-[#FF2E2E] transition-colors">
              <Upload className="h-4 w-4" /> Impor
            </button>
            <button data-testid="admin-logout-button" onClick={logout} className="flex items-center gap-2 rounded-full border border-slate-700 bg-[#161F2E] px-4 py-2 text-sm font-semibold text-white hover:border-red-500/60 hover:text-red-400 transition-colors">
              <LogOut className="h-4 w-4" /> Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 sm:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white">Dashboard Produk</h1>
            <p className="mt-1 text-slate-400 text-sm">Kelola daftar sepeda, harga, stok, dan spesifikasi. Data tersimpan lokal (offline).</p>
          </div>
          <button data-testid="admin-add-product-button" onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 rounded-full bg-[#FF2E2E] px-6 py-3 text-sm font-bold text-white cyan-glow hover:scale-105 transition-transform">
            <Plus className="h-4 w-4" /> Tambah Sepeda
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard icon={Package} label="Total Sepeda" value={stats.total_products} testid="stat-total-products" />
          <StatCard icon={Layers} label="Total Kategori" value={stats.total_categories} testid="stat-total-categories" />
          <StatCard icon={CheckCircle2} label="Stok Tersedia" value={stats.in_stock} testid="stat-in-stock" />
          <StatCard icon={Wallet} label="Nilai Inventaris" value={rupiah(stats.inventory_value)} testid="stat-inventory-value" />
        </div>

        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              data-testid="admin-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari berdasarkan kode / nama barang..."
              className="w-full rounded-full border border-slate-700 bg-[#161F2E] pl-11 pr-4 py-3 text-sm text-white outline-none focus:border-[#FF2E2E] transition-colors"
            />
          </div>
          <select
            data-testid="admin-category-filter"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="rounded-full border border-slate-700 bg-[#161F2E] px-4 py-3 text-sm text-white outline-none focus:border-[#FF2E2E] transition-colors"
          >
            <option value="Semua">Semua Kategori</option>
            {store.CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="flex gap-3 sm:hidden">
            <button data-testid="admin-export-button-mobile" onClick={handleExport} className="flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-700 bg-[#161F2E] px-4 py-3 text-sm font-semibold text-white hover:border-[#FF2E2E]/60 transition-colors">
              <Download className="h-4 w-4" /> Ekspor
            </button>
            <button data-testid="admin-import-button-mobile" onClick={() => fileInputRef.current?.click()} className="flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-700 bg-[#161F2E] px-4 py-3 text-sm font-semibold text-white hover:border-[#FF2E2E]/60 transition-colors">
              <Upload className="h-4 w-4" /> Impor
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#111723] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-4 font-medium">Sepeda</th>
                  <th className="px-5 py-4 font-medium">Kode</th>
                  <th className="px-5 py-4 font-medium">Kategori</th>
                  <th className="px-5 py-4 font-medium">Harga</th>
                  <th className="px-5 py-4 font-medium">Stok</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">{products.length === 0 ? "Belum ada produk. Tambahkan sepeda pertama Anda." : "Tidak ada produk yang cocok dengan pencarian."}</td></tr>
                ) : filtered.map((p) => (
                  <tr key={p.id} data-testid={`admin-product-row-${p.id}`} className="hover:bg-[#161F2E]/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 rounded-lg bg-[#0A0D14] overflow-hidden">
                          {p.image_url && <img src={resolveImage(p.image_url)} alt={p.name} className="h-full w-full object-cover" />}
                        </div>
                        <span className="font-medium text-white">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono-tech text-slate-300">{p.code || "-"}</td>
                    <td className="px-5 py-4 text-slate-400">{p.category}</td>
                    <td className="px-5 py-4 text-[#FF2E2E] font-mono-tech">{rupiah(p.price)}</td>
                    <td className="px-5 py-4 text-slate-300">{p.stock}</td>
                    <td className="px-5 py-4 text-slate-400">{p.status}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button data-testid={`admin-edit-${p.id}`} onClick={() => { setEditing(p); setShowForm(true); }} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-[#FF2E2E] hover:text-[#FF2E2E] transition-colors">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button data-testid={`admin-delete-${p.id}`} onClick={() => setDeleteId(p.id)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-red-500 hover:text-red-400 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showForm && <ProductForm product={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={onSaved} />}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="bg-[#111723] border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Hapus produk ini?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Tindakan ini tidak dapat dibatalkan. Produk akan dihapus permanen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800">Batal</AlertDialogCancel>
            <AlertDialogAction data-testid="confirm-delete-button" onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingImport} onOpenChange={(o) => !o && setPendingImport(null)}>
        <AlertDialogContent className="bg-[#111723] border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Impor data dari file?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              File: <span className="text-slate-200 font-mono-tech">{pendingImport?.name}</span>.<br />
              Pilih <b className="text-white">Ganti Semua</b> untuk menimpa seluruh produk, atau <b className="text-white">Gabung</b> untuk menambah/memperbarui tanpa menghapus yang ada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 mt-0">Batal</AlertDialogCancel>
            <AlertDialogAction data-testid="import-merge-button" onClick={() => runImport("merge")} className="bg-slate-700 hover:bg-slate-600 text-white">Gabung</AlertDialogAction>
            <AlertDialogAction data-testid="import-replace-button" onClick={() => runImport("replace")} className="bg-[#FF2E2E] hover:bg-red-700 text-white">Ganti Semua</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
