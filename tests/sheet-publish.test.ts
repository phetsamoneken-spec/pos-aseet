import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {publishWithLockRetry,encodeSheetPublication,decodeSheetPublication} from '../src/services/sheetPublish';

let attempts=0;const delays:number[]=[];
const lockError='Exception: Lock timeout: another process was holding the lock for too long.';
assert.equal((await publishWithLockRetry(async()=>++attempts<3?{success:false,error:lockError}:{success:true},()=>{},async ms=>{delays.push(ms);})).success,true);
assert.equal(attempts,3);assert.deepEqual(delays,[2000,4000]);
attempts=0;await publishWithLockRetry(async()=>{attempts++;return {success:false,message:'Sheet changed on another device'};},()=>{},async()=>{});assert.equal(attempts,1,'revision conflicts must never be retried blindly');
attempts=0;await publishWithLockRetry(async()=>{attempts++;return {success:false,message:'Network request failed'};},()=>{},async()=>{});assert.equal(attempts,1,'unknown write outcomes must not be retried automatically');

const harness=readFileSync('tests/gas-sync.test.cjs','utf8').split("test('single file")[0];
const backend=vm.runInNewContext(harness+'\nbackend;',{require:createRequire(import.meta.url)}),server=backend();server.context.initializeDatabase();
const values=new Map<string,string>(),sessions=new Map<string,string>();
const ls={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v)},removeItem:(k:string)=>{values.delete(k)}};
Object.assign(globalThis,{window:{localStorage:ls},localStorage:ls,sessionStorage:{getItem:(k:string)=>sessions.get(k)??null,setItem:(k:string,v:string)=>{sessions.set(k,v)},removeItem:(k:string)=>{sessions.delete(k)}}});
const {INITIAL_SETTINGS}=await import('../src/data/seedData');const endpoint='https://script.google.com/macros/s/upload-lock-fixture/exec';INITIAL_SETTINGS.appsScriptUrl=endpoint;
const {storage}=await import('../src/services/storage');const {GasService}=await import('../src/services/gasService');
const {remoteSession}=await import('../src/services/remoteAccounts');
let busy=true,hold=false,release:(()=>void)|undefined;const sent:string[]=[];
globalThis.fetch=async(_url,init)=>{
  const request=JSON.parse(String(init?.body));
  if(request.action==='SYNC_BULK_DATA'){
    sent.push(JSON.stringify(request.payload));
    if(hold)await new Promise<void>(resolve=>{release=resolve;});
    if(busy)return new Response(JSON.stringify({success:false,error:lockError}));
  }
  return new Response(JSON.stringify(server.context.doPost({postData:{contents:JSON.stringify(request)}})));
};
const realTimer=globalThis.setTimeout;
globalThis.setTimeout=((fn:()=>void,ms?:number,...args:unknown[])=>realTimer(fn,[2000,4000,8000].includes(ms||0)?0:ms,...args)) as typeof setTimeout;
try{
  assert.equal((await storage.login('admin','Test-only-password-42!')).success,true);assert.equal((await storage.loadBusinessFromSheets()).success,true);
  const header=['MDE','Customer Code','Customer Name','Condition Quantity','Condition UOM','Product','Commencing On','Expiring On'];
  assert.equal(storage.importCustomersFromRawRows([header,['MDE-B1','UPLOADED','Original upload',2,'CAS','Product','2026-01-01','2028-12-31']],{replaceAll:true}).success,true);
  storage.logAction('UPLOAD_CHECK','First event');storage.logAction('UPLOAD_CHECK','Second event');assert.equal(new Set(storage.getLogs(1000).map(log=>log.id)).size,storage.getLogs(1000).length);
  const payload=JSON.stringify(storage.getGoogleSheetsSnapshot());
  assert.equal((await GasService.syncAllToGoogleSheets(undefined,{fileName:'master.xlsx',importedCount:1})).success,false);assert.equal(sent.length,4);assert.ok(sent.every(text=>text===payload),'lock retries keep the exact payload and server revision');
  const receipt=storage.getPendingSheetPublish()!;assert.ok(receipt);const packed=encodeSheetPublication(receipt);assert.deepEqual(decodeSheetPublication(packed),receipt);assert.ok(packed.length<JSON.stringify(receipt).length,'large upload receipts are compressed before browser storage');assert.equal(receipt.importedCount,1);assert.ok(!JSON.stringify(receipt).includes(remoteSession(endpoint)!.token));assert.equal(receipt.payload.users,undefined);
  assert.equal((await storage.loadBusinessFromSheets()).success,false);assert.equal((await storage.recoverLegacyCache()).success,false);assert.equal((await storage.commitBusinessChange('DELETE_CUSTOMER',{customerCode:'UPLOADED'})).success,false);assert.equal(storage.getCustomerByCode('UPLOADED')!.name,'Original upload','background hydration cannot erase a failed Excel publication');
  assert.equal(storage.importCustomersFromRawRows([header,['MDE-B1','OTHER','Other',1,'CAS','Product','2026-01-01','2028-12-31']]).success,false);
  storage.init();assert.equal(storage.getPendingSheetPublish()!.id,receipt.id,'Reload retains the original receipt');
  busy=false;hold=true;const publishing=GasService.syncAllToGoogleSheets();for(let n=0;n<30&&!release;n++)await new Promise(resolve=>realTimer(resolve,1));assert.ok(release);assert.equal(storage.getSheetPublishState().saving,true);assert.equal(storage.discardPendingSheetPublish(),false,'cannot discard a request in flight');
  release!();hold=false;const published=await publishing;assert.equal(published.success,true,published.message);assert.equal(storage.getPendingSheetPublish(),null);assert.equal(sent.at(-1),payload);assert.equal(server.sheets.get('CUSTOMERS').rows[1][0],'UPLOADED');
  assert.equal((await storage.loadBusinessFromSheets()).success,true);assert.equal(storage.getCustomerByCode('UPLOADED')!.name,'Original upload');
  busy=true;assert.equal((await GasService.syncAllToGoogleSheets()).success,false);const cancel=storage.getPendingSheetPublish()!;assert.equal(storage.discardPendingSheetPublish(),true);assert.equal(storage.getPendingSheetPublish(),null);assert.ok(values.get('foc-saved-publish-v1:'+cancel.id),'cancel retains a recoverable local archive');
}finally{globalThis.setTimeout=realTimer;}
console.log('PASS: lock-only retries, unchanged payload/revision, retained upload across Reload, hydration/write guards, credential exclusion, successful explicit retry and safe cancellation.');
