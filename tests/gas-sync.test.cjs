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
  const failDeletes = new Set();
  class Sheet {
    constructor(name) { this.name = name; this.rows = []; }
    getName(){return this.name;}
    setName(name){if(sheets.has(name)&&name!==this.name)throw Error('Duplicate sheet name');sheets.delete(this.name);this.name=name;sheets.set(name,this);return this;}
    copyTo(target){const copy=target.insertSheet('Copy-'+crypto.randomUUID());copy.rows=JSON.parse(JSON.stringify(this.rows));return copy;}
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
    deleteRow(row) { this.deleteRows(row,1); }
    deleteRows(row,count) { if(failDeletes.has(this.name))throw Error('simulated row deletion failure');this.rows.splice(row-1,count); }
  }
  const ss = { getSpreadsheetTimeZone:()=> 'Asia/Bangkok', getId: () => options.sheetId||'TEST_SHEET_ID_0123456789', getSheetByName: n => sheets.get(n), insertSheet(n) { const s = new Sheet(n); sheets.set(n, s); return s; } };
  const context = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => key === 'INITIAL_ADMIN_PASSWORD' ? (options.adminPassword === undefined ? 'Test-only-password-42!' : options.adminPassword) : (options.property === undefined ? ss.getId() : options.property) }) },
    SpreadsheetApp: { openById: id => { assert.equal(id, ss.getId()); return ss; }, getActiveSpreadsheet: () => options.bound ? ss : null, flush() {} },
    LockService: { getScriptLock: () => ({ waitLock() { assert.equal(held,false,'must not acquire a nested script lock');held = true; }, hasLock: () => held, releaseLock() { assert.ok(held); held = false; } }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ setMimeType: () => JSON.parse(s) }) },
    Utilities: {formatDate:(value,zone,format)=>{assert.equal(zone,'Asia/Bangkok');return format==='yyyy-MM-dd'?value.toISOString().slice(0,10):value.toISOString()},getUuid:()=>crypto.randomUUID(),DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,s)=>[...crypto.createHash('sha256').update(s).digest()]},
    CacheService: {getScriptCache:()=>({get:()=>null,put(){},remove(){}})},
    Logger: { log() {} }
  });
  vm.runInContext(source, context);
  return { context, sheets, ss, failWrites, failDeletes, post(payload) { let result;try{result=context.handleBulkSync(payload);}catch(error){result={success:false,error:String(error)};} assert.equal(held, false); return result; } };
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
  assert.equal(b.sheets.size, 12); assert.equal(b.sheets.get('USERS').rows.length, 2);
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
 if(action==='SYNC_BULK_DATA'&&authToken&&payload.expectedBusinessRevision===undefined){try{payload={...payload,expectedBusinessRevision:b.context.readBusinessData_(authToken).businessRevision};}catch{}}
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
 assert.equal(b.sheets.get('USERS').rows.find(r=>r[0]===user.id)[10],'DELETED');assert.ok(b.sheets.get('USERS').rows.find(r=>r[0]===user.id)[12]);assert.ok(!userRequest(b,'GET_USERS',{},disabled.token).users.some(u=>u.id===user.id));
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

