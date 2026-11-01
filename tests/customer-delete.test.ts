import assert from 'node:assert/strict';
import type { User, Customer, ActivityLog } from '../src/types';

const values = new Map<string,string>();
const ls = { getItem:(key:string)=>values.get(key)??null, setItem:(key:string,value:string)=>{values.set(key,value)}, removeItem:(key:string)=>{values.delete(key)} };
Object.assign(globalThis,{localStorage:ls,window:{localStorage:ls}});
const {storage} = await import('../src/services/storage');
const admin = {...storage.getCurrentUser()!};
type Snapshot = { customers:Customer[]; contracts:unknown[]; transactions:unknown[]; logs:ActivityLog[] };
const before: Snapshot = storage.getGoogleSheetsSnapshot();
const b1 = before.customers.find(customer => customer.team === 'B1')!;
const b2 = before.customers.find(customer => customer.team === 'B2')!;
const financialKeys = ['mkt_conditions_v1','mkt_contracts_v1','mkt_budgets_v1','mkt_transactions_v1'];
const history = financialKeys.map(key => values.get(key));
const user: User = {...admin,id:'test-team-user',username:'test-team',role:'TEAM_USER',team:'B1'};

storage.setCurrentUser(null);
const untouched = values.get('mkt_customers_v1');
assert.equal(storage.canDeleteCustomer(b1.code),false);
assert.equal(storage.deleteCustomer(b1.code).success,false);
assert.equal(values.get('mkt_customers_v1'),untouched);

storage.setCurrentUser(user);
assert.equal(storage.canDeleteCustomer(b1.code),true);
assert.equal(storage.canDeleteCustomer(b2.code),false);
assert.equal(storage.deleteCustomer(b2.code).success,false,'service must block cross-team requests');
assert.equal(values.get('mkt_customers_v1'),untouched);
// ALL is not a shortcut to administrative deletion rights for a team user.
storage.setCurrentUser({...user,team:'ALL'});
assert.equal(storage.deleteCustomer(b2.code).success,false);

storage.setCurrentUser(user);
const metricsBefore = storage.getDashboardMetrics('B1');
assert.equal(storage.deleteCustomer(b1.code).success,true);
assert.equal(storage.getCustomers('ALL').some(customer => customer.code === b1.code),false);
assert.equal(storage.getCustomerByCode(b1.code)!.status,'DELETED');
assert.deepEqual(financialKeys.map(key=>values.get(key)),history,'deletion must retain every financial row');
assert.equal(storage.getDashboardMetrics('B1').totalCustomers,metricsBefore.totalCustomers-1);
assert.equal(storage.getDashboardMetrics('B1').teamBudgets.B1.customerCount,metricsBefore.teamBudgets.B1.customerCount-1);
assert.equal(storage.deleteCustomer(b1.code).success,false,'repeated deletion must not add audit events');
assert.equal(storage.addTransaction({customerCode:b1.code,date:'2026-11-01',category:'Other',description:'Must reject',amount:1}).success,false);

// Reinitialization reads the persisted tombstone and preserves archived budgets.
storage.init();
assert.equal(storage.getCustomers().some(customer=>customer.code===b1.code),false);
assert.deepEqual(financialKeys.filter(key=>key!=='mkt_contracts_v1').map(key=>values.get(key)),history.filter((_,i)=>financialKeys[i]!=='mkt_contracts_v1'));
storage.setCurrentUser(admin);
assert.equal(storage.canDeleteCustomer(b2.code),true);
assert.equal(storage.deleteCustomer(b2.code).success,true,'Admin may delete another team’s store');
assert.equal(storage.updateBudget(storage.getBudgetForCustomer(b2.code)!.id,1).success,false);
assert.equal(storage.addNewContractCycle({customerCode:b2.code,commencingOn:'2026-11-01',expiringOn:'2027-11-01',annualBudget:1}).success,false);
assert.equal(storage.canDeleteCustomer('missing'),false);
assert.equal(storage.deleteCustomer('missing').success,false);
const snapshot: Snapshot = storage.getGoogleSheetsSnapshot();
assert.equal(snapshot.customers.find(customer=>customer.code===b1.code)!.status,'DELETED');
assert.equal(snapshot.customers.find(customer=>customer.code===b2.code)!.status,'DELETED');
assert.equal(snapshot.contracts.length,before.contracts.length);
assert.equal(snapshot.transactions.length,before.transactions.length);
assert.equal(snapshot.logs.filter(log=>log.action==='DELETE_CUSTOMER').length,2);
assert.equal(snapshot.logs.find(log=>log.action==='DELETE_CUSTOMER' && log.user===user.username)!.team,'B1');
const archivedBudget = JSON.stringify(storage.getBudgetForCustomer(b2.code));
storage.recalculateBudgetsByPricePerCrate(250000);
assert.equal(JSON.stringify(storage.getBudgetForCustomer(b2.code)),archivedBudget,'global price changes must not alter archived budgets');
console.log('PASS: Admin/own-team deletion, cross-team and guest rejection, persistent tombstones, retained financial history, metrics, blocked new activity and Sheet snapshot status.');
