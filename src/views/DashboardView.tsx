import React, { useState } from 'react';
import {
  Users,
  Wallet,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  PlusCircle,
  ArrowUpRight,
  Filter,
  PieChart,
  BarChart,
  Calendar,
  Layers,
  ChevronRight,
  AlertOctagon
} from 'lucide-react';
import { storage } from '../services/storage';
import { translations, Language } from '../locales/translations';
import { Team, TEAMS } from '../types';

interface DashboardViewProps {
  selectedTeam: Team | 'ALL';
  onSelectTeam: (team: Team | 'ALL') => void;
  onNavigate: (view: string) => void;
  onOpenAddTransaction: () => void;
  onOpenAddContract: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  selectedTeam,
  onSelectTeam,
  onNavigate,
  onOpenAddTransaction,
  onOpenAddContract
}) => {
  const currentUser = storage.getCurrentUser();
  const settings = storage.getSettings();
  const lang: Language = settings.language;
  const t = translations[lang];
  const isAdmin = currentUser?.role === 'ADMIN';

  // Filters
  const [filterPeriod, setFilterPeriod] = useState<'ALL' | '2026' | '2025'>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const metrics = storage.getDashboardMetrics(selectedTeam);

  // Utilization color helper
  const getUtilColor = (rate: number) => {
    if (rate >= 100) return 'text-rose-600 bg-rose-50 border-rose-200';
    if (rate >= 80) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  };

  const getUtilBarColor = (rate: number) => {
    if (rate >= 100) return 'bg-rose-500';
    if (rate >= 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  // Find critical contracts & budgets to show in alert banner
  const customers = storage.getCustomers(selectedTeam);
  const expiringContractsList = customers
    .map((c) => ({
      customer: c,
      contract: storage.getActiveContract(c.code),
      budget: storage.getBudgetForCustomer(c.code)
    }))
    .filter((item) => item.contract && (item.contract.status === 'EXPIRING_SOON' || item.contract.status === 'EXPIRED'))
    .slice(0, 5);

  const budgetWarningList = customers
    .map((c) => ({
      customer: c,
      budget: storage.getBudgetForCustomer(c.code)
    }))
    .filter((item) => item.budget && item.budget.utilizationPercentage >= 80)
    .slice(0, 5);

  return (
    <div className="themed-dashboard space-y-6">
      
      {/* Top Banner: Greeting, Contract Cycle Notice & Quick Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 rounded-2xl p-6 text-white shadow-xl border border-slate-700/60 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {isAdmin ? t.roleAdmin : `${t.roleTeamUser} (${currentUser?.team})`}
            </span>
            <span className="text-xs text-slate-400">
              {new Date().toLocaleDateString(lang === 'lo' ? 'lo-LA' : 'en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-2 tracking-tight">
            {lang === 'lo' ? 'ສະຫຼຸບພາບລວມງົບປະມານການຕະຫຼາດ' : 'Marketing Budget Overview'}
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            {t.contractCycleNotice}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onOpenAddTransaction}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition cursor-pointer active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t.newTransaction}</span>
          </button>

          {isAdmin && (
            <button
              onClick={onOpenAddContract}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>{t.addNewContract}</span>
            </button>
          )}

          <button
            onClick={() => onNavigate('customers')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition cursor-pointer active:scale-95"
          >
            <span>{lang === 'lo' ? 'ອັບໂຫຼດ Excel' : 'Upload Excel'}</span>
          </button>
        </div>
      </div>

      {/* Zero Customers Banner */}
      {metrics.totalCustomers === 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-6 text-center space-y-3 shadow-xs">
          <h3 className="font-bold text-base text-amber-950">
            {lang === 'lo' ? 'ຍັງບໍ່ມີຂໍ້ມູນລູກຄ້າໃນລະບົບ' : 'No Customer Records in Database'}
          </h3>
          <p className="text-xs text-amber-800 max-w-lg mx-auto">
            {lang === 'lo'
              ? 'ທ່ານໄດ້ລຶບລາຍຊື່ລູກຄ້າທັງໝົດແລ້ວ. ຕອນນີ້ທ່ານສາມາດອັບໂຫຼດໄຟລ໌ Excel (.xlsx, .xls, .csv) ຂອງທ່ານໄດ້ເລີຍ ຫຼື ໂຫຼດຂໍ້ມູນຕົວຢ່າງ.'
              : 'The customer list is clean. You can now upload your Excel spreadsheet (.xlsx, .xls, .csv) or restore the default records.'}
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              onClick={() => onNavigate('customers')}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              {lang === 'lo' ? 'ໄປທີ່ໜ້າອັບໂຫຼດ Excel' : 'Go to Excel Upload'}
            </button>
          </div>
        </div>
      )}

      {/* Critical Warnings Accordion / Alert Banner */}
      {(expiringContractsList.length > 0 || budgetWarningList.length > 0) && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-amber-950">
                  {lang === 'lo' ? 'ແຈ້ງເຕືອນສັນຍາ ແລະ ງົບປະມານທີ່ຕ້ອງເອົາໃຈໃສ່' : 'Attention Required: Contracts & Budgets'}
                </h4>
                <p className="text-xs text-amber-900/80">
                  {lang === 'lo'
                    ? `ມີ ${metrics.expiringContracts} ສັນຍາໃກ້ໝົດກຳນົດ ແລະ ງົບປະມານທີ່ໃຊ້ເກີນ 80%`
                    : `${metrics.expiringContracts} contracts expiring soon and accounts over 80% utilization`}
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('contracts')}
              className="text-xs font-bold text-amber-700 hover:text-amber-900 underline flex items-center gap-1 cursor-pointer"
            >
              <span>{lang === 'lo' ? 'ກວດເບິ່ງທັງໝົດ' : 'Review All'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {expiringContractsList.slice(0, 2).map((item) => (
              <div
                key={item.customer.code}
                className="bg-white/90 p-2.5 rounded-xl border border-amber-200 flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-slate-900">{item.customer.name}</span>
                  <span className="text-[10px] text-slate-500 ml-1.5">({item.customer.code})</span>
                  <p className="text-[11px] text-amber-700">
                    {lang === 'lo' ? 'ໝົດສັນຍາວັນທີ:' : 'Expiring on:'} {item.contract?.expiringOn}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  {item.contract?.status === 'EXPIRED' ? t.statusExpired : t.statusExpiringSoon}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7 KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Card 1: Total Customers */}
        <div
          onClick={() => onNavigate('customers')}
          className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/80 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t.totalCustomers}</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{metrics.totalCustomers}</span>
            <span className="text-xs font-medium text-slate-500">
              {selectedTeam === 'ALL' ? 'ທຸກທີມ B1-B7' : `ທີມ ${selectedTeam}`}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{lang === 'lo' ? 'ລູກຄ້າໃນລະບົບ' : 'Registered'}</span>
            <span className="text-blue-600 font-semibold flex items-center">
              {lang === 'lo' ? 'ເບິ່ງລາຍການ' : 'View'} <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 2: Total Annual Budget */}
        <div
          onClick={() => onNavigate('budgets')}
          className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/80 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t.totalAnnualBudget}</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight block truncate">
              {storage.formatCurrency(metrics.totalAnnualBudget)}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{lang === 'lo' ? 'ຄິດໄລ່: ຈຳນວນລັງ × ລາຄາ' : 'Qty × Price per crate'}</span>
            <span className="text-indigo-600 font-bold">{storage.formatCurrency(storage.getSettings().pricePerCrate || 240000)}/ລັງ</span>
          </div>
        </div>

        {/* Card 3: Total Budget Used */}
        <div
          onClick={() => onNavigate('transactions')}
          className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/80 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t.totalBudgetUsed}</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight block truncate">
              {storage.formatCurrency(metrics.totalBudgetUsed)}
            </span>
          </div>
          <div className="mt-2 text-[11px] flex items-center justify-between">
            <span className="text-slate-400">{t.utilizationRate}:</span>
            <span className={`font-bold px-1.5 py-0.2 rounded-md ${getUtilColor(metrics.overallUtilizationRate)}`}>
              {metrics.overallUtilizationRate}%
            </span>
          </div>
        </div>

        {/* Card 4: Total Remaining Budget */}
        <div
          onClick={() => onNavigate('budgets')}
          className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/80 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t.totalRemainingBudget}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight block truncate">
              {storage.formatCurrency(metrics.totalRemainingBudget)}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{lang === 'lo' ? 'ຍັງສາມາດນຳໃຊ້ໄດ້' : 'Available'}</span>
            <span className="text-emerald-700 font-semibold">
              {100 - metrics.overallUtilizationRate > 0 ? (100 - metrics.overallUtilizationRate).toFixed(1) : 0}%
            </span>
          </div>
        </div>

      </div>

      {/* Contract Status Triple Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          onClick={() => onNavigate('contracts')}
          className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{t.activeContracts}</p>
              <p className="text-lg font-bold text-slate-900">{metrics.activeContracts}</p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
            {t.statusActive}
          </span>
        </div>

        <div
          onClick={() => onNavigate('contracts')}
          className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{t.expiringContracts}</p>
              <p className="text-lg font-bold text-amber-700">{metrics.expiringContracts}</p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
            {t.statusExpiringSoon}
          </span>
        </div>

        <div
          onClick={() => onNavigate('contracts')}
          className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <XCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{t.expiredContracts}</p>
              <p className="text-lg font-bold text-rose-700">{metrics.expiredContracts}</p>
            </div>
          </div>
          <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
            {t.statusExpired}
          </span>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Team B1-B7 Budget Comparison (2 columns wide) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {lang === 'lo' ? 'ການນຳໃຊ້ງົບປະມານແຕ່ລະທີມ (Teams B1 - B7)' : 'Budget Utilization by Team (B1 - B7)'}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'lo' ? 'ປຽບທຽບງົບປະມານປະຈຳປີ ແລະ ຍອດໃຊ້ຕົວຈິງ' : 'Annual Budget vs Actual Spent by Team'}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-300"></span> {t.annualBudget}
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-600"></span> {t.budgetUsed}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {TEAMS.map((team) => {
              const tb = metrics.teamBudgets[team];
              if (!tb) return null;
              const isSelected = selectedTeam === team;

              return (
                <div
                  key={team}
                  onClick={() => isAdmin && onSelectTeam(team === selectedTeam ? 'ALL' : team)}
                  className={`p-3 rounded-xl border transition cursor-pointer ${
                    isSelected ? 'bg-blue-50/60 border-blue-300' : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-white font-bold text-[11px]">
                        {team}
                      </span>
                      <span className="text-slate-800">
                        {tb.customerCount} {lang === 'lo' ? 'ລູກຄ້າ' : 'customers'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-normal">
                        {storage.formatCurrency(tb.usedBudget)} / {storage.formatCurrency(tb.annualBudget)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${getUtilColor(tb.utilization)}`}>
                        {tb.utilization}%
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getUtilBarColor(tb.utilization)}`}
                      style={{ width: `${Math.min(100, tb.utilization)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Category Breakdown */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === 'lo' ? 'ລາຍຈ່າຍຕາມໝວດໝູ່' : 'Expenses by Category'}
                </h3>
                <p className="text-xs text-slate-500">{t.filterByCategory}</p>
              </div>
              <PieChart className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-3">
              {Object.entries(metrics.categoryUsage).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  {lang === 'lo' ? 'ບໍ່ມີຂໍ້ມູນລາຍຈ່າຍ' : 'No expenses recorded'}
                </p>
              ) : (
                Object.entries(metrics.categoryUsage)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, amount], idx) => {
                    const total = metrics.totalBudgetUsed || 1;
                    const pct = Math.round((amount / total) * 100);
                    const colors = [
                      'bg-blue-600',
                      'bg-emerald-500',
                      'bg-amber-500',
                      'bg-indigo-500',
                      'bg-purple-500',
                      'bg-rose-500'
                    ];
                    const color = colors[idx % colors.length];

                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-700 truncate max-w-[160px]">{cat}</span>
                          <span className="font-bold text-slate-900">{storage.formatCurrency(amount)} ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* Quick summary footer in box */}
          <div className="mt-5 pt-4 border-t border-slate-100 bg-slate-50 -mx-5 -mb-5 p-4 rounded-b-2xl">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{t.remainingBudget}:</span>
              <span className="font-black text-emerald-600 text-sm">
                {storage.formatCurrency(metrics.totalRemainingBudget)}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Monthly Budget Usage Trend Bar */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {lang === 'lo' ? 'ທ່າອ່ຽງການໃຊ້ງົບປະມານລາຍເດືອນ (Monthly Trend)' : 'Monthly Budget Usage Trend'}
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'lo' ? 'ຍອດລາຍຈ່າຍຕົວຈິງໃນແຕ່ລະເດືອນ' : 'Actual transaction expenditures across months'}
            </p>
          </div>
        </div>

        {/* Responsive Bar representation */}
        <div className="grid grid-cols-12 gap-1.5 sm:gap-2 h-36 items-end pt-4 border-b border-slate-200 pb-2">
          {(() => {
            const maxVal = Math.max(...metrics.monthlyUsage.map((m) => m.amount), 1);
            return metrics.monthlyUsage.map((item) => {
              const heightPercent = Math.max(10, Math.round((item.amount / maxVal) * 100));
              return (
                <div key={item.month} className="flex flex-col items-center h-full justify-end group">
                  <div
                    title={`${item.month}: ${storage.formatCurrency(item.amount)}`}
                    style={{ height: `${heightPercent}%` }}
                    className="w-full bg-blue-600 hover:bg-blue-500 rounded-t-md transition-all group-hover:shadow-md cursor-pointer relative"
                  >
                    {item.amount > 0 && (
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm whitespace-nowrap z-20 shadow-md">
                        {storage.formatCurrency(item.amount)}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 mt-2 truncate w-full text-center">
                    {item.month}
                  </span>
                </div>
              );
            });
          })()}
        </div>
      </div>

    </div>
  );
};
