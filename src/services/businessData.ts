import type { Customer, CustomerCondition, Contract, Budget, BudgetTransaction, Team } from '../types';

export interface BusinessSnapshot {
  customers: Customer[];
  conditions: CustomerCondition[];
  contracts: Contract[];
  budgets: Budget[];
  transactions: BudgetTransaction[];
}
export const businessKeys = ['customers','conditions','contracts','budgets','transactions'] as const;
export function businessFingerprint(snapshot: BusinessSnapshot): string {
  const text=JSON.stringify(businessKeys.map(key=>snapshot[key].map(record=>{
    if(key==='contracts') {const {status,...rest}=record as Contract;return rest;}
    return record;
  }).sort((a,b)=>String('code' in a?a.code:a.id).localeCompare(String('code' in b?b.code:b.id)))));
  let a=2166136261,b=5381;
  for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b,33)^text.charCodeAt(i);}
  return (a>>>0).toString(16)+':'+(b>>>0).toString(16)+':'+text.length;
}
export function validateBusinessSnapshot(value: unknown, scope: Team): BusinessSnapshot {
  if(!value || typeof value!=='object') throw Error('Missing Sheet data');
  const snapshot=value as BusinessSnapshot;
  const ids=new Map<string,Set<string>>();
  for(const key of businessKeys){
    if(!Array.isArray(snapshot[key]))throw Error('Missing Sheet table: '+key);
    const seen=new Set<string>();ids.set(key,seen);
    for(const row of snapshot[key]){
      if(!row || typeof row!=='object')throw Error('Invalid Sheet row: '+key);
      const id=key==='customers'?(row as Customer).code:(row as {id:string}).id;
      if(typeof id!=='string'||!id.trim()||seen.has(id))throw Error('Missing or duplicate Sheet ID: '+key);
      seen.add(id);
      if(key!=='conditions' && !('team' in row))throw Error('Missing Sheet team');
      if('team' in row && (!/^B[1-7]$/.test(row.team) || scope!=='ALL'&&row.team!==scope))throw Error('Unexpected Sheet team');
      if(key==='customers' && (typeof (row as Customer).name!=='string' || !['ACTIVE','INACTIVE','DELETED'].includes((row as Customer).status)))throw Error('Invalid Sheet customer');
      if(key!=='customers' && !ids.get('customers')!.has((row as {customerCode:string}).customerCode))throw Error('Unknown customer reference in '+key);
      for(const field of ['conditionQuantity','pricePerUnit','cycleNumber','annualAmount','totalUsed','remainingAmount','utilizationPercentage','amount','periodNumber','unallocatedUsed']){
        const value=(row as unknown as Record<string,unknown>)[field];
        if(field in row && (typeof value!=='number'||!Number.isFinite(value)))throw Error('Invalid Sheet number: '+field);
      }
    }
  }
  for(const budget of snapshot.budgets)if(budget.contractId&&!snapshot.contracts.some(contract=>contract.id===budget.contractId&&contract.customerCode===budget.customerCode))throw Error('Unknown budget contract');
  for(const transaction of snapshot.transactions)if(transaction.contractId&&!snapshot.contracts.some(contract=>contract.id===transaction.contractId&&contract.customerCode===transaction.customerCode))throw Error('Unknown transaction contract');
  return snapshot;
}
