import { useEffect, useMemo, useState, useCallback } from "react";
import { createSale, listSales, updateSale, deleteSale, salesSummary } from "../lib/api";
import { toast } from "sonner";
import {
  Delete, Eye, Receipt as ReceiptIcon, History, ArrowLeft, X, Trash2, Pencil,
  Loader2, Calculator, TrendingUp, Wallet, EyeOff, Keyboard as KeyboardIcon,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "../components/ui/alert-dialog";

// ---- Coded calculator logic (port of Kalkulator repo) ----
const LETTER_TO_DIGIT = { P: "0", Y: "1", F: "2", V: "3", H: "4", K: "5", T: "6", B: "7", R: "8", Q: "9" };
const KEYPAD_LETTERS = ["P", "Y", "F", "V", "H", "K", "T", "B", "R", "Q", "Z"];
function lettersToDigits(letters) {
  let d = "";
  for (const l of letters) {
    if (l === "Z") { if (d.length > 0) d += d[d.length - 1]; }
    else if (LETTER_TO_DIGIT[l] !== undefined) d += LETTER_TO_DIGIT[l];
  }
  return d;
}
function digitsToModal(digits) {
  if (!digits) return 0;
  return parseInt(digits.padEnd(7, "0"), 10);
}

const rupiah = (n) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");
const groupNum = (n) => (Number(n) || 0).toLocaleString("id-ID");
const parseNum = (t) => { const d = String(t || "").replace(/[^0-9]/g, ""); return d ? parseInt(d, 10) : 0; };
const todayISO = () => new Date().toISOString().slice(0, 10);
const isoToLabel = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
};
const QUICK_MARGINS = [100000, 250000, 500000, 1000000];

const emptyForm = {
  tanggal: todayISO(), nama_pembeli: "", nama_barang: "", kode_barang: "", ukuran_warna: "",
  kode_huruf: "", harga_modal: 0, margin: 0,
  metode_pembayaran: "", sudah_diambil: "", metode_pengambilan: "", alamat_pengiriman: "",
};

