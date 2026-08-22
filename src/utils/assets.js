/** Public asset URL that respects Vite `base` (GitHub Pages `/Omaju/`). */
export function assetUrl(path) {
  const cleaned = String(path || '').replace(/^\//, '');
  return `${import.meta.env.BASE_URL}${cleaned}`;
}
