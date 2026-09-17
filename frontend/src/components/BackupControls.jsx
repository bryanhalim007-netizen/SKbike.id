import { useRef, useState } from "react";
import { exportBackup, importBackup } from "../lib/api";
import { toast } from "sonner";
import { Download, Upload, FileJson, FileSpreadsheet, ChevronDown, X, Merge, Replace, DatabaseBackup, Loader2, AlertTriangle } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const DATASET_LABELS = {
  products: "Produk",
  sales: "Penjualan",
  services: "Servis",
  purchase_orders: "Pembelian",
  suppliers: "Supplier",
  employees: "Pegawai",
  attendance: "Absensi",
  price_history: "Riwayat Harga",
  pos_transactions: "Transaksi Kasir",
  activity_logs: "Log Aktivitas",
};

export function BackupControls({ onImported }) {
  const [exporting, setExporting] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [mode, setMode] = useState("merge");
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef();

  const doExport = async (format) => {
    setExporting(true);
    try {
      const blob = await exportBackup(format);
      const ts = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
      const ext = format === "excel" ? "xlsx" : "json";
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-skbike-${ts}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Backup diekspor (${format === "excel" ? "Excel" : "JSON"})`);
    } catch (e) {
      toast.error(e?.response?.data?.detail ? String(e.response.data.detail) : "Gagal mengekspor backup");
    } finally {
      setExporting(false);
    }
  };

  const doImport = async () => {
    if (!file) { toast.error("Pilih file backup dulu"); return; }
    setImporting(true);
    try {
      const res = await importBackup(file, mode);
      const parts = Object.entries(res.datasets || {})
        .map(([k, v]) => `${DATASET_LABELS[k] || k}: +${v.created}/~${v.updated}`)
        .join(" · ");
      toast.success(`Restore berhasil (${mode === "replace" ? "Ganti Semua" : "Gabung"}) — ${parts}`);
      setShowImport(false);
      setFile(null);
      onImported?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail ? String(e.response.data.detail) : "Gagal mengimpor backup");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2" data-testid="backup-controls">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button data-testid="backup-export-button" disabled={exporting} className="flex items-center gap-2 rounded-full border border-slate-700 bg-[#161F2E] px-4 py-2.5 text-sm font-semibold text-white hover:border-[#10B981] hover:text-[#10B981] transition-colors disabled:opacity-60">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-[#111723] border-slate-700 text-white">
          <DropdownMenuItem data-testid="backup-export-excel" onClick={() => doExport("excel")} className="cursor-pointer focus:bg-[#161F2E] focus:text-[#10B981]">
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel (.xlsx)
          </DropdownMenuItem>
          <DropdownMenuItem data-testid="backup-export-json" onClick={() => doExport("json")} className="cursor-pointer focus:bg-[#161F2E] focus:text-amber-400">
            <FileJson className="h-4 w-4 mr-2" /> JSON (.json)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button data-testid="backup-import-button" onClick={() => { setFile(null); setMode("merge"); setShowImport(true); }} className="flex items-center gap-2 rounded-full border border-slate-700 bg-[#161F2E] px-4 py-2.5 text-sm font-semibold text-white hover:border-blue-400 hover:text-blue-400 transition-colors">
        <Upload className="h-4 w-4" /> Import
      </button>

      {showImport && (
        <div data-testid="backup-import-modal" className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-sm" onClick={() => !importing && setShowImport(false)}>
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-[#111723] p-6 animate-fade-up">
            <button type="button" onClick={() => !importing && setShowImport(false)} className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
            <div className="flex items-center gap-3 mb-1">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400"><DatabaseBackup className="h-5 w-5" /></span>
              <div>
                <h2 className="font-heading text-lg font-bold text-white">Import Backup</h2>
                <p className="text-xs text-slate-400">Restore semua data (Produk, Penjualan, Pembelian, Supplier, Servis, Pegawai, Absensi, Riwayat Harga, Transaksi Kasir & Log) dari 1 file.</p>
              </div>
            </div>

            <p className="mt-5 text-xs uppercase tracking-wider text-slate-400 mb-2">Mode Import</p>
            <div className="grid grid-cols-2 gap-2">
              <button data-testid="backup-mode-merge" type="button" onClick={() => setMode("merge")} className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${mode === "merge" ? "border-[#FF2E2E] bg-[#FF2E2E]/10" : "border-slate-700 bg-[#0A0D14] hover:border-slate-500"}`}>
                <span className="flex items-center gap-1.5 text-sm font-bold text-white"><Merge className="h-4 w-4 text-[#FF2E2E]" /> Gabung</span>
                <span className="text-[11px] text-slate-400">Perbarui data yang cocok, tambah yang baru.</span>
              </button>
              <button data-testid="backup-mode-replace" type="button" onClick={() => setMode("replace")} className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${mode === "replace" ? "border-red-500 bg-red-500/10" : "border-slate-700 bg-[#0A0D14] hover:border-slate-500"}`}>
                <span className="flex items-center gap-1.5 text-sm font-bold text-white"><Replace className="h-4 w-4 text-red-400" /> Ganti Semua</span>
                <span className="text-[11px] text-slate-400">Hapus semua data lama, ganti dari file.</span>
              </button>
            </div>

            {mode === "replace" && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> Semua data lama (Produk, Penjualan, Pembelian, Supplier, Servis, Pegawai, Absensi, Riwayat Harga, Transaksi Kasir & Log) akan dihapus & diganti dengan isi file. Tidak dapat dibatalkan.
              </div>
            )}

            <input ref={fileRef} type="file" accept=".json,.xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" data-testid="backup-file-input" />
            <button type="button" onClick={() => fileRef.current?.click()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 bg-[#0A0D14] px-4 py-3 text-sm text-slate-300 hover:border-blue-400 hover:text-blue-400 transition-colors">
              <Upload className="h-4 w-4" /> {file ? file.name : "Pilih file (.json / .xlsx)"}
            </button>

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setShowImport(false)} disabled={importing} className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-60">Batal</button>
              <button data-testid="backup-import-confirm" type="button" onClick={doImport} disabled={importing || !file} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#FF2E2E] py-2.5 text-sm font-bold text-white hover:brightness-110 transition-[filter] disabled:opacity-50">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseBackup className="h-4 w-4" />} {importing ? "Mengimpor..." : "Import Sekarang"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
