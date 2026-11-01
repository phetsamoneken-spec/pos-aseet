import assert from 'node:assert/strict';
import type {BusinessSnapshot} from '../src/services/businessData';
const local=new Map<string,string>(),sessions=new Map<string,string>();
const ls={getItem:(k:string)=>local.get(k)??null,setItem:(k:string,v:string)=>{local.set(k,v)},removeItem:(k:string)=>{local.delete(k)}};
Object.assign(globalThis,{window:{localStorage:ls},localStorage:ls,sessionStorage:{getItem:(k:string)=>sessions.get(k)??null,setItem:(k:string,v:string)=>{sessions.set(k,v)},removeItem:(k:string)=>{sessions.delete(k)}}});
const {storage}=await import('../src/services/storage');
const endpoint='https://script.google.com/macros/s/read-fixture/exec';
storage.updateSettings({appsScriptUrl:endpoint});
const admin={...storage.getCurrentUser()!,id:'sheet-admin',username:'admin',password:undefined};
const data:BusinessSnapshot={
 customers:[{code:'S1',name:'Sheet shop',team:'B1',mde:'MDE-B1',status:'ACTIVE',createdAt:'2026-01-01'},{code:'S2',name:'Deleted Sheet shop',team:'B2',mde:'MDE-B2',status:'DELETED',createdAt:'2026-01-01'}],
 conditions:[{id:'COND1',customerCode:'S1',conditionQuantity:0,conditionUOM:'CAS',conditionProductDescription:'Sheet product',updatedAt:''}],
 contracts:[{id:'CT1',customerCode:'S1',customerName:'Sheet shop',team:'B1',commencingOn:'2026-01-01',expiringOn:'2028-01-01',cycleNumber:1,status:'ACTIVE',createdAt:'2026-01-01'}],
 budgets:[{id:'BD1',customerCode:'S1',contractId:'CT1',team:'B1',annualAmount:100,totalUsed:120,remainingAmount:-20,utilizationPercentage:120,status:'EXCEEDED',updatedAt:''}],
 transactions:[{id:'TX1',customerCode:'S1',customerName:'Sheet shop',contractId:'CT1',budgetId:'BD1',team:'B1',amount:120,date:'2026-01-01',category:'Other',description:'Imported',createdBy:'admin',createdAt:'2026-01-01',status:'ACTIVE'}]
};
let requests=0, response:unknown, release:(()=>void)|undefined, delay=false;
let actor=admin;
globalThis.fetch=async(_url,init)=>{
 const body=JSON.parse(String(init?.body));
 if(body.action==='AUTH_LOGIN')return new Response(JSON.stringify({success:true,user:actor,token:'test-'+actor.id,expiresAt:new Date(Date.now()+100000).toISOString()}));
 if(body.action==='AUTH_LOGOUT')return new Response(JSON.stringify({success:true}));
 assert.equal(body.action,'GET_BUSINESS_DATA');assert.equal(body.authToken,'test-'+actor.id);requests++;
 if(delay)await new Promise<void>(resolve=>{release=resolve});
 return new Response(JSON.stringify(response));
};
await storage.login('admin','Test-only-password!');
assert.equal(storage.hasUnsyncedBusinessData(),false,'untouched old demo data can load actual Sheet records');
response={success:false,error:'Unsupported action: GET_BUSINESS_DATA'};
assert.equal((await storage.loadBusinessFromSheets()).success,false);
assert.equal(storage.getCustomers().length,578,'old backend errors must not erase cached records');
assert.match(storage.getSheetDataState().message,/Code.gs/);
response={success:true,businessRevision:"fixture-revision",dataVersion:1,settingsVersion:1,settings:{language:'lo'},scope:'ALL',snapshot:data,spreadsheetId:'TEST_SHEET_ID_0123456789'};
assert.equal((await storage.loadBusinessFromSheets()).success,true);
assert.deepEqual(storage.getCustomers().map(c=>c.code),['S1']);
assert.equal(storage.getCustomerByCode('S2')!.status,'DELETED');
assert.equal(storage.getBudgetForCustomer('S1')!.remainingAmount,-20);
assert.equal(storage.getCustomerCondition('S1')!.conditionQuantity,0);
assert.equal(storage.getTransactions().length,1);
assert.equal(storage.hasUnsyncedBusinessData(),false);
storage.init();
assert.equal(storage.getCustomerCondition('S1')!.conditionQuantity,0,'reload must not invent quantities');
assert.equal(storage.getBudgetForCustomer('S1')!.annualAmount,100,'reload must preserve actual Sheet budgets');
assert.equal(storage.getBudgetForCustomer('S1')!.remainingAmount,-20);
const add=(code:string)=>storage.addCustomer({code,name:'Local '+code,team:'B1',conditionQty:1,conditionUOM:'CAS',conditionProductDescription:'Local',commencingOn:'2026-01-01',expiringOn:'2028-01-01',annualBudget:100});
assert.equal(add('LOCAL1').success,true);
const count=requests;
assert.equal((await storage.loadBusinessFromSheets()).success,false);
assert.equal(requests,count,'automatic reads must keep unsynced edits without sending a request');
assert.ok(storage.getCustomerByCode('LOCAL1'));
response={success:true,businessRevision:"fixture-revision",dataVersion:1,settingsVersion:1,settings:{language:'lo'},scope:'ALL',snapshot:{...data,conditions:[{...data.conditions[0],customerCode:'missing'}]}};
assert.equal((await storage.loadBusinessFromSheets(true)).success,false);
assert.ok(storage.getCustomerByCode('LOCAL1'),'malformed snapshots must be rejected before any write');
response={success:true,businessRevision:"fixture-revision",dataVersion:1,settingsVersion:1,settings:{language:'lo'},scope:'ALL',snapshot:data};delay=true;
const loading=storage.loadBusinessFromSheets(true);await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(add('LOCAL2').success,true);release!();
assert.equal((await loading).success,false,'edits made during a read must be preserved');
assert.ok(storage.getCustomerByCode('LOCAL2'));
delay=false;assert.equal((await storage.loadBusinessFromSheets(true)).success,true);
assert.equal(storage.getCustomerByCode('LOCAL1'),undefined);
assert.ok(!JSON.stringify(storage.exportBusinessBackup()).includes('test-sheet-admin'));
actor={...admin,id:'sheet-team-b1',username:'team-one',role:'TEAM_USER',team:'B1'};
await storage.login(actor.username,'Test-only-password!');
response={success:true,businessRevision:"fixture-revision",dataVersion:1,settingsVersion:1,settings:{language:'lo'},scope:'B1',snapshot:data};
assert.equal((await storage.loadBusinessFromSheets()).success,false,'reject another team in a scoped response');
response={success:true,businessRevision:"fixture-revision",dataVersion:1,settingsVersion:1,settings:{language:'lo'},scope:'B1',snapshot:{...data,customers:[data.customers[0]]}};
assert.equal((await storage.loadBusinessFromSheets()).success,true);
response={success:true,businessRevision:"fixture-revision",dataVersion:1,settingsVersion:1,settings:{language:'en',pricePerCrate:260000,dashboardTheme:'minimal'},user:{...actor,team:'B2'},scope:'B2',snapshot:{customers:[data.customers[1]],conditions:[],contracts:[],budgets:[],transactions:[]}};
assert.equal((await storage.loadBusinessFromSheets()).success,true);
assert.equal(storage.getCurrentUser()!.team,'B2','refresh uses the assignment held by the backend');
assert.equal(storage.getSettings().pricePerCrate,260000);
assert.equal(storage.getSettings().dashboardTheme,'minimal');
delay=true;const stale=storage.loadBusinessFromSheets();await new Promise(resolve=>setTimeout(resolve,0));
storage.logout();release!();assert.equal((await stale).success,false,'ignore responses after logout');
console.log('PASS: Sheet hydration, old-backend errors, exact budgets/zero values, cache persistence, unsynced-edit protection, read races, team scope and logout races.');
