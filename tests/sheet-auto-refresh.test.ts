import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {SHEET_REFRESH_INTERVAL_MS,startSheetAutoRefresh} from '../src/services/sheetAutoRefresh';

const harness=readFileSync('tests/gas-sync.test.cjs','utf8').split("test('single file")[0];
const backend=vm.runInNewContext(harness+'\nbackend;',{require:createRequire(import.meta.url)});
const server=backend();server.context.initializeDatabase();
const post=(action:string,payload:unknown={},authToken?:string)=>server.context.doPost({postData:{contents:JSON.stringify({action,payload,authToken})}});
const admin=post('AUTH_LOGIN',{username:'admin',password:'Test-only-password-42!'});
const shop={code:'SHEET-DELETE',name:'Deleted directly in Sheet',team:'B1',conditionQty:1,conditionUOM:'CAS',conditionProductDescription:'Product',commencingOn:'2026-01-01',expiringOn:'2028-12-31',annualBudget:1000};
assert.equal(post('MUTATE_BUSINESS',{id:'OP-sheet-delete-setup',kind:'ADD_CUSTOMER',data:shop},admin.token).success,true);
assert.equal(post('ADD_USER',{username:'reader',fullName:'Reader',role:'TEAM_USER',team:'B1',password:'Reader-test-42!'},admin.token).success,true);

const values=new Map<string,string>(),sessions=new Map<string,string>();
const ls={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v)},removeItem:(k:string)=>{values.delete(k)}};
const windowEvents=new EventTarget(),documentEvents=new EventTarget();
let tick:()=>void=()=>{},cleared=false;
const doc=Object.assign(documentEvents,{visibilityState:'visible'});
Object.assign(globalThis,{window:Object.assign(windowEvents,{localStorage:ls,setInterval:(fn:()=>void,ms:number)=>{assert.equal(ms,15_000);tick=fn;return 1;},clearInterval:()=>{cleared=true;}}),document:doc,localStorage:ls,sessionStorage:{getItem:(k:string)=>sessions.get(k)??null,setItem:(k:string,v:string)=>{sessions.set(k,v)},removeItem:(k:string)=>{sessions.delete(k)}}});
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}});
const {storage}=await import('../src/services/storage');
storage.updateSettings({appsScriptUrl:'https://script.google.com/macros/s/auto-refresh-fixture/exec'});
const actions:string[]=[];
let fail=false,hold=false,release:(()=>void)|undefined;
globalThis.fetch=async(_url,init)=>{
  const request=JSON.parse(String(init?.body));actions.push(request.action);
  if(request.action==='GET_BUSINESS_DATA'){
    if(hold)await new Promise<void>(resolve=>{release=resolve;});
    if(fail)throw Error('Temporary connection failure');
  }
  return new Response(JSON.stringify(post(request.action,request.payload,request.authToken)));
};
assert.equal((await storage.login('reader','Reader-test-42!')).success,true);
let runs=0;
const settle=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setTimeout(resolve,0));};
const refresh=async()=>{runs++;await storage.loadBusinessFromSheets(false,true);};
const stop=startSheetAutoRefresh(refresh);
await settle();assert.equal(runs,1);assert.ok(storage.getCustomerByCode(shop.code));
assert.equal(SHEET_REFRESH_INTERVAL_MS,15_000);
assert.equal(storage.getLogs(1000).filter(log=>log.action==='LOAD_FROM_SHEETS').length,0,'polling must not fill activity history with reads');

// Physically remove only the customer row, leaving linked historical rows.
server.sheets.get('CUSTOMERS').deleteRow(2);
fail=true;tick();await settle();assert.ok(storage.getCustomerByCode(shop.code),'failed reads retain the last valid data');
fail=false;tick();await settle();assert.equal(storage.getCustomerByCode(shop.code),undefined);
for(const rows of Object.values(storage.exportBusinessBackup()))assert.equal(rows.length,0,'deleted customer and orphaned child rows disappear from the client');
assert.ok(server.sheets.get('CONTRACTS').rows.length>1,'read refresh preserves historical Sheet rows');
assert.equal(server.sheets.get('CUSTOMERS').rows.length,1,'browser does not recreate deleted rows');
assert.ok(!actions.includes('MUTATE_BUSINESS')&&!actions.includes('SYNC_BULK_DATA'),'automatic refresh never publishes a stale browser snapshot');

assert.equal(post('MUTATE_BUSINESS',{id:'OP-sheet-retained-shop',kind:'ADD_CUSTOMER',data:{...shop,code:'KEEP'}},admin.token).success,true);
tick();await settle();assert.ok(storage.getCustomerByCode('KEEP'),'rows added in the shared database appear without reload');
const contract=storage.exportBusinessBackup().contracts.find(row=>row.customerCode==='KEEP')!;
assert.equal(post('MUTATE_BUSINESS',{id:'OP-sheet-delete-expense',kind:'ADD_TRANSACTION',data:{customerCode:'KEEP',contractId:contract.id,amount:25,date:'2026-11-01',category:'Other',description:'Removed in Sheet'}},admin.token).success,true);
tick();await settle();assert.equal(storage.getTransactions().length,1);
server.sheets.get('BUDGET_TRANSACTIONS').deleteRow(2);
tick();await settle();assert.equal(storage.getTransactions().length,0,'physical expense row deletions also reach the client');

doc.visibilityState='hidden';const count=runs;tick();windowEvents.dispatchEvent(new Event('focus'));await settle();assert.equal(runs,count);
doc.visibilityState='visible';documentEvents.dispatchEvent(new Event('visibilitychange'));await settle();assert.equal(runs,count+1);
(navigator as {onLine:boolean}).onLine=false;tick();await settle();assert.equal(runs,count+1);
(navigator as {onLine:boolean}).onLine=true;windowEvents.dispatchEvent(new Event('online'));await settle();assert.equal(runs,count+2);

hold=true;tick();await settle();const active=runs;tick();windowEvents.dispatchEvent(new Event('focus'));await settle();assert.equal(runs,active,'slow reads cannot overlap');
release!();hold=false;await settle();
storage.beginBulkPublish();const reads=actions.length;tick();await settle();assert.equal(actions.length,reads,'polling pauses while Excel is being published');storage.endBulkPublish();
stop();assert.equal(cleared,true);const finished=runs;tick();windowEvents.dispatchEvent(new Event('focus'));windowEvents.dispatchEvent(new Event('online'));documentEvents.dispatchEvent(new Event('visibilitychange'));await settle();assert.equal(runs,finished,'logout/unmount cleanup disables timers and wake listeners');
console.log('PASS: automatic Sheet deletion reaches a Team browser with linked-row filtering, read-only polling, outage retention, hidden/offline pause, wake refresh, no overlapping reads, bulk-publication pause and cleanup.');
