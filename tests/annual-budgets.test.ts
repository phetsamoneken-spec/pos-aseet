import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {annualPeriods, projectAnnualBudgets, selectAnnualBudget, businessToday} from '../src/services/annualBudgets';
import type {Contract,Budget,BudgetTransaction} from '../src/types';
const contract:Contract={id:'CT',customerCode:'SHOP',customerName:'Shop',team:'B1',commencingOn:'2024-05-19',expiringOn:'2027-05-18',cycleNumber:1,status:'ACTIVE',createdAt:''};
const budget:Budget={id:'BD',contractId:'CT',customerCode:'SHOP',team:'B1',annualAmount:1000,totalUsed:650,remainingAmount:350,utilizationPercentage:65,status:'NORMAL',updatedAt:''};
const txn=(id:string,date:string,amount:number,status:'ACTIVE'|'CANCELLED'='ACTIVE'):BudgetTransaction=>({id,date,amount,status,budgetId:'BD',contractId:'CT',customerCode:'SHOP',customerName:'Shop',team:'B1',category:'Other',description:id,createdBy:'admin',createdAt:date});
const transactions=[txn('old','2024-06-01',300),txn('anniversary','2025-05-19',150),txn('cancelled','2026-06-01',900,'CANCELLED')];
const projected=projectAnnualBudgets([contract],[budget],transactions);
assert.deepEqual(projected.budgets.map(b=>[b.periodStart,b.periodEnd,b.totalUsed]),[
 ['2024-05-19','2025-05-18',500], // 200 legacy spending retained with the original year
 ['2025-05-19','2026-05-18',150],
 ['2026-05-19','2027-05-18',0],
]);
assert.equal(selectAnnualBudget(projected.budgets,'2025-05-18')!.id,'BD');
assert.equal(selectAnnualBudget(projected.budgets,'2025-05-19')!.id,'BD-Y2');
assert.equal(selectAnnualBudget(projected.budgets,'2026-05-19')!.remainingAmount,1000);
assert.equal(selectAnnualBudget(projected.budgets,'2027-05-19',false),undefined);
assert.equal(selectAnnualBudget(projected.budgets,'2024-05-18',false),undefined);
assert.equal(projected.transactions.find(t=>t.id==='anniversary')!.budgetId,'BD-Y2');
assert.equal(projected.transactions.find(t=>t.id==='cancelled')!.status,'CANCELLED');
assert.deepEqual(projectAnnualBudgets([contract],projected.budgets,projected.transactions),projected,'repeat reads/syncs do not duplicate budgets or spending');
assert.equal(budget.totalUsed,650);assert.equal(transactions[1].budgetId,'BD','projection does not mutate inputs');
assert.equal(projected.budgets.reduce((s,b)=>s+b.totalUsed,0),650);
assert.deepEqual(annualPeriods({...contract,commencingOn:'2024-02-29',expiringOn:'2028-03-01'}).map(p=>p.periodStart),['2024-02-29','2025-02-28','2026-02-28','2027-02-28','2028-02-29']);
assert.equal(annualPeriods({...contract,expiringOn:'2025-08-10'})[1].periodEnd,'2025-08-10');
assert.deepEqual(annualPeriods({...contract,commencingOn:'2025-02-30'}),[]);
const zero=projectAnnualBudgets([contract],[{...budget,annualAmount:0,totalUsed:0}],[]);
assert.equal(zero.budgets[2].annualAmount,0);
const code=readFileSync(new URL('../gas/Code.gs',import.meta.url),'utf8');
const shared=readFileSync(new URL('../src/services/annualBudgets.js',import.meta.url),'utf8').replaceAll('export function ','function ');
assert.equal(code.split('// BEGIN SHARED ANNUAL BUDGET RULES (src/services/annualBudgets.js)\n')[1].split('\n// END SHARED ANNUAL BUDGET RULES')[0],shared,'browser and server use identical calendar/migration rules');
const server=vm.createContext({});vm.runInContext(shared,server);
assert.deepEqual(JSON.parse(JSON.stringify(server.projectAnnualBudgets([contract],[budget],transactions))),projected);
// The Lao calendar day is the same in every browser timezone.
const realDate=Date;let clock=Date.parse('2025-05-18T16:59:59Z');
class TestDate extends realDate {constructor(...args:any[]){super(args.length?args[0]:clock)}static now(){return clock}}
Object.assign(globalThis,{Date:TestDate});assert.equal(businessToday(),'2025-05-18');clock+=1000;assert.equal(businessToday(),'2025-05-19');
const values=new Map<string,string>();const ls={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v)},removeItem:(k:string)=>{values.delete(k)}};
const user={id:'admin',username:'admin',fullName:'Admin',role:'ADMIN',team:'ALL',isActive:true,createdAt:''};
for(const [key,value] of Object.entries({customers:[{code:'SHOP',name:'Shop',team:'B1',mde:'MDE-B1',status:'ACTIVE',createdAt:''}],conditions:[],contracts:[contract],budgets:[budget],transactions,users:[user],current_user:user,settings:{appsScriptUrl:'https://script.google.com/macros/s/test/exec',syncMode:'gas'}}))values.set('mkt_'+key+'_v1',JSON.stringify(value));
Object.assign(globalThis,{window:{localStorage:ls},localStorage:ls});
const {storage}=await import('../src/services/storage');storage.setCurrentUser(user as any);
assert.equal(storage.getBudgetForCustomer('SHOP')!.periodNumber,2);
assert.equal(storage.getDashboardMetrics().totalBudgetUsed,150,'dashboard excludes past and future annual budgets');
assert.equal(storage.getDashboardMetrics().totalAnnualBudget,1000,'dashboard counts the current year once');
const old=storage.addTransaction({customerCode:'SHOP',date:'2025-05-18',amount:40,category:'Other',description:'Backdated'});assert.equal(old.success,true);assert.equal(old.transaction!.budgetId,'BD');
assert.equal(storage.getBudgetForCustomer('SHOP')!.totalUsed,150);
assert.equal(storage.cancelTransaction('old','Cancel an old receipt').success,true);
assert.equal(storage.getBudgetForCustomer('SHOP')!.totalUsed,150,'cancelling a previous-year receipt cannot refill this year');
clock=Date.parse('2026-05-18T17:00:00Z');storage.refreshBudgetCalendar();
assert.equal(storage.getBudgetForCustomer('SHOP')!.periodNumber,3);assert.equal(storage.getBudgetForCustomer('SHOP')!.remainingAmount,1000,'anniversary resets without requiring a new login');
assert.equal(storage.addTransaction({customerCode:'SHOP',date:'2027-05-19',amount:1,category:'Other',description:'After expiry'}).success,false);
assert.equal(storage.getTransactions({customerCode:'SHOP'}).find(t=>t.id==='cancelled')!.status,'CANCELLED');
clock=Date.parse('2025-05-19T05:00:00Z');
assert.equal(storage.updateBudget('BD-Y2',1500).success,true);
assert.equal(storage.getContractBudgets('CT')[0].annualAmount,1000,'past yearly allowance is retained');
assert.equal(storage.getContractBudgets('CT')[2].annualAmount,1500,'future yearly allowance follows the Admin adjustment');
assert.equal(storage.getBudgetForCustomer('SHOP')!.totalUsed,150,'allowance adjustments do not erase spending');
const shortened=projectAnnualBudgets([{...contract,expiringOn:'2025-05-18'}],projected.budgets,projected.transactions);
assert.equal(shortened.budgets.find(b=>b.id==='BD-Y2')!.totalUsed,150,'shortening a contract retains historical annual records');
assert.throws(()=>projectAnnualBudgets([contract],[{...budget,periodNumber:-1}],[]),/annual budget year/);
Object.assign(globalThis,{Date:realDate});
console.log('PASS: anniversary boundaries, separate annual balances, leap years, Lao midnight, idempotent legacy migration, server/browser parity, backdated receipts, cancellation history and current-year dashboard.');
