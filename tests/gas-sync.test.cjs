const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('gas/Code.gs', 'utf8');
function backend() {
  let held = false;
  const sheets = new Map();
  const failWrites = new Set();
  class Sheet {
    constructor(name) { this.name = name; this.rows = []; }
    getLastRow() { return this.rows.length; }
    getMaxRows() { return 10000; }
    getMaxColumns() { return 100; }
    getDataRange() { return this.getRange(1, 1, this.rows.length, Math.max(1, ...this.rows.map(r => r.length))); }
    getRange(row, col, height = 1, width = 1) {
      const self = this;
      const range = {
        getValues() { return Array.from({ length: height }, (_, i) => Array.from({ length: width }, (_, j) => self.rows[row - 1 + i]?.[col - 1 + j] ?? '')); },
        getFormulas() { return range.getValues().map(r => r.map(v => typeof v === 'string' && v.startsWith('=') ? v : '')); },
        setValues(values) {
          if (failWrites.has(self.name)) throw Error('simulated write failure');
          values.forEach((r, i) => { self.rows[row - 1 + i] ??= []; r.forEach((v, j) => { self.rows[row - 1 + i][col - 1 + j] = v; }); });
          return range;
        },
        setValue(value) { return range.setValues([[value]]); },
        setBackground() { return range; }, setFontColor() { return range; }, setFontWeight() { return range; }
      };
      return range;
    }
    appendRow(row) { this.rows.push([...row]); }
    setFrozenRows() {}
  }
  const ss = { getSheetByName: n => sheets.get(n), insertSheet(n) { const s = new Sheet(n); sheets.set(n, s); return s; } };
  const context = vm.createContext({
    SpreadsheetApp: { openById: () => ss, flush() {} },
    LockService: { getScriptLock: () => ({ waitLock() { held = true; }, hasLock: () => held, releaseLock() { assert.ok(held); held = false; } }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ setMimeType: () => JSON.parse(s) }) },
    Logger: { log() {} }
  });
  vm.runInContext(source, context);
  return { context, sheets, ss, failWrites, post(payload) { const result = context.doPost({ postData: { contents: JSON.stringify({ action: 'SYNC_BULK_DATA', payload }) } }); assert.equal(held, false); return result; } };
}
const payload = () => ({
  spreadsheetId: 'YOUR_SPREADSHEET_ID',
  customers: [{ code: 'C1', name: 'ລູກຄ້າ', team: 'B1' }],
  conditions: [{ id: 'COND1', customerCode: 'C1', conditionQuantity: 125, pricePerUnit: 240000 }],
  contracts: [{ id: 'CT1', customerCode: 'C1', cycleNumber: 1 }],
  budgets: [{ id: 'B1', contractId: 'CT1', annualAmount: 30000000, totalUsed: 100000, remainingAmount: 29900000 }],
  transactions: [{ id: 'T1', customerCode: 'C1', contractId: 'CT1', amount: 100000, status: 'ACTIVE' }],
  logs: [{ id: 'L1', action: 'ADD_TRANSACTION' }],
  settings: { pricePerCrate: 240000, language: 'lo', password: 'must-not-export' }
});
test('single file includes setup/import and sync writes all seven tables without exporting credentials', () => {
  const b = backend();
  assert.equal(typeof b.context.initializeDatabase, 'function');
  assert.equal(typeof b.context.importExistingCustomerData, 'function');
  const res = b.post(payload());
  assert.equal(res.success, true);
  assert.equal(Object.keys(res.counts).length, 7);
  assert.equal(b.sheets.get('CUSTOMERS').rows[1][1], 'ລູກຄ້າ');
  assert.equal(b.sheets.get('BUDGETS').rows[1][4], 30000000);
  assert.ok(!JSON.stringify(b.sheets.get('SETTINGS').rows).includes('must-not-export'));
});
test('repeat sync updates by ID, preserves other rows, formulas, extra columns and contract history', () => {
  const b = backend(); b.post(payload());
  const customers = b.sheets.get('CUSTOMERS');
  customers.rows[0].push('Manual Formula'); customers.rows[1].push('=1+1');
  customers.appendRow(['OTHER', 'Keep me']);
  const p = payload(); p.customers[0].name = 'Updated'; p.customers[0].phone = '=IMPORTXML("x")';
  p.transactions[0].status = 'CANCELLED'; p.transactions[0].cancelledBy = 'admin';
  const res = b.post(p);
  assert.equal(res.success, true); assert.equal(res.counts.CUSTOMERS.inserted, 0);
  assert.equal(customers.rows.length, 3); assert.equal(customers.rows[1][1], 'Updated');
  assert.equal(customers.rows[1].at(-1), '=1+1'); assert.equal(customers.rows[2][0], 'OTHER');
  assert.equal(customers.rows[1][4], '\'=IMPORTXML("x")');
  assert.equal(b.sheets.get('CONTRACTS').rows.length, 2);
  assert.equal(b.sheets.get('BUDGET_TRANSACTIONS').rows[1][13], 'CANCELLED');
});
test('invalid later table is rejected before any table is written', () => {
  const b = backend(); const p = payload(); p.transactions.push({ ...p.transactions[0] });
  assert.equal(b.post(p).success, false); assert.equal(b.sheets.size, 0);
  assert.equal(b.post({ ...payload(), spreadsheetId: 'wrong' }).success, false);
});
test('legacy initializeDatabase remains idempotent and accepts extended sync columns', () => {
  const b = backend(); b.context.initializeDatabase(); b.context.initializeDatabase();
  assert.equal(b.sheets.size, 10); assert.equal(b.sheets.get('USERS').rows.length, 9);
  assert.equal(b.post(payload()).success, true);
  assert.equal(b.sheets.get('CUSTOMER_CONDITIONS').rows[0].at(-1), 'Price per Unit');
});
test('empty or omitted collections never delete stored rows; malformed schema is rejected', () => {
  const b = backend(); b.post(payload());
  assert.equal(b.post({ customers: [] }).success, true); assert.equal(b.sheets.get('CUSTOMERS').rows.length, 2);
  b.sheets.get('CUSTOMERS').rows[0][0] = 'Wrong Column';
  assert.equal(b.post(payload()).success, false); assert.equal(b.sheets.get('CUSTOMERS').rows[0][0], 'Wrong Column');
});
test('partial write failure is not reported as success; retry inserts no duplicates', () => {
  const b = backend(); b.failWrites.add('BUDGETS');
  const res = b.post(payload()); assert.equal(res.success, false); assert.ok(res.appliedSheets.includes('CUSTOMERS'));
  b.failWrites.clear(); assert.equal(b.post(payload()).success, true); assert.equal(b.sheets.get('CUSTOMERS').rows.length, 2);
});
test('malformed requests return failure and release their lock', () => {
  const b = backend(); assert.equal(b.context.doPost({ postData: { contents: '{bad' } }).success, false);
  assert.equal(b.post(payload()).success, true);
});
