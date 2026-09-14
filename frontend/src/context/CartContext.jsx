import React, { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "skbike_cart_v1";

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore quota / privacy errors */
    }
  }, [items]);

  const addItem = (product, qty = 1) => {
    setItems((prev) => {
      const found = prev.find((it) => it.id === product.id);
      if (found) {
        return prev.map((it) => (it.id === product.id ? { ...it, qty: it.qty + qty } : it));
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          category: product.category,
          price: Number(product.price) || 0,
          image_url: product.image_url || "",
          qty,
        },
      ];
    });
  };

  const removeItem = (id) => setItems((prev) => prev.filter((it) => it.id !== id));

  const updateQty = (id, qty) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, qty: Math.max(1, Number(qty) || 1) } : it)));

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((s, it) => s + it.qty, 0);
  const totalPrice = items.reduce((s, it) => s + it.price * it.qty, 0);

  const value = { items, open, setOpen, addItem, removeItem, updateQty, clearCart, totalItems, totalPrice };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
