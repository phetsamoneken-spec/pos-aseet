const crypto = require('node:crypto');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('gas/Code.gs', 'utf8');
function backend(options = {}) {
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
    deleteRow(row) { this.rows.splice(row-1,1); }
  }
  const ss = { getSpreadsheetTimeZone:()=> 'Asia/Bangkok', getId: () => 'TEST_SHEET_ID_0123456789', getSheetByName: n => sheets.get(n), insertSheet(n) { const s = new Sheet(n); sheets.set(n, s); return s; } };
  const context = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => key === 'INITIAL_ADMIN_PASSWORD' ? (options.adminPassword === undefined ? 'Test-only-password-42!' : options.adminPassword) : (options.property === undefined ? ss.getId() : options.property) }) },
    SpreadsheetApp: { openById: id => { assert.equal(id, ss.getId()); return ss; }, getActiveSpreadsheet: () => options.bound ? ss : null, flush() {} },
    LockService: { getScriptLock: () => ({ waitLock() { held = true; }, hasLock: () => held, releaseLock() { assert.ok(held); held = false; } }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ setMimeType: () => JSON.parse(s) }) },
    Utilities: {formatDate:(value,zone,format)=>{assert.equal(zone,'Asia/Bangkok');return format==='yyyy-MM-dd'?value.toISOString().slice(0,10):value.toISOString()},getUuid:()=>crypto.randomUUID(),DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,s)=>[...crypto.createHash('sha256').update(s).digest()]},
    CacheService: {getScriptCache:()=>({get:()=>null,put(){},remove(){}})},
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
  assert.equal(b.sheets.size, 10); assert.equal(b.sheets.get('USERS').rows.length, 2);
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
test('script property resolves the real Sheet ID and ping reports it', () => {
 const b = backend(); assert.equal(b.context.getSpreadsheet().getId(), 'TEST_SHEET_ID_0123456789');
 assert.equal(b.context.doGet({ parameter: { action: 'ping' } }).spreadsheetId, 'TEST_SHEET_ID_0123456789');
 assert.equal(b.post({ ...payload(), spreadsheetId: 'TEST_SHEET_ID_0123456789' }).success, true);
});
test('bound Sheet fallback works; missing config gives setup instructions instead of opening placeholder', () => {
 const bound = backend({ property: 'YOUR_SPREADSHEET_ID', bound: true });
 assert.equal(bound.context.getSpreadsheet().getId(), 'TEST_SHEET_ID_0123456789');
 const unbound = backend({ property: 'YOUR_SPREADSHEET_ID' });
 assert.throws(() => unbound.context.initializeDatabase(), /Script Properties/);
 assert.equal(unbound.context.doGet({ parameter: { action: 'ping' } }).success, false);
});
test('full Sheet URL in Script Properties extracts the ID; invalid config is rejected', () => {
 assert.equal(backend({ property: 'https://docs.google.com/spreadsheets/d/TEST_SHEET_ID_0123456789/edit' }).context.getSpreadsheet().getId(), 'TEST_SHEET_ID_0123456789');
 assert.throws(() => backend({ property: 'bad' }).context.getSpreadsheet(), /Invalid SPREADSHEET_ID/);
});

