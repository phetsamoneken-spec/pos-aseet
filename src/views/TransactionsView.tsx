import React, { useState } from 'react';
import {
  ReceiptText,
  Search,
  Filter,
  Plus,
  Download,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  Trash2,
  Printer
} from 'lucide-react';
import { storage } from '../services/storage';
import { translations, Language } from '../locales/translations';
import { Team, TEAMS, BudgetTransaction } from '../types';

interface TransactionsViewProps {
  selectedTeam: Team | 'ALL';
  onSelectTeam: (team: Team | 'ALL') => void;
  onOpenAddTransaction: () => void;
  onOpenCustomerDetail: (customerCode: string) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  selectedTeam,
  onSelectTeam,
  onOpenAddTransaction,
  onOpenCustomerDetail
}) => {
  const currentUser = storage.getCurrentUser();
  const settings = storage.getSettings();
  const lang: Language = settings.language;
  const t = translations[lang];
  const isAdmin = currentUser?.role === 'ADMIN';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CANCELLED'>('ALL');
  const [cancellingTxn, setCancellingTxn] = useState<BudgetTransaction | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const rawTxns = storage.getTransactions({
    team: selectedTeam,
    category: selectedCategory === 'ALL' ? undefined : selectedCategory,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    search: searchTerm
  });

  const totalPages = Math.ceil(rawTxns.length / pageSize) || 1;
  const paginated = rawTxns.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const categories = [
    'POSM / Signboard',
    'Event & Sponsorship',
    'Trade Promotion',
    'Sampling & Activation',
    'Rebate & Discount',
    'Media & Digital',
    'Customer Incentive',
    'Other'
  ];

  const handleConfirmCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingTxn || !cancelReason.trim()) return;

    const res = storage.cancelTransaction(cancellingTxn.id, cancelReason.trim());
    if (res.success) {
      setCancellingTxn(null);
      setCancelReason('');
    } else {
      alert(res.message);
    }
  };

  const handleExportCsv = () => {
    const headers = [
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
      'Created At',
      'Status',
      'Cancellation Reason'
    ];

    const rows = rawTxns.map((txn) => [
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
      txn.createdAt,
      txn.status,
      txn.cancellationReason ? `"${txn.cancellationReason.replace(/"/g, '""')}"` : ''
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MKT_Transactions_${selectedTeam}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>{t.navTransactions}</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {rawTxns.length} {lang === 'lo' ? 'ລາຍການ' : 'transactions'}
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            {lang === 'lo'
              ? 'ປະຫວັດການເບີກຈ່າຍງົບປະມານການຕະຫຼາດ, ລະຫັດອ້າງອີງ, ແລະ ບັນທຶກຜູ້ອະນຸມັດ'
              : 'Audit trail of marketing budget expenditures, invoice references, and operational logs'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{t.exportCsv}</span>
          </button>

          <button
            onClick={onOpenAddTransaction}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition cursor-pointer shadow-md shadow-blue-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t.newTransaction}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={lang === 'lo' ? 'ຄົ້ນຫາຕາມລະຫັດ, ຊື່ລູກຄ້າ, ເລກໃບບິນ...' : 'Search by ID, customer name, invoice ref...'}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">{t.team}:</span>
              <select
                value={selectedTeam}
                onChange={(e) => {
                  onSelectTeam(e.target.value as Team | 'ALL');
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">{t.allTeams}</option>
                {TEAMS.map((tm) => (
                  <option key={tm} value={tm}>
                    {t.team} {tm}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-medium">{t.category}:</span>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer max-w-[160px] truncate"
            >
              <option value="ALL">{t.all}</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-medium">{t.status}:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'CANCELLED');
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">{t.all}</option>
              <option value="ACTIVE">{lang === 'lo' ? 'ປົກກະຕິ (Active)' : 'Active'}</option>
              <option value="CANCELLED">{lang === 'lo' ? 'ຍົກເລີກແລ້ວ (Cancelled)' : 'Cancelled'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Transactions Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold select-none">
                <th className="py-3 px-4 whitespace-nowrap">{t.txnId}</th>
                <th className="py-3 px-3 whitespace-nowrap">{t.date}</th>
                <th className="py-3 px-4 whitespace-nowrap">{t.customerName}</th>
                <th className="py-3 px-3 whitespace-nowrap">{t.team}</th>
                <th className="py-3 px-3 whitespace-nowrap">{t.category}</th>
                <th className="py-3 px-4">{t.description}</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">{t.amount}</th>
                <th className="py-3 px-3 whitespace-nowrap">{t.invoiceRef}</th>
                <th className="py-3 px-3 whitespace-nowrap">{t.createdBy}</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">{t.status}</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-slate-800">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    {lang === 'lo' ? 'ບໍ່ພົບລາຍການລາຍຈ່າຍ' : 'No transactions recorded'}
                  </td>
                </tr>
              ) : (
                paginated.map((txn) => {
                  const isCancelled = txn.status === 'CANCELLED';

                  return (
                    <tr
                      key={txn.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isCancelled ? 'opacity-50 bg-slate-50/40 line-through' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {txn.id}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                        {txn.date}
                      </td>
                      <td className="py-3 px-4">
                        <div
                          onClick={() => onOpenCustomerDetail(txn.customerCode)}
                          className="font-bold text-slate-900 cursor-pointer hover:text-blue-600"
                        >
                          {txn.customerName}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {txn.customerCode}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-slate-100 text-slate-700">
                          {txn.team}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {txn.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-700" title={txn.description}>
                        {txn.description}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                        {storage.formatCurrency(txn.amount)}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {txn.invoiceRef || '-'}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {txn.createdBy}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {isCancelled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700" title={txn.cancellationReason}>
                            <XCircle className="w-3 h-3" />
                            <span>{lang === 'lo' ? 'ຍົກເລີກ' : 'Cancelled'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{lang === 'lo' ? 'ປົກກະຕິ' : 'Active'}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {!isCancelled && (
                          <button
                            onClick={() => setCancellingTxn(txn)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title={t.cancelTxn}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="py-3 px-4 bg-slate-50/60 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            {lang === 'lo'
              ? `ສະແດງ ${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, rawTxns.length)} ຈາກທັງໝົດ ${rawTxns.length} ລາຍການ`
              : `Showing ${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, rawTxns.length)} of ${rawTxns.length} entries`}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700"
            >
              {lang === 'lo' ? 'ກ່ອນໜ້າ' : 'Previous'}
            </button>
            <span className="font-bold text-slate-800 px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700"
            >
              {lang === 'lo' ? 'ຖັດໄປ' : 'Next'}
            </button>
          </div>
        </div>
      </div>

      {/* Cancel Transaction Modal */}
      {cancellingTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <span>{t.cancelTxn}</span>
            </h3>
            <p className="text-xs text-slate-600 mt-2">
              {lang === 'lo'
                ? `ທ່ານກຳລັງຈະຍົກເລີກລາຍການ ${cancellingTxn.id} ຈຳນວນ ${storage.formatCurrency(cancellingTxn.amount)} ຂອງລູກຄ້າ ${cancellingTxn.customerName}. ຍອດເງິນຈະຖືກສົ່ງຄືນເຂົ້າໃນງົບປະມານ.`
                : `You are cancelling ${cancellingTxn.id} (${storage.formatCurrency(cancellingTxn.amount)}) for ${cancellingTxn.customerName}. The amount will be refunded to the customer budget.`}
            </p>

            <form onSubmit={handleConfirmCancel} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.cancellationReason} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder={lang === 'lo' ? 'ລະບຸເຫດຜົນໃນການຍົກເລີກ ເຊັ່ນ: ໃບບິນຜິດພາດ, ຍົກເລີກກິດຈະກຳ...' : 'Reason for cancellation (e.g. invoice error, event cancelled)...'}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCancellingTxn(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-md shadow-rose-600/30"
                >
                  {lang === 'lo' ? 'ຢືນຢັນການຍົກເລີກ' : 'Confirm Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