test('only a signed-in Admin can publish Excel data and shared settings; team users receive the Admin configuration',()=>{
 const b=backend();b.context.initializeDatabase();
 const login=userRequest(b,'AUTH_LOGIN',{username:'admin',password:'Test-only-password-42!'});
 assert.equal(userRequest(b,'SYNC_BULK_DATA',payload()).success,false);
 assert.equal(userRequest(b,'SAVE_SHARED_SETTINGS',{settings:{language:'en'},role:'ADMIN'}).success,false);
 assert.equal(userRequest(b,'ADD_USER',{username:'policy-reader',password:'Team-policy-test!',fullName:'Policy Reader',role:'TEAM_USER',team:'B1'},login.token).success,true);
 const team=userRequest(b,'AUTH_LOGIN',{username:'policy-reader',password:'Team-policy-test!'});
 const before=JSON.stringify(b.sheets.get('SETTINGS').rows);
 assert.equal(userRequest(b,'SYNC_BULK_DATA',{...payload(),role:'ADMIN'},team.token).success,false);
 assert.equal(userRequest(b,'SAVE_SHARED_SETTINGS',{settings:{pricePerCrate:1},role:'ADMIN'},team.token).success,false);
 assert.equal(JSON.stringify(b.sheets.get('SETTINGS').rows),before);
 assert.equal(userRequest(b,'SYNC_BULK_DATA',payload(),login.token).success,true);
 const common={language:'en',currencyCode:'USD',currencySymbol:'$',currencyPosition:'before',pricePerCrate:250000,warningThresholdPercent:85,contractAlertDays:45,dashboardTheme:'minimal'};
 assert.equal(userRequest(b,'SAVE_SHARED_SETTINGS',{settings:{...common,appsScriptUrl:'must-not-be-shared'}},login.token).success,true);
 const read=userRequest(b,'GET_SHARED_SETTINGS',{role:'ADMIN',team:'ALL'},team.token);
 assert.equal(read.success,true);assert.equal(read.settingsVersion,1);assert.deepEqual(JSON.parse(JSON.stringify(read.settings)),common);
 assert.equal(read.user.team,'B1');assert.equal(read.settings.appsScriptUrl,undefined);
 const data=userRequest(b,'GET_BUSINESS_DATA',{},team.token);
 assert.equal(data.settings.dashboardTheme,'minimal');assert.equal(data.settings.currencyCode,'USD');assert.equal(data.user.role,'TEAM_USER');
 const saved=JSON.stringify(b.sheets.get('SETTINGS').rows);
 assert.equal(userRequest(b,'SAVE_SHARED_SETTINGS',{settings:{pricePerCrate:-1}},login.token).success,false);
 assert.equal(JSON.stringify(b.sheets.get('SETTINGS').rows),saved);
 assert.equal(userRequest(b,'UPDATE_BUDGET',{budgetId:'B1',newAmount:1},team.token).success,false);
 assert.equal(userRequest(b,'NEW_CONTRACT_CYCLE',{customerCode:'C1'},team.token).success,false);
 assert.equal(userRequest(b,'ADD_TRANSACTION',{customerCode:'not-your-store',team:'B1'},team.token).success,false);
 const row=b.sheets.get('USERS').rows.find(row=>row[1]==='policy-reader');row[6]='B2';
 assert.equal(userRequest(b,'GET_SHARED_SETTINGS',{},team.token).user.team,'B2','server assignment updates without a new login');
});

test('legacy team transaction writes cannot forge customer/contract/budget links or spreadsheet formulas',()=>{
 const b=backend();b.context.initializeDatabase();const p=payload();p.budgets[0].customerCode='C1';p.contracts[0].commencingOn='2026-01-01';p.contracts[0].expiringOn='2026-12-31';
 p.customers.push({code:'C2',name:'Other team',team:'B2'});p.contracts.push({id:'CT2',customerCode:'C2',team:'B2',cycleNumber:1});p.budgets.push({id:'BD2',contractId:'CT2',customerCode:'C2',team:'B2',annualAmount:100});
 assert.equal(b.post(p).success,true);
 const admin=userRequest(b,'AUTH_LOGIN',{username:'admin',password:'Test-only-password-42!'});
 userRequest(b,'ADD_USER',{username:'txn-reader',password:'Transaction-test!',fullName:'Team',role:'TEAM_USER',team:'B1'},admin.token);
 const team=userRequest(b,'AUTH_LOGIN',{username:'txn-reader',password:'Transaction-test!'});
 const before=b.sheets.get('BUDGET_TRANSACTIONS').rows.length;
 assert.equal(userRequest(b,'ADD_TRANSACTION',{customerCode:'C1',contractId:'CT2',budgetId:'BD2',amount:1},team.token).success,false);
 assert.equal(b.sheets.get('BUDGET_TRANSACTIONS').rows.length,before);
 const saved=userRequest(b,'ADD_TRANSACTION',{id:'forged-id',customerCode:'C1',customerName:'forged-name',team:'B2',createdBy:'admin',contractId:'CT1',budgetId:'B1',amount:1,date:'2026-11-01',description:'=1+1',category:'Other'},team.token);
 assert.equal(saved.success,true);
 const row=b.sheets.get('BUDGET_TRANSACTIONS').rows.at(-1);
 assert.notEqual(row[0],'forged-id');assert.equal(row[3],'ລູກຄ້າ');assert.equal(row[4],'B1');assert.equal(row[11],'txn-reader');assert.equal(row[8],"'=1+1");
});

