// Public web-app address, never a password or session credential.
export const DEPLOYED_BACKEND_URL = 'https://script.google.com/macros/s/AKfycbzqRrcFZcabexZCXH7okCcWOqTuJOc2CsBq4sKz7m9sLjBdz_bEYWslfsgl4-HWY-gT/exec';
const RETIRED_BACKENDS = ['https://script.google.com/macros/s/AKfycbxt7FMAsx19pzuuMUB8xheP4aJtsZvjD_3W1qW5fjyZmvrgfIHCt7-TtC-QFwrCmiDu/exec'];
export function isRetiredBackend(value:unknown):boolean { return typeof value==='string' && RETIRED_BACKENDS.includes(value.trim()); }

const buildDefault = import.meta.env?.PROD ? DEPLOYED_BACKEND_URL : '';

// Production always uses one deployment-owned backend on every device.
// Explicit local endpoints remain available only for development/demo use.
export function resolveBackendUrl(saved: unknown, fallback = buildDefault): string {
  if(fallback)return fallback;
  return typeof saved === 'string' && saved.trim() && !isRetiredBackend(saved) ? saved.trim() : fallback;
}
