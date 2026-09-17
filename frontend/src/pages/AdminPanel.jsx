import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { resolveImage, adminProducts, adminStats, getLowStock, deleteProduct as apiDeleteProduct, priceHistoryProduct, verifyPin, CATEGORIES, exportProducts, importProducts } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { ProductForm } from "../components/ProductForm";
import CashierPanel from "./CashierPanel";
import Dashboard from "./Dashboard";
import AdminAccounts from "./AdminAccounts";
import ActivityLog from "./ActivityLog";
import Attendance from "./Attendance";
import SalesHistory from "./SalesHistory";
import ServicePanel from "./ServicePanel";
import PurchaseManagement from "./PurchaseManagement";
import SupplierList from "./SupplierList";
import { PinGate } from "../components/PinGate";
import { StockEditorModal } from "../components/StockEditorModal";
import { ProductDetailModal } from "../components/ProductDetailModal";
import skLogo from "../assets/sk-logo.png";
import {
  LogOut, Plus, Pencil, Trash2, Package, Layers, CheckCircle2, Wallet, ExternalLink, Search, Loader2, History, TrendingUp, TrendingDown, X, Settings, Download, Upload, FileJson, FileSpreadsheet, ChevronDown, Merge, Replace, Boxes, Wrench, Users, ScrollText, BarChart3, Bell, PackageX, Truck, Factory, ArrowUp, ArrowDown, ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "../components/ui/alert-dialog";

const rupiah = (n) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");

const STATUS_PILL = {
  "Tersedia": "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40",
  "Stok Terbatas": "bg-amber-500/15 text-amber-300 border-amber-500/40",
  "Inden": "bg-slate-500/15 text-slate-300 border-slate-500/40",
};

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
  const [sortBy, setSortBy] = useState(null); // "price" | "stock" | null
  const [sortDir, setSortDir] = useState("asc");
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [historyProduct, setHistoryProduct] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [stockProduct, setStockProduct] = useState(null);
  const [detailProduct, setDetailProduct] = useState(null);
  const [rawTab, setTab] = useState("dashboard");
  const [unlocked, setUnlocked] = useState({ produk: false, kasir: false });
  const [exporting, setExporting] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importMode, setImportMode] = useState("merge");
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const importFileRef = useRef(null);
  const [lowStock, setLowStock] = useState({ threshold: 3, out_of_stock: [], low_stock: [], count: 0 });
  const lowNotifiedRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const [list, s, ls] = await Promise.all([adminProducts(), adminStats(), getLowStock().catch(() => null)]);
      setProducts(list);
      setStats(s);
      if (ls) {
        setLowStock(ls);
        if (!lowNotifiedRef.current && ls.count > 0) {
          lowNotifiedRef.current = true;
          toast.warning(`${ls.count} produk stok menipis/habis`, { description: "Cek lonceng notifikasi untuk detail." });
        }
      }
    } catch {
      toast.error("Gagal memuat data");
    }
  }, []);

  const doExport = async (format) => {
    setExporting(true);
    try {
      const blob = await exportProducts(format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `produk-skbike-${stamp}.${format === "excel" ? "xlsx" : "json"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Data produk diekspor (${format === "excel" ? "Excel" : "JSON"})`);
    } catch {
      toast.error("Gagal mengekspor data");
    } finally {
      setExporting(false);
    }
  };

  const doImport = async () => {
    if (!importFile) { toast.error("Pilih file terlebih dahulu"); return; }
    setImporting(true);
    try {
      const res = await importProducts(importFile, importMode);
      toast.success(`Import berhasil — ${res.created} baru, ${res.updated} diperbarui (total ${res.total} produk)`);
      setShowImport(false);
      setImportFile(null);
      load();
    } catch (e) {
      const d = e?.response?.data?.detail;
      toast.error(d ? String(d) : "Gagal mengimpor data");
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/admin/login"); return; }
    load();
  }, [user, loading, load, navigate]);

  const onSaved = () => { setShowForm(false); setEditing(null); load(); };

  const openStockFor = (id) => {
    const p = products.find((x) => x.id === id);
    if (p) setStockProduct(p);
    else toast.info("Buka tab Produk untuk mengelola stok item ini");
  };

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

  const isCashier = user?.role === "cashier";
  let tab = rawTab;
  if (isCashier) tab = ["kasir", "service", "history"].includes(rawTab) ? rawTab : "kasir";
  else if (rawTab === "dashboard" && !user?.is_super) tab = "produk";

  const q = search.trim().toLowerCase();
  const catOrder = (c) => { const i = CATEGORIES.indexOf(c); return i === -1 ? 999 : i; };
  const lowThreshold = lowStock.threshold ?? 3;
  const toggleSort = (col) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("asc"); }
  };
  const sortIcon = (col) => {
    if (sortBy !== col) return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-[#FF2E2E]" /> : <ArrowDown className="h-3 w-3 text-[#FF2E2E]" />;
  };
  const filtered = products
    .filter((p) => {
      const matchesQ = !q || p.name.toLowerCase().includes(q) || (p.code || "").toLowerCase().includes(q);
      const matchesCat = catFilter === "Semua" || p.category === catFilter;
      const matchesLow = !onlyLowStock || (Number(p.stock) || 0) <= lowThreshold;
      return matchesQ && matchesCat && matchesLow;
    })
    .sort((a, b) => {
      if (sortBy === "price") { const d = (Number(a.price) || 0) - (Number(b.price) || 0); return sortDir === "asc" ? d : -d; }
      if (sortBy === "stock") { const d = (Number(a.stock) || 0) - (Number(b.stock) || 0); return sortDir === "asc" ? d : -d; }
      return catOrder(a.category) - catOrder(b.category) || a.name.localeCompare(b.name);
    });

  const navGroups = [
    {
      label: "Utama",
      items: [
        user?.is_super && { key: "dashboard", label: "Dashboard", Icon: BarChart3 },
        !isCashier && { key: "produk", label: "Produk", Icon: Package },
        { key: "kasir", label: "Kasir", Icon: Wallet },
      ].filter(Boolean),
    },
    {
      label: "Operasional",
      items: [
        { key: "service", label: "Service", Icon: Wrench },
        !isCashier && { key: "pembelian", label: "Pembelian", Icon: Truck },
        !isCashier && { key: "supplier", label: "Supplier", Icon: Factory },
      ].filter(Boolean),
    },
    {
      label: "Laporan & Data",
      items: [
        { key: "history", label: "Riwayat Jual", Icon: History },
        !isCashier && { key: "absensi", label: "Absensi", Icon: Users },
        user?.is_super && { key: "activity", label: "Log Aktivitas", Icon: ScrollText },
      ].filter(Boolean),
    },
    {
      label: "Sistem",
      items: [
        user?.is_super && { key: "admin", label: "Pengaturan", Icon: Settings },
      ].filter(Boolean),
    },
  ].filter((g) => g.items.length);

  return (
    <div className="min-h-screen bg-[#0A0D14]">
      <header className="sticky top-0 z-40 glass border-b border-slate-800/80">
        <div className="mx-auto max-w-[1600px] px-5 sm:px-8 flex h-16 sm:h-20 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={skLogo} alt="SK Bike Store" className="h-10 w-auto rounded-md" />
            <div className="leading-none">
              <span className="font-heading text-lg font-extrabold text-white">Admin</span>
              <span className="block text-[10px] uppercase tracking-[0.25em] text-[#FF2E2E]">{user?.email}</span>
              <span data-testid="admin-role-badge" className="mt-0.5 inline-block rounded-full bg-slate-700/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-300">{user?.role === "super_admin" ? "Super Admin" : user?.role === "cashier" ? "Kasir" : "Admin"}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="hidden sm:flex items-center gap-1.5 text-sm text-slate-300 hover:text-[#FF2E2E] transition-colors">
              <ExternalLink className="h-4 w-4" /> Lihat Toko
            </Link>
            {!isCashier && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button data-testid="low-stock-bell" title="Notifikasi stok" className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-[#161F2E] text-slate-300 hover:border-amber-400 hover:text-amber-400 transition-colors">
                    <Bell className="h-5 w-5" />
                    {lowStock.count > 0 && (
                      <span data-testid="low-stock-count" className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#FF2E2E] px-1 text-[10px] font-bold text-white animate-pulse">{lowStock.count}</span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 bg-[#111723] border-slate-700 text-white max-h-[26rem] overflow-y-auto p-0">
                  <div className="px-4 py-3 border-b border-slate-800">
                    <p className="text-sm font-bold text-white flex items-center gap-2"><Bell className="h-4 w-4 text-amber-400" /> Notifikasi Stok</p>
                    <p className="text-[11px] text-slate-500">Ambang menipis: ≤ {lowStock.threshold ?? 3} unit</p>
                  </div>
                  {lowStock.count === 0 ? (
                    <p data-testid="low-stock-empty" className="px-4 py-8 text-center text-sm text-slate-500">Semua stok aman ✅</p>
                  ) : (
                    <div className="py-1">
                      {lowStock.out_of_stock?.map((it) => (
                        <button key={it.id} data-testid={`low-stock-item-${it.id}`} onClick={() => openStockFor(it.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#161F2E] transition-colors">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 overflow-hidden">
                            {it.image_url ? <img src={resolveImage(it.image_url)} alt="" className="h-full w-full object-cover" /> : <PackageX className="h-4 w-4" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-white truncate">{it.name}</span>
                            <span className="block text-[11px] text-slate-500 truncate">{it.category}{it.code ? ` • ${it.code}` : ""}</span>
                          </span>
                          <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">HABIS</span>
                        </button>
                      ))}
                      {lowStock.low_stock?.map((it) => (
                        <button key={it.id} data-testid={`low-stock-item-${it.id}`} onClick={() => openStockFor(it.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#161F2E] transition-colors">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-400 overflow-hidden">
                            {it.image_url ? <img src={resolveImage(it.image_url)} alt="" className="h-full w-full object-cover" /> : <PackageX className="h-4 w-4" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-white truncate">{it.name}</span>
                            <span className="block text-[11px] text-slate-500 truncate">{it.category}{it.code ? ` • ${it.code}` : ""}</span>
                          </span>
                          <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">Sisa {it.stock}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {user?.is_super && (
              <button
                data-testid="admin-settings-button"
                onClick={() => setTab("admin")}
                title="Pengaturan Admin"
                className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${tab === "admin" ? "border-[#FF2E2E] bg-[#FF2E2E]/15 text-[#FF2E2E]" : "border-slate-700 bg-[#161F2E] text-slate-300 hover:border-[#FF2E2E] hover:text-[#FF2E2E]"}`}
              >
                <Settings className="h-5 w-5" />
              </button>
            )}
            <button data-testid="admin-logout-button" onClick={logout} className="flex items-center gap-2 rounded-full border border-slate-700 bg-[#161F2E] px-4 py-2 text-sm font-semibold text-white hover:border-red-500/60 hover:text-red-400 transition-colors">
              <LogOut className="h-4 w-4" /> Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-5 sm:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:items-stretch">
          <aside className="lg:w-60 shrink-0 lg:rounded-2xl lg:border lg:border-slate-800/70 lg:bg-[#111723] lg:p-3">
            <nav data-testid="admin-sidebar" className="flex lg:flex-col gap-1.5 overflow-x-auto pb-2 lg:pb-0 lg:sticky lg:top-24">
              {navGroups.map((group) => (
                <div key={group.label} className="flex lg:flex-col gap-1.5 lg:gap-1">
                  <p className="hidden lg:block px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">{group.label}</p>
                  {group.items.map(({ key, label, Icon }) => (
                    <button
                      key={key}
                      data-testid={`admin-tab-${key}`}
                      onClick={() => setTab(key)}
                      className={`group flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wide transition-colors ${tab === key ? "bg-[#FF2E2E] text-white shadow-lg shadow-[#FF2E2E]/20" : "text-slate-400 hover:bg-[#161F2E] hover:text-white"}`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </nav>
          </aside>

          <div className="flex-1 min-w-0">

        {tab === "kasir" ? (
          unlocked.kasir ? <CashierPanel /> : <PinGate title="Kasir" testid="pin-kasir" verify={(pin) => verifyPin("kasir", pin)} onUnlock={() => setUnlocked((u) => ({ ...u, kasir: true }))} />
        ) : tab === "dashboard" ? (
          <Dashboard />
        ) : tab === "service" ? (
          <ServicePanel />
        ) : tab === "pembelian" ? (
          <PurchaseManagement />
        ) : tab === "supplier" ? (
          <SupplierList />
        ) : tab === "history" ? (
          <SalesHistory />
        ) : tab === "absensi" ? (
          <Attendance />
        ) : tab === "admin" ? (
          <AdminAccounts />
        ) : tab === "activity" ? (
          <ActivityLog />
        ) : unlocked.produk ? (
        <>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white">Dashboard Produk</h1>
            <p className="mt-1 text-slate-400 text-sm">Kelola daftar sepeda, harga, stok, dan spesifikasi. Data tersimpan online di server.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button data-testid="admin-export-button" disabled={exporting} className="flex items-center gap-2 rounded-full border border-slate-700 bg-[#161F2E] px-5 py-3 text-sm font-semibold text-white hover:border-[#10B981] hover:text-[#10B981] transition-colors disabled:opacity-60">
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#111723] border-slate-700 text-white">
                <DropdownMenuItem data-testid="export-excel-item" onClick={() => doExport("excel")} className="cursor-pointer focus:bg-[#161F2E] focus:text-[#10B981]">
                  <FileSpreadsheet className="h-4 w-4 mr-2 text-[#10B981]" /> Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="export-json-item" onClick={() => doExport("json")} className="cursor-pointer focus:bg-[#161F2E] focus:text-amber-400">
                  <FileJson className="h-4 w-4 mr-2 text-amber-400" /> JSON (.json)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button data-testid="admin-import-button" onClick={() => { setImportFile(null); setImportMode("merge"); setShowImport(true); }} className="flex items-center gap-2 rounded-full border border-slate-700 bg-[#161F2E] px-5 py-3 text-sm font-semibold text-white hover:border-blue-400 hover:text-blue-400 transition-colors">
              <Upload className="h-4 w-4" /> Import
            </button>
          </div>
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
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            data-testid="admin-lowstock-filter"
            onClick={() => setOnlyLowStock((v) => !v)}
            title={`Tampilkan produk dengan stok ≤ ${lowThreshold}`}
            className={`flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition-colors ${onlyLowStock ? "border-amber-400 bg-amber-400/15 text-amber-300" : "border-slate-700 bg-[#161F2E] text-slate-300 hover:border-amber-400 hover:text-amber-300"}`}
          >
            <PackageX className="h-4 w-4" /> Stok Menipis
            {lowStock.count > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#FF2E2E] px-1 text-[10px] font-bold text-white">{lowStock.count}</span>
            )}
          </button>
          <button data-testid="admin-add-product-button" onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center justify-center gap-2 rounded-full bg-[#FF2E2E] px-6 py-3 text-sm font-bold text-white cyan-glow hover:scale-105 transition-transform sm:ml-auto">
            <Plus className="h-4 w-4" /> Tambah Sepeda
          </button>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#111723] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-[#0f1622] text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-4 font-semibold">Sepeda</th>
                  <th className="px-5 py-4 font-semibold">Kode</th>
                  <th className="px-5 py-4 font-semibold">Kategori</th>
                  <th className="px-5 py-4 font-semibold">
                    <button data-testid="admin-sort-price" onClick={() => toggleSort("price")} className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-white transition-colors">Harga {sortIcon("price")}</button>
                  </th>
                  <th className="px-5 py-4 font-semibold">
                    <button data-testid="admin-sort-stock" onClick={() => toggleSort("stock")} className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-white transition-colors">Stok {sortIcon("stock")}</button>
                  </th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">{products.length === 0 ? "Belum ada produk. Tambahkan sepeda pertama Anda." : "Tidak ada produk yang cocok dengan pencarian."}</td></tr>
                ) : filtered.map((p) => (
                  <tr key={p.id} data-testid={`admin-product-row-${p.id}`} className="hover:bg-[#161F2E]/60 transition-colors">
                    <td className="px-5 py-4">
                      <button type="button" data-testid={`admin-product-detail-${p.id}`} onClick={() => setDetailProduct(p)} title="Lihat detail & stok barang" className="flex items-center gap-3 text-left group">
                        <div className="h-12 w-12 shrink-0 rounded-lg bg-[#0A0D14] overflow-hidden">
                          {p.image_url && <img src={resolveImage(p.image_url)} alt={p.name} className="h-full w-full object-cover" />}
                        </div>
                        <span className="font-medium text-white group-hover:text-[#FF2E2E] transition-colors underline-offset-2 group-hover:underline">{p.name}</span>
                      </button>
                    </td>
                    <td className="px-5 py-4 font-mono-tech text-slate-300">{p.code || "-"}</td>
                    <td className="px-5 py-4"><span className="inline-flex items-center rounded-md bg-slate-800/60 px-2.5 py-1 text-xs text-slate-300">{p.category}</span></td>
                    <td className="px-5 py-4 text-[#FF2E2E] font-mono-tech font-semibold">{rupiah(p.price)}</td>
                    <td className="px-5 py-4">
                      <button data-testid={`admin-stock-badge-${p.id}`} onClick={() => setStockProduct(p)} title="Kelola stok per warna" className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono-tech text-sm transition-colors ${p.stock === 0 ? "border-red-500/40 bg-red-500/10 text-red-400" : p.stock <= 3 ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-slate-700 bg-[#0A0D14] text-slate-200 hover:border-[#FF2E2E]"}`}>
                        <Boxes className="h-3.5 w-3.5" /> {p.stock}
                        {p.variants?.length > 1 && <span className="text-[10px] text-slate-500">/{p.variants.length}w</span>}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${STATUS_PILL[p.status] || STATUS_PILL["Inden"]}`}>{p.status}</span>
                    </td>
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
        ) : <PinGate title="Dashboard Produk" testid="pin-produk" verify={(pin) => verifyPin("produk", pin)} onUnlock={() => setUnlocked((u) => ({ ...u, produk: true }))} />}
          </div>
        </div>
      </main>

      {showForm && <ProductForm product={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={onSaved} />}

      {stockProduct && <StockEditorModal product={stockProduct} onClose={() => setStockProduct(null)} onSaved={() => load()} />}

      {detailProduct && <ProductDetailModal product={detailProduct} onClose={() => setDetailProduct(null)} onManageStock={(p) => { setDetailProduct(null); setStockProduct(p); }} />}

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

      {showImport && (
        <div data-testid="import-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-sm" onClick={() => !importing && setShowImport(false)}>
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-[#111723] p-6 animate-fade-up">
            <button type="button" onClick={() => !importing && setShowImport(false)} className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
            <div className="flex items-center gap-3 mb-1">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400"><Upload className="h-5 w-5" /></span>
              <div>
                <h2 className="font-heading text-lg font-bold text-white">Import Produk</h2>
                <p className="text-xs text-slate-400">Unggah file Excel (.xlsx), CSV, atau JSON hasil export.</p>
              </div>
            </div>

            <p className="mt-5 text-xs uppercase tracking-wider text-slate-400 mb-2">Mode Import</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                data-testid="import-mode-merge"
                onClick={() => setImportMode("merge")}
                className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${importMode === "merge" ? "border-[#FF2E2E] bg-[#FF2E2E]/10" : "border-slate-700 bg-[#0A0D14] hover:border-slate-500"}`}
              >
                <span className="flex items-center gap-1.5 text-sm font-bold text-white"><Merge className="h-4 w-4 text-blue-400" /> Gabung</span>
                <span className="text-[11px] text-slate-400">Tambah produk baru, perbarui yang kode-nya sama.</span>
              </button>
              <button
                data-testid="import-mode-replace"
                onClick={() => setImportMode("replace")}
                className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${importMode === "replace" ? "border-[#FF2E2E] bg-[#FF2E2E]/10" : "border-slate-700 bg-[#0A0D14] hover:border-slate-500"}`}
              >
                <span className="flex items-center gap-1.5 text-sm font-bold text-white"><Replace className="h-4 w-4 text-amber-400" /> Ganti Semua</span>
                <span className="text-[11px] text-slate-400">Hapus semua produk lama, ganti dengan isi file.</span>
              </button>
            </div>

            {importMode === "replace" && (
              <p data-testid="import-replace-warning" className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">⚠️ Semua produk lama akan dihapus permanen dan diganti dengan isi file.</p>
            )}

            <p className="mt-5 text-xs uppercase tracking-wider text-slate-400 mb-2">File</p>
            <input ref={importFileRef} type="file" accept=".json,.xlsx,.xls,.csv" onChange={(e) => setImportFile(e.target.files?.[0] || null)} className="hidden" data-testid="import-file-input" />
            <button
              type="button"
              onClick={() => importFileRef.current?.click()}
              className="flex w-full items-center gap-3 rounded-xl border border-dashed border-slate-600 bg-[#0A0D14] px-4 py-4 text-sm text-slate-300 hover:border-[#FF2E2E] transition-colors"
            >
              <Upload className="h-5 w-5 text-slate-500 shrink-0" />
              <span className="truncate">{importFile ? importFile.name : "Klik untuk memilih file..."}</span>
            </button>

            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => !importing && setShowImport(false)} className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm text-slate-300 hover:text-white transition-colors">Batal</button>
              <button
                data-testid="import-submit-button"
                type="button"
                onClick={doImport}
                disabled={importing || !importFile}
                className="flex items-center gap-2 rounded-xl bg-[#FF2E2E] px-6 py-2.5 text-sm font-bold text-white hover:brightness-110 transition-[filter] disabled:opacity-60"
              >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {importing ? "Mengimpor..." : "Import Sekarang"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