test('annual budgets persist by contract anniversary and authenticated transactions charge/cancel their own year',()=>{
 const {b,login}=signedInBackend(),p=payload();
 Object.assign(p.contracts[0],{commencingOn:'2024-05-19',expiringOn:'2027-05-18',team:'B1'});
 Object.assign(p.budgets[0],{customerCode:'C1',team:'B1',annualAmount:1000,totalUsed:200,remainingAmount:800});
 Object.assign(p.transactions[0],{budgetId:'B1',team:'B1',date:'2024-06-01',amount:200});
 const sync=userRequest(b,'SYNC_BULK_DATA',p,login.token);assert.equal(sync.success,true);assert.equal(sync.annualBudgetVersion,1);
 const originalRows=b.sheets.get('BUDGETS').rows.length;
 const read=()=>userRequest(b,'GET_BUSINESS_DATA',{},login.token).snapshot;
 let data=read();assert.equal(data.budgets.length,3);assert.equal(b.sheets.get('BUDGETS').rows.length,originalRows,'reads are projections without Sheet writes');
 assert.deepEqual(JSON.parse(JSON.stringify(data.budgets.map(x=>[x.periodNumber,x.periodStart,x.periodEnd,x.totalUsed]))),[[1,'2024-05-19','2025-05-18',200],[2,'2025-05-19','2026-05-18',0],[3,'2026-05-19','2027-05-18',0]]);
 assert.equal(userRequest(b,'SYNC_BULK_DATA',{...data},login.token).success,true);assert.equal(b.sheets.get('BUDGETS').rows.length,4);
 userRequest(b,'ADD_USER',{username:'annual-team',password:'Annual-team-test!',fullName:'Team',role:'TEAM_USER',team:'B1'},login.token);
 const team=userRequest(b,'AUTH_LOGIN',{username:'annual-team',password:'Annual-team-test!'});
 const entry={customerCode:'C1',contractId:'CT1',budgetId:'B1-Y2',date:'2025-05-19',amount:100,description:'Second year',category:'Other'};
 assert.equal(userRequest(b,'ADD_TRANSACTION',{...entry,budgetId:'B1'},team.token).success,false,'cannot charge the previous year');
 assert.equal(userRequest(b,'ADD_TRANSACTION',{...entry,date:'2027-05-19'},team.token).success,false,'contract expiry caps annual resets');
 assert.equal(userRequest(b,'ADD_TRANSACTION',{...entry,amount:1001},team.token).success,false,'team budget limit uses the chosen year');
 const added=userRequest(b,'ADD_TRANSACTION',entry,team.token);assert.equal(added.success,true);assert.equal(added.budgetId,'B1-Y2');
 data=read();assert.equal(data.budgets.find(b=>b.id==='B1-Y2').totalUsed,100);assert.equal(data.budgets.find(b=>b.id==='B1').totalUsed,200);assert.equal(data.budgets.find(b=>b.id==='B1-Y3').remainingAmount,1000);
 assert.equal(userRequest(b,'CANCEL_TRANSACTION',{txnId:'T1',reason:'Prior year cancellation'},team.token).success,true);
 data=read();assert.equal(data.budgets.find(b=>b.id==='B1').totalUsed,0);assert.equal(data.budgets.find(b=>b.id==='B1-Y2').totalUsed,100);assert.equal(data.transactions.find(t=>t.id==='T1').status,'CANCELLED');
 assert.equal(userRequest(b,'CANCEL_TRANSACTION',{txnId:'T1'},team.token).success,false);
 const retryEntry={...entry,id:'stable-request-key',amount:900};
 b.failWrites.add('BUDGET_TRANSACTIONS');assert.equal(userRequest(b,'ADD_TRANSACTION',retryEntry,team.token).success,false);
 b.failWrites.clear();const retried=userRequest(b,'ADD_TRANSACTION',retryEntry,team.token);assert.equal(retried.success,true);
 assert.equal(userRequest(b,'ADD_TRANSACTION',retryEntry,team.token).success,true,'retry acknowledges the same transaction even after the budget is exhausted');
 data=read();assert.equal(data.transactions.filter(t=>t.id===retried.id).length,1);assert.equal(data.budgets.find(b=>b.id==='B1-Y2').totalUsed,1000,'partial writes and retries do not duplicate spending');
 assert.equal(userRequest(b,'SYNC_BULK_DATA',{...data},login.token).success,true);assert.equal(b.sheets.get('BUDGETS').rows.length,4);assert.equal(read().budgets.find(b=>b.id==='B1-Y2').totalUsed,1000);
});

