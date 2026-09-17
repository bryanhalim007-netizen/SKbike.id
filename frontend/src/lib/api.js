import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API, withCredentials: true });

// Auto-refresh: jika akses token kedaluwarsa (401), coba refresh sekali lalu ulangi request.
let refreshPromise = null;
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config || {};
    const status = error?.response?.status;
    const url = original.url || "";
    const isAuthCall = url.includes("/auth/login") || url.includes("/auth/refresh");
    if (status === 401 && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        refreshPromise = refreshPromise || api.post("/auth/refresh");
        await refreshPromise;
        refreshPromise = null;
        return api(original);
      } catch (e) {
        refreshPromise = null;
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

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
export async function getCategories() {
  const { data } = await api.get("/categories");
  return data;
}
// ---- Admin: kategori ----
export async function listCategoriesAdmin() {
  const { data } = await api.get("/admin/categories");
  return data;
}
export async function createCategory(payload) {
  const { data } = await api.post("/admin/categories", payload);
  return data;
}
export async function updateCategory(id, payload) {
  const { data } = await api.put(`/admin/categories/${id}`, payload);
  return data;
}
export async function deleteCategory(id) {
  const { data } = await api.delete(`/admin/categories/${id}`);
  return data;
}
export async function reorderCategories(order) {
  const { data } = await api.put("/admin/categories/reorder", { order });
  return data;
}
export async function getProducts({ sort } = {}) {
  const { data } = await api.get("/products", { params: sort ? { sort } : {} });
  return data;
}
export async function getProduct(id) {
  const { data } = await api.get(`/products/${id}`);
  return data;
}

// ---- Auth ----
export async function login(email, password) {
  try {
    const { data } = await api.post("/auth/login", { email, password });
    return { ok: true, user: { id: data.id, email: data.email, name: data.name, role: data.role, is_super: data.is_super } };
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
export async function getLowStock() {
  const { data } = await api.get("/admin/low-stock");
  return data;
}

// ---- Supplier & Purchase Order (Restock) ----
export async function listSuppliers() {
  const { data } = await api.get("/admin/suppliers");
  return data;
}
export async function createSupplier(payload) {
  const { data } = await api.post("/admin/suppliers", payload);
  return data;
}
export async function updateSupplier(id, payload) {
  const { data } = await api.put(`/admin/suppliers/${id}`, payload);
  return data;
}
export async function deleteSupplier(id) {
  await api.delete(`/admin/suppliers/${id}`);
}
export async function exportSupplier(id) {
  const { data } = await api.get(`/admin/suppliers/${id}/export`, { responseType: "blob" });
  return data;
}
export async function listPurchaseOrders(supplierId) {
  const { data } = await api.get("/admin/purchase-orders", { params: supplierId ? { supplier_id: supplierId } : {} });
  return data;
}
export async function createPurchaseOrder(payload) {
  const { data } = await api.post("/admin/purchase-orders", payload);
  return data;
}
export async function deletePurchaseOrder(id) {
  await api.delete(`/admin/purchase-orders/${id}`);
}
export async function receivePurchaseOrder(id, items) {
  const { data } = await api.post(`/admin/purchase-orders/${id}/receive`, items ? { items } : {});
  return data;
}
export async function setPurchaseOrderPaid(id, paid) {
  const { data } = await api.patch(`/admin/purchase-orders/${id}/paid`, { paid });
  return data;
}
export async function purchaseSummary() {
  const { data } = await api.get("/admin/purchase-orders/summary");
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
export async function updateProductVariants(id, variants) {
  const { data } = await api.put(`/admin/products/${id}/variants`, { variants });
  return data;
}
export async function deleteProduct(id) {
  await api.delete(`/admin/products/${id}`);
}
export async function reorderProducts(order) {
  const { data } = await api.put("/admin/products/reorder", { order });
  return data;
}
export async function setProductFeatured(id, featured) {
  const { data } = await api.put(`/admin/products/${id}/featured`, { featured });
  return data;
}
export async function exportProducts(format = "json") {
  const { data } = await api.get("/admin/products/export", { params: { format }, responseType: "blob" });
  return data;
}
export async function importProducts(file, mode = "merge") {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post("/admin/products/import", fd, { params: { mode }, headers: { "Content-Type": "multipart/form-data" } });
  return data;
}
export async function exportBackup(format = "json") {
  const { data } = await api.get("/admin/backup/export", { params: { format }, responseType: "blob" });
  return data;
}
export async function importBackup(file, mode = "merge") {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post("/admin/backup/import", fd, { params: { mode }, headers: { "Content-Type": "multipart/form-data" } });
  return data;
}
export async function priceHistoryAll() {
  const { data } = await api.get("/admin/price-history");
  return data;
}
export async function priceHistoryProduct(id) {
  const { data } = await api.get(`/admin/products/${id}/price-history`);
  return data;
}
export async function uploadImage(file) {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post("/admin/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
  return data.image_url;
}
export async function createSale(payload) {
  const { data } = await api.post("/admin/sales", payload);
  return data;
}
export async function listSales() {
  const { data } = await api.get("/admin/sales");
  return data;
}
export async function updateSale(id, payload) {
  const { data } = await api.put(`/admin/sales/${id}`, payload);
  return data;
}
export async function updateSaleStatus(id, payload) {
  const { data } = await api.patch(`/admin/sales/${id}/status`, payload);
  return data;
}
export async function deleteSale(id) {
  await api.delete(`/admin/sales/${id}`);
}
export async function returnSale(id, returned) {
  const { data } = await api.patch(`/admin/sales/${id}/return`, { returned });
  return data;
}
export async function salesSummary() {
  const { data } = await api.get("/admin/sales/summary");
  return data;
}
export async function salesDaily(days = 14) {
  const { data } = await api.get("/admin/sales/daily", { params: { days } });
  return data;
}
export async function salesDashboard({ range = "today", start, end } = {}) {
  const params = { range };
  if (start) params.start = start;
  if (end) params.end = end;
  const { data } = await api.get("/admin/dashboard", { params });
  return data;
}

// ---- Service / Bengkel ----
export const SERVICE_STATUSES = ["Antri", "Dikerjakan", "Menunggu Sparepart", "Selesai", "Diambil"];
export async function listServices() {
  const { data } = await api.get("/admin/services");
  return data;
}
export async function createService(payload) {
  const { data } = await api.post("/admin/services", payload);
  return data;
}
export async function updateService(id, payload) {
  const { data } = await api.put(`/admin/services/${id}`, payload);
  return data;
}
export async function deleteService(id) {
  await api.delete(`/admin/services/${id}`);
}
export async function servicesSummary() {
  const { data } = await api.get("/admin/services/summary");
  return data;
}

// ---- POS (Point of Sale) ----
export async function posCheckout(payload) {
  const { data } = await api.post("/admin/pos/checkout", payload);
  return data;
}

// ---- Admin account management (super admin only) ----
export async function listAdmins() {
  const { data } = await api.get("/admin/admins");
  return data;
}
export async function createAdmin(payload) {
  const { data } = await api.post("/admin/admins", payload);
  return data;
}
export async function deleteAdmin(id) {
  await api.delete(`/admin/admins/${id}`);
}
export async function changeAdminPassword(id, password) {
  await api.put(`/admin/admins/${id}/password`, { password });
}
export async function changeAdminRole(id, role) {
  const { data } = await api.put(`/admin/admins/${id}/role`, { role });
  return data;
}

// ---- Activity log (super admin only) ----
export async function listActivity(limit = 150) {
  const { data } = await api.get("/admin/activity", { params: { limit } });
  return data;
}

// ---- Access PINs ----
export async function getPins() {
  const { data } = await api.get("/admin/pins");
  return data;
}
export async function updatePins(payload) {
  const { data } = await api.put("/admin/pins", payload);
  return data;
}
export async function verifyPin(scope, pin) {
  const { data } = await api.post("/admin/verify-pin", { scope, pin });
  return data.ok;
}

// ---- Absensi / Pegawai ----
export async function listEmployees() {
  const { data } = await api.get("/admin/employees");
  return data;
}
export async function createEmployee(payload) {
  const { data } = await api.post("/admin/employees", payload);
  return data;
}
export async function deleteEmployee(id) {
  await api.delete(`/admin/employees/${id}`);
}
export async function updateEmployee(id, payload) {
  const { data } = await api.put(`/admin/employees/${id}`, payload);
  return data;
}
export async function listAttendance(employeeId) {
  const { data } = await api.get("/admin/attendance", { params: { employee_id: employeeId } });
  return data;
}
export async function markAttendance(payload) {
  const { data } = await api.post("/admin/attendance", payload);
  return data;
}
