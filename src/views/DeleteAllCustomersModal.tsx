import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  Trash2,
  AlertOctagon,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import { storage } from '../services/storage';
import { translations, Language } from '../locales/translations';

interface DeleteAllCustomersModalProps {
  customerCount: number;
  onClose: () => void;
  onSuccess: () => void;
  onOpenUploadExcel: () => void;
}

export const DeleteAllCustomersModal: React.FC<DeleteAllCustomersModalProps> = ({
  customerCount,
  onClose,
  onSuccess,
  onOpenUploadExcel
}) => {
  const settings = storage.getSettings();
  const lang: Language = settings.language;
  const t = translations[lang];

  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [error,setError]=useState('');
  const handleDelete = async () => {
    if(isDeleting)return;
    setIsDeleting(true);
    const result=await storage.commitBusinessChange('DELETE_ALL_CUSTOMERS',{});
    setIsDeleting(false);
    if(result.success)onSuccess();else setError(result.message);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-rose-950 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 flex items-center justify-center text-white font-bold shadow-lg">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {lang === 'lo' ? 'ລຶບລາຍຊື່ລູກຄ້າທັງໝົດ' : 'Delete All Customer Records'}
              </h3>
              <p className="text-xs text-rose-300">
                {lang === 'lo' ? 'ເກັບປະຫວັດສັນຍາ ແລະລາຍຈ່າຍໄວ້' : 'Contract and spending history retained'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-rose-900 hover:bg-rose-800 text-rose-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-2">
            <p className="font-bold text-sm text-rose-950">
              {lang === 'lo'
                ? `ທ່ານກຳລັງຈະລຶບຂໍ້ມູນລູກຄ້າທັງໝົດ ${customerCount} ລາຍການ!`
                : `You are about to delete all ${customerCount} customer records!`}
            </p>
            <p className="text-rose-800 leading-relaxed">
              {lang === 'lo'
                ? 'ຈະສຳຮອງຂໍ້ມູນກ່ອນ ແລ້ວລົບແຖວຮ້ານ, ເງື່ອນໄຂ, ສັນຍາ, ງົບປະມານ ແລະລາຍຈ່າຍອອກຈາກຕາຕະລາງໃຊ້ງານໃນ Sheet ແລະແອັບ.'
                : 'After a backup is saved, store, condition, contract, budget and spending rows will be removed from the working Sheet tables and app.'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {lang === 'lo'
                ? 'ພິມ "DELETE" ຫຼື "ລຶບ" ເພື່ອຢືນຢັນ:'
                : 'Type "DELETE" to confirm:'}
            </label>
            <input
              type="text"
              placeholder="DELETE"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={
                isDeleting ||
                (confirmInput.trim().toUpperCase() !== 'DELETE' &&
                  confirmInput.trim() !== 'ລຶບ')
              }
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-rose-600/30 transition cursor-pointer active:scale-95"
            >
              {isDeleting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span>{lang === 'lo' ? 'ຢືນຢັນການລຶບທັງໝົດ' : 'Confirm Delete All'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