function userRequest(b, action, payload={}, authToken) {
 return b.context.doPost({postData:{contents:JSON.stringify({action,payload,authToken})}});
}
function signedInBackend() {
 const b=backend(); b.context.initializeDatabase();
 const login=userRequest(b,'AUTH_LOGIN',{username:'admin',password:'Test-only-password-42!'});
 assert.equal(login.success,true);return {b,login};
}
test('user bootstrap hashes passwords and login returns only safe fields and an opaque session',()=>{
 const {b,login}=signedInBackend();
 assert.match(b.sheets.get('USERS').rows[1][2], /^\$2[aby]\$/);
 assert.ok(!JSON.stringify(b.sheets.get('USERS').rows).includes('Test-only-password-42!'));
 assert.equal(login.user.password,undefined);assert.equal(login.user.passwordHash,undefined);
 assert.ok(!JSON.stringify(b.sheets.get('SESSIONS').rows).includes(login.token));
 assert.equal(userRequest(b,'AUTH_LOGIN',{username:'admin',password:'incorrect'}).success,false);
 assert.equal(userRequest(b,'ADD_USER',{username:'evil',role:'ADMIN',password:'Test-only-password-42!'}).success,false);
});
test('admin sync saves users once; independent login uses Sheet credentials; role checks reject forged admin',()=>{
 const {b,login}=signedInBackend();
 const data={username:'team1',fullName:'Team One',role:'TEAM_USER',team:'B1',password:'Test-team-password-42!'};
 const synced=userRequest(b,'SYNC_USERS',{users:[data]},login.token);assert.equal(synced.success,true);
 assert.equal(userRequest(b,'SYNC_USERS',{users:[data]},synced.token).success,true);
 assert.equal(b.sheets.get('USERS').rows.length,3);
 const teamLogin=userRequest(b,'AUTH_LOGIN',{username:'team1',password:'Test-team-password-42!'});
 assert.equal(teamLogin.success,true);assert.equal(teamLogin.user.team,'B1');
 assert.equal(userRequest(b,'GET_USERS',{role:'ADMIN'},teamLogin.token).success,false);
 assert.equal(userRequest(b,'UPDATE_USER',{id:login.user.id,role:'ADMIN'},teamLogin.token).success,false);
 assert.equal(synced.users.find(u=>u.username==='team1').password,undefined);
});
test('password reset invalidates old sessions, disable blocks login, and delete persists in USERS',()=>{
 const {b,login}=signedInBackend();
 const add=userRequest(b,'ADD_USER',{username:'team2',fullName:'Team Two',role:'TEAM_USER',team:'B2',password:'Test-team-password-42!'},login.token);
 const user=add.users.find(u=>u.username==='team2');
 const old=userRequest(b,'AUTH_LOGIN',{username:'team2',password:'Test-team-password-42!'});
 const reset=userRequest(b,'RESET_USER_PASSWORD',{id:user.id,password:'New-test-password-42!'},add.token);assert.equal(reset.success,true);
 assert.equal(userRequest(b,'AUTH_ME',{},old.token).success,false);
 assert.equal(userRequest(b,'AUTH_LOGIN',{username:'team2',password:'Test-team-password-42!'}).success,false);
 assert.equal(userRequest(b,'AUTH_LOGIN',{username:'team2',password:'New-test-password-42!'}).success,true);
 const disabled=userRequest(b,'UPDATE_USER',{id:user.id,isActive:false},reset.token);assert.equal(disabled.success,true);
 assert.equal(userRequest(b,'AUTH_LOGIN',{username:'team2',password:'New-test-password-42!'}).success,false);
 assert.equal(userRequest(b,'DELETE_USER',{id:user.id},disabled.token).success,true);
 assert.ok(!b.sheets.get('USERS').rows.some(r=>r[0]===user.id));
 assert.equal(userRequest(b,'DELETE_USER',{id:login.user.id},disabled.token).success,false);
});
test('bootstrap requires a private password property and migrates legacy plaintext without losing accounts',()=>{
 const b=backend({adminPassword:null});assert.throws(()=>b.context.initializeDatabase(),/INITIAL_ADMIN_PASSWORD/);
 const legacy=backend();legacy.context.userTables_();legacy.sheets.get('USERS').appendRow(['old','admin','Old-pass-42!','Old Admin','','ADMIN','ALL',true,'','']);
 legacy.context.initializeUsers_();assert.equal(legacy.sheets.get('USERS').rows.length,2);
 assert.match(legacy.sheets.get('USERS').rows[1][2],/^\$2[aby]\$/);
 assert.equal(userRequest(legacy,'AUTH_LOGIN',{username:'admin',password:'Old-pass-42!'}).success,true);
});

test('store deletion status syncs without removing financial history and survives repeat sync',()=>{
 const b=backend();
 assert.equal(b.post(payload()).success,true);
 const p=payload();p.customers[0].status='DELETED';
 assert.equal(b.post(p).success,true);
 const customers=b.sheets.get('CUSTOMERS');
 const statusColumn=customers.rows[0].indexOf('Status');
 assert.equal(customers.rows[1][statusColumn],'DELETED');
 assert.equal(b.sheets.get('CONTRACTS').rows.length,2);
 assert.equal(b.sheets.get('BUDGET_TRANSACTIONS').rows.length,2);
 assert.equal(b.post(p).success,true);
 assert.equal(customers.rows.length,2);
 assert.equal(customers.rows[1][statusColumn],'DELETED');
});


