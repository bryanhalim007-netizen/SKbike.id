import { useEffect } from "react";

const DEFAULT_TITLE = "SK BIKE | Katalog Sepeda & Sepeda Listrik";
const DEFAULT_DESC = "SK Bike Store Ketapang — katalog sepeda & sepeda listrik, siap antar Kabupaten Ketapang, Kalimantan Barat.";

function setMeta(attr, key, value) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value || "");
}

function setCanonical(url) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", url);
}

export function useSeo({ title, description, image, url, type = "website" } = {}) {
  useEffect(() => {
    const t = title ? `${title} | SK Bike Store` : DEFAULT_TITLE;
    const d = (description || DEFAULT_DESC).slice(0, 200);
    const u = url || window.location.href;
    document.title = t;
    setMeta("name", "description", d);
    setMeta("property", "og:type", type);
    setMeta("property", "og:title", t);
    setMeta("property", "og:description", d);
    setMeta("property", "og:url", u);
    if (image) setMeta("property", "og:image", image);
    setMeta("name", "twitter:card", image ? "summary_large_image" : "summary");
    setMeta("name", "twitter:title", t);
    setMeta("name", "twitter:description", d);
    if (image) setMeta("name", "twitter:image", image);
    setCanonical(u);
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title, description, image, url, type]);
}
