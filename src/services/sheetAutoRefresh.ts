export const SHEET_REFRESH_INTERVAL_MS = 15_000;

// Sheet remains authoritative while a signed-in browser stays open.
export function startSheetAutoRefresh(refresh: () => Promise<unknown>): () => void {
  let stopped = false;
  let running = false;
  const run = async () => {
    if (stopped || running || document.visibilityState === 'hidden' || navigator.onLine === false) return;
    running = true;
    try { await refresh(); }
    catch (error) { console.warn('Could not refresh Sheet data:', error); }
    finally { running = false; }
  };
  const onWake = () => { void run(); };
  const timer = window.setInterval(onWake, SHEET_REFRESH_INTERVAL_MS);
  window.addEventListener('focus', onWake);
  window.addEventListener('online', onWake);
  document.addEventListener('visibilitychange', onWake);
  onWake();
  return () => {
    stopped = true;
    window.clearInterval(timer);
    window.removeEventListener('focus', onWake);
    window.removeEventListener('online', onWake);
    document.removeEventListener('visibilitychange', onWake);
  };
}
