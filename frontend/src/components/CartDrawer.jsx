import { useCart } from "../context/CartContext";
import { resolveImage } from "../lib/api";
import { ShoppingCart, X, Plus, Minus, Trash2, MessageCircle } from "lucide-react";

export function CartDrawer({ waNumber }) {
  const { items, open, setOpen, updateQty, removeItem, clearCart, totalItems, totalPrice } = useCart();

  const rupiah = (n) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");

  const checkout = () => {
    if (items.length === 0) return;
    const lines = items.map((it, i) => {
      const opts = [it.color, it.size].filter(Boolean).join(", ");
      return `${i + 1}. ${it.name}${opts ? ` [${opts}]` : ""}${it.code ? ` (${it.code})` : ""} x${it.qty}${it.price ? ` — ${rupiah(it.price * it.qty)}` : ""}`;
    });
    const totalLine = totalPrice ? `\n\n*Estimasi Total: ${rupiah(totalPrice)}*` : "";
    const msg =
      `Halo Admin SK Bike, saya ingin memesan:\n\n${lines.join("\n")}` + totalLine +
      `\n\nMohon konfirmasi harga, ketersediaan & proses selanjutnya. Terima kasih!`;
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, "_blank");
    setOpen(false);
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[60] bg-[#0A0D14]/80 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Panel */}
      <aside
        data-testid="cart-drawer"
        className={`fixed top-0 right-0 z-[70] h-full w-[92vw] max-w-md bg-[#0B0E16] border-l border-slate-800 shadow-2xl flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#111723]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF2E2E]/15 text-[#FF2E2E]">
              <ShoppingCart className="h-5 w-5" />
            </span>
            <div>
              <p className="font-heading font-bold text-white uppercase italic leading-none">Keranjang</p>
              <p className="text-xs text-slate-400 mt-1">{totalItems} item dipilih</p>
            </div>
          </div>
          <button
            data-testid="cart-close-btn"
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#161F2E] text-slate-300 hover:text-[#FF2E2E] transition-colors"
            aria-label="Tutup keranjang"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#161F2E] text-slate-600 mb-4">
                <ShoppingCart className="h-7 w-7" />
              </span>
              <p className="font-heading font-bold text-white uppercase italic">Keranjang Kosong</p>
              <p className="text-sm text-slate-400 mt-1">Tambahkan sepeda dari katalog untuk memulai pesanan.</p>
            </div>
          ) : (
            items.map((it) => (
              <div
                key={it.key || it.id}
                data-testid={`cart-item-${it.id}`}
                className="flex gap-3 rounded-2xl border border-slate-800 bg-[#161F2E] p-3"
              >
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#0A0D14]">
                  {it.image_url ? (
                    <img src={resolveImage(it.image_url)} alt={it.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-slate-600">Tanpa Gambar</div>
                  )}
                </div>
                <div className="flex flex-1 flex-col min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-[#FF2E2E]">{it.category}</p>
                  <p className="font-heading font-bold text-white text-sm leading-snug truncate">{it.name}</p>
                  {(it.color || it.size) && (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {it.color && <span className="rounded-full border border-slate-700 bg-[#0A0D14] px-2 py-0.5 text-[10px] text-slate-300">{it.color}</span>}
                      {it.size && <span className="rounded-full border border-[#FF7A33]/40 bg-[#FF7A33]/10 px-2 py-0.5 text-[10px] text-[#FF7A33]">{it.size}</span>}
                    </div>
                  )}
                  {it.price > 0 && <p className="mt-1 text-xs font-mono-tech font-bold text-white">{rupiah(it.price)}</p>}

                  <div className="mt-auto pt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        data-testid={`cart-qty-minus-${it.id}`}
                        onClick={() => updateQty(it.key || it.id, it.qty - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-[#0A0D14] text-slate-300 hover:text-[#FF2E2E] hover:border-[#FF2E2E] transition-colors"
                        aria-label="Kurangi"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span data-testid={`cart-qty-${it.id}`} className="w-6 text-center text-sm font-semibold text-white">{it.qty}</span>
                      <button
                        data-testid={`cart-qty-plus-${it.id}`}
                        onClick={() => updateQty(it.key || it.id, it.qty + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-[#0A0D14] text-slate-300 hover:text-[#FF2E2E] hover:border-[#FF2E2E] transition-colors"
                        aria-label="Tambah"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      data-testid={`cart-remove-${it.id}`}
                      onClick={() => removeItem(it.key || it.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:text-[#FF2E2E] transition-colors"
                      aria-label="Hapus item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-slate-800 bg-[#111723] px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Total item</span>
              <span data-testid="cart-total" className="font-heading text-xl font-black text-white italic">{totalItems}</span>
            </div>
            {totalPrice > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Estimasi total</span>
                <span data-testid="cart-total-price" className="font-heading text-lg font-black text-[#FF2E2E] italic font-mono-tech">{rupiah(totalPrice)}</span>
              </div>
            )}
            <p className="text-[11px] text-slate-500">Harga & total akan dikonfirmasi oleh admin via WhatsApp.</p>
            <button
              data-testid="cart-checkout-btn"
              onClick={checkout}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3.5 text-sm font-bold uppercase tracking-wide text-white hover:brightness-110 transition-[filter]"
            >
              <MessageCircle className="h-5 w-5" /> Pesan via WhatsApp
            </button>
            <button
              data-testid="cart-clear-btn"
              onClick={clearCart}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-[#161F2E] px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-[#FF2E2E] hover:border-[#FF2E2E] transition-colors"
            >
              <Trash2 className="h-4 w-4" /> Kosongkan Keranjang
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
