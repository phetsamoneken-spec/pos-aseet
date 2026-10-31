import React, { useSyncExternalStore } from 'react';
import { isAppUpdateReady, subscribeToAppUpdates } from '../services/appUpdates';

export function AppUpdateNotice() {
  const ready = useSyncExternalStore(subscribeToAppUpdates, isAppUpdateReady, () => false);
  if (!ready) return null;
  return <div role="status" className="no-print fixed top-4 left-4 right-4 z-[100] mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-white p-4 text-sm text-slate-900 shadow-xl">
    <span>ມີເວີຊັນໃໝ່ພ້ອມແລ້ວ. ບັນທຶກວຽກກ່ອນໂຫຼດຄືນ. / Update ready.</span>
    <button type="button" className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white cursor-pointer" onClick={() => window.location.reload()}>ໂຫຼດເວີຊັນໃໝ່ / Reload</button>
  </div>;
}
