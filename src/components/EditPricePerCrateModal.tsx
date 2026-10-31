import React, { useState } from 'react';
import { X, Package, RefreshCw, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { storage } from '../services/storage';
import { translations, Language } from '../locales/translations';

interface EditPricePerCrateModalProps {
  onClose: () => void;
  onSuccess: (updatedCount: number, newPrice: number) => void;
}

export const EditPricePerCrateModal: React.FC<EditPricePerCrateModalProps> = ({
  onClose,
  onSuccess
}) => {
  const settings = storage.getSettings();
  const lang: Language = settings.language;
  const t = translations[lang];

  const currentPrice = settings.pricePerCrate || 240000;
  const [newPrice, setNewPrice] = useState<number>(currentPrice);
  const [recalculateAll, setRecalculateAll] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Quick preset prices
  const presets = [220000, 240000, 250000, 260000, 280000, 300000];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPrice <= 0) return;

    setIsSaving(true);
    // Update settings first
    storage.updateSettings({ pricePerCrate: newPrice });

    let count = 0;
    if (recalculateAll) {
      const res = storage.recalculateBudgetsByPricePerCrate(newPrice);
      count = res.updatedCount;
    }

    setTimeout(() => {
      setIsSaving(false);
      onSuccess(count, newPrice);
    }, 200);
  };

  // Sample preview for 125 crates (standard case)
  const sampleCrates = 125;
  const sampleCurrentAmount = sampleCrates * currentPrice;
  const sampleNewAmount = sampleCrates * newPrice;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden my-8"
      >
        {/* Header */}
        <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {lang === 'lo' ? 'ກຳນົດລາຄາເບຍຕໍ່ລັງ (Price per Crate)' : 'Configure Beer Crate Price'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {lang === 'lo' ? 'ສູດຄິດໄລ່ງົບປະມານລູກຄ້າ: ຈຳນວນລັງ × ລາຄາຕໍ່ລັງ' : 'Customer budget formula: Condition Quantity × Price per Crate'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Formula Explanation Banner */}
          <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-2xl text-xs text-blue-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <span>{lang === 'lo' ? 'ຫຼັກການຄິດໄລ່ງົບປະມານ:' : 'Budget Calculation Rule:'}</span>
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed font-mono">
              ງົບປະມານປະຈຳປີ (Annual Budget) = Condition Quantity (ລັງ) × ລາຄາຕໍ່ລັງ (₭)
            </p>
          </div>

          {/* Current vs New Price Input */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">
                {lang === 'lo' ? 'ລາຄາເບຍຕໍ່ລັງປັດຈຸບັນ:' : 'Current Price per Crate:'}
              </span>
              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                {storage.formatCurrency(currentPrice)} / {lang === 'lo' ? 'ລັງ' : 'crate'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5">
                {lang === 'lo' ? 'ກຳນົດລາຄາໃໝ່ (ກີບ / ລັງ)' : 'Set New Price (Kip / Crate)'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                  ₭ / {lang === 'lo' ? 'ລັງ' : 'crate'}
                </span>
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <span className="text-[11px] text-slate-500 block mb-1.5 font-medium">
                {lang === 'lo' ? 'ເລືອກລາຄາດ່ວນ:' : 'Quick Presets:'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setNewPrice(p)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-mono font-bold transition cursor-pointer ${
                      newPrice === p
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {storage.formatCurrency(p)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
            <span className="font-bold text-slate-700 block">
              {lang === 'lo' ? 'ຕົວຢ່າງການປ່ຽນແປງງົບປະມານ (ລູກຄ້າ 125 ລັງ):' : 'Calculation Preview (Sample 125 Crates):'}
            </span>
            <div className="flex items-center justify-between text-slate-600">
              <span>{lang === 'lo' ? 'ງົບເດີມ:' : 'Current:'}</span>
              <span className="font-mono">{sampleCrates} × {storage.formatCurrency(currentPrice)} = <strong className="text-slate-900">{storage.formatCurrency(sampleCurrentAmount)}</strong></span>
            </div>
            <div className="flex items-center justify-between text-emerald-700 font-semibold pt-1 border-t border-slate-200">
              <span>{lang === 'lo' ? 'ງົບໃໝ່:' : 'New:'}</span>
              <span className="font-mono">{sampleCrates} × {storage.formatCurrency(newPrice)} = <strong className="text-emerald-700 text-sm">{storage.formatCurrency(sampleNewAmount)}</strong></span>
            </div>
          </div>

          {/* Option: Recalculate All Existing Budgets */}
          <label className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer hover:bg-slate-100/60 transition">
            <input
              type="checkbox"
              checked={recalculateAll}
              onChange={(e) => setRecalculateAll(e.target.checked)}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-900">
                {lang === 'lo' ? 'ຄິດໄລ່ງົບປະມານລູກຄ້າທັງໝົດຄືນໃໝ່ທັນທີ' : 'Recalculate all customer budgets immediately'}
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {lang === 'lo'
                  ? 'ລະບົບຈະຄູນ ຈຳນວນລັງ × ລາຄາໃໝ່ ໃຫ້ລູກຄ້າທຸກຄົນ ແລະ ອັບເດດຍອດເຫຼືອ (Remaining) ໃຫ້ຖືກຕ້ອງອັດຕະໂນມັດ'
                  : 'Multiplies Condition Quantity by new price for all customers and updates remaining balances.'}
              </p>
            </div>
          </label>

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition cursor-pointer flex items-center gap-2 active:scale-95"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{lang === 'lo' ? 'ກຳລັງບັນທຶກ...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{lang === 'lo' ? 'ບັນທຶກ ແລະ ນຳໃຊ້ລາຄານີ້' : 'Save & Apply Price'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