function Segmented({ value, onChange, options, testid }) {
  return (
    <div className="flex gap-2" data-testid={testid}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          data-testid={`${testid}-${o}`}
          onClick={() => onChange(value === o ? "" : o)}
          className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${value === o ? "border-[#FF2E2E] bg-[#FF2E2E]/15 text-white" : "border-slate-700 bg-[#0A0D14] text-slate-400 hover:border-slate-500"}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export default function CashierPanel() {
  const [view, setView] = useState("calc"); // calc | riwayat
  const [letters, setLetters] = useState([]);
  const [mode, setMode] = useState("calc"); // calc | jual (margin revealed)
  const [marginText, setMarginText] = useState("");
  const [keypadHidden, setKeypadHidden] = useState(false);

  const [showBuyer, setShowBuyer] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [sales, setSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [summary, setSummary] = useState({ total_transactions: 0, total_revenue: 0, total_margin: 0, today_transactions: 0, today_revenue: 0, today_margin: 0 });

  const digits = useMemo(() => lettersToDigits(letters), [letters]);
  const hargaModal = useMemo(() => digitsToModal(digits), [digits]);
  const margin = parseNum(marginText);
  const hargaJual = hargaModal + margin;

  const loadSummary = useCallback(async () => {
    try { setSummary(await salesSummary()); } catch { /* ignore */ }
  }, []);
  const loadSales = useCallback(async () => {
    setLoadingSales(true);
    try { setSales(await listSales()); } catch { toast.error("Gagal memuat riwayat penjualan"); }
    finally { setLoadingSales(false); }
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { if (view === "riwayat") { loadSales(); loadSummary(); } }, [view, loadSales, loadSummary]);

  // ---- Calculator handlers ----
  const pressLetter = (l) => setLetters((prev) => [...prev, l]);
  const backspace = () => setLetters((prev) => prev.slice(0, -1));
  const clearAll = () => { setLetters([]); setMode("calc"); setMarginText(""); };
  const onChangeCode = (text) => {
    const clean = text.toUpperCase().split("").filter((c) => KEYPAD_LETTERS.includes(c));
    setLetters(clean);
  };
  const onCheck = () => {
    if (hargaModal <= 0) { toast.error("Masukkan kode harga dulu"); return; }
    setMode("jual");
  };
  const addMargin = (amt) => setMarginText(groupNum(margin + amt));

  // ---- Sell form ----
  const openSellForm = () => {
    setEditId(null);
    setForm({
      ...emptyForm,
      tanggal: todayISO(),
      kode_huruf: letters.join(""),
      harga_modal: hargaModal,
      margin,
    });
    setShowForm(true);
  };
  const openEdit = (s) => {
    setEditId(s.id);
    setForm({
      tanggal: s.tanggal_penjualan && /\d{4}-\d{2}-\d{2}/.test(s.tanggal_penjualan) ? s.tanggal_penjualan : todayISO(),
      nama_pembeli: s.nama_pembeli || "", nama_barang: s.nama_barang || "", kode_barang: s.kode_barang || "",
      ukuran_warna: s.ukuran_warna || "", kode_huruf: s.kode_huruf || "",
      harga_modal: s.harga_modal || 0, margin: s.margin || 0,
      metode_pembayaran: s.metode_pembayaran || "", sudah_diambil: s.sudah_diambil || "",
      metode_pengambilan: s.metode_pengambilan || "", alamat_pengiriman: s.alamat_pengiriman || "",
      _rawTanggal: s.tanggal_penjualan,
    });
    setShowForm(true);
  };

  const formJual = (Number(form.harga_modal) || 0) + (Number(form.margin) || 0);

  const saveSale = async () => {
    setSaving(true);
    const payload = {
      tanggal_penjualan: isoToLabel(form.tanggal),
      nama_pembeli: form.nama_pembeli || null,
      nama_barang: form.nama_barang || null,
      kode_barang: form.kode_barang || null,
      ukuran_warna: form.ukuran_warna || null,
      kode_huruf: form.kode_huruf || null,
      harga_modal: Number(form.harga_modal) || null,
      harga_jual: formJual || null,
      margin: Number(form.margin) || null,
      metode_pembayaran: form.metode_pembayaran || null,
      sudah_diambil: form.sudah_diambil || null,
      metode_pengambilan: form.metode_pengambilan || null,
      alamat_pengiriman: form.alamat_pengiriman || null,
    };
    try {
      if (editId) { await updateSale(editId, payload); toast.success("Perubahan tersimpan"); }
      else { await createSale(payload); toast.success("Penjualan tersimpan"); }
      setShowForm(false);
      setForm(emptyForm);
      setEditId(null);
      clearAll();
      loadSummary();
      if (view === "riwayat") loadSales();
      else setView("riwayat");
    } catch (err) {
      toast.error(err?.response?.data?.detail ? String(err.response.data.detail) : "Gagal menyimpan");
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    const id = deleteTarget;
    setDeleteTarget(null);
    try { await deleteSale(id); toast.success("Penjualan dihapus"); loadSales(); loadSummary(); }
    catch { toast.error("Gagal menghapus"); }
  };

  const inputCls = "w-full rounded-lg border border-slate-700 bg-[#0A0D14] px-3 py-2.5 text-sm text-white outline-none focus:border-[#FF2E2E] transition-colors";
  const labelCls = "block text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5";

  return (
    <div data-testid="cashier-panel">
      {/* Header + view switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <Calculator className="h-6 w-6 text-[#FF2E2E]" /> Kasir SK Bike
          </h1>
          <p className="mt-1 text-slate-400 text-sm">Kalkulator kode rahasia untuk hitung harga jual & catat penjualan.</p>
        </div>
        <div className="flex gap-2">
          <button data-testid="cashier-view-calc" onClick={() => setView("calc")} className={`rounded-full px-5 py-2.5 text-sm font-bold transition-colors ${view === "calc" ? "bg-[#FF2E2E] text-white" : "border border-slate-700 bg-[#161F2E] text-slate-300 hover:border-[#FF2E2E]"}`}>Kalkulator</button>
          <button data-testid="cashier-view-riwayat" onClick={() => setView("riwayat")} className={`flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold transition-colors ${view === "riwayat" ? "bg-[#FF2E2E] text-white" : "border border-slate-700 bg-[#161F2E] text-slate-300 hover:border-[#FF2E2E]"}`}><History className="h-4 w-4" /> Riwayat</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-2xl border border-slate-800 bg-[#161F2E] p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Penjualan Hari Ini</p>
          <p data-testid="cashier-summary-today-count" className="font-heading text-xl font-bold text-white mt-1">{summary.today_transactions}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-[#161F2E] p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Omzet Hari Ini</p>
          <p className="font-heading text-lg font-bold text-[#10B981] mt-1">{rupiah(summary.today_revenue)}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-[#161F2E] p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Total Penjualan</p>
          <p className="font-heading text-xl font-bold text-white mt-1">{summary.total_transactions}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-[#161F2E] p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Total Margin</p>
          <p className="font-heading text-lg font-bold text-[#FF6B6B] mt-1">{rupiah(summary.total_margin)}</p>
        </div>
      </div>

      {view === "calc" ? (
        <div className="max-w-xl mx-auto space-y-4">
          {/* Kode harga */}
          <div className="rounded-2xl border border-slate-800 bg-[#111723] p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Kode Harga</span>
              {letters.length > 0 && (
                <button data-testid="cashier-clear-code" onClick={clearAll} className="flex items-center gap-1 text-xs font-semibold text-[#FF2E2E] hover:brightness-125"><Trash2 className="h-3.5 w-3.5" /> Hapus</button>
              )}
            </div>
            <input
              data-testid="cashier-code-input"
              value={letters.join("")}
              onChange={(e) => onChangeCode(e.target.value)}
              placeholder="Ketik kode, mis. YVK"
              autoCapitalize="characters"
              autoCorrect="off"
              className="mt-2 w-full bg-transparent font-heading text-4xl tracking-[0.35em] text-white outline-none placeholder:text-slate-700 placeholder:tracking-normal placeholder:text-2xl"
            />
            {digits.length > 0 && <p data-testid="cashier-digits-hint" className="mt-1 font-mono-tech text-base tracking-[0.3em] text-[#FF2E2E]">{digits.split("").join(" ")}</p>}
            <p className="mt-3 text-[11px] text-slate-500">Huruf: P Y F V H K T B R Q Z · Z = ulang angka sebelumnya</p>
          </div>

          {/* Harga modal + jual */}
          <div className="rounded-2xl border border-slate-800 bg-[#111723] p-5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Harga Modal</span>
            <p data-testid="cashier-harga-modal" className="font-heading text-3xl font-bold text-white mt-0.5">{rupiah(hargaModal)}</p>

            {mode === "jual" && (
              <>
                <div className="my-4 h-px bg-slate-800" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Margin</span>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-700 bg-[#0A0D14] px-3">
                  <span className="text-slate-500 font-semibold">Rp</span>
                  <input
                    data-testid="cashier-margin-input"
                    value={marginText}
                    onChange={(e) => setMarginText(groupNum(parseNum(e.target.value)))}
                    inputMode="numeric"
                    placeholder="0"
                    className="flex-1 bg-transparent py-3 font-heading text-2xl text-white outline-none placeholder:text-slate-700"
                  />
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {QUICK_MARGINS.map((amt) => (
                    <button key={amt} data-testid={`cashier-margin-chip-${amt}`} onClick={() => addMargin(amt)} className="rounded-full bg-[#FF2E2E]/15 border border-[#FF2E2E]/30 px-3.5 py-1.5 text-xs font-semibold text-[#FF6B6B] hover:bg-[#FF2E2E]/25 transition-colors">
                      +{amt >= 1000000 ? `${amt / 1000000}jt` : `${amt / 1000}rb`}
                    </button>
                  ))}
                </div>
                <div className="my-4 h-px bg-slate-800" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FF2E2E]">Harga Jual</span>
                <p data-testid="cashier-harga-jual" className="font-heading text-4xl font-bold text-[#FF2E2E] mt-0.5">{rupiah(hargaJual)}</p>
              </>
            )}
          </div>

          {/* Keypad (calc mode) */}
          {mode === "calc" && (
            <>
              <button data-testid="cashier-toggle-keypad" onClick={() => setKeypadHidden((v) => !v)} className="mx-auto flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors">
                {keypadHidden ? <KeyboardIcon className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {keypadHidden ? "Tampilkan Keypad" : "Sembunyikan Keypad"}
              </button>
              {!keypadHidden && (
                <div data-testid="cashier-letter-keypad" className="grid grid-cols-3 gap-3">
                  {KEYPAD_LETTERS.map((l) => (
                    <button key={l} data-testid={`cashier-key-${l}`} onClick={() => pressLetter(l)} className="flex flex-col items-center justify-center rounded-xl border border-slate-700 bg-[#161F2E] py-4 text-white hover:border-[#FF2E2E] active:bg-[#FF2E2E]/20 transition-colors">
                      <span className="font-heading text-2xl leading-none">{l}</span>
                      <span className="mt-1 text-[10px] text-slate-500">{l === "Z" ? "×2" : LETTER_TO_DIGIT[l]}</span>
                    </button>
                  ))}
                  <button data-testid="cashier-key-backspace" onClick={backspace} className="flex items-center justify-center rounded-xl border border-slate-700 bg-[#161F2E] py-4 text-white hover:border-[#FF2E2E] active:bg-[#FF2E2E]/20 transition-colors">
                    <Delete className="h-6 w-6" />
                  </button>
                </div>
              )}
            </>
          )}

          {/* CTAs */}
          {mode === "calc" ? (
            <button data-testid="cashier-check-jual" onClick={onCheck} disabled={hargaModal <= 0} className="w-full rounded-xl bg-[#FF2E2E] py-4 text-sm font-bold uppercase tracking-wide text-white cyan-glow hover:scale-[1.01] transition-transform disabled:opacity-40 disabled:cursor-not-allowed">
              Check Harga Jual
            </button>
          ) : (
            <div className="space-y-3">
              <button data-testid="cashier-back-to-calc" onClick={() => setMode("calc")} className="mx-auto flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors"><ArrowLeft className="h-4 w-4" /> Ubah kode harga</button>
              <div className="grid grid-cols-2 gap-3">
                <button data-testid="cashier-view-buyer" onClick={() => setShowBuyer(true)} className="flex items-center justify-center gap-2 rounded-xl border border-slate-600 bg-[#161F2E] py-3.5 text-sm font-bold text-white hover:border-[#FF2E2E] transition-colors">
                  <Eye className="h-5 w-5" /> Harga ke Pembeli
                </button>
                <button data-testid="cashier-open-sell" onClick={openSellForm} className="flex items-center justify-center gap-2 rounded-xl bg-[#FF2E2E] py-3.5 text-sm font-bold text-white cyan-glow hover:scale-[1.02] transition-transform">
                  <ReceiptIcon className="h-5 w-5" /> Barang Terjual
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ---- Riwayat ---- */
        <div className="rounded-2xl border border-slate-800 bg-[#111723] overflow-hidden">
          {loadingSales ? (
            <div className="flex items-center justify-center py-16 text-slate-500"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat...</div>
          ) : sales.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">Belum ada penjualan tercatat.</div>
          ) : (
            <div className="divide-y divide-slate-800/70">
              {sales.map((s) => (
                <div key={s.id} data-testid={`cashier-sale-row-${s.id}`} className="flex items-center gap-3 px-4 sm:px-5 py-4 hover:bg-[#161F2E]/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white truncate">{s.nama_barang || "Barang"}</p>
                      {s.metode_pembayaran && <span className="rounded-full bg-slate-700/60 px-2 py-0.5 text-[10px] text-slate-300">{s.metode_pembayaran}</span>}
                      {s.sudah_diambil && <span className={`rounded-full px-2 py-0.5 text-[10px] ${s.sudah_diambil === "Sudah" ? "bg-[#10B981]/15 text-[#10B981]" : "bg-amber-500/15 text-amber-400"}`}>{s.sudah_diambil} diambil</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {s.tanggal_penjualan || "-"}{s.nama_pembeli ? ` • ${s.nama_pembeli}` : ""}{s.kode_barang ? ` • ${s.kode_barang}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[#FF2E2E] font-mono-tech">{rupiah(s.harga_jual)}</p>
                    <p className="text-[11px] text-slate-500">margin {rupiah(s.margin)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button data-testid={`cashier-edit-sale-${s.id}`} onClick={() => openEdit(s)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-[#FF2E2E] hover:text-[#FF2E2E] transition-colors"><Pencil className="h-4 w-4" /></button>
                    <button data-testid={`cashier-delete-sale-${s.id}`} onClick={() => setDeleteTarget(s.id)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-red-500 hover:text-red-400 transition-colors"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Buyer price modal */}
      {showBuyer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/90 backdrop-blur-sm" onClick={() => setShowBuyer(false)}>
          <div data-testid="cashier-buyer-modal" onClick={(e) => e.stopPropagation()} className="relative w-full max-w-sm rounded-2xl border border-slate-700 bg-[#111723] p-8 text-center animate-fade-up">
            <button onClick={() => setShowBuyer(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Harga</p>
            <p data-testid="cashier-buyer-price" className="mt-3 font-heading text-5xl font-bold text-[#FF2E2E]">{rupiah(hargaJual)}</p>
            <p className="mt-4 text-xs text-slate-500">Tampilan khusus untuk diperlihatkan ke pembeli.</p>
          </div>
        </div>
      )}

      {/* Sell / edit form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div data-testid="cashier-sell-form" onClick={(e) => e.stopPropagation()} className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-[#111723] p-6 max-h-[90vh] overflow-y-auto animate-fade-up">
            <button onClick={() => setShowForm(false)} className="absolute top-5 right-5 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            <h2 className="font-heading text-lg font-bold text-white mb-1">{editId ? "Edit Penjualan" : "Barang Terjual"}</h2>
            <p className="text-xs text-slate-500 mb-5">Isi data penjualan. Semua kolom opsional kecuali harga.</p>

            <div className="space-y-4">
              <div>
                <label className={labelCls}>Tanggal Penjualan</label>
                <input data-testid="sell-tanggal" type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Nama Pembeli</label><input data-testid="sell-nama-pembeli" value={form.nama_pembeli} onChange={(e) => setForm({ ...form, nama_pembeli: e.target.value })} placeholder="Nama pembeli" className={inputCls} /></div>
                <div><label className={labelCls}>Nama Barang</label><input data-testid="sell-nama-barang" value={form.nama_barang} onChange={(e) => setForm({ ...form, nama_barang: e.target.value })} placeholder="cth. Sepeda Lipat" className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Kode Barang</label><input data-testid="sell-kode-barang" value={form.kode_barang} onChange={(e) => setForm({ ...form, kode_barang: e.target.value })} placeholder="cth. SPD-001" className={inputCls} /></div>
                <div><label className={labelCls}>Ukuran & Warna</label><input data-testid="sell-ukuran-warna" value={form.ukuran_warna} onChange={(e) => setForm({ ...form, ukuran_warna: e.target.value })} placeholder="cth. 26 inci, Merah" className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Harga Modal</label>
                  <input data-testid="sell-harga-modal" inputMode="numeric" value={groupNum(form.harga_modal)} onChange={(e) => setForm({ ...form, harga_modal: parseNum(e.target.value) })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Margin</label>
                  <input data-testid="sell-margin" inputMode="numeric" value={groupNum(form.margin)} onChange={(e) => setForm({ ...form, margin: parseNum(e.target.value) })} className={inputCls} />
                </div>
              </div>
              <div className="rounded-xl border border-[#FF2E2E]/40 bg-[#FF2E2E]/10 px-4 py-3 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#FF6B6B]">Harga Jual</span>
                <span data-testid="sell-harga-jual" className="font-heading text-2xl font-bold text-[#FF2E2E]">{rupiah(formJual)}</span>
              </div>
              <div><label className={labelCls}>Metode Pembayaran</label><Segmented testid="sell-pembayaran" value={form.metode_pembayaran} onChange={(v) => setForm({ ...form, metode_pembayaran: v })} options={["Cash", "Transfer"]} /></div>
              <div><label className={labelCls}>Apakah sudah diambil?</label><Segmented testid="sell-diambil" value={form.sudah_diambil} onChange={(v) => setForm({ ...form, sudah_diambil: v })} options={["Belum", "Sudah"]} /></div>
              <div><label className={labelCls}>Metode Pengambilan</label><Segmented testid="sell-pengambilan" value={form.metode_pengambilan} onChange={(v) => setForm({ ...form, metode_pengambilan: v })} options={["Pick up Sendiri", "Travel"]} /></div>
              <div><label className={labelCls}>Alamat Pengiriman</label><textarea data-testid="sell-alamat" value={form.alamat_pengiriman} onChange={(e) => setForm({ ...form, alamat_pengiriman: e.target.value })} placeholder="Alamat lengkap pengiriman" rows={2} className={`${inputCls} resize-none`} /></div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowForm(false)} className="rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-300 hover:text-white transition-colors">Batal</button>
              <button data-testid="sell-save" onClick={saveSale} disabled={saving} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#FF2E2E] px-4 py-3 text-sm font-bold uppercase tracking-wide text-white cyan-glow hover:scale-[1.01] transition-transform disabled:opacity-50">
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <ReceiptIcon className="h-5 w-5" />}
                {saving ? "Menyimpan..." : editId ? "Simpan Perubahan" : "Simpan Penjualan"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[#111723] border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Hapus penjualan ini?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Catatan penjualan akan dihapus dari riwayat.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800">Batal</AlertDialogCancel>
            <AlertDialogAction data-testid="cashier-confirm-delete" onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
