import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { resolveImage, adminProducts, adminStats, deleteProduct as apiDeleteProduct, getAppInfo, downloadApp, priceHistoryProduct, CATEGORIES } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { ProductForm } from "../components/ProductForm";
import CashierPanel from "./CashierPanel";
import skLogo from "../assets/sk-logo.png";
import {
  LogOut, Plus, Pencil, Trash2, Package, Layers, CheckCircle2, Wallet, ExternalLink, Search, Smartphone, Loader2, History, TrendingUp, TrendingDown, X,
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
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({ total_products: 0, total_categories: 0, in_stock: 0, inventory_value: 0 });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Semua");
  const [appInfo, setAppInfo] = useState({ available: false });
  const [downloading, setDownloading] = useState(false);
  const [historyProduct, setHistoryProduct] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [tab, setTab] = useState("produk");

  const load = useCallback(async () => {
    try {
      const [list, s] = await Promise.all([adminProducts(), adminStats()]);
      setProducts(list);
      setStats(s);
    } catch {
      toast.error("Gagal memuat data");
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/admin/login"); return; }
    load();
    getAppInfo().then(setAppInfo).catch(() => {});
  }, [user, loading, load, navigate]);

  const handleDownloadApp = async () => {
    setDownloading(true);
    try {
      const blob = await downloadApp();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "SK-Bike-Store.apk";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("APK sedang diunduh");
    } catch {
      toast.error("Gagal mengunduh APK");
    } finally {
      setDownloading(false);
    }
  };

  const onSaved = () => { setShowForm(false); setEditing(null); load(); };

  const openHistory = async (p) => {
    setHistoryProduct(p);
    setHistoryLoading(true);
    setHistoryList([]);
    try {
      const list = await priceHistoryProduct(p.id);
      setHistoryList(list);
    } catch {
      toast.error("Gagal memuat riwayat harga");
    } finally {
      setHistoryLoading(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await apiDeleteProduct(deleteId);
      toast.success("Produk dihapus");
    } catch {
      toast.error("Gagal menghapus produk");
    }
    setDeleteId(null);
    load();
  };

  if (loading || !user) return <div className="min-h-screen bg-[#0A0D14] flex items-center justify-center text-slate-500">Memuat...</div>;

  const q = search.trim().toLowerCase();
  const catOrder = (c) => { const i = CATEGORIES.indexOf(c); return i === -1 ? 999 : i; };
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
            <img src={skLogo} alt="SK Bike Store" className="h-10 w-auto rounded-md" />
            <div className="leading-none">
              <span className="font-heading text-lg font-extrabold text-white">Admin</span>
              <span className="block text-[10px] uppercase tracking-[0.25em] text-[#FF2E2E]">{user?.email}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="hidden sm:flex items-center gap-1.5 text-sm text-slate-300 hover:text-[#FF2E2E] transition-colors">
              <ExternalLink className="h-4 w-4" /> Lihat Toko
            </Link>
            {appInfo.available && (
              <button
                data-testid="admin-download-apk-button"
                onClick={handleDownloadApp}
                disabled={downloading}
                className="flex items-center gap-2 rounded-full border border-[#FF2E2E]/50 bg-[#FF2E2E]/10 px-4 py-2 text-sm font-semibold text-[#FF6B6B] hover:bg-[#FF2E2E] hover:text-white transition-colors disabled:opacity-60"
              >
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                <span className="hidden sm:inline">{downloading ? "Mengunduh..." : "Download APK"}</span>
                <span className="sm:hidden">APK</span>
              </button>
            )}
            <button data-testid="admin-logout-button" onClick={logout} className="flex items-center gap-2 rounded-full border border-slate-700 bg-[#161F2E] px-4 py-2 text-sm font-semibold text-white hover:border-red-500/60 hover:text-red-400 transition-colors">
              <LogOut className="h-4 w-4" /> Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 sm:px-8 py-10">
        <div className="flex gap-1 mb-8 border-b border-slate-800">
          <button data-testid="admin-tab-produk" onClick={() => setTab("produk")} className={`px-5 py-3 text-sm font-bold uppercase tracking-wide border-b-2 -mb-px transition-colors ${tab === "produk" ? "border-[#FF2E2E] text-white" : "border-transparent text-slate-500 hover:text-slate-300"}`}>Produk</button>
          <button data-testid="admin-tab-kasir" onClick={() => setTab("kasir")} className={`px-5 py-3 text-sm font-bold uppercase tracking-wide border-b-2 -mb-px transition-colors ${tab === "kasir" ? "border-[#FF2E2E] text-white" : "border-transparent text-slate-500 hover:text-slate-300"}`}>Kasir</button>
        </div>

        {tab === "kasir" ? <CashierPanel /> : (
        <>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white">Dashboard Produk</h1>
            <p className="mt-1 text-slate-400 text-sm">Kelola daftar sepeda, harga, stok, dan spesifikasi. Data tersimpan online di server.</p>
          </div>
          <button data-testid="admin-add-product-button" onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 rounded-full bg-[#FF2E2E] px-6 py-3 text-sm font-bold text-white cyan-glow hover:scale-105 transition-transform">
            <Plus className="h-4 w-4" /> Tambah Sepeda
          </button>
        </div>

        {appInfo.available && (
          <div data-testid="admin-apk-card" className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#FF2E2E]/30 bg-gradient-to-r from-[#FF2E2E]/10 to-transparent p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FF2E2E]/15 border border-[#FF2E2E]/30">
                <Smartphone className="h-6 w-6 text-[#FF2E2E]" />
              </div>
              <div>
                <p className="font-heading font-bold text-white">Aplikasi Android (APK)</p>
                <p className="text-sm text-slate-400">Unduh & pasang aplikasi SK Bike di HP Android. Ukuran ± {(appInfo.size / 1048576).toFixed(1)} MB.</p>
              </div>
            </div>
            <button
              data-testid="admin-download-apk-card-button"
              onClick={handleDownloadApp}
              disabled={downloading}
              className="flex items-center justify-center gap-2 rounded-full bg-[#FF2E2E] px-6 py-3 text-sm font-bold text-white cyan-glow hover:scale-105 transition-transform disabled:opacity-60"
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
              {downloading ? "Mengunduh..." : "Download APK Android"}
            </button>
          </div>
        )}

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
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
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
                        <button data-testid={`admin-history-${p.id}`} onClick={() => openHistory(p)} title="Riwayat Harga" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-400 transition-colors">
                          <History className="h-4 w-4" />
                        </button>
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
        </>
        )}
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

      {historyProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-sm" onClick={() => setHistoryProduct(null)}>
          <div data-testid="price-history-modal" onClick={(e) => e.stopPropagation()} className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-[#111723] p-6 max-h-[85vh] overflow-y-auto animate-fade-up">
            <button type="button" onClick={() => setHistoryProduct(null)} className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 mb-1">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400"><History className="h-5 w-5" /></span>
              <div>
                <h2 className="font-heading text-lg font-bold text-white">Riwayat Perubahan Harga</h2>
                <p className="text-xs text-slate-400">{historyProduct.name} — harga saat ini {rupiah(historyProduct.price)}</p>
              </div>
            </div>

            <div className="mt-5">
              {historyLoading ? (
                <div className="flex items-center justify-center py-10 text-slate-500"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat...</div>
              ) : historyList.length === 0 ? (
                <div className="py-10 text-center text-slate-500 text-sm">Belum ada perubahan harga untuk produk ini.</div>
              ) : (
                <ol className="relative border-l border-slate-800 ml-3 space-y-5">
                  {historyList.map((h) => {
                    const up = h.new_price > h.old_price;
                    const diff = Math.abs(h.new_price - h.old_price);
                    const d = new Date(h.changed_at);
                    return (
                      <li key={h.id} data-testid={`price-history-item-${h.id}`} className="ml-5">
                        <span className={`absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full ${up ? "bg-red-500/20" : "bg-green-500/20"}`}>
                          {up ? <TrendingUp className="h-3 w-3 text-red-400" /> : <TrendingDown className="h-3 w-3 text-green-400" />}
                        </span>
                        <div className="rounded-xl border border-slate-800 bg-[#0A0D14] p-3">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-500 line-through font-mono-tech">{rupiah(h.old_price)}</span>
                            <span className="text-slate-500">→</span>
                            <span className="text-white font-mono-tech font-semibold">{rupiah(h.new_price)}</span>
                            <span className={`ml-auto text-xs font-semibold ${up ? "text-red-400" : "text-green-400"}`}>{up ? "+" : "−"}{rupiah(diff).replace("Rp ", "Rp ")}</span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            {h.changed_by ? ` • oleh ${h.changed_by}` : ""}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
