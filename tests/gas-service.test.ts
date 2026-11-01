import assert from 'node:assert/strict';
const values = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
  removeItem: (key: string) => { values.delete(key); }
};
Object.assign(globalThis, { localStorage: localStorageMock, window: { localStorage: localStorageMock } });
const { storage } = await import('../src/services/storage');
const { GasService } = await import('../src/services/gasService');
const snapshot = storage.getGoogleSheetsSnapshot();
for (const name of ['customers', 'conditions', 'contracts', 'budgets', 'transactions', 'logs']) {
  assert.ok(snapshot[name].length > 0, name);
}
assert.equal(snapshot.users, undefined);
assert.ok(!JSON.stringify(snapshot).includes('CHANGE_ME_ADMIN_PASSWORD'));
snapshot.customers[0].name = 'must not mutate app storage';
assert.notEqual(storage.getCustomers()[0].name, snapshot.customers[0].name);
let calls = 0;
const endpoint = 'https://script.google.com/macros/s/test-deployment/exec';
globalThis.fetch = async (url, init) => {
  calls++;
  assert.equal(url, endpoint);
  assert.equal((init!.headers as Record<string, string>)['Content-Type'], 'text/plain;charset=utf-8');
  const body = JSON.parse(String(init!.body));
  assert.equal(body.action, 'SYNC_BULK_DATA');
  assert.equal(body.payload.customers.length, 578);
  assert.ok(body.payload.budgets.length > 0);
  return new Response(JSON.stringify({ success: true, syncVersion: 2, annualBudgetVersion: 1, message: 'saved' }));
};
assert.equal((await GasService.syncAllToGoogleSheets(endpoint)).success, true);
assert.equal((await GasService.syncAllToGoogleSheets('https://example.com/exec')).success, false);
assert.equal(calls, 1);
globalThis.fetch = async () => new Response(JSON.stringify({ success: true, message: 'Sync handshake confirmed' }));
assert.equal((await GasService.syncAllToGoogleSheets(endpoint)).success, false);
globalThis.fetch = async () => new Response(JSON.stringify({ success: false, error: 'Sheet write failed' }));
assert.deepEqual(await GasService.syncAllToGoogleSheets(endpoint), { success: false, message: 'Sheet write failed' });
assert.equal((await GasService.testConnection(endpoint)).success, false);
await storage.login('b1_user', 'CHANGE_ME_TEAM_B1_PASSWORD');
assert.equal((await GasService.syncAllToGoogleSheets(endpoint)).success, false);
console.log('PASS: complete snapshot, defensive copy, credential exclusion, HTTP payload, URL validation, backend failures, and team-user restriction');
