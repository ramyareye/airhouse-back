const R2_BASE_URL = "https://files.airhouse.name";

export function resolveFeaturedImageUrl(url: string | null) {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  const normalized = url.startsWith("/") ? url.slice(1) : url;
  return `${R2_BASE_URL}/${normalized}`;
}