const incremental=(b,token,id,kind,data)=>userRequest(b,'MUTATE_BUSINESS',{id:'OP-'+id,kind,data},token);
const newStore=(code,team='B1')=>({code,name:'Store '+code,team,conditionQty:2,conditionUOM:'CAS',conditionProductDescription:'Product',commencingOn:'2026-01-01',expiringOn:'2028-12-31',annualBudget:200,phone:'=1+1'});
test('incremental store and expense writes reach the shared Sheet, enforce teams and retain deleted-store history',()=>{
 const {b,login}=signedInBackend();userRequest(b,'SAVE_SHARED_SETTINGS',{settings:{pricePerCrate:100}},login.token);
 userRequest(b,'ADD_USER',{username:'writer',fullName:'Writer',role:'TEAM_USER',team:'B1',password:'Writer-test-42!'},login.token);
 const team=userRequest(b,'AUTH_LOGIN',{username:'writer',password:'Writer-test-42!'});
 assert.equal(incremental(b,undefined,'unauthorized-0001','ADD_CUSTOMER',newStore('C1')).success,false);
 assert.equal(incremental(b,team.token,'cross-team-00001','ADD_CUSTOMER',newStore('CROSS','B2')).success,false);
 const added=incremental(b,team.token,'create-store-001','ADD_CUSTOMER',{...newStore('C1'),annualBudget:999999});assert.equal(added.success,true);assert.equal(added.writeVersion,1);assert.equal(added.patch.budgets[0].annualAmount,200,'Team cannot forge the Admin price');
 assert.equal(incremental(b,login.token,'create-store-002','ADD_CUSTOMER',newStore('C2','B2')).success,true);
 assert.equal(b.sheets.get('CUSTOMERS').rows.length,3);assert.equal(b.sheets.get('CUSTOMERS').rows[1][4],"'=1+1");
 assert.equal(incremental(b,team.token,'wrong-delete-001','DELETE_CUSTOMER',{customerCode:'C2',role:'ADMIN'}).success,false);
 const entry={customerCode:'C1',date:'2026-11-01',category:'Other',description:'Shared expense',amount:75};
 const expense=incremental(b,team.token,'expense-write-01','ADD_TRANSACTION',entry);assert.equal(expense.success,true);
 assert.equal(incremental(b,team.token,'expense-write-01','ADD_TRANSACTION',entry).entityId,expense.entityId,'lost-response retry has the same receipt');
 assert.equal(incremental(b,team.token,'expense-write-01','ADD_TRANSACTION',{...entry,amount:80}).success,false,'an operation ID cannot be reused with different data');
 assert.equal(incremental(b,login.token,'expense-write-02','ADD_TRANSACTION',{...entry,amount:30}).success,true);
 const read=()=>userRequest(b,'GET_BUSINESS_DATA',{},login.token).snapshot;
 assert.equal(read().budgets.find(x=>x.customerCode==='C1'&&x.periodNumber===1).totalUsed,105,'two browsers add to the authoritative balance');
 assert.equal(read().transactions.length,2);
 assert.equal(incremental(b,team.token,'forged-budget-01','UPDATE_BUDGET',{budgetId:added.patch.budgets[0].id,newAmount:9999}).success,false);
 assert.equal(incremental(b,team.token,'cancel-expense-1','CANCEL_TRANSACTION',{txnId:expense.entityId,reason:'Correction'}).success,true);
 assert.equal(read().budgets.find(x=>x.customerCode==='C1'&&x.periodNumber===1).totalUsed,30);
 const deleted=incremental(b,team.token,'delete-store-001','DELETE_CUSTOMER',{customerCode:'C1'});assert.equal(deleted.success,true);assert.equal(deleted.patch.customers.length,0);
 assert.equal(b.sheets.get('CUSTOMERS').rows.some(row=>row[0]==='C1'),false);assert.equal(read().transactions.length,0);assert.equal(read().contracts.length,1);
 assert.equal(incremental(b,team.token,'expense-deleted1','ADD_TRANSACTION',entry).success,false);
 const independent=userRequest(b,'AUTH_LOGIN',{username:'writer',password:'Writer-test-42!'});const own=userRequest(b,'GET_BUSINESS_DATA',{},independent.token);assert.deepEqual(JSON.parse(JSON.stringify(own.snapshot.customers.map(c=>[c.code,c.status]))),[]);
 assert.equal(incremental(b,team.token,'delete-all-team1','DELETE_ALL_CUSTOMERS',{}).success,false);
 assert.equal(incremental(b,login.token,'delete-all-admin','DELETE_ALL_CUSTOMERS',{}).success,true);assert.equal(read().customers.length,0);assert.equal(read().transactions.length,0);
});

