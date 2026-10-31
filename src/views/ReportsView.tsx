import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Filter,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  TrendingUp,
  Wallet,
  Users
} from 'lucide-react';
import { storage } from '../services/storage';
import { translations, Language } from '../locales/translations';
import { Team, TEAMS } from '../types';

interface ReportsViewProps {
  selectedTeam: Team | 'ALL';
  onSelectTeam: (team: Team | 'ALL') => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  selectedTeam,
  onSelectTeam
}) => {
  const currentUser = storage.getCurrentUser();
  const settings = storage.getSettings();
  const lang: Language = settings.language;
  const t = translations[lang];
  const isAdmin = currentUser?.role === 'ADMIN';

  const [reportType, setReportType] = useState<'SUMMARY_BY_TEAM' | 'CUSTOMER_BALANCES' | 'EXPENSES_BY_CATEGORY' | 'TRANSACTION_AUDIT'>('SUMMARY_BY_TEAM');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');

  const metrics = storage.getDashboardMetrics(selectedTeam);
  const customers = storage.getCustomers(selectedTeam);
  const transactions = storage.getTransactions({ team: selectedTeam });

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = `MKT_Report_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`;

    if (reportType === 'SUMMARY_BY_TEAM') {
      headers = ['Team', 'Customers', 'Annual Budget', 'Used Budget', 'Remaining Budget', 'Utilization (%)'];
      rows = TEAMS.map((tm) => {
        const tb = metrics.teamBudgets[tm];
        return [
          tm,
          tb.customerCount,
          tb.annualBudget,
          tb.usedBudget,
          tb.remainingBudget,
          tb.utilization
        ];
      });
    } else if (reportType === 'CUSTOMER_BALANCES') {
      headers = [
        'Customer Code',
        'Customer Name',
        'Team',
        'Contract Start',
        'Contract End',
        'Annual Budget',
        'Used Budget',
        'Remaining Budget',
        'Utilization (%)'
      ];
      rows = customers.map((c) => {
        const contract = storage.getActiveContract(c.code);
        const budget = storage.getBudgetForCustomer(c.code);
        return [
          c.code,
          `"${c.name.replace(/"/g, '""')}"`,
          c.team,
          contract?.commencingOn || '',
          contract?.expiringOn || '',
          budget?.annualAmount || 0,
          budget?.totalUsed || 0,
          budget?.remainingAmount || 0,
          budget?.utilizationPercentage || 0
        ];
      });
    } else if (reportType === 'EXPENSES_BY_CATEGORY') {
      headers = ['Category', 'Total Spent', 'Percentage of Total Used (%)'];
      const totalUsed = metrics.totalBudgetUsed || 1;
      rows = Object.entries(metrics.categoryUsage).map(([cat, amt]) => [
        `"${cat}"`,
        amt,
        Math.round((amt / totalUsed) * 1000) / 10
      ]);
    } else {
      headers = [
        'Transaction ID',
        'Date',
        'Customer Code',
        'Customer Name',
        'Team',
        'Category',
        'Description',
        'Amount',
        'Invoice Ref',
        'Created By',
        'Status'
      ];
      rows = transactions.map((txn) => [
        txn.id,
        txn.date,
        txn.customerCode,
        `"${txn.customerName.replace(/"/g, '""')}"`,
        txn.team,
        `"${txn.category}"`,
        `"${txn.description.replace(/"/g, '""')}"`,
        txn.amount,
        txn.invoiceRef || '',
        txn.createdBy,
        txn.status
      ]);
    }

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Export controls */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>{t.navReports}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {lang === 'lo'
              ? 'ລາຍງານງົບປະມານການຕະຫຼາດ, ຍອດຍັງເຫຼືອ, ແລະ ສົ່ງອອກ Excel / CSV / PDF'
              : 'Multi-dimensional marketing budget analytics and exports for management review'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{t.exportExcel} / CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition cursor-pointer shadow-md shadow-slate-900/20 active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>{t.printReport}</span>
          </button>
        </div>
      </div>

      {/* Report Type Selector Tabs (no-print) */}
      <div className="no-print bg-white p-3 rounded-2xl shadow-xs border border-slate-200 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setReportType('SUMMARY_BY_TEAM')}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            reportType === 'SUMMARY_BY_TEAM'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {lang === 'lo' ? 'ສະຫຼຸບງົບປະມານຕາມທີມ (B1-B7)' : 'Team Summary (B1-B7)'}
        </button>

        <button
          onClick={() => setReportType('CUSTOMER_BALANCES')}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            reportType === 'CUSTOMER_BALANCES'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {lang === 'lo' ? 'ຍອດເຫຼືອງົບປະມານລູກຄ້າ (Customer Balances)' : 'Customer Balances'}
        </button>

        <button
          onClick={() => setReportType('EXPENSES_BY_CATEGORY')}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            reportType === 'EXPENSES_BY_CATEGORY'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {lang === 'lo' ? 'ລາຍຈ່າຍຕາມໝວດໝູ່ (Categories)' : 'Expenses by Category'}
        </button>

        <button
          onClick={() => setReportType('TRANSACTION_AUDIT')}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            reportType === 'TRANSACTION_AUDIT'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {lang === 'lo' ? 'ບັນທຶກລາຍການລະອຽດ (Transaction Log)' : 'Transaction Audit'}
        </button>
      </div>

      {/* Printable Report Document Card */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 print:border-none print:shadow-none print:p-0">
        
        {/* Print Header */}
        <div className="border-b border-slate-200 pb-5 mb-5 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs print:hidden">
                MKT
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {t.appName}
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {lang === 'lo' ? 'ລາຍງານການເຄື່ອນໄຫວງົບປະມານ ແລະ ສັນຍາລູກຄ້າ' : 'Marketing Customer Budget & Contract Performance Report'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Google Spreadsheet ID: {settings.spreadsheetId}
            </p>
          </div>

          <div className="text-right text-xs text-slate-500">
            <p className="font-semibold text-slate-800">
              {lang === 'lo' ? 'ວັນທີອອກລາຍງານ:' : 'Date:'} {new Date().toLocaleDateString()}
            </p>
            <p className="text-[11px]">
              {lang === 'lo' ? 'ຜູ້ດາວໂຫຼດ:' : 'Generated by:'} {currentUser?.fullName} ({currentUser?.role})
            </p>
            <p className="text-[11px]">
              {lang === 'lo' ? 'ຂອບເຂດທີມ:' : 'Scope:'} {selectedTeam === 'ALL' ? t.allTeams : `Team ${selectedTeam}`}
            </p>
          </div>
        </div>

        {/* Printable KPI Cards summary */}
        <div className="grid grid-cols-4 gap-3 mb-6 print:grid-cols-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 font-semibold uppercase">{t.totalCustomers}</span>
            <p className="text-lg font-black text-slate-900 mt-0.5">{metrics.totalCustomers}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 font-semibold uppercase">{t.totalAnnualBudget}</span>
            <p className="text-lg font-black text-slate-900 mt-0.5 truncate">{storage.formatCurrency(metrics.totalAnnualBudget)}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 font-semibold uppercase">{t.totalBudgetUsed}</span>
            <p className="text-lg font-black text-amber-600 mt-0.5 truncate">{storage.formatCurrency(metrics.totalBudgetUsed)}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 font-semibold uppercase">{t.totalRemainingBudget}</span>
            <p className="text-lg font-black text-emerald-600 mt-0.5 truncate">{storage.formatCurrency(metrics.totalRemainingBudget)}</p>
          </div>
        </div>

        {/* Report Content Table */}
        {reportType === 'SUMMARY_BY_TEAM' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-2.5 px-3">{t.team}</th>
                  <th className="py-2.5 px-3 text-center">{t.totalCustomers}</th>
                  <th className="py-2.5 px-3 text-right">{t.annualBudget}</th>
                  <th className="py-2.5 px-3 text-right">{t.budgetUsed}</th>
                  <th className="py-2.5 px-3 text-right">{t.remainingBudget}</th>
                  <th className="py-2.5 px-3 text-center">{t.utilizationRate}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {TEAMS.map((tm) => {
                  const tb = metrics.teamBudgets[tm];
                  return (
                    <tr key={tm} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">Team {tm}</td>
                      <td className="py-2.5 px-3 text-center">{tb.customerCount}</td>
                      <td className="py-2.5 px-3 text-right font-semibold">{storage.formatCurrency(tb.annualBudget)}</td>
                      <td className="py-2.5 px-3 text-right text-amber-700 font-semibold">{storage.formatCurrency(tb.usedBudget)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 font-bold">{storage.formatCurrency(tb.remainingBudget)}</td>
                      <td className="py-2.5 px-3 text-center font-bold">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] ${
                          tb.utilization >= 100 ? 'bg-rose-100 text-rose-800' : tb.utilization >= 80 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {tb.utilization}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100/80 font-black border-t-2 border-slate-300">
                  <td className="py-3 px-3">{lang === 'lo' ? 'ລວມທັງໝົດ' : 'Total'}</td>
                  <td className="py-3 px-3 text-center">{metrics.totalCustomers}</td>
                  <td className="py-3 px-3 text-right">{storage.formatCurrency(metrics.totalAnnualBudget)}</td>
                  <td className="py-3 px-3 text-right text-amber-700">{storage.formatCurrency(metrics.totalBudgetUsed)}</td>
                  <td className="py-3 px-3 text-right text-emerald-700">{storage.formatCurrency(metrics.totalRemainingBudget)}</td>
                  <td className="py-3 px-3 text-center">{metrics.overallUtilizationRate}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {reportType === 'CUSTOMER_BALANCES' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-2.5 px-3">{t.customerCode}</th>
                  <th className="py-2.5 px-3">{t.customerName}</th>
                  <th className="py-2.5 px-2">{t.team}</th>
                  <th className="py-2.5 px-3">{t.contractPeriod}</th>
                  <th className="py-2.5 px-3 text-right">{t.annualBudget}</th>
                  <th className="py-2.5 px-3 text-right">{t.budgetUsed}</th>
                  <th className="py-2.5 px-3 text-right">{t.remainingBudget}</th>
                  <th className="py-2.5 px-2 text-center">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.slice(0, 100).map((c) => {
                  const contract = storage.getActiveContract(c.code);
                  const budget = storage.getBudgetForCustomer(c.code);
                  const util = budget?.utilizationPercentage || 0;

                  return (
                    <tr key={c.code} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-bold text-blue-700">{c.code}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{c.name}</td>
                      <td className="py-2 px-2">{c.team}</td>
                      <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">
                        {contract?.commencingOn} → {contract?.expiringOn}
                      </td>
                      <td className="py-2 px-3 text-right">{storage.formatCurrency(budget?.annualAmount || 0)}</td>
                      <td className="py-2 px-3 text-right text-amber-700">{storage.formatCurrency(budget?.totalUsed || 0)}</td>
                      <td className="py-2 px-3 text-right text-emerald-700 font-bold">{storage.formatCurrency(budget?.remainingAmount || 0)}</td>
                      <td className="py-2 px-2 text-center font-bold text-[11px]">{util}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'EXPENSES_BY_CATEGORY' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-2.5 px-3">{t.category}</th>
                  <th className="py-2.5 px-4 text-right">{t.amount}</th>
                  <th className="py-2.5 px-4 text-right">% of Total Usage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {Object.entries(metrics.categoryUsage)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, amt]) => {
                    const total = metrics.totalBudgetUsed || 1;
                    const pct = Math.round((amt / total) * 1000) / 10;
                    return (
                      <tr key={cat} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{cat}</td>
                        <td className="py-2.5 px-4 text-right font-semibold">{storage.formatCurrency(amt)}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-blue-600">{pct}%</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'TRANSACTION_AUDIT' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-2 px-3">{t.txnId}</th>
                  <th className="py-2 px-2">{t.date}</th>
                  <th className="py-2 px-3">{t.customerName}</th>
                  <th className="py-2 px-2">{t.team}</th>
                  <th className="py-2 px-3">{t.category}</th>
                  <th className="py-2 px-3 text-right">{t.amount}</th>
                  <th className="py-2 px-2">{t.invoiceRef}</th>
                  <th className="py-2 px-2">{t.createdBy}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.slice(0, 100).map((txn) => (
                  <tr key={txn.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono font-bold text-slate-800">{txn.id}</td>
                    <td className="py-2 px-2 text-slate-600">{txn.date}</td>
                    <td className="py-2 px-3 font-medium text-slate-900">{txn.customerName}</td>
                    <td className="py-2 px-2 font-bold">{txn.team}</td>
                    <td className="py-2 px-3">{txn.category}</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">{storage.formatCurrency(txn.amount)}</td>
                    <td className="py-2 px-2 font-mono text-[11px] text-slate-500">{txn.invoiceRef || '-'}</td>
                    <td className="py-2 px-2 text-slate-600">{txn.createdBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Report Footer */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
          <span>MKT Customer Budget Management System • Report Signature</span>
          <span>Certified Confidential Marketing Data</span>
        </div>

      </div>

    </div>
  );
};
