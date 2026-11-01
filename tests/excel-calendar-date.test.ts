import assert from 'node:assert/strict';
const local=new Map<string,string>();
const ls={getItem:(key:string)=>local.get(key)??null,setItem:(key:string,value:string)=>{local.set(key,value)},removeItem:(key:string)=>{local.delete(key)}};
Object.assign(globalThis,{window:{localStorage:ls},localStorage:ls});
const {storage}=await import('../src/services/storage');
const result=storage.importCustomersFromRawRows([
 ['MDE','Customer Code','Customer Name','Condition Quantity','Condition UOM','Product Description','Commencing On','Expiring On'],
 ['MDE-B1','DATE-REGRESSION','Calendar date fixture',2,'CAS','Test product',45797,46892]
],{replaceAll:false});
assert.equal(result.success,true);
const contract=storage.getActiveContract('DATE-REGRESSION')!;
assert.equal(contract.commencingOn,'2025-05-20');
assert.equal(contract.expiringOn,'2028-05-19');
assert.equal(storage.getBudgetForCustomer('DATE-REGRESSION')!.annualAmount,480000);
console.log('PASS: Excel calendar dates are preserved in timezone '+Intl.DateTimeFormat().resolvedOptions().timeZone);