test('journal recovery finishes partial writes once and stale full snapshots cannot overwrite another browser',()=>{
 const {b,login}=signedInBackend();assert.equal(incremental(b,login.token,'create-recovery1','ADD_CUSTOMER',newStore('R1')).success,true);
 const before=userRequest(b,'GET_BUSINESS_DATA',{},login.token);
 const entry={customerCode:'R1',date:'2026-11-01',category:'Other',description:'Retry safely',amount:70};
 b.failWrites.add('BUDGET_TRANSACTIONS');assert.equal(incremental(b,login.token,'partial-expense1','ADD_TRANSACTION',entry).success,false);
 b.failWrites.clear();const recovered=userRequest(b,'GET_BUSINESS_DATA',{},login.token);assert.equal(recovered.success,true);assert.equal(recovered.snapshot.transactions.length,1);assert.equal(recovered.snapshot.budgets[0].totalUsed,70);
 assert.equal(incremental(b,login.token,'partial-expense1','ADD_TRANSACTION',entry).success,true);assert.equal(userRequest(b,'GET_BUSINESS_DATA',{},login.token).snapshot.transactions.length,1);
 const stale=userRequest(b,'SYNC_BULK_DATA',{...before.snapshot,expectedBusinessRevision:before.businessRevision},login.token);assert.equal(stale.success,false);assert.match(stale.message,/another device/);assert.equal(userRequest(b,'GET_BUSINESS_DATA',{},login.token).snapshot.budgets[0].totalUsed,70);
 assert.equal(incremental(b,login.token,'after-recovery01','ADD_TRANSACTION',{...entry,amount:20}).success,true);assert.equal(userRequest(b,'GET_BUSINESS_DATA',{},login.token).snapshot.budgets[0].totalUsed,90);
 const invalid=incremental(b,login.token,'validation-00001','NEW_CONTRACT',{customerCode:'R1',commencingOn:'2026-02-01',expiringOn:'2027-02-01',annualBudget:200});assert.equal(invalid.success,false);assert.equal(invalid.retryable,false);
 assert.equal(incremental(b,login.token,'future-contract1','NEW_CONTRACT',{customerCode:'R1',commencingOn:'2029-01-01',expiringOn:'2030-12-31',annualBudget:500}).success,true);
 const all=userRequest(b,'GET_BUSINESS_DATA',{},login.token);assert.equal(all.snapshot.contracts.length,2);assert.equal(all.snapshot.transactions.length,2);
 assert.equal(b.sheets.get('APP_WRITES').rows.slice(1).every(row=>row[4]==='DONE'),true);
});

test('large journal plans split into valid Unicode chunks and replay without losing historical receipts',()=>{
 const {b,login}=signedInBackend();const added=incremental(b,login.token,'large-plan-store','ADD_CUSTOMER',newStore('LARGE'));assert.equal(added.success,true);
 const contract=added.patch.contracts[0],budget=added.patch.budgets[0];
 const history=Array.from({length:30},(_,i)=>({id:'HISTORY-'+i,customerCode:'LARGE',customerName:'Large',team:'B1',contractId:contract.id,budgetId:budget.id,date:'2026-11-01',amount:1,category:'Other',description:'😀'.repeat(1000),createdBy:'admin',createdAt:'2026-11-01',status:'ACTIVE'}));assert.equal(b.post({transactions:history}).success,true);
 const saved=incremental(b,login.token,'large-plan-write','ADD_TRANSACTION',{customerCode:'LARGE',date:'2026-11-01',category:'Other',description:'Additional receipt',amount:2});assert.equal(saved.success,true);assert.equal(saved.snapshot.transactions.length,31);assert.equal(saved.snapshot.budgets[0].totalUsed,32);
 const parts=b.sheets.get('APP_WRITES').rows.filter(row=>row[0]==='OP-large-plan-write');assert.ok(parts.length>1);assert.equal(parts.every(row=>row[7].length<=28000&&!(row[7].charCodeAt(row[7].length-1)>=0xD800&&row[7].charCodeAt(row[7].length-1)<=0xDBFF)),true);
 assert.equal(incremental(b,login.token,'large-plan-write','ADD_TRANSACTION',{customerCode:'LARGE',date:'2026-11-01',category:'Other',description:'Additional receipt',amount:2}).snapshot.transactions.length,31);
});

