import { useEffect, useMemo, useState, useCallback } from "react";
import { adminProducts, posCheckout, resolveImage, uploadImage, CATEGORIES } from "../lib/api";
import { toast } from "sonner";
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Loader2, X, Receipt as ReceiptIcon,
  Printer, Share2, PackageX, BadgePercent, Wallet, UserRound, PlusCircle, Palette,
  Phone, MapPin, Truck, ImageUp, Check, Package as PackageIcon, Ruler,
  PauseCircle, PlayCircle, Clock, Inbox,
} from "lucide-react";

const rupiah = (n) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");
const parseNum = (t) => { const d = String(t ?? "").replace(/[^0-9]/g, ""); return d ? parseInt(d, 10) : 0; };
const STORE = { name: "SK BIKE STORE", addr: "Jl Pawan 1, Ketapang, Kalimantan Barat", wa: "628125559681" };

export default function PosRegister() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Semua");
  const [cart, setCart] = useState([]); // {key, product_id, name, code, qty, unit_price, cost_price, stock}
  const [customer, setCustomer] = useState("");
  const [payment, setPayment] = useState("Cash");
  const [discount, setDiscount] = useState(0);
  const [paidText, setPaidText] = useState("");
  const [cashText, setCashText] = useState("");
  const [transferText, setTransferText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [optPick, setOptPick] = useState(null); // { product, size }
  const PARK_KEY = "skbike_parked_sales";
  const [parked, setParked] = useState(() => { try { return JSON.parse(localStorage.getItem(PARK_KEY) || "[]"); } catch { return []; } });
  const [showParked, setShowParked] = useState(false);
  useEffect(() => { try { localStorage.setItem(PARK_KEY, JSON.stringify(parked)); } catch { /* ignore */ } }, [parked]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setProducts(await adminProducts()); }
    catch { toast.error("Gagal memuat produk"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const q = search.trim().toLowerCase();
  const filtered = products.filter((p) => {
    const mq = !q || p.name.toLowerCase().includes(q) || (p.code || "").toLowerCase().includes(q);
    const mc = catFilter === "Semua" || p.category === catFilter;
    return mq && mc;
  });

  const cartQtyForProduct = (pid) => cart.filter((c) => c.product_id === pid).reduce((s, c) => s + c.qty, 0);
  const cartQtyForKey = (key) => cart.find((c) => c.key === key)?.qty || 0;

  const addToCart = (p, opts = {}) => {
    const sizes = p.sizes || [];
    const hasSizes = sizes.length > 0;
    // Step 1: require a size for nested products.
    const sizeObj = hasSizes ? (opts.size ? sizes.find((s) => s.label === opts.size) : null) : null;
    if (hasSizes && !sizeObj) { setOptPick({ product: p, size: null }); return; }
    // Step 2: require a color when more than one is available.
    const colorList = hasSizes ? (sizeObj.colors || []) : (p.variants || []);
    const color = opts.color || null;
    if (colorList.length > 1 && !color) { setOptPick({ product: p, size: sizeObj || null }); return; }
    const colorObj = color ? colorList.find((v) => v.color === color) : (colorList[0] || null);
    const chosenColor = colorObj ? colorObj.color : null;
    const stock = colorObj ? colorObj.stock : p.stock;
    const unitPrice = hasSizes ? (Number(sizeObj.price) || 0) : (p.price || 0);
    const costPrice = hasSizes ? (Number(sizeObj.cost_price) || 0) : (p.cost_price || 0);
    const code = hasSizes ? (sizeObj.code || p.code || "") : (p.code || "");
    const sizeLabel = hasSizes ? sizeObj.label : null;
    const key = `${p.id}|${sizeLabel || ""}|${chosenColor || ""}`;
    const label = [sizeLabel, chosenColor].filter(Boolean).join(" ");
    if (stock <= 0) { toast.error(`${p.name}${label ? ` (${label})` : ""} stok habis`); return; }
    if (cartQtyForKey(key) >= stock) { toast.error(`Stok ${label || p.name} hanya ${stock}`); return; }
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.key === key);
      if (idx >= 0) { const cp = [...prev]; cp[idx] = { ...cp[idx], qty: cp[idx].qty + 1 }; return cp; }
      return [...prev, { key, product_id: p.id, name: p.name, code, color: chosenColor, size: sizeLabel, qty: 1, unit_price: unitPrice, cost_price: costPrice, stock }];
    });
    setOptPick(null);
  };

  const changeQty = (key, delta) => setCart((prev) => prev.flatMap((c) => {
    if (c.key !== key) return [c];
    const next = c.qty + delta;
    if (next <= 0) return [];
    if (c.stock != null && c.product_id && next > c.stock) { toast.error(`Stok hanya ${c.stock}`); return [c]; }
    return [{ ...c, qty: next }];
  }));
  const setUnitPrice = (key, val) => setCart((prev) => prev.map((c) => c.key === key ? { ...c, unit_price: parseNum(val) } : c));
  const removeItem = (key) => setCart((prev) => prev.filter((c) => c.key !== key));
  const clearCart = () => { setCart([]); setDiscount(0); setPaidText(""); setCashText(""); setTransferText(""); setCustomer(""); };

  const parkSale = () => {
    if (cart.length === 0) { toast.error("Keranjang kosong"); return; }
    const entry = {
      id: `park-${Date.now()}`,
      label: customer.trim() || "Tanpa nama",
      cart, customer, payment, discount, paidText, cashText, transferText,
      count: cart.reduce((s, c) => s + c.qty, 0),
      total: cart.reduce((s, c) => s + c.unit_price * c.qty, 0) - Math.min(discount, cart.reduce((s, c) => s + c.unit_price * c.qty, 0)),
      at: new Date().toISOString(),
    };
    setParked((prev) => [entry, ...prev]);
    clearCart();
    toast.success("Transaksi diparkir — kasir siap untuk pembeli berikutnya");
  };
  const resumeSale = (p) => {
    if (cart.length > 0 && !window.confirm("Keranjang aktif akan diganti dengan transaksi terparkir. Lanjut?")) return;
    setCart(p.cart || []);
    setCustomer(p.customer || "");
    setPayment(p.payment || "Cash");
    setDiscount(p.discount || 0);
    setPaidText(p.paidText || "");
    setCashText(p.cashText || "");
    setTransferText(p.transferText || "");
    setParked((prev) => prev.filter((x) => x.id !== p.id));
    setShowParked(false);
    toast.success("Transaksi dilanjutkan");
  };
  const deleteParked = (id) => setParked((prev) => prev.filter((x) => x.id !== id));

  const subtotal = useMemo(() => cart.reduce((s, c) => s + c.unit_price * c.qty, 0), [cart]);
  const disc = Math.min(discount, subtotal);
  const total = subtotal - disc;
  const cashPart = parseNum(cashText);
  const transferPart = parseNum(transferText);
  const paid = payment === "Split" ? cashPart + transferPart : parseNum(paidText);
  const change = paid - total;

  const addManual = (name, price, qty) => {
    if (!name.trim()) { toast.error("Nama barang wajib"); return; }
    const key = `manual-${Date.now()}`;
    setCart((prev) => [...prev, { key, product_id: null, name: name.trim(), code: "", qty: Math.max(1, parseInt(qty, 10) || 1), unit_price: parseNum(price), cost_price: 0, stock: null }]);
    setShowManual(false);
  };

  const validateCheckout = () => {
    if (cart.length === 0) { toast.error("Keranjang kosong"); return false; }
    if (payment === "Cash" && paid < total) { toast.error("Uang bayar kurang dari total"); return false; }
    if (payment === "Split") {
      if (cashPart <= 0 || transferPart <= 0) { toast.error("Isi nominal Cash dan Transfer"); return false; }
      if (cashPart + transferPart < total) { toast.error("Total Cash + Transfer kurang dari total"); return false; }
    }
    return true;
  };

  const openSaleForm = () => { if (validateCheckout()) setShowSaleForm(true); };

  const checkout = async (extra = {}) => {
    if (!validateCheckout()) return;
    const paymentLabel = payment === "Split" ? `Cash ${rupiah(cashPart)} + Transfer ${rupiah(transferPart)}` : payment;
    const amountPaid = payment === "Cash" ? paid : payment === "Split" ? cashPart + transferPart : total;
    setProcessing(true);
    try {
      const res = await posCheckout({
        customer: extra.customer ?? (customer || null),
        customer_phone: extra.customer_phone || null,
        address: extra.address || null,
        taken_status: extra.taken_status || null,
        courier_name: extra.courier_name || null,
        courier_phone: extra.courier_phone || null,
        transfer_proof: extra.transfer_proof || null,
        product_note: extra.product_note || null,
        payment_method: paymentLabel,
        amount_paid: amountPaid,
        discount: disc,
        items: cart.map((c) => ({ product_id: c.product_id, name: c.name, code: c.code, color: c.color, size: c.size, qty: c.qty, unit_price: c.unit_price, cost_price: c.cost_price })),
      });
      setReceipt(res);
      setShowSaleForm(false);
      toast.success("Transaksi berhasil");
      clearCart();
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail ? String(err.response.data.detail) : "Gagal memproses transaksi");
    } finally { setProcessing(false); }
  };

  const receiptText = (r) => [
    `*${STORE.name}*`, STORE.addr, "--------------------------------",
    r.tanggal, r.customer ? `Pembeli: ${r.customer}` : null, `No: ${r.id.slice(0, 8).toUpperCase()}`,
    "--------------------------------",
    ...r.items.map((it) => `${it.name}${it.size ? ` [${it.size}]` : ""}${it.color ? ` [${it.color}]` : ""} ${it.code ? `(${it.code}) ` : ""}\n  ${it.qty} x ${rupiah(it.unit_price)} = ${rupiah(it.line_total)}`),
    "--------------------------------",
    `Subtotal: ${rupiah(r.subtotal)}`, r.discount ? `Diskon: -${rupiah(r.discount)}` : null,
    `*TOTAL: ${rupiah(r.total)}*`, `Bayar (${r.payment_method}): ${rupiah(r.amount_paid)}`,
    r.payment_method === "Cash" ? `Kembali: ${rupiah(r.change)}` : null,
    "--------------------------------", "Terima kasih telah berbelanja!",
  ].filter(Boolean).join("\n");

  const shareReceipt = (r) => window.open(`https://wa.me/?text=${encodeURIComponent(receiptText(r))}`, "_blank");

  const printReceipt = (r) => {
    const rows = r.items.map((it) => `<tr><td>${it.name}${it.size ? ` <span class="muted">[${it.size}]</span>` : ""}${it.color ? ` <span class="muted">[${it.color}]</span>` : ""}${it.code ? ` <span class="muted">(${it.code})</span>` : ""}<br/><span class="muted">${it.qty} x ${rupiah(it.unit_price)}</span></td><td class="r">${rupiah(it.line_total)}</td></tr>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Struk ${r.id.slice(0,8)}</title>
      <style>*{font-family:'Courier New',monospace;color:#000}body{width:280px;margin:0 auto;padding:10px}h2{text-align:center;margin:0}.c{text-align:center}.muted{color:#555;font-size:11px}table{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px}td{padding:2px 0;vertical-align:top}.r{text-align:right;white-space:nowrap}.line{border-top:1px dashed #000;margin:6px 0}.tot{font-weight:bold;font-size:14px}</style></head>
      <body onload="window.print();setTimeout(()=>window.close(),300)">
      <h2>${STORE.name}</h2><p class="c muted">${STORE.addr}</p><div class="line"></div>
      <p class="muted">${r.tanggal}<br/>No: ${r.id.slice(0,8).toUpperCase()}${r.customer ? `<br/>Pembeli: ${r.customer}` : ""}</p>
      <div class="line"></div><table>${rows}</table><div class="line"></div>
      <table><tr><td>Subtotal</td><td class="r">${rupiah(r.subtotal)}</td></tr>
      ${r.discount ? `<tr><td>Diskon</td><td class="r">-${rupiah(r.discount)}</td></tr>` : ""}
      <tr class="tot"><td>TOTAL</td><td class="r">${rupiah(r.total)}</td></tr>
      <tr><td>Bayar (${r.payment_method})</td><td class="r">${rupiah(r.amount_paid)}</td></tr>
      ${r.payment_method === "Cash" ? `<tr><td>Kembali</td><td class="r">${rupiah(r.change)}</td></tr>` : ""}</table>
      <div class="line"></div><p class="c">Terima kasih telah berbelanja!</p></body></html>`;
    const w = window.open("", "_blank", "width=340,height=600");
    if (!w) { toast.error("Popup diblokir. Izinkan popup untuk cetak."); return; }
    w.document.write(html); w.document.close();
  };

  const printNotaFax = (r) => {
    const rows = r.items.map((it, i) => {
      const label = `${it.name}${it.size ? ` [${it.size}]` : ""}${it.color ? ` [${it.color}]` : ""}${it.code ? ` (${it.code})` : ""}`;
      return `<tr><td class="c">${i + 1}</td><td>${label}</td><td class="c">${it.qty}</td><td class="r">${rupiah(it.unit_price)}</td><td class="r">${rupiah(it.line_total)}</td></tr>`;
    }).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Nota ${r.id.slice(0, 8).toUpperCase()}</title>
      <style>
      @page{size:A4;margin:14mm}
      *{font-family:'Courier New',Courier,monospace;color:#000;box-sizing:border-box}
      body{font-size:13px;margin:0}
      .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px double #000;padding-bottom:8px}
      .store h1{font-size:24px;margin:0;letter-spacing:2px}
      .store p{margin:2px 0;font-size:12px}
      .meta{text-align:right;font-size:12px}
      .meta .no{font-size:16px;font-weight:bold;margin-bottom:2px}
      .title{text-align:center;font-size:18px;font-weight:bold;letter-spacing:8px;margin:12px 0}
      table.items{width:100%;border-collapse:collapse;margin-top:4px}
      table.items th,table.items td{border:1px solid #000;padding:6px 8px;font-size:12px;vertical-align:top}
      table.items th{background:#eee;text-align:left}
      .r{text-align:right;white-space:nowrap}.c{text-align:center}
      table.sum{width:48%;margin-left:auto;margin-top:8px;border-collapse:collapse}
      table.sum td{padding:3px 8px;font-size:12px}
      table.sum td.r{text-align:right;white-space:nowrap}
      table.sum tr.tot td{font-weight:bold;font-size:15px;border-top:1px solid #000;border-bottom:1px solid #000}
      .sign{display:flex;justify-content:space-around;margin-top:44px;font-size:12px}
      .sign div{text-align:center;width:40%}
      .sign .space{height:60px}
      .sign .name{border-top:1px solid #000;padding-top:4px}
      .foot{margin-top:22px;font-size:11px;text-align:center;border-top:1px dashed #000;padding-top:8px}
      </style></head>
      <body onload="window.print();setTimeout(()=>window.close(),400)">
      <div class="head">
        <div class="store"><h1>${STORE.name}</h1><p>${STORE.addr}</p><p>WA/Telp: ${STORE.wa}</p></div>
        <div class="meta"><div class="no">NOTA #${r.id.slice(0, 8).toUpperCase()}</div><div>Tanggal: ${r.tanggal}</div><div>Kepada: ${r.customer || "-"}</div></div>
      </div>
      <div class="title">N O T A</div>
      <table class="items">
        <thead><tr><th class="c" style="width:38px">No</th><th>Nama Barang</th><th class="c" style="width:50px">Qty</th><th class="r" style="width:120px">Harga</th><th class="r" style="width:130px">Jumlah</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <table class="sum">
        <tr><td>Subtotal</td><td class="r">${rupiah(r.subtotal)}</td></tr>
        ${r.discount ? `<tr><td>Diskon</td><td class="r">-${rupiah(r.discount)}</td></tr>` : ""}
        <tr class="tot"><td>TOTAL</td><td class="r">${rupiah(r.total)}</td></tr>
        <tr><td>Bayar (${r.payment_method})</td><td class="r">${rupiah(r.amount_paid)}</td></tr>
        ${r.payment_method === "Cash" ? `<tr><td>Kembali</td><td class="r">${rupiah(r.change)}</td></tr>` : ""}
      </table>
      <div class="sign">
        <div>Penerima,<div class="space"></div><div class="name">(________________)</div></div>
        <div>Hormat Kami,<div class="space"></div><div class="name">${STORE.name}</div></div>
      </div>
      <div class="foot">Terima kasih telah berbelanja di ${STORE.name} • Barang yang sudah dibeli tidak dapat ditukar/dikembalikan tanpa nota ini.</div>
      </body></html>`;
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) { toast.error("Popup diblokir. Izinkan popup untuk cetak."); return; }
    w.document.write(html); w.document.close();
  };

  return (
    <div data-testid="pos-register" className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
      {/* Product picker */}
      <div>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input data-testid="pos-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama / kode produk..." className="w-full rounded-full border border-slate-700 bg-[#161F2E] pl-11 pr-4 py-3 text-sm text-white outline-none focus:border-[#FF2E2E] transition-colors" />
          </div>
          <select data-testid="pos-cat-filter" value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="rounded-full border border-slate-700 bg-[#161F2E] px-4 py-3 text-sm text-white outline-none focus:border-[#FF2E2E]">
            <option value="Semua">Semua</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat produk...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
            {filtered.map((p) => {
              const remaining = p.stock - cartQtyForProduct(p.id);
              const out = remaining <= 0;
              const multiColor = (p.variants || []).length > 1;
              const hasSizes = (p.sizes || []).length > 0;
              return (
                <button key={p.id} data-testid={`pos-product-${p.id}`} onClick={() => addToCart(p)} disabled={out}
                  className={`group text-left rounded-xl border bg-[#161F2E] overflow-hidden transition-all ${out ? "border-slate-800 opacity-50 cursor-not-allowed" : "border-slate-800 hover:border-[#FF2E2E] hover:-translate-y-0.5"}`}>
                  <div className="relative aspect-square bg-[#0A0D14] overflow-hidden">
                    {p.image_url ? <img src={resolveImage(p.image_url)} alt={p.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-600"><PackageX className="h-6 w-6" /></div>}
                    <span className={`absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${out ? "bg-red-500/80 text-white" : "bg-[#0A0D14]/80 text-slate-200"}`}>{out ? "Habis" : `Stok ${remaining}`}</span>
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {hasSizes && !out && <span className="flex items-center gap-1 rounded-full bg-[#0A0D14]/80 px-2 py-0.5 text-[10px] font-bold text-[#FF7A33]"><Ruler className="h-3 w-3" /> {p.sizes.length}</span>}
                      {multiColor && !out && <span className="flex items-center gap-1 rounded-full bg-[#0A0D14]/80 px-2 py-0.5 text-[10px] font-bold text-[#FF7A33]"><Palette className="h-3 w-3" /> {p.variants.length}</span>}
                    </div>
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-semibold text-white line-clamp-2 leading-tight min-h-[2rem]">{p.name}</p>
                    <p className="mt-1 text-sm font-bold text-[#FF2E2E] font-mono-tech">{hasSizes ? "Mulai " : ""}{rupiah(p.price)}</p>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && <div className="col-span-full py-16 text-center text-slate-500 text-sm">Tidak ada produk.</div>}
          </div>
        )}
        <button data-testid="pos-add-manual" onClick={() => setShowManual(true)} className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-[#FF2E2E] transition-colors"><PlusCircle className="h-4 w-4" /> Tambah item manual (non-katalog)</button>
      </div>

      {/* Cart */}
      <div className="rounded-2xl border border-slate-800 bg-[#111723] flex flex-col max-h-[calc(100vh-180px)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-[#FF2E2E]" /> Keranjang <span data-testid="pos-cart-count" className="text-sm text-slate-500">({cart.reduce((s, c) => s + c.qty, 0)})</span></h2>
          {cart.length > 0 && <button data-testid="pos-clear-cart" onClick={clearCart} className="text-xs font-semibold text-slate-500 hover:text-red-400 flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Kosongkan</button>}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 divide-y divide-slate-800/70">
          {cart.length === 0 ? (
            <div className="py-16 text-center text-slate-600 text-sm flex flex-col items-center gap-2"><ShoppingCart className="h-8 w-8" /> Keranjang kosong<br />Pilih produk untuk mulai transaksi</div>
          ) : cart.map((c) => (
            <div key={c.key} data-testid={`pos-cart-item-${c.key}`} className="py-3 px-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {c.size && <span className="inline-flex items-center gap-1 rounded-full bg-[#FF7A33]/15 px-2 py-0.5 text-[10px] font-semibold text-[#FF7A33]"><Ruler className="h-2.5 w-2.5" /> {c.size}</span>}
                    {c.color && <span className="inline-flex items-center gap-1 rounded-full bg-[#FF2E2E]/15 px-2 py-0.5 text-[10px] font-semibold text-[#FF7A33]"><Palette className="h-2.5 w-2.5" /> {c.color}</span>}
                    {c.code && <span className="text-[11px] text-slate-500 font-mono-tech">{c.code}</span>}
                  </div>
                </div>
                <button data-testid={`pos-remove-${c.key}`} onClick={() => removeItem(c.key)} className="text-slate-500 hover:text-red-400 shrink-0"><X className="h-4 w-4" /></button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button data-testid={`pos-dec-${c.key}`} onClick={() => changeQty(c.key, -1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 text-white hover:border-[#FF2E2E]"><Minus className="h-3.5 w-3.5" /></button>
                  <span data-testid={`pos-qty-${c.key}`} className="w-7 text-center text-sm font-bold text-white">{c.qty}</span>
                  <button data-testid={`pos-inc-${c.key}`} onClick={() => changeQty(c.key, 1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 text-white hover:border-[#FF2E2E]"><Plus className="h-3.5 w-3.5" /></button>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-[#0A0D14] px-2">
                  <span className="text-[11px] text-slate-500">Rp</span>
                  <input data-testid={`pos-price-${c.key}`} value={c.unit_price.toLocaleString("id-ID")} onChange={(e) => setUnitPrice(c.key, e.target.value)} inputMode="numeric" className="w-24 bg-transparent py-1.5 text-right text-sm text-white outline-none" />
                </div>
              </div>
              <p className="mt-1 text-right text-sm font-bold text-[#FF2E2E] font-mono-tech">{rupiah(c.unit_price * c.qty)}</p>
            </div>
          ))}
        </div>

        {/* Checkout footer */}
        <div className="border-t border-slate-800 p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {["Cash", "Transfer", "Split"].map((m) => (
              <button key={m} data-testid={`pos-pay-${m}`} onClick={() => setPayment(m)} className={`rounded-lg border py-2 text-sm font-semibold transition-colors ${payment === m ? "border-[#FF2E2E] bg-[#FF2E2E]/15 text-white" : "border-slate-700 bg-[#0A0D14] text-slate-400 hover:border-slate-500"}`}>{m === "Split" ? "Cash+Transfer" : m}</button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <BadgePercent className="h-4 w-4 text-slate-500 shrink-0" />
            <span className="text-xs text-slate-400">Diskon</span>
            <div className="ml-auto flex items-center gap-1 rounded-lg border border-slate-700 bg-[#0A0D14] px-2">
              <span className="text-[11px] text-slate-500">Rp</span>
              <input data-testid="pos-discount" value={discount ? discount.toLocaleString("id-ID") : ""} onChange={(e) => setDiscount(parseNum(e.target.value))} inputMode="numeric" placeholder="0" className="w-24 bg-transparent py-1.5 text-right text-sm text-white outline-none" />
            </div>
          </div>

          <div className="rounded-xl bg-[#0A0D14] p-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-400"><span>Subtotal</span><span data-testid="pos-subtotal" className="font-mono-tech text-slate-200">{rupiah(subtotal)}</span></div>
            {disc > 0 && <div className="flex justify-between text-slate-400"><span>Diskon</span><span className="font-mono-tech text-amber-400">-{rupiah(disc)}</span></div>}
            <div className="flex justify-between items-center pt-1 border-t border-slate-800"><span className="font-bold text-white">TOTAL</span><span data-testid="pos-total" className="font-heading text-xl font-black text-[#FF2E2E]">{rupiah(total)}</span></div>
          </div>

          {payment === "Cash" && (
            <div>
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-slate-500 shrink-0" />
                <div className="ml-auto flex items-center gap-1 rounded-lg border border-slate-700 bg-[#0A0D14] px-2 flex-1">
                  <span className="text-[11px] text-slate-500">Bayar Rp</span>
                  <input data-testid="pos-paid" value={paidText} onChange={(e) => setPaidText(parseNum(e.target.value) ? parseNum(e.target.value).toLocaleString("id-ID") : "")} inputMode="numeric" placeholder="0" className="w-full bg-transparent py-1.5 text-right text-sm text-white outline-none" />
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button data-testid="pos-paid-exact" onClick={() => setPaidText(total.toLocaleString("id-ID"))} className="rounded-full bg-slate-700/50 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-600">Uang Pas</button>
                {[50000, 100000, 200000, 500000].map((amt) => (
                  <button key={amt} onClick={() => setPaidText((paid + amt).toLocaleString("id-ID"))} className="rounded-full bg-slate-700/50 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-600">+{amt / 1000}rb</button>
                ))}
              </div>
              {paid > 0 && (
                <div className="mt-2 flex justify-between text-sm"><span className="text-slate-400">Kembalian</span><span data-testid="pos-change" className={`font-mono-tech font-bold ${change < 0 ? "text-red-400" : "text-[#10B981]"}`}>{rupiah(change)}</span></div>
              )}
            </div>
          )}

          {payment === "Split" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-slate-500 shrink-0" />
                <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-[#0A0D14] px-2 flex-1">
                  <span className="text-[11px] text-slate-500 whitespace-nowrap">Cash Rp</span>
                  <input data-testid="pos-split-cash" value={cashText} onChange={(e) => setCashText(parseNum(e.target.value) ? parseNum(e.target.value).toLocaleString("id-ID") : "")} inputMode="numeric" placeholder="0" className="w-full bg-transparent py-1.5 text-right text-sm text-white outline-none" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-slate-500 shrink-0" />
                <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-[#0A0D14] px-2 flex-1">
                  <span className="text-[11px] text-slate-500 whitespace-nowrap">Transfer Rp</span>
                  <input data-testid="pos-split-transfer" value={transferText} onChange={(e) => setTransferText(parseNum(e.target.value) ? parseNum(e.target.value).toLocaleString("id-ID") : "")} inputMode="numeric" placeholder="0" className="w-full bg-transparent py-1.5 text-right text-sm text-white outline-none" />
                </div>
              </div>
              <button data-testid="pos-split-fill-transfer" onClick={() => setTransferText(Math.max(0, total - cashPart).toLocaleString("id-ID"))} className="text-[11px] font-semibold text-slate-400 hover:text-[#FF2E2E] transition-colors">Sisanya ke Transfer</button>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Total Dibayar</span><span data-testid="pos-split-paid" className="font-mono-tech text-slate-200">{rupiah(paid)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">{change < 0 ? "Kurang" : "Kembalian"}</span><span data-testid="pos-change" className={`font-mono-tech font-bold ${change < 0 ? "text-red-400" : "text-[#10B981]"}`}>{rupiah(Math.abs(change))}</span></div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button data-testid="pos-park" onClick={parkSale} disabled={cart.length === 0} className="flex items-center justify-center gap-1.5 rounded-xl border border-[#FF7A33]/50 bg-[#FF7A33]/10 py-2.5 text-sm font-bold text-[#FF7A33] hover:bg-[#FF7A33]/20 transition-colors disabled:opacity-40"><PauseCircle className="h-4 w-4" /> Parkir</button>
            <button data-testid="pos-parked-open" onClick={() => setShowParked(true)} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-[#0A0D14] py-2.5 text-sm font-bold text-slate-300 hover:border-slate-500 transition-colors"><Inbox className="h-4 w-4" /> Terparkir {parked.length > 0 && <span className="rounded-full bg-[#FF2E2E] px-1.5 text-[10px] text-white">{parked.length}</span>}</button>
          </div>

          <button data-testid="pos-checkout" onClick={openSaleForm} disabled={processing || cart.length === 0} className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#FF2E2E] py-3.5 text-sm font-bold uppercase tracking-wide text-white cyan-glow hover:scale-[1.01] transition-transform disabled:opacity-40 disabled:cursor-not-allowed">
            {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ReceiptIcon className="h-5 w-5" />} {processing ? "Memproses..." : "Bayar & Cetak Struk"}
          </button>
        </div>
      </div>

      {/* Manual item modal */}
      {showManual && <ManualItemModal onClose={() => setShowManual(false)} onAdd={addManual} />}

      {/* Sales form modal (before completing checkout) */}
      {showSaleForm && (
        <SaleFormModal
          defaultCustomer={customer}
          defaultProducts={cart.map((c) => `${c.name}${[c.size, c.color].filter(Boolean).length ? ` (${[c.size, c.color].filter(Boolean).join(", ")})` : ""} x${c.qty}`).join(", ")}
          total={total}
          processing={processing}
          onClose={() => !processing && setShowSaleForm(false)}
          onSubmit={checkout}
        />
      )}

      {/* Option picker modal — size then color */}
      {optPick && (() => {
        const p = optPick.product;
        const sizes = p.sizes || [];
        const hasSizes = sizes.length > 0;
        const step = hasSizes && !optPick.size ? "size" : "color";
        const colorList = optPick.size ? (optPick.size.colors || []) : (p.variants || []);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-sm" onClick={() => setOptPick(null)}>
            <div data-testid="pos-option-modal" onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-[#111723] p-6 animate-fade-up">
              <button onClick={() => setOptPick(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
              <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2 mb-1">
                {step === "size" ? <><Ruler className="h-5 w-5 text-[#FF2E2E]" /> Pilih Ukuran</> : <><Palette className="h-5 w-5 text-[#FF2E2E]" /> Pilih Warna</>}
              </h2>
              <p className="text-sm text-slate-400 mb-4">{p.name}{optPick.size ? ` • ${optPick.size.label}` : ""}</p>

              {step === "size" ? (
                <div className="grid grid-cols-2 gap-2">
                  {sizes.map((s) => {
                    const sStock = (s.colors || []).reduce((a, c) => a + (Number(c.stock) || 0), 0);
                    const out = sStock <= 0;
                    return (
                      <button key={s.label} data-testid={`pos-size-${s.label}`} disabled={out} onClick={() => addToCart(p, { size: s.label })}
                        className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${out ? "border-slate-800 opacity-40 cursor-not-allowed text-slate-500" : "border-slate-700 bg-[#0A0D14] text-white hover:border-[#FF2E2E]"}`}>
                        <span>{s.label}</span>
                        <span className="text-[11px] font-mono-tech text-[#FF7A33]">{rupiah(s.price)}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <>
                  {optPick.size && <button data-testid="pos-back-size" onClick={() => setOptPick({ product: p, size: null })} className="mb-3 text-[11px] font-semibold text-slate-400 hover:text-[#FF2E2E]">← Ganti ukuran</button>}
                  <div className="grid grid-cols-2 gap-2">
                    {colorList.map((v) => {
                      const key = `${p.id}|${optPick.size?.label || ""}|${v.color}`;
                      const remaining = v.stock - cartQtyForKey(key);
                      const out = remaining <= 0;
                      return (
                        <button key={v.color} data-testid={`pos-color-${v.color}`} disabled={out} onClick={() => addToCart(p, { size: optPick.size?.label, color: v.color })}
                          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${out ? "border-slate-800 opacity-40 cursor-not-allowed text-slate-500" : "border-slate-700 bg-[#0A0D14] text-white hover:border-[#FF2E2E]"}`}>
                          <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-full border border-white/20" style={{ backgroundColor: v.hex || "#94A3B8" }} />{v.color}</span>
                          <span className={`text-[11px] ${out ? "text-red-400" : remaining <= 3 ? "text-amber-400" : "text-[#10B981]"}`}>{out ? "Habis" : `Stok ${remaining}`}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* Parked sales modal */}
      {showParked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-sm" onClick={() => setShowParked(false)}>
          <div data-testid="pos-parked-modal" onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-[#111723] p-6 max-h-[85vh] overflow-y-auto animate-fade-up">
            <button onClick={() => setShowParked(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2 mb-1"><PauseCircle className="h-5 w-5 text-[#FF7A33]" /> Transaksi Terparkir <span className="text-sm text-slate-500">({parked.length})</span></h2>
            <p className="text-xs text-slate-500 mb-4">Lanjutkan transaksi yang dijeda saat melayani pembeli lain.</p>
            {parked.length === 0 ? (
              <div className="py-12 text-center text-slate-600 text-sm flex flex-col items-center gap-2"><Inbox className="h-8 w-8" /> Belum ada transaksi terparkir</div>
            ) : (
              <div className="space-y-2">
                {parked.map((p) => (
                  <div key={p.id} data-testid={`pos-parked-${p.id}`} className="rounded-xl border border-slate-800 bg-[#0A0D14] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{p.label}</p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(p.at).toLocaleString("id-ID")} • {p.count} item</p>
                      </div>
                      <span className="shrink-0 font-mono-tech text-sm font-bold text-[#FF2E2E]">{rupiah(p.total)}</span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button data-testid={`pos-parked-resume-${p.id}`} onClick={() => resumeSale(p)} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[#10B981] py-2 text-xs font-bold text-white hover:brightness-110 transition"><PlayCircle className="h-4 w-4" /> Lanjutkan</button>
                      <button data-testid={`pos-parked-delete-${p.id}`} onClick={() => deleteParked(p.id)} className="flex items-center justify-center rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-red-400 hover:bg-red-500/20 transition"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Receipt modal */}
      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-sm" onClick={() => setReceipt(null)}>
          <div data-testid="pos-receipt-modal" onClick={(e) => e.stopPropagation()} className="relative w-full max-w-sm rounded-2xl border border-slate-700 bg-[#111723] max-h-[90vh] overflow-y-auto animate-fade-up">
            <button onClick={() => setReceipt(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white z-10"><X className="h-5 w-5" /></button>
            <div className="p-6">
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#10B981]/15 text-[#10B981] mb-3"><ReceiptIcon className="h-7 w-7" /></div>
                <h2 className="font-heading text-lg font-bold text-white">{STORE.name}</h2>
                <p className="text-[11px] text-slate-500">{STORE.addr}</p>
              </div>
              <div className="my-4 border-t border-dashed border-slate-700" />
              <p className="text-[11px] text-slate-500">{receipt.tanggal} • No {receipt.id.slice(0, 8).toUpperCase()}{receipt.customer ? ` • ${receipt.customer}` : ""}</p>
              <div className="mt-3 space-y-2">
                {receipt.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <div className="text-slate-300">{it.name}{it.size ? <span className="text-[#FF7A33]"> • {it.size}</span> : ""}{it.color ? <span className="text-[#FF7A33]"> • {it.color}</span> : ""}<span className="block text-[11px] text-slate-500">{it.qty} x {rupiah(it.unit_price)}</span></div>
                    <span className="font-mono-tech text-white">{rupiah(it.line_total)}</span>
                  </div>
                ))}
              </div>
              <div className="my-4 border-t border-dashed border-slate-700" />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-slate-400"><span>Subtotal</span><span className="font-mono-tech">{rupiah(receipt.subtotal)}</span></div>
                {receipt.discount > 0 && <div className="flex justify-between text-amber-400"><span>Diskon</span><span className="font-mono-tech">-{rupiah(receipt.discount)}</span></div>}
                <div className="flex justify-between font-bold text-white text-base"><span>TOTAL</span><span className="font-mono-tech text-[#FF2E2E]">{rupiah(receipt.total)}</span></div>
                <div className="flex justify-between text-slate-400"><span>Bayar ({receipt.payment_method})</span><span className="font-mono-tech">{rupiah(receipt.amount_paid)}</span></div>
                {receipt.payment_method === "Cash" && <div className="flex justify-between text-[#10B981]"><span>Kembalian</span><span className="font-mono-tech">{rupiah(receipt.change)}</span></div>}
              </div>
              <div className="mt-6">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">Pilih Format Cetak</p>
                <div className="grid grid-cols-2 gap-2">
                  <button data-testid="pos-receipt-print" onClick={() => printReceipt(receipt)} className="flex items-center justify-center gap-2 rounded-xl bg-[#FF2E2E] py-3 text-sm font-bold text-white hover:scale-[1.02] transition-transform"><Printer className="h-4 w-4" /> Struk</button>
                  <button data-testid="pos-receipt-print-nota" onClick={() => printNotaFax(receipt)} className="flex items-center justify-center gap-2 rounded-xl border-2 border-slate-500 bg-[#0A0D14] py-3 text-sm font-bold text-white hover:border-white hover:scale-[1.02] transition-all"><Printer className="h-4 w-4" /> Nota (Fax)</button>
                </div>
              </div>
              <button data-testid="pos-receipt-share" onClick={() => shareReceipt(receipt)} className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white hover:brightness-110 transition-[filter]"><Share2 className="h-4 w-4" /> Kirim WhatsApp</button>
              <button data-testid="pos-receipt-new" onClick={() => setReceipt(null)} className="mt-2 w-full rounded-xl border border-slate-700 py-2.5 text-sm font-semibold text-slate-300 hover:text-white transition-colors">Transaksi Baru</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ManualItemModal({ onClose, onAdd }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState(1);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-sm" onClick={onClose}>
      <div data-testid="pos-manual-modal" onClick={(e) => e.stopPropagation()} className="relative w-full max-w-sm rounded-2xl border border-slate-700 bg-[#111723] p-6 animate-fade-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
        <h2 className="font-heading text-lg font-bold text-white mb-4">Item Manual</h2>
        <div className="space-y-3">
          <div><label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Nama Barang / Jasa</label>
            <input data-testid="pos-manual-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="cth. Aksesoris / Ongkos pasang" className="w-full rounded-lg border border-slate-700 bg-[#0A0D14] px-3 py-2.5 text-sm text-white outline-none focus:border-[#FF2E2E]" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Harga Satuan</label>
              <input data-testid="pos-manual-price" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" placeholder="0" className="w-full rounded-lg border border-slate-700 bg-[#0A0D14] px-3 py-2.5 text-sm text-white outline-none focus:border-[#FF2E2E]" /></div>
            <div><label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Jumlah</label>
              <div className="flex items-center gap-1.5">
                <button data-testid="pos-manual-qty-dec" type="button" onClick={() => setQty((n) => Math.max(1, n - 1))} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-white hover:border-[#FF2E2E]"><Minus className="h-3.5 w-3.5" /></button>
                <input data-testid="pos-manual-qty" value={qty} onChange={(e) => setQty(Math.max(1, parseInt(String(e.target.value).replace(/[^0-9]/g, ""), 10) || 1))} inputMode="numeric" className="w-full rounded-lg border border-slate-700 bg-[#0A0D14] px-2 py-2.5 text-center text-sm text-white outline-none focus:border-[#FF2E2E]" />
                <button data-testid="pos-manual-qty-inc" type="button" onClick={() => setQty((n) => n + 1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-white hover:border-[#FF2E2E]"><Plus className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </div>
        </div>
        <button data-testid="pos-manual-add" onClick={() => onAdd(name, price, qty)} className="mt-5 w-full rounded-xl bg-[#FF2E2E] py-3 text-sm font-bold text-white hover:scale-[1.01] transition-transform">Tambah {qty > 1 ? `${qty} Item` : "ke Keranjang"}</button>
      </div>
    </div>
  );
}

function SaleFormModal({ defaultCustomer, defaultProducts, total, processing, onClose, onSubmit }) {
  const [customer, setCustomer] = useState(defaultCustomer || "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [products, setProducts] = useState(defaultProducts || "");
  const [taken, setTaken] = useState("Belum");
  const [courierName, setCourierName] = useState("");
  const [courierPhone, setCourierPhone] = useState("");
  const [proof, setProof] = useState("");
  const [uploading, setUploading] = useState(false);

  const onProofSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setProof(url);
      toast.success("Bukti transfer diunggah");
    } catch { toast.error("Gagal mengunggah bukti transfer"); }
    finally { setUploading(false); }
  };

  const submit = () => onSubmit({
    customer: customer.trim() || null,
    customer_phone: phone.trim() || null,
    address: address.trim() || null,
    product_note: products.trim() || null,
    taken_status: taken,
    courier_name: courierName.trim() || null,
    courier_phone: courierPhone.trim() || null,
    transfer_proof: proof || null,
  });

  const fld = "w-full rounded-lg border border-slate-700 bg-[#0A0D14] px-3 py-2.5 text-sm text-white outline-none focus:border-[#FF2E2E] transition-colors";
  const lbl = "block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-sm" onClick={onClose}>
      <div data-testid="pos-sale-form-modal" onClick={(e) => e.stopPropagation()} className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-[#111723] max-h-[90vh] overflow-y-auto animate-fade-up">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-[#111723] px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2"><ReceiptIcon className="h-5 w-5 text-[#FF2E2E]" /> Form Penjualan</h2>
            <p className="text-[11px] text-slate-500">Semua kolom opsional • Total <span className="font-mono-tech text-[#FF2E2E]">{rupiah(total)}</span></p>
          </div>
          <button data-testid="pos-sale-form-close" onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Nama Pembeli</label>
              <div className="relative"><UserRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input data-testid="pos-sf-customer" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Nama" className={`${fld} pl-9`} /></div>
            </div>
            <div>
              <label className={lbl}>Nomor Telepon</label>
              <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input data-testid="pos-sf-phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="08xxxx" className={`${fld} pl-9`} /></div>
            </div>
          </div>

          <div>
            <label className={lbl}>Nama Product</label>
            <div className="relative"><PackageIcon className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <textarea data-testid="pos-sf-products" value={products} onChange={(e) => setProducts(e.target.value)} rows={2} placeholder="Otomatis dari keranjang" className={`${fld} pl-9 resize-none`} /></div>
          </div>

          <div>
            <label className={lbl}>Status Pengambilan</label>
            <div className="grid grid-cols-2 gap-2">
              {["Belum", "Sudah"].map((s) => (
                <button key={s} data-testid={`pos-sf-taken-${s}`} type="button" onClick={() => setTaken(s)} className={`flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-sm font-semibold transition-colors ${taken === s ? "border-[#FF2E2E] bg-[#FF2E2E]/15 text-white" : "border-slate-700 bg-[#0A0D14] text-slate-400 hover:border-slate-500"}`}>
                  {taken === s && <Check className="h-3.5 w-3.5" />} {s === "Sudah" ? "Sudah Diambil" : "Belum Diambil"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Nama Kurir</label>
              <div className="relative"><Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input data-testid="pos-sf-courier-name" value={courierName} onChange={(e) => setCourierName(e.target.value)} placeholder="Nama kurir / travel" className={`${fld} pl-9`} /></div>
            </div>
            <div>
              <label className={lbl}>No. Telepon Kurir</label>
              <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input data-testid="pos-sf-courier-phone" value={courierPhone} onChange={(e) => setCourierPhone(e.target.value)} inputMode="tel" placeholder="08xxxx" className={`${fld} pl-9`} /></div>
            </div>
          </div>

          <div>
            <label className={lbl}>Alamat</label>
            <div className="relative"><MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <textarea data-testid="pos-sf-address" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="Alamat pengiriman" className={`${fld} pl-9 resize-none`} /></div>
          </div>

          <div>
            <label className={lbl}>Bukti Transfer</label>
            <div className="flex items-center gap-3">
              {proof && <img src={resolveImage(proof)} alt="bukti" className="h-16 w-16 rounded-lg object-cover border border-slate-700" />}
              <label data-testid="pos-sf-proof-label" className="flex items-center gap-2 rounded-lg border border-dashed border-slate-600 bg-[#0A0D14] px-4 py-3 text-sm text-slate-300 hover:border-[#FF2E2E] transition-colors cursor-pointer">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />} {proof ? "Ganti foto" : "Unggah foto"}
                <input data-testid="pos-sf-proof-input" type="file" accept="image/*" onChange={onProofSelected} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex gap-2 bg-[#111723] px-6 py-4 border-t border-slate-800">
          <button data-testid="pos-sf-skip" type="button" onClick={() => onSubmit({})} disabled={processing || uploading} className="flex-1 rounded-xl border border-slate-700 py-3 text-sm font-semibold text-slate-300 hover:text-white transition-colors disabled:opacity-40">Lewati</button>
          <button data-testid="pos-sf-submit" type="button" onClick={submit} disabled={processing || uploading} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#FF2E2E] py-3 text-sm font-bold text-white hover:scale-[1.01] transition-transform disabled:opacity-40">
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ReceiptIcon className="h-4 w-4" />} Bayar & Cetak Struk
          </button>
        </div>
      </div>
    </div>
  );
}
