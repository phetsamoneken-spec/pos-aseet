import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  AlertCircle,
  CheckCircle2,
  Download,
  Layers,
  FileUp,
  RefreshCw,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { storage } from '../services/storage';
import {GasService} from '../services/gasService';
import { translations, Language } from '../locales/translations';

interface UploadExcelModalProps {
  onClose: () => void;
  onSuccess: (count: number) => void;
}

export const UploadExcelModal: React.FC<UploadExcelModalProps> = ({
  onClose,
  onSuccess
}) => {
  const settings = storage.getSettings();
  const lang: Language = settings.language;
  const t = translations[lang];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<(string | number)[][] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [replaceAll, setReplaceAll] = useState(true);
  const [defaultBudget, setDefaultBudget] = useState(30000000);
  const [importedCount,setImportedCount]=useState<number|null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = async (file: File) => {
    if(!storage.canManageSettings())return;
    setImportedCount(null);
    setErrorMsg(null);
    setFileName(file.name);
    setIsLoading(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];

      const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
        blankrows: false
      }) as (string | number)[][];

      if (!rows || rows.length < 1) {
        throw new Error(
          lang === 'lo'
            ? 'ໄຟລ໌ບໍ່ມີຂໍ້ມູນ ຫຼື ຕາຕະລາງຫວ່າງເປົ່າ'
            : 'Excel sheet is empty or contains no data rows.'
        );
      }

      setParsedRows(rows);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(
        lang === 'lo'
          ? `ບໍ່ສາມາດອ່ານໄຟລ໌ Excel ໄດ້: ${msg}`
          : `Failed to read Excel file: ${msg}`
      );
      setParsedRows(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if(!storage.canManageSettings()||isLoading||!parsedRows?.length)return;
    setIsLoading(true);setErrorMsg(null);
    try{
      let count=importedCount;
      if(count===null){
        const result=storage.importCustomersFromRawRows(parsedRows,{replaceAll,defaultAnnualBudget:defaultBudget});
        if(!result.success){setErrorMsg(result.errors.join('\n')||'Import failed');return;}
        count=result.importedCount;setImportedCount(count);
      }
      if(storage.getSettings().appsScriptUrl){
        const published=await GasService.syncAllToGoogleSheets();
        if(!published.success){setErrorMsg('ນຳເຂົ້າໃນ browser ແລ້ວ ແຕ່ຍັງບໍ່ສົ່ງໄປ Sheet. ກົດລອງອີກຄັ້ງ: '+published.message);return;}
      }
      onSuccess(count);
    }finally{setIsLoading(false);}
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      [
        'MDE',
        'Customer Code',
        'Customer Name',
        'Condition Quantity',
        'Condition UOM',
        'Condition Product Code Description',
        'Commencing On',
        'Expiring On'
      ],
      [
        'MDE-B1',
        'CUST-B1-001',
        'ຮ້ານອາຫານ ດາວເຮືອງ ສາຂາ 1',
        1500,
        'Cartons',
        'Beerlao Lager Can 330ml x 24',
        '2026-04-01',
        '2027-03-31'
      ],
      [
        'MDE-B2',
        'CUST-B2-001',
        'ໂຮງແຮມ ແລນມາກ ແມ່ຂອງ ຣິເວີໄຊ',
        2400,
        'Cases',
        'Beerlao Gold Bottle 330ml x 24',
        '2026-01-15',
        '2027-01-14'
      ],
      [
        'MDE-B3',
        'CUST-B3-001',
        'ສັບພະສິນຄ້າ ວຽງຈັນເຊັນເຕີ',
        5000,
        'Cartons',
        'Sommo Lemon Drink Can 320ml',
        '2026-06-01',
        '2027-05-31'
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'MKT_Customer_Import_Template.xlsx');
  };

  if(!storage.canManageSettings())return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {lang === 'lo' ? 'ອັບໂຫຼດໄຟລ໌ Excel / CSV ລູກຄ້າ' : 'Upload Customer Excel / CSV File'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'lo'
                  ? 'ຮອງຮັບໄຟລ໌ .xlsx, .xls, .csv ພ້ອມກວດສອບ 8 ຖັນອັດຕະໂນມັດ'
                  : 'Supports .xlsx, .xls, and .csv with auto-mapping for the 8 columns'}
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

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="whitespace-pre-line leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* Template Info & Download button */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-800">
                  {lang === 'lo' ? 'ຮູບແບບ 8 ຖັນ (Columns) ຕາມໄຟລ໌ Excel:' : 'Expected 8 Columns in Excel:'}
                </p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  1. MDE | 2. Customer Code | 3. Customer Name | 4. Condition Quantity | 5. Condition UOM | 6. Condition Product Code Description | 7. Commencing On | 8. Expiring On
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs whitespace-nowrap self-start sm:self-auto cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>{lang === 'lo' ? 'ດາວໂຫຼດຟອມຕົວຢ່າງ Excel' : 'Download Template'}</span>
            </button>
          </div>

          {/* File Upload Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/60 hover:bg-blue-50/40 p-8 rounded-3xl text-center cursor-pointer transition flex flex-col items-center justify-center group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition">
              <FileUp className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-800">
              {fileName ? fileName : (lang === 'lo' ? 'ກົດເລືອກໄຟລ໌ Excel ຫຼື ລາກໄຟລ໌ມາວາງໃສ່ນີ້' : 'Click to select Excel file or drag & drop here')}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {lang === 'lo' ? 'ຮອງຮັບໄຟລ໌ .xlsx, .xls, .csv ທຸກຂະໜາດ' : 'Accepts Microsoft Excel (.xlsx, .xls) and CSV files'}
            </p>
          </div>

          {/* Preview Parsed Data */}
          {parsedRows && parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">
                  {lang === 'lo'
                    ? `ກວດພົບທັງໝົດ ${parsedRows.length - 1} ລາຍການລູກຄ້າໃນໄຟລ໌:`
                    : `Found ${parsedRows.length - 1} customer rows:`}
                </span>
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Ready to Import
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                <table className="w-full text-left text-[11px] border-collapse bg-white">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                    <tr>
                      <th className="py-1.5 px-2">MDE</th>
                      <th className="py-1.5 px-2">Code</th>
                      <th className="py-1.5 px-3">Customer Name</th>
                      <th className="py-1.5 px-2">Qty</th>
                      <th className="py-1.5 px-2">Commencing</th>
                      <th className="py-1.5 px-2">Expiring</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {parsedRows.slice(1, 6).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-1 px-2 font-bold">{String(row[0] || '')}</td>
                        <td className="py-1 px-2 font-mono text-blue-700">{String(row[1] || '')}</td>
                        <td className="py-1 px-3 truncate max-w-xs">{String(row[2] || '')}</td>
                        <td className="py-1 px-2">{String(row[3] || '')}</td>
                        <td className="py-1 px-2 font-mono text-[10px]">{String(row[6] || '')}</td>
                        <td className="py-1 px-2 font-mono text-[10px]">{String(row[7] || '')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Settings */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={replaceAll}
                onChange={(e) => setReplaceAll(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 mt-0.5"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  {lang === 'lo'
                    ? 'ໃຊ້ໄຟລ໌ນີ້ເປັນລາຍຊື່ຫຼັກ'
                    : 'Use this file as the active customer master'}
                </span>
                <span className="text-[11px] text-slate-500">
                  {lang === 'lo'
                    ? 'ຮ້ານນອກໄຟລ໌ຈະຖືກເກັບເປັນປະຫວັດ. ລາຍຈ່າຍ ແລະຍອດໃຊ້ເດີມຍັງຢູ່. ນຳເຂົ້າແລ້ວຈະສົ່ງໄປ Sheet ກາງ.'
                    : 'Stores outside the file are archived. Existing transactions and spending are retained. The import is then published to the shared Sheet.'}
                </span>
              </div>
            </label>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'lo'
                  ? `ສູດຄິດໄລ່ງົບປະມານ: Condition Quantity × ${storage.formatCurrency(settings.pricePerCrate || 240000)}/ລັງ`
                  : `Budget Formula: Condition Quantity × ${storage.formatCurrency(settings.pricePerCrate || 240000)}/crate`}
              </label>
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 font-mono mb-2">
                ✓ {lang === 'lo' ? 'ລະບົບຈະຄິດໄລ່ງົບປະມານຕົວຈິງອັດຕະໂນມັດຈາກຈຳນວນລັງເບຍ' : 'System auto-computes annual budget from crate quantities'}
              </div>

              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'lo' ? 'ງົບປະມານເລີ່ມຕົ້ນ (ສຳລັບແຖວທີ່ບໍ່ມີຈຳນວນລັງ):' : 'Fallback Budget (for rows without quantity):'}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={defaultBudget}
                onChange={(e) => setDefaultBudget(Number(e.target.value))}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                {storage.formatCurrency(defaultBudget)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={isLoading || !parsedRows || parsedRows.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition cursor-pointer active:scale-95"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>{importedCount!==null ? (lang==='lo'?'ລອງສົ່ງໄປ Sheet ອີກຄັ້ງ':'Retry publishing to Sheet') : (lang === 'lo' ? 'ນຳເຂົ້າ ແລະສົ່ງໄປ Sheet' : 'Import and publish to Sheet')}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