test('legacy browser recovery backs up scoped data without applying stale balances or session/password fields',()=>{
 const {b,login}=signedInBackend();incremental(b,login.token,'recovery-store01','ADD_CUSTOMER',newStore('RECOVERY'));
 const recovery={id:'REC-browser-backup01',createdAt:'2026-11-01',reason:'DELETE_CUSTOMER',business:{customers:[{code:'RECOVERY',name:'Old local name',team:'B1',status:'ACTIVE'}],conditions:[],contracts:[],budgets:[],transactions:[]},users:[{id:'draft',username:'draft',fullName:'Draft',role:'TEAM_USER',team:'B1',password:'Do-not-copy-plaintext!',passwordHash:'Do-not-copy-hash!',token:login.token}],settings:{language:'lo'},logs:[],token:login.token};
 const result=userRequest(b,'SAVE_BROWSER_RECOVERY',{recovery},login.token);assert.equal(result.success,true);assert.equal(result.recoveryVersion,1);assert.equal(result.snapshot.customers[0].name,'Store RECOVERY');
 const archive=b.sheets.get('BROWSER_RECOVERY').rows.slice(1).filter(r=>r[0]===recovery.id).sort((a,b)=>a[5]-b[5]).map(r=>r[8]).join('');
 assert.ok(archive.includes('Old local name'));assert.ok(!archive.includes('Do-not-copy'));assert.ok(!archive.includes(login.token));
 assert.equal(userRequest(b,'SAVE_BROWSER_RECOVERY',{recovery},login.token).success,true);assert.equal(b.sheets.get('BROWSER_RECOVERY').rows.length,2,'repeat backup ID does not duplicate chunks');
 const deleted=incremental(b,login.token,'recovery-delete1','DELETE_CUSTOMER',{customerCode:'RECOVERY'});assert.equal(deleted.success,true);assert.equal(deleted.snapshot.customers.length,0);assert.ok(b.sheets.get('DELETED_CUSTOMERS').rows.find(r=>r[0]==='RECOVERY')[1]);
 const history=b.sheets.get('CHANGE_HISTORY').rows;assert.ok(history.some(r=>r[3]==='DELETE_CUSTOMER'&&r[4]==='customers'&&r[5]==='RECOVERY'&&Number.isFinite(Date.parse(r[1]))));
 assert.equal(userRequest(b,'BACKUP_DATABASE',{},login.token).success,true);
 const backups=b.sheets.get('DATABASE_BACKUPS').rows.slice(1);const manual=backups.filter(r=>r[4]==='ADMIN_MANUAL').sort((a,b)=>a[5]-b[5]);const snapshot=JSON.parse(manual.map(r=>r[8]).join(''));assert.ok(snapshot.tables.USERS.some(r=>r[1]==='admin'));assert.equal(snapshot.tables.SESSIONS,undefined);assert.ok(!JSON.stringify(snapshot).includes(login.token));
});

test('primary database cutover preserves users/current rows, leaves fresh sessions and retires old database access',()=>{
 const source=backend({sheetId:'SOURCE_SHEET_ID_0123456789'}),target=backend({sheetId:'TARGET_SHEET_ID_0123456789'});source.context.initializeDatabase();
 const login=userRequest(source,'AUTH_LOGIN',{username:'admin',password:'Test-only-password-42!'});assert.equal(login.success,true);
 incremental(source,login.token,'cutover-store001','ADD_CUSTOMER',newStore('CUTOVER'));
 const oldUserHash=source.sheets.get('USERS').rows[1][2];
 target.ss.insertSheet('USERS').appendRow(['Old destination contents are retained']);
 source.context.SpreadsheetApp.openById=id=>{if(id===source.ss.getId())return source.ss;if(id===target.ss.getId())return target.ss;throw Error('Unexpected spreadsheet ID');};
 source.context.setDatabaseSetting_(source.ss,'primaryDatabaseId',target.ss.getId());source.context.setDatabaseSetting_(source.ss,'databaseRouteState','PENDING');
 const ping=source.context.doGet({parameter:{action:'ping'}});assert.equal(ping.success,true);assert.equal(ping.spreadsheetId,target.ss.getId());
 assert.equal(target.sheets.get('CUSTOMERS').rows[1][0],'CUTOVER');assert.equal(target.sheets.get('USERS').rows[1][2],oldUserHash);assert.equal(target.sheets.get('USERS').rows[1][7],true);assert.equal(source.sheets.get('USERS').rows[1][7],false,'old deployment cannot accept new authenticated writes');
 assert.equal(target.sheets.get('SESSIONS').rows.length,1,'active session credentials are not copied');assert.ok([...target.sheets.keys()].some(name=>name.startsWith('PRE_CUTOVER_')&&name.endsWith('_USERS')));
 assert.equal(userRequest(source,'AUTH_ME',{},login.token).success,false,'old session must sign in again');
 const fresh=userRequest(source,'AUTH_LOGIN',{username:'admin',password:'Test-only-password-42!'});assert.equal(fresh.success,true);assert.equal(fresh.user.id,login.user.id);assert.equal(target.sheets.get('SESSIONS').rows.length,2);
 assert.equal(userRequest(source,'GET_BUSINESS_DATA',{},fresh.token).snapshot.customers[0].code,'CUTOVER');
 assert.equal(source.context.databaseSetting_(source.ss,'databaseRouteState'),'ACTIVE');assert.equal(source.context.databaseSetting_(target.ss,'migrationSourceId'),source.ss.getId());
});

