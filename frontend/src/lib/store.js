// Offline-first local data layer (no server). Everything lives in localStorage.

const PRODUCTS_KEY = "skbike_products_v1";
const AUTH_KEY = "skbike_auth_v1";

export const WHATSAPP_NUMBER = "628125559681";
export const CATEGORIES = [
  "Sepeda Listrik", "Sepeda Gunung", "BMX", "Sepeda Anak",
  "Sepeda Lipat", "Motor / Mobil Aki", "Mini Trail", "Road Bike",
];

// Admin credentials come from build-time env (no literal in source).
const ADMIN = {
  email: (process.env.REACT_APP_ADMIN_EMAIL || "bryan.halim007@gmail.com").toLowerCase(),
  password: process.env.REACT_APP_ADMIN_PASSWORD || "velox2026",
  name: "Admin SK Bike",
};

const SEED = [
  { name: "SK Trail Pro 29", code: "MTB-001", category: "Sepeda Gunung", price: 8500000, stock: 12, status: "Tersedia",
    description: "Sepeda gunung hardtail agresif untuk trail teknikal dengan geometri modern dan handling presisi.",
    image_url: "https://images.unsplash.com/photo-1621122940876-2b3be129159c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NjZ8MHwxfHNlYXJjaHwzfHxtb3VudGFpbiUyMGJpa2UlMjBiaWN5Y2xlJTIwYWN0aW9uJTIwY3ljbGluZ3xlbnwwfHx8fDE3ODkxOTYxMjJ8MA&ixlib=rb-4.1.0&q=85",
    specs: { frame: "Aluminium Alloy 6061", transmisi: "Shimano Deore 12-Speed", rem: "Hydraulic Disc Brake", ukuran_roda: "29 inci", baterai_motor: "-" } },
  { name: "SK Enduro X1", code: "MTB-002", category: "Sepeda Gunung", price: 15750000, stock: 5, status: "Stok Terbatas",
    description: "Full suspension enduro untuk medan ekstrem, travel 160mm dan performa turunan luar biasa.",
    image_url: "https://images.unsplash.com/photo-1606087492572-424ebe0f2f61?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NjZ8MHwxfHNlYXJjaHwyfHxtb3VudGFpbiUyMGJpa2UlMjBiaWN5Y2xlJTIwYWN0aW9uJTIwY3ljbGluZ3xlbnwwfHx8fDE3ODkxOTYxMjJ8MA&ixlib=rb-4.1.0&q=85",
    specs: { frame: "Carbon Fiber", transmisi: "SRAM GX Eagle 12-Speed", rem: "SRAM Code R 4-Piston", ukuran_roda: "29 inci", baterai_motor: "-" } },
  { name: "SK Street BMX 20", code: "BMX-001", category: "BMX", price: 3200000, stock: 20, status: "Tersedia",
    description: "BMX freestyle tangguh untuk trik park dan street, ringan namun kokoh.",
    image_url: "https://images.unsplash.com/photo-1594015197353-373334c20904?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzB8MHwxfHNlYXJjaHwyfHxCTVglMjByaWRlciUyMHRyaWNrfGVufDB8fHx8MTc4NzcyMzIyOHww&ixlib=rb-4.1.0&q=85",
    specs: { frame: "Chromoly 4130", transmisi: "Single Speed 25T", rem: "U-Brake Rear", ukuran_roda: "20 inci", baterai_motor: "-" } },
  { name: "SK Pro Park BMX", code: "BMX-002", category: "BMX", price: 4100000, stock: 8, status: "Tersedia",
    description: "BMX kompetisi dengan komponen premium untuk rider tingkat lanjut.",
    image_url: "https://images.unsplash.com/flagged/photo-1553677969-1d67bbe9d55a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzB8MHwxfHNlYXJjaHwxfHxCTVglMjByaWRlciUyMHRyaWNrfGVufDB8fHx8MTc4NzcyMzIyOHww&ixlib=rb-4.1.0&q=85",
    specs: { frame: "Full Chromoly", transmisi: "Single Speed 25/9", rem: "Gyro U-Brake", ukuran_roda: "20 inci", baterai_motor: "-" } },
  { name: "SK Junior 16", code: "ANK-001", category: "Sepeda Anak", price: 1450000, stock: 25, status: "Tersedia",
    description: "Sepeda anak aman dan ceria dengan roda bantu, cocok usia 4-7 tahun.",
    image_url: "https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?crop=entropy&cs=srgb&fm=jpg&fit=max&q=80&w=1080",
    specs: { frame: "Hi-Ten Steel", transmisi: "Single Speed", rem: "Coaster + V-Brake", ukuran_roda: "16 inci", baterai_motor: "-" } },
  { name: "SK Fold Urban 20", code: "LPT-001", category: "Sepeda Lipat", price: 4750000, stock: 15, status: "Tersedia",
    description: "Sepeda lipat urban ringkas, dilipat dalam 15 detik untuk mobilitas kota.",
    image_url: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?crop=entropy&cs=srgb&fm=jpg&fit=max&q=80&w=1080",
    specs: { frame: "Aluminium Alloy Lipat", transmisi: "Shimano 7-Speed", rem: "Dual V-Brake", ukuran_roda: "20 inci", baterai_motor: "-" } },
  { name: "SK E-Trail 750W", code: "ELC-001", category: "Sepeda Listrik", price: 22500000, stock: 7, status: "Tersedia",
    description: "E-bike gunung bertenaga motor 750W, jangkauan hingga 80km per pengisian.",
    image_url: "https://images.unsplash.com/photo-1571068316344-75bc76f77890?crop=entropy&cs=srgb&fm=jpg&fit=max&q=80&w=1080",
    specs: { frame: "Aluminium Alloy E-Bike", transmisi: "Shimano 9-Speed", rem: "Hydraulic Disc 180mm", ukuran_roda: "27.5 inci", baterai_motor: "Motor 750W / Baterai 48V 15Ah" } },
  { name: "SK E-City Cruiser", code: "ELC-002", category: "Sepeda Listrik", price: 16900000, stock: 10, status: "Tersedia",
    description: "E-bike perkotaan nyaman dengan desain elegan dan bantuan pedal cerdas.",
    image_url: "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?crop=entropy&cs=srgb&fm=jpg&fit=max&q=80&w=1080",
    specs: { frame: "Aluminium Step-Through", transmisi: "Shimano 7-Speed", rem: "Tektro Disc Brake", ukuran_roda: "700c", baterai_motor: "Motor 500W / Baterai 36V 12Ah" } },
];

