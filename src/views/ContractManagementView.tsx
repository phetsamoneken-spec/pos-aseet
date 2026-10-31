import React, { useState } from 'react';
import {
  FileCheck2,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  Filter,
  ArrowRight,
  History,
  Info,
  Package,
  Layers,
  Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';
import { storage } from '../services/storage';
import { translations, Language } from '../locales/translations';
import { Team, TEAMS, ContractStatus } from '../types';
import { EditPricePerCrateModal } from '../components/EditPricePerCrateModal';

interface ContractManagementViewProps {
  selectedTeam: Team | 'ALL';
  onSelectTeam: (team: Team | 'ALL') => void;
  onOpenCustomerDetail: (customerCode: string) => void;
  onOpenAddContract: (customerCode?: string) => void;
}

export const ContractManagementView: React.FC<ContractManagementViewProps> = ({
  selectedTeam,
  onSelectTeam,
  onOpenCustomerDetail,
  onOpenAddContract
}) => {
  const currentUser = storage.getCurrentUser();
  const settings = storage.getSettings();
  const lang: Language = settings.language;
  const t = translations[lang];
  const isAdmin = currentUser?.role === 'ADMIN';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ContractStatus>('ALL');
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const pricePerCrate = settings.pricePerCrate || 240000;
  const rawCustomers = storage.getCustomers(selectedTeam, searchTerm);

  const contractItems = rawCustomers.map((c) => {
    const contract = storage.getActiveContract(c.code);
    const budget = storage.getBudgetForCustomer(c.code);
    const condition = storage.getCustomerCondition(c.code);
    const allContracts = storage.getCustomerContracts(c.code);

    let daysRemaining = 0;
    if (contract) {
      const exp = new Date(contract.expiringOn).getTime();
      const now = new Date().getTime();
      daysRemaining = Math.max(0, Math.ceil((exp - now) / (1000 * 60 * 60 * 24)));
    }

    return {
      customer: c,
      contract,
      budget,
      condition,
      allContracts,
      daysRemaining
    };
  });

  const filtered = contractItems.filter((item) => {
    if (statusFilter === 'ALL') return true;
    return item.contract?.status === statusFilter;
  });

  const getStatusBadge = (status?: ContractStatus, days = 0) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span>{t.statusActive} ({days} {lang === 'lo' ? 'ວັນຍັງເຫຼືອ' : 'days left'})</span>
          </span>
        );
      case 'EXPIRING_SOON':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300 animate-pulse">
            <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <span>{t.statusExpiringSoon} ({days} {lang === 'lo' ? 'ວັນຍັງເຫຼືອ' : 'days left'})</span>
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
            <span>{t.statusExpired}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            <span>{t.statusUpcoming}</span>
          </span>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      
      {/* Title & Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>{t.navContracts}</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {filtered.length} {lang === 'lo' ? 'ສັນຍາ' : 'contracts'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === 'lo'
              ? 'ຄຸ້ມຄອງຮອບສັນຍາຕາມວັນທີຕົວຈິງ (ລັງລະ ' + storage.formatCurrency(pricePerCrate) + ') ແລະ ຕໍ່ອາຍຸຮອບໃໝ່'
              : 'Contract-based annual lifecycle management (' + storage.formatCurrency(pricePerCrate) + '/crate formula)'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Beer Crate Price Pill */}
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/90 px-3 py-1.5 rounded-xl shadow-2xs">
            <Package className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <div className="text-xs">
              <span className="text-slate-500 font-medium">{lang === 'lo' ? 'ລາຄາເບຍ:' : 'Beer Crate:'} </span>
              <span className="font-mono font-bold text-emerald-700">
                {storage.formatCurrency(pricePerCrate)}
              </span>
              <span className="text-[10px] text-slate-400">/{lang === 'lo' ? 'ລັງ' : 'crate'}</span>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowPriceModal(true)}
                className="ml-1 text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer bg-white/80 px-2 py-0.5 rounded-md border border-emerald-300 hover:bg-white transition"
              >
                {lang === 'lo' ? 'ແກ້ໄຂລາຄາ' : 'Edit'}
              </button>
            )}
          </div>

          {isAdmin && (
            <button
              onClick={() => onOpenAddContract()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition cursor-pointer shadow-md shadow-blue-600/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addNewContract}</span>
            </button>
          )}
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="p-3 bg-emerald-600 text-white rounded-2xl text-xs font-semibold shadow-md flex items-center justify-between"
        >
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-white/80 hover:text-white font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* Contract Policy Alert Notice */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white rounded-2xl p-5 shadow-md border border-slate-700/60 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <h4 className="font-bold text-white text-sm">
            {lang === 'lo' ? 'ຫຼັກການຮອບສັນຍາລູກຄ້າ (Contract-based Lifecycle):' : 'Contract Lifecycle Policy:'}
          </h4>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            {lang === 'lo'
              ? '1. ຮອບງົບປະມານຈະເລີ່ມຕົ້ນ ແລະ ສິ້ນສຸດຕາມວັນທີ Commencing On - Expiring On ຂອງລູກຄ້າແຕ່ລະຄົນ (ບໍ່ແມ່ນປີປະຕິທິນ). 2. ເມື່ອມີການຕໍ່ສັນຍາໃໝ່ (Renew), ລະບົບຈະສ້າງ Cycle ໃໝ່ ແລະ ເກັບຮັກສາປະຫວັດຮອບສັນຍາເກົ່າ ແລະ ທຸລະກຳເກົ່າໄວ້ 100% ໂດຍບໍ່ມີການລຶບ.'
              : '1. Budget cycles activate strictly per customer Commencing On - Expiring On dates, never by calendar year. 2. When renewing, a new contract cycle is generated while all previous contract records and financial transactions remain permanently preserved.'}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={lang === 'lo' ? 'ຄົ້ນຫາຕາມລະຫັດ ຫຼື ຊື່ລູກຄ້າ...' : 'Search customer code or name...'}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">{t.team}:</span>
              <select
                value={selectedTeam}
                onChange={(e) => onSelectTeam(e.target.value as Team | 'ALL')}
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
            <span className="text-xs text-slate-500 font-medium">{t.status}:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | ContractStatus)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">{t.all}</option>
              <option value="ACTIVE">{t.statusActive}</option>
              <option value="EXPIRING_SOON">{t.statusExpiringSoon}</option>
              <option value="EXPIRED">{t.statusExpired}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contract Cards Grid with Modern Minimal Design & Motion */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((item, idx) => {
          const contract = item.contract;
          const budget = item.budget;
          const condition = item.condition;
          const isExpiring = contract?.status === 'EXPIRING_SOON';
          const isExpired = contract?.status === 'EXPIRED';

          const cartonCount = condition?.conditionQuantity || 0;
          const calculatedAnnual = cartonCount > 0 ? cartonCount * pricePerCrate : (budget?.annualAmount || 0);

          return (
            <motion.div
              key={item.customer.code}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.3) }}
              whileHover={{ y: -3 }}
              className={`bg-white rounded-3xl p-5 shadow-xs border transition-all flex flex-col justify-between ${
                isExpired
                  ? 'border-rose-200 bg-rose-50/20 shadow-rose-100'
                  : isExpiring
                  ? 'border-amber-300 bg-amber-50/20 ring-1 ring-amber-300'
                  : 'border-slate-200/90 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/5'
              }`}
            >
              <div className="space-y-4">
                
                {/* Header Pills Row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 rounded-lg">
                      {item.customer.code}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                      {item.customer.team}
                    </span>
                  </div>

                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 whitespace-nowrap border border-slate-200">
                    Cycle #{contract?.cycleNumber || 1}
                  </span>
                </div>

                {/* Customer Name */}
                <div>
                  <h3
                    onClick={() => onOpenCustomerDetail(item.customer.code)}
                    className="font-bold text-base text-slate-900 truncate hover:text-blue-600 cursor-pointer transition leading-snug"
                    title={item.customer.name}
                  >
                    {item.customer.name}
                  </h3>
                </div>

                {/* Status Badge */}
                <div>
                  {getStatusBadge(contract?.status, item.daysRemaining)}
                </div>

                {/* Timeline Dates Box */}
                <div className="p-3.5 bg-slate-50/80 rounded-2xl space-y-2 border border-slate-100 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                      <span>{t.commencingOn}:</span>
                    </span>
                    <span className="font-semibold text-slate-800 font-mono text-[11px]">
                      {contract?.commencingOn}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      <span>{t.expiringOn}:</span>
                    </span>
                    <span className="font-semibold text-slate-800 font-mono text-[11px]">
                      {contract?.expiringOn}
                    </span>
                  </div>
                </div>

                {/* Condition & Crate Formula Box */}
                <div className="p-3.5 bg-gradient-to-br from-blue-50/70 to-indigo-50/40 rounded-2xl border border-blue-100/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                      <Package className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                      <span>{lang === 'lo' ? 'ຈຳນວນເບຍຕາມສັນຍາ:' : 'Beer Crates:'}</span>
                    </span>
                    <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-blue-100 text-[11px] shadow-2xs">
                      {cartonCount.toLocaleString()} {condition?.conditionUOM || (lang === 'lo' ? 'ລັງ' : 'Cartons')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="text-[11px]">{lang === 'lo' ? 'ລາຄາຕໍ່ລັງ (ຄູນ):' : 'Price per Crate:'}</span>
                    <span className="font-mono text-xs font-semibold text-slate-700">
                      × {storage.formatCurrency(pricePerCrate)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">{t.annualBudget}:</div>
                      <div className="text-[10px] text-blue-600 font-medium">
                        ({cartonCount.toLocaleString()} ລັງ × {storage.formatCurrency(pricePerCrate)})
                      </div>
                    </div>
                    <span className="font-black text-blue-700 text-sm sm:text-base font-mono tracking-tight">
                      {storage.formatCurrency(budget?.annualAmount || calculatedAnnual)}
                    </span>
                  </div>
                </div>

              </div>

              {/* Action Buttons Footer */}
              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2.5">
                <button
                  onClick={() => onOpenCustomerDetail(item.customer.code)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shadow-2xs"
                >
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  <span>{lang === 'lo' ? 'ປະຫວັດສັນຍາ' : 'Contract Cycles'}</span>
                </button>

                {isAdmin && (
                  <button
                    onClick={() => onOpenAddContract(item.customer.code)}
                    className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-blue-600/25 flex items-center justify-center gap-1.5 active:scale-95"
                    title={t.addNewContract}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{lang === 'lo' ? 'ຕໍ່ສັນຍາ' : 'Renew'}</span>
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Edit Beer Crate Price Modal */}
      {showPriceModal && (
        <EditPricePerCrateModal
          onClose={() => setShowPriceModal(false)}
          onSuccess={(count, newPrice) => {
            setShowPriceModal(false);
            setToastMessage(
              lang === 'lo'
                ? count > 0
                  ? `ອັບເດດລາຄາເບຍ ${storage.formatCurrency(newPrice)}/ລັງ ແລະ ຄິດໄລ່ງົບປະມານຄືນ ${count} ລູກຄ້າສຳເລັດແລ້ວ!`
                  : `ອັບເດດລາຄາເບຍ ${storage.formatCurrency(newPrice)}/ລັງ ສຳເລັດແລ້ວ!`
                : `Beer crate price updated to ${storage.formatCurrency(newPrice)}/crate!`
            );
          }}
        />
      )}

    </motion.div>
  );
};