test('store edits are scoped, update linked names and timestamps, retain spending, and reject team budget inflation',()=>{
 const {b,login}=signedInBackend();const created=incremental(b,login.token,'edit-store-init1','ADD_CUSTOMER',newStore('EDIT'));assert.equal(created.success,true);
 const receipt=incremental(b,login.token,'edit-store-txn01','ADD_TRANSACTION',{customerCode:'EDIT',date:'2026-11-01',amount:40,category:'Other',description:'Keep spending'});assert.equal(receipt.success,true);
 const updated=incremental(b,login.token,'edit-store-name1','UPDATE_CUSTOMER',{...newStore('EDIT'),name:'Updated store',phone:'02012345678',annualBudget:500});assert.equal(updated.success,true);assert.equal(updated.snapshot.customers[0].name,'Updated store');assert.ok(updated.snapshot.customers[0].updatedAt);assert.equal(updated.snapshot.transactions[0].customerName,'Updated store');assert.equal(updated.snapshot.budgets[0].totalUsed,40);assert.equal(updated.snapshot.budgets[0].annualAmount,500);
 userRequest(b,'ADD_USER',{username:'editor',fullName:'Editor',role:'TEAM_USER',team:'B1',password:'Editor-test-42!'},login.token);const team=userRequest(b,'AUTH_LOGIN',{username:'editor',password:'Editor-test-42!'});
 assert.equal(incremental(b,team.token,'edit-store-team1','UPDATE_CUSTOMER',{code:'EDIT',name:'Team contact edit',phone:'02087654321'}).success,true);
 assert.equal(incremental(b,team.token,'edit-store-team2','UPDATE_CUSTOMER',{code:'EDIT',name:'Forged',annualBudget:900000}).success,false);
 const deleted=userRequest(b,'DELETE_USER',{id:team.user.id},login.token);assert.equal(deleted.success,true);const row=b.sheets.get('USERS').rows.find(row=>row[0]===team.user.id);assert.equal(row[10],'DELETED');assert.ok(row[11]&&row[12]);
 assert.ok(b.sheets.get('CHANGE_HISTORY').rows.some(row=>row[3]==='DELETE_USER'&&row[4]==='USERS'&&row[5]===team.user.id));assert.equal(deleted.users.some(user=>user.id===team.user.id),false);
});

test('app deletion archives first, physically removes linked Sheet rows, retries safely and blocks stale resurrection',()=>{
 const {b,login}=signedInBackend();
 incremental(b,login.token,'physical-store1','ADD_CUSTOMER',newStore('REMOVE'));
 incremental(b,login.token,'physical-store2','ADD_CUSTOMER',newStore('KEEP','B2'));
 incremental(b,login.token,'physical-receipt','ADD_TRANSACTION',{customerCode:'REMOVE',date:'2026-11-01',category:'Other',description:'Keep in backup',amount:20});
 const stale=userRequest(b,'GET_BUSINESS_DATA',{},login.token).snapshot;
 const customers=b.sheets.get('CUSTOMERS');customers.rows[0].push('Manual Formula');customers.rows[1].push('=1+1');
 const before=JSON.stringify(customers.rows);
 b.failWrites.add('DATABASE_BACKUPS');
 assert.equal(incremental(b,login.token,'physical-delete1','DELETE_CUSTOMER',{customerCode:'REMOVE'}).success,false);
 assert.equal(JSON.stringify(customers.rows),before,'backup failure must leave live data intact');assert.equal(b.sheets.has('DELETED_CUSTOMERS'),false);
 b.failWrites.clear();
 const deleted=incremental(b,login.token,'physical-delete1','DELETE_CUSTOMER',{customerCode:'REMOVE'});assert.equal(deleted.success,true);assert.equal(deleted.deletionVersion,1);
 const tables=['CUSTOMERS','CUSTOMER_CONDITIONS','CONTRACTS','BUDGETS','BUDGET_TRANSACTIONS'];
 for(const name of tables){const rows=b.sheets.get(name).rows,column=rows[0].indexOf('Customer Code');assert.ok(!rows.slice(1).some(row=>row[column]==='REMOVE'),name);}
 assert.ok(customers.rows.some(row=>row[0]==='KEEP'),'unrelated team stays intact');
 const archive=b.sheets.get('DATABASE_BACKUPS').rows.filter(row=>row[0]==='DELETE-OP-physical-delete1').sort((a,b)=>a[5]-b[5]);
 const backup=JSON.parse(archive.map(row=>row[8]).join(''));assert.ok(backup.tables.CUSTOMERS.rows.some(row=>row[0]==='REMOVE'));assert.equal(backup.tables.CUSTOMERS.formulas[0].at(-1),'=1+1');assert.equal(backup.tables.BUDGET_TRANSACTIONS.rows[0][9],20);
 assert.equal(b.sheets.get('DELETED_CUSTOMERS').rows[1][4],'DELETE-OP-physical-delete1');
 const history=JSON.stringify(b.sheets.get('CHANGE_HISTORY').rows),backups=b.sheets.get('DATABASE_BACKUPS').rows.length;
 assert.equal(incremental(b,login.token,'physical-delete1','DELETE_CUSTOMER',{customerCode:'REMOVE'}).success,true);assert.equal(JSON.stringify(b.sheets.get('CHANGE_HISTORY').rows),history);assert.equal(b.sheets.get('DATABASE_BACKUPS').rows.length,backups);
 const current=userRequest(b,'GET_BUSINESS_DATA',{},login.token);
 assert.equal(userRequest(b,'SYNC_BULK_DATA',{...stale,expectedBusinessRevision:current.businessRevision},login.token).success,true);
 assert.ok(!customers.rows.some(row=>row[0]==='REMOVE'),'even a full publication cannot restore an archived customer code');
 assert.equal(incremental(b,login.token,'physical-recreate','ADD_CUSTOMER',newStore('REMOVE')).success,false);
 assert.ok(b.sheets.get('CHANGE_HISTORY').rows.some(row=>row[3]==='DELETE_CUSTOMER'&&JSON.parse(row[10]).after===null));
});

