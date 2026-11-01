// Public web-app address, never a password or session credential.
export const DEPLOYED_BACKEND_URL = 'https://script.google.com/macros/s/AKfycbxt7FMAsx19pzuuMUB8xheP4aJtsZvjD_3W1qW5fjyZmvrgfIHCt7-TtC-QFwrCmiDu/exec';

const buildDefault = import.meta.env?.PROD ? DEPLOYED_BACKEND_URL : '';

// Keep an Admin's explicit configuration; repair missing/blank settings on new
// devices and browsers that saved settings before the shared default existed.
export function resolveBackendUrl(saved: unknown, fallback = buildDefault): string {
  return typeof saved === 'string' && saved.trim() ? saved.trim() : fallback;
}