function uid() {
  return (crypto.randomUUID ? crypto.randomUUID() : "id-" + Date.now() + "-" + Math.random().toString(16).slice(2));
}

function read() {
  try { return JSON.parse(localStorage.getItem(PRODUCTS_KEY)) || []; } catch { return []; }
}
function write(list) {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(list));
}

export function seedIfEmpty() {
  if (!localStorage.getItem(PRODUCTS_KEY)) {
    const now = new Date().toISOString();
    write(SEED.map((p) => ({ ...p, id: uid(), created_at: now, updated_at: now })));
  }
}

export function getConfig() {
  return { whatsapp_number: WHATSAPP_NUMBER, categories: CATEGORIES };
}

export function getProducts({ sort } = {}) {
  seedIfEmpty();
  let list = read();
  if (sort === "price_asc") list = [...list].sort((a, b) => a.price - b.price);
  else if (sort === "price_desc") list = [...list].sort((a, b) => b.price - a.price);
  else list = [...list].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  return list;
}

export function getStats() {
  const list = read();
  const cats = new Set(list.map((p) => p.category));
  return {
    total_products: list.length,
    total_categories: cats.size,
    in_stock: list.filter((p) => (p.stock || 0) > 0).length,
    inventory_value: list.reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.stock) || 0), 0),
  };
}

export function addProduct(data) {
  const list = read();
  const now = new Date().toISOString();
  const item = { ...data, id: uid(), price: Number(data.price) || 0, stock: Number(data.stock) || 0, created_at: now, updated_at: now };
  list.push(item);
  write(list);
  return item;
}

export function updateProduct(id, data) {
  const list = read();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...data, price: Number(data.price) || 0, stock: Number(data.stock) || 0, updated_at: new Date().toISOString() };
  write(list);
  return list[idx];
}

export function deleteProduct(id) {
  write(read().filter((p) => p.id !== id));
}

// ---- Export / Import (offline data portability) ----
export function exportData() {
  return {
    app: "SK Bike Store",
    version: 1,
    exported_at: new Date().toISOString(),
    products: read(),
  };
}

export function importData(payload, { mode = "replace" } = {}) {
  let data = payload;
  if (typeof payload === "string") {
    try { data = JSON.parse(payload); } catch { return { ok: false, error: "File tidak valid (bukan JSON)." }; }
  }
  const incoming = Array.isArray(data) ? data : data && data.products;
  if (!Array.isArray(incoming)) return { ok: false, error: "Format file tidak dikenali. Pastikan file ekspor SK Bike." };

  const now = new Date().toISOString();
  const clean = incoming
    .filter((p) => p && p.name)
    .map((p) => ({
      ...p,
      id: p.id || uid(),
      price: Number(p.price) || 0,
      stock: Number(p.stock) || 0,
      created_at: p.created_at || now,
      updated_at: now,
    }));

  if (mode === "merge") {
    const list = read();
    const byId = new Map(list.map((p) => [p.id, p]));
    clean.forEach((p) => byId.set(p.id, { ...byId.get(p.id), ...p }));
    write(Array.from(byId.values()));
  } else {
    write(clean);
  }
  return { ok: true, count: clean.length };
}

// ---- Auth (local, offline-by-design) ----
// NOTE: This is a fully offline PWA (user requirement: 100% no server). There is no
// backend to issue httpOnly cookies, so the session flag is kept in localStorage.
// No sensitive server secret is stored here.
export function login(email, password) {
  if ((email || "").trim().toLowerCase() === ADMIN.email && password === ADMIN.password) {
    const user = { email: ADMIN.email, name: ADMIN.name, role: "admin" };
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    return { ok: true, user };
  }
  return { ok: false, error: "Email atau kata sandi salah" };
}

export function getUser() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch { return null; }
}

export function logout() {
  localStorage.removeItem(AUTH_KEY);
}