test('authenticated business reads filter all linked tables by the session team, ignoring caller roles',()=>{
 const b=backend();b.context.initializeDatabase();
 const p=payload();
 p.budgets[0].customerCode='C1';
 p.customers.push({code:'C2',name:'Team two',team:'B2',status:'DELETED'});
 p.conditions.push({id:'COND2',customerCode:'C2',conditionQuantity:0});
 p.contracts.push({id:'CT2',customerCode:'C2',cycleNumber:1});
 p.budgets.push({id:'BD2',contractId:'CT2',customerCode:'C2',annualAmount:500,totalUsed:600,remainingAmount:-100});
 p.transactions.push({id:'T2',customerCode:'C2',contractId:'CT2',amount:600,status:'ACTIVE'});
 assert.equal(b.post(p).success,true);
 const login=userRequest(b,'AUTH_LOGIN',{username:'admin',password:'Test-only-password-42!'});
 assert.equal(userRequest(b,'GET_BUSINESS_DATA').success,false);
 const all=userRequest(b,'GET_BUSINESS_DATA',{},login.token);
 assert.equal(all.success,true);assert.equal(all.dataVersion,1);assert.equal(all.scope,'ALL');
 for(const key of ['customers','conditions','contracts','budgets','transactions'])assert.equal(all.snapshot[key].length,2,key);
 assert.equal(all.snapshot.budgets[1].remainingAmount,-100);
 assert.equal(all.snapshot.customers[1].status,'DELETED');
 assert.equal(all.snapshot.users,undefined);assert.equal(all.snapshot.settings,undefined);
 assert.ok(!JSON.stringify(all).includes('Password Hash'));
 const created=userRequest(b,'ADD_USER',{username:'team-reader',password:'Team-reader-test!',fullName:'Reader',role:'TEAM_USER',team:'B1'},login.token);
 assert.equal(created.success,true);
 const team=userRequest(b,'AUTH_LOGIN',{username:'team-reader',password:'Team-reader-test!'});
 const own=userRequest(b,'GET_BUSINESS_DATA',{team:'ALL',role:'ADMIN'},team.token);
 assert.equal(own.success,true);assert.equal(own.scope,'B1');
 for(const key of ['customers','conditions','contracts','budgets','transactions']){assert.equal(own.snapshot[key].length,1,key);assert.ok(!JSON.stringify(own.snapshot[key]).includes('C2'));}
 // An ALL team value does not grant administrator reads.
 const row=b.sheets.get('USERS').rows.find(row=>row[1]==='team-reader');row[6]='ALL';
 assert.equal(userRequest(b,'GET_BUSINESS_DATA',{},team.token).success,false);
});

test('business reads use named columns, preserve dates/zero balances, and reject invalid schemas',()=>{
 const b=backend();b.context.initializeDatabase();
 const p=payload();p.customers[0].status='ACTIVE';p.conditions[0].conditionQuantity=0;
 p.contracts[0].commencingOn='2026-01-02';assert.equal(b.post(p).success,true);
 const login=userRequest(b,'AUTH_LOGIN',{username:'admin',password:'Test-only-password-42!'});
 const sheet=b.sheets.get('CUSTOMERS');
 sheet.rows=sheet.rows.map(row=>[row[1],row[0],...row.slice(2)]);
 const contracts=b.sheets.get('CONTRACTS');contracts.rows[1][4]=new Date('2026-01-02T00:00:00Z');
 const result=userRequest(b,'GET_BUSINESS_DATA',{},login.token);
 assert.equal(result.success,true);assert.equal(result.snapshot.customers[0].code,'C1');
 assert.equal(result.snapshot.contracts[0].commencingOn,'2026-01-02');assert.equal(result.snapshot.conditions[0].conditionQuantity,0);
 sheet.rows[0][1]='Unexpected ID';assert.equal(userRequest(b,'GET_BUSINESS_DATA',{},login.token).success,false);
});

test('legacy public customer GET does not bypass authenticated team-scoped reads',()=>{
 const b=backend();assert.equal(b.context.doGet({parameter:{action:'getCustomers',team:'ALL'}}).success,false);
 assert.equal(b.context.doGet({parameter:{action:'ping'}}).success,true);
});
