import assert from 'node:assert/strict';
const local = new Map<string,string>(), sessions=new Map<string,string>();
const ls={getItem:(k:string)=>local.get(k)??null,setItem:(k:string,v:string)=>{local.set(k,v)},removeItem:(k:string)=>{local.delete(k)}};
Object.assign(globalThis,{window:{localStorage:ls},localStorage:ls,sessionStorage:{getItem:(k:string)=>sessions.get(k)??null,setItem:(k:string,v:string)=>{sessions.set(k,v)},removeItem:(k:string)=>{sessions.delete(k)}}});
const {storage}=await import('../src/services/storage');
const {remoteSession}=await import('../src/services/remoteAccounts');
const endpoint='https://script.google.com/macros/s/test-accounts/exec';
const admin={id:'server-admin',username:'admin',fullName:'Admin',role:'ADMIN',team:'ALL',isActive:true,createdAt:'2026-01-01'};
let sequence:string[]=[], imported=false;
globalThis.fetch=async (_url,init)=>{
 const request=JSON.parse(String(init?.body));sequence.push(request.action);
 if(request.action==='AUTH_LOGIN') {
  assert.equal(request.payload.password,'Test-only-password-42!');
  return new Response(JSON.stringify({success:true,user:admin,token:'opaque-test-token',expiresAt:new Date(Date.now()+100000).toISOString()}));
 }
 assert.equal(request.authToken,'opaque-test-token');
 if(request.action==='SYNC_USERS') {assert.ok(request.payload.users.length>0);imported=true;}
 return new Response(JSON.stringify({success:true,users:[admin],user:admin,message:'Saved to USERS'}));
};
storage.updateSettings({appsScriptUrl:endpoint});
assert.equal((await storage.login('admin','Test-only-password-42!')).success,true);
assert.ok(remoteSession(endpoint));
assert.ok(!JSON.stringify([...sessions]).includes('Test-only-password-42!'));
assert.ok(!local.get('mkt_current_user_v1')!.includes('password'));
assert.equal((await storage.syncUsersToSheets()).success,true);assert.equal(imported,true);
assert.equal(storage.getUsers()[0].password,undefined);
assert.equal((await storage.addUser({username:'new-team',fullName:'New Team',password:'New-test-password-42!',role:'TEAM_USER',team:'B1'})).success,true);
assert.ok(sequence.includes('ADD_USER'));
assert.ok(!JSON.stringify([...local]).includes('New-test-password-42!'));
globalThis.fetch=async()=>new Response(JSON.stringify({success:false,error:'Sheet permission denied'}));
assert.equal((await storage.updateUser(admin.id,{fullName:'Changed'})).success,false);
assert.notEqual(storage.getCurrentUser()!.fullName,'Changed');
console.log('PASS: backend login, session storage, users sync, direct remote create, no new plaintext password in browser cache, failed writes do not mutate local accounts.');