test('interrupted physical deletion recovers from its journal before the next read',()=>{
 const {b,login}=signedInBackend();incremental(b,login.token,'partial-delete-store','ADD_CUSTOMER',newStore('PARTIAL'));
 b.failDeletes.add('BUDGETS');
 assert.equal(incremental(b,login.token,'partial-delete-op','DELETE_CUSTOMER',{customerCode:'PARTIAL'}).success,false);
 assert.equal(b.sheets.get('CUSTOMERS').rows.length,1);assert.ok(b.sheets.get('BUDGETS').rows.length>1);
 assert.equal(userRequest(b,'GET_BUSINESS_DATA',{},login.token).success,false,'incomplete deletion must not be acknowledged');
 b.failDeletes.clear();const read=userRequest(b,'GET_BUSINESS_DATA',{},login.token);assert.equal(read.success,true);assert.equal(read.snapshot.customers.length,0);assert.equal(b.sheets.get('BUDGETS').rows.length,1);
 assert.equal(incremental(b,login.token,'partial-delete-op','DELETE_CUSTOMER',{customerCode:'PARTIAL'}).success,true);
 assert.ok(b.sheets.get('APP_WRITES').rows.filter(row=>row[0]==='OP-partial-delete-op').every(row=>row[4]==='DONE'));
});

test('retrying a legacy completed soft-delete receipt removes only its original stores',()=>{
 const {b,login}=signedInBackend();incremental(b,login.token,'legacy-delete-store','ADD_CUSTOMER',newStore('LEGACY'));
 const kind='DELETE_ALL_CUSTOMERS',data={},id='OP-legacy-delete-all';
 b.sheets.get('CUSTOMERS').rows[1][7]='DELETED';
 const actor=b.sheets.get('USERS').rows.find(row=>row[1]==='admin');
 const plan={tables:{},codes:['LEGACY'],result:{},actor:[actor[0],actor[1]],action:kind};
 const text=JSON.stringify(plan);b.context.writeJournal_().appendRow([id,actor[0],b.context.digest_(JSON.stringify({kind,data})),b.context.digest_(text),'DONE',0,1,text,new Date().toISOString()]);
 incremental(b,login.token,'new-after-legacy','ADD_CUSTOMER',newStore('NEW'));
 const result=userRequest(b,'MUTATE_BUSINESS',{id,kind,data},login.token);assert.equal(result.success,true);assert.equal(result.mutationId,id);assert.ok(!b.sheets.get('CUSTOMERS').rows.some(row=>row[0]==='LEGACY'));assert.ok(b.sheets.get('CUSTOMERS').rows.some(row=>row[0]==='NEW'),'an old delete-all retry must not delete stores added later');
});
