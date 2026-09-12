// Image URLs are absolute (http/https) or inline data URLs in offline mode.
export function resolveImage(url) {
  return url || "";
}

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Terjadi kesalahan. Silakan coba lagi.";
  if (typeof detail === "string") return detail;
  return String(detail);
}
