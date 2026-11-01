// Shared calendar and annual-budget rules. The exact functions below are also
// embedded in Code.gs; regression tests enforce parity with the browser.
export function businessToday() {
  return new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
}

export function isCalendarDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function anniversary(start, offset) {
  const year = Number(start.slice(0, 4)) + offset;
  const month = Number(start.slice(5, 7));
  const day = Math.min(Number(start.slice(8, 10)), new Date(Date.UTC(year, month, 0)).getUTCDate());
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** @param {import('../types').Contract} contract */
export function annualPeriods(contract) {
  const start = contract.commencingOn, end = contract.expiringOn;
  if (!isCalendarDate(start) || !isCalendarDate(end) || end < start) return [];
  const periods = [];
  for (let offset = 0; offset <= 100; offset++) {
    const periodStart = anniversary(start, offset);
    if (periodStart > end) return periods;
    if (offset === 100) throw Error('Contract exceeds 100 annual budget periods');
    const next = anniversary(start, offset + 1);
    const previousDay = new Date(Date.parse(next) - 86400000).toISOString().slice(0, 10);
    periods.push({periodNumber: offset + 1, periodStart, periodEnd: previousDay < end ? previousDay : end});
  }
  return periods;
}

/** @param {import('../types').Budget} budget */
export function refreshBudgetTotals(budget) {
  budget.remainingAmount = budget.annualAmount - budget.totalUsed;
  budget.utilizationPercentage = budget.annualAmount > 0 ? Math.round(budget.totalUsed / budget.annualAmount * 1000) / 10 : 0;
  budget.status = budget.totalUsed > budget.annualAmount ? 'EXCEEDED' : budget.utilizationPercentage >= 100 ? 'CRITICAL_100' : budget.utilizationPercentage >= 80 ? 'WARNING_80' : 'NORMAL';
  return budget;
}

/**
 * Derive separate budgets for each anniversary year without removing history.
 * Legacy spending not represented by transactions stays in its original year.
 * @param {import('../types').Contract[]} contracts
 * @param {import('../types').Budget[]} budgets
 * @param {import('../types').BudgetTransaction[]} transactions
 */
export function projectAnnualBudgets(contracts, budgets, transactions) {
  let result = budgets.map(budget => ({...budget}));
  const txns = transactions.map(transaction => ({...transaction}));
  for (const contract of contracts) {
    const periods = annualPeriods(contract);
    const stored = result.filter(budget => budget.contractId === contract.id && budget.customerCode === contract.customerCode);
    if (!periods.length || !stored.length) continue;
    for(const budget of stored){
      if(budget.periodNumber!==undefined&&(!Number.isInteger(budget.periodNumber)||budget.periodNumber<1||budget.periodNumber>100))throw Error('Invalid annual budget year');
      if(budget.unallocatedUsed!==undefined&&(!Number.isFinite(budget.unallocatedUsed)||budget.unallocatedUsed<0))throw Error('Invalid legacy spending amount');
    }
    const base = stored.find(budget => budget.periodNumber === 1) || stored[0];
    const linked = txns.filter(transaction => transaction.contractId === contract.id && transaction.customerCode === contract.customerCode);
    const residual = new Map();
    for (const budget of stored) {
      const recorded = linked.filter(transaction => (transaction.budgetId === budget.id || !transaction.budgetId && budget.id === base.id) && transaction.status === 'ACTIVE').reduce((sum, transaction) => sum + transaction.amount, 0);
      residual.set(budget.id, Number.isFinite(budget.unallocatedUsed) ? budget.unallocatedUsed : Math.max(0, budget.totalUsed - recorded));
    }
    const years = periods.map(period => {
      const existing = stored.find(budget => (budget.periodNumber || 1) === period.periodNumber);
      const previous = stored.filter(budget => (budget.periodNumber || 1) < period.periodNumber).sort((a,b) => (b.periodNumber || 1) - (a.periodNumber || 1))[0] || base;
      const budget = existing ? {...existing} : {
        ...base, id: `${base.id}-Y${period.periodNumber}`, annualAmount: previous.annualAmount,
        allowException: false, exceptionReason: ''
      };
      return {...budget, ...period, unallocatedUsed: residual.get(budget.id) || 0, totalUsed: residual.get(budget.id) || 0};
    });
    // Keep historical budgets even if Admin shortens a contract later.
    const historical = stored.filter(budget => !years.some(year => year.id === budget.id)).map(budget => ({...budget, unallocatedUsed: residual.get(budget.id) || 0, totalUsed: residual.get(budget.id) || 0}));
    for (const transaction of linked) {
      const year = years.find(budget => isCalendarDate(transaction.date) && transaction.date >= budget.periodStart && transaction.date <= budget.periodEnd) ||
        [...years, ...historical].find(budget => budget.id === transaction.budgetId) || years[0];
      transaction.budgetId = year.id;
      if (transaction.status === 'ACTIVE') year.totalUsed += transaction.amount;
    }
    const replacements = [...years, ...historical].map(refreshBudgetTotals);
    result = result.filter(budget => !stored.some(old => old.id === budget.id)).concat(replacements);
  }
  return {budgets: result, transactions: txns};
}

/** @param {import('../types').Budget[]} budgets */
export function selectAnnualBudget(budgets, date = businessToday(), clamp = true) {
  const sorted = [...budgets].sort((a,b) => (a.periodNumber || 1) - (b.periodNumber || 1));
  const exact = sorted.find(budget => budget.periodStart && date >= budget.periodStart && date <= budget.periodEnd);
  if (exact || !clamp) return exact;
  if (sorted[0]?.periodStart && date < sorted[0].periodStart) return sorted[0];
  return sorted[sorted.length - 1];
}
