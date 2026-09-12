import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API, withCredentials: true });

// Kategori tetap (selaras dengan backend) agar tab kategori tidak menunggu request.
export const CATEGORIES = [
  "Sepeda Listrik", "Sepeda Gunung", "BMX", "Sepeda Anak",
  "Sepeda Lipat", "Motor / Mobil Aki", "Mini Trail", "Road Bike",
];

export function resolveImage(url) {
  if (!url) return "";
  if (url.startsWith("/api")) return `${BACKEND_URL}${url}`;
  return url;
}

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Terjadi kesalahan. Silakan coba lagi.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => d?.msg || String(d)).join(", ");
  return String(detail);
}

// ---- Public ----
export async function getConfig() {
  const { data } = await api.get("/config");
  return data;
}
export async function getProducts({ sort } = {}) {
  const { data } = await api.get("/products", { params: sort ? { sort } : {} });
  return data;
}

// ---- Auth ----
export async function login(email, password) {
  try {
    const { data } = await api.post("/auth/login", { email, password });
    return { ok: true, user: { id: data.id, email: data.email, name: data.name, role: data.role } };
  } catch (e) {
    return { ok: false, error: formatApiErrorDetail(e?.response?.data?.detail) };
  }
}
export async function logout() {
  try { await api.post("/auth/logout"); } catch { /* ignore */ }
}
export async function getMe() {
  try { const { data } = await api.get("/auth/me"); return data; } catch { return null; }
}

// ---- Admin ----
export async function adminProducts() {
  const { data } = await api.get("/admin/products");
  return data;
}
export async function adminStats() {
  const { data } = await api.get("/admin/stats");
  return data;
}
export async function addProduct(payload) {
  const { data } = await api.post("/admin/products", payload);
  return data;
}
export async function updateProduct(id, payload) {
  const { data } = await api.put(`/admin/products/${id}`, payload);
  return data;
}
export async function deleteProduct(id) {
  await api.delete(`/admin/products/${id}`);
}
export async function uploadImage(file) {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post("/admin/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
  return data.image_url;
}
