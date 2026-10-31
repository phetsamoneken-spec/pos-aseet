import React, { useState } from 'react';
import {
  X,
  Building2,
  Calendar,
  Wallet,
  ReceiptText,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Package,
  Layers,
  Phone,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { storage } from '../services/storage';
import { translations, Language } from '../locales/translations';
import { Customer, Contract, Budget, BudgetTransaction, CustomerCondition } from '../types';

interface CustomerDetailModalProps {
  customerCode: string;
  onClose: () => void;
  onOpenAddTransaction: (customerCode: string) => void;
  onOpenAddContract: (customerCode: string) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customerCode,
  onClose,
  onOpenAddTransaction,
  onOpenAddContract
}) => {
  const currentUser = storage.getCurrentUser();
  const settings = storage.getSettings();
  const lang: Language = settings.language;
  const t = translations[lang];
  const isAdmin = currentUser?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CONTRACTS' | 'TRANSACTIONS'>('OVERVIEW');

  const customer = storage.getCustomerByCode(customerCode);
  const condition = storage.getCustomerCondition(customerCode);
  const contracts = storage.getCustomerContracts(customerCode);
  const activeContract = storage.getActiveContract(customerCode);
  const budget = activeContract ? storage.getContractBudget(activeContract.id) : undefined;
  const transactions = storage.getTransactions({ customerCode });

  if (!customer) return null;

  const utilRate = budget?.utilizationPercentage || 0;
  const isOverBudget = utilRate > 100 || (budget?.remainingAmount || 0) < 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95">
        
        {/* Modal Top Header */}
        <div className="bg-slate-900 p-6 text-white flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-0.5 rounded-md">
                {customer.code}
              </span>
              <span className="text-xs font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md">
                {customer.team} ({customer.mde})
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black mt-2 text-white">
              {customer.name}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{customer.province || customer.address || 'Vientiane, Laos'}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'OVERVIEW'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              {lang === 'lo' ? 'ພາບລວມ (Overview)' : 'Overview'}
            </button>
            <button
              onClick={() => setActiveTab('CONTRACTS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'CONTRACTS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              {lang === 'lo' ? 'ຮອບສັນຍາ (Cycles)' : 'Contract Cycles'} ({contracts.length})
            </button>
            <button
              onClick={() => setActiveTab('TRANSACTIONS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'TRANSACTIONS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              {lang === 'lo' ? 'ປະຫວັດລາຍຈ່າຍ (Transactions)' : 'Transactions'} ({transactions.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenAddTransaction(customer.code)}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.newTransaction}</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => onOpenAddContract(customer.code)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.addNewContract}</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              
              {/* Financial KPI Banner */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800">
                      {lang === 'lo' ? 'ງົບປະມານຮອບສັນຍາປັດຈຸບັນ (Active Cycle)' : 'Active Cycle Budget'}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    Cycle #{activeContract?.cycleNumber || 1}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                    <p className="text-[10px] text-slate-500 font-semibold">{t.annualBudget}</p>
                    <p className="text-sm font-black text-slate-900 mt-0.5 truncate">
                      {storage.formatCurrency(budget?.annualAmount || 0)}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                    <p className="text-[10px] text-slate-500 font-semibold">{t.budgetUsed}</p>
                    <p className="text-sm font-black text-amber-600 mt-0.5 truncate">
                      {storage.formatCurrency(budget?.totalUsed || 0)}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl border shadow-xs ${isOverBudget ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-100 text-emerald-700'}`}>
                    <p className="text-[10px] font-semibold">{t.remainingBudget}</p>
                    <p className="text-sm font-black mt-0.5 truncate">
                      {storage.formatCurrency(budget?.remainingAmount || 0)}
                    </p>
                  </div>
                </div>

                {/* Utilization bar */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">{t.utilizationRate}</span>
                    <span className={utilRate >= 100 ? 'text-rose-600 font-bold' : utilRate >= 80 ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>
                      {utilRate}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        utilRate >= 100 ? 'bg-rose-500' : utilRate >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, utilRate)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Condition Information Box */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
                  <Package className="w-4 h-4 text-emerald-600" />
                  <span>{lang === 'lo' ? 'ເງື່ອນໄຂສັນຍາສິນຄ້າ (Condition Details)' : 'Condition Product Details'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500">{t.conditionProduct}:</span>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {condition?.conditionProductDescription || '-'}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-500">{t.conditionQty}:</span>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {condition?.conditionQuantity ? condition.conditionQuantity.toLocaleString() : '0'}{' '}
                      <span className="text-slate-500 font-normal">({condition?.conditionUOM})</span>
                    </p>
                    {condition?.conditionQuantity ? (
                      <p className="text-[11px] text-emerald-700 font-mono mt-1">
                        ✓ {condition.conditionQuantity.toLocaleString()} ລັງ × {storage.formatCurrency(settings.pricePerCrate || 240000)} = {storage.formatCurrency((condition.conditionQuantity || 0) * (settings.pricePerCrate || 240000))}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Active Contract Info */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>{lang === 'lo' ? 'ໄລຍະເວລາສັນຍາ (Contract Dates)' : 'Contract Period'}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-500">{t.commencingOn}:</span>
                    <p className="font-bold font-mono text-slate-900 mt-0.5">
                      {activeContract?.commencingOn}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-500">{t.expiringOn}:</span>
                    <p className="font-bold font-mono text-slate-900 mt-0.5">
                      {activeContract?.expiringOn}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: CONTRACT CYCLES */}
          {activeTab === 'CONTRACTS' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                {lang === 'lo'
                  ? 'ປະຫວັດຮອບສັນຍາທັງໝົດຂອງລູກຄ້ານີ້. ທຸກຮອບຈະຖືກເກັບຮັກສາໄວ້ຖາວອນ.'
                  : 'Complete history of contract cycles for this customer. Historical cycles are permanently archived.'}
              </p>

              <div className="space-y-3">
                {contracts.map((c) => {
                  const b = storage.getContractBudget(c.id);

                  return (
                    <div
                      key={c.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-800">
                            Cycle #{c.cycleNumber}
                          </span>
                          <span className="font-mono text-xs text-slate-400">
                            {c.id}
                          </span>
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {c.status}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400">{t.commencingOn}:</span>
                          <p className="font-semibold text-slate-800">{c.commencingOn}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">{t.expiringOn}:</span>
                          <p className="font-semibold text-slate-800">{c.expiringOn}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">{t.annualBudget}:</span>
                          <p className="font-bold text-slate-900">{storage.formatCurrency(b?.annualAmount || 0)}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">{t.budgetUsed}:</span>
                          <p className="font-bold text-amber-600">{storage.formatCurrency(b?.totalUsed || 0)}</p>
                        </div>
                      </div>

                      {c.notes && (
                        <p className="mt-2 text-[11px] text-slate-500 italic">
                          {c.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: TRANSACTIONS */}
          {activeTab === 'TRANSACTIONS' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2.5 px-3">{t.txnId}</th>
                      <th className="py-2.5 px-2">{t.date}</th>
                      <th className="py-2.5 px-3">{t.category}</th>
                      <th className="py-2.5 px-3">{t.description}</th>
                      <th className="py-2.5 px-3 text-right">{t.amount}</th>
                      <th className="py-2.5 px-2">{t.invoiceRef}</th>
                      <th className="py-2.5 px-2 text-center">{t.status}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          {lang === 'lo' ? 'ຍັງບໍ່ມີລາຍການລາຍຈ່າຍສຳລັບລູກຄ້ານີ້' : 'No transactions recorded yet'}
                        </td>
                      </tr>
                    ) : (
                      transactions.map((txn) => (
                        <tr key={txn.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold text-slate-800">{txn.id}</td>
                          <td className="py-2 px-2 text-slate-600">{txn.date}</td>
                          <td className="py-2 px-3 font-semibold text-blue-700">{txn.category}</td>
                          <td className="py-2 px-3 text-slate-700 max-w-xs truncate">{txn.description}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">{storage.formatCurrency(txn.amount)}</td>
                          <td className="py-2 px-2 font-mono text-[11px] text-slate-500">{txn.invoiceRef || '-'}</td>
                          <td className="py-2 px-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              txn.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800 line-through'
                            }`}>
                              {txn.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
          >
            {lang === 'lo' ? 'ປິດໜ້າຈໍ' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
