import unifiedCode from '../../gas/Code.gs?raw';
import React, { useState } from 'react';
import {
  X,
  Code2,
  Copy,
  Check,
  FileSpreadsheet,
  Terminal,
  ExternalLink,
  ShieldCheck,
  Layers,
  HelpCircle,
  Download
} from 'lucide-react';
import { storage } from '../services/storage';
import { translations, Language } from '../locales/translations';

interface GasDocsModalProps {
  onClose: () => void;
}

export const GasDocsModal: React.FC<GasDocsModalProps> = ({ onClose }) => {
  const settings = storage.getSettings();
  const lang: Language = settings.language;
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<'SETUP' | 'CODE_GS' | 'DB_SETUP' | 'IMPORT_GS' | 'GITHUB_PAGES'>('SETUP');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFile(id);
    setTimeout(() => setCopiedFile(null), 2500);
  };

  const codeGsContent = unifiedCode;

  const dbSetupContent = `/**
 * ============================================================================
 * ONE-CLICK DATABASE INITIALIZATION SCRIPT
 * Run this function 'initializeDatabase()' once in Google Apps Script editor.
 * It will safely create all 10 required sheets with proper headers & styling!
 * ============================================================================
 */

function initializeDatabase() {
  const ss = SpreadsheetApp.openById("YOUR_SPREADSHEET_ID");

  const schema = {
    "CUSTOMERS": [
      "Customer Code", "Customer Name", "Team", "MDE", "Phone", "Address", "Province", "Status", "Created At"
    ],
    "CUSTOMER_CONDITIONS": [
      "ID", "Customer Code", "Condition Quantity", "Condition UOM", "Product Description", "Updated At"
    ],
    "CONTRACTS": [
      "Contract ID", "Customer Code", "Customer Name", "Team", "Commencing On", "Expiring On", "Cycle Number", "Status", "Notes", "Created At"
    ],
    "BUDGETS": [
      "Budget ID", "Contract ID", "Customer Code", "Team", "Annual Amount", "Total Used", "Remaining Amount", "Utilization (%)", "Status", "Allow Exception", "Exception Reason", "Updated At"
    ],
    "BUDGET_TRANSACTIONS": [
      "Transaction ID", "Date", "Customer Code", "Customer Name", "Team", "Contract ID", "Budget ID", "Category", "Description", "Amount", "Invoice Ref", "Created By", "Created At", "Status", "Cancellation Reason"
    ],
    "USERS": [
      "User ID", "Username", "Password Hash", "Full Name", "Email", "Role", "Assigned Team", "Is Active", "Created At", "Last Login"
    ],
    "CATEGORIES": [
      "Category ID", "Name Lao", "Name English", "Code", "Description"
    ],
    "ACTIVITY_LOG": [
      "Log ID", "Timestamp", "User", "Role", "Team", "Action", "Details"
    ],
    "SETTINGS": [
      "Setting Key", "Setting Value", "Description", "Updated At"
    ],
    "SESSIONS": [
      "Session ID", "Username", "Token", "Expires At", "Created At"
    ]
  };

  for (const [sheetName, headers] of Object.entries(schema)) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(headers);
      
      // Header styling
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#0f172a");
      headerRange.setFontColor("#ffffff");
      headerRange.setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
  }

  Logger.log("All 10 sheets initialized successfully in spreadsheet!");
}
`;

  const importGsContent = `/**
 * ============================================================================
 * CUSTOMER DATA IMPORT SCRIPT
 * Reads existing Excel data columns:
 * 1. MDE
 * 2. Customer Code
 * 3. Customer Name
 * 4. Condition Quantity
 * 5. Condition UOM
 * 6. Condition Product Code Description
 * 7. Commencing On
 * 8. Expiring On
 * 
 * Maps MDE-B1..B7 to B1..B7 and initializes contract cycles without overwriting history.
 * ============================================================================
 */

function importExistingCustomerData() {
  const ss = SpreadsheetApp.openById("YOUR_SPREADSHEET_ID");
  
  // Sheet containing raw imported Excel rows
  const sourceSheet = ss.getSheetByName("Sheet1") || ss.getSheets()[0];
  const targetCust = ss.getSheetByName("CUSTOMERS");
  const targetCond = ss.getSheetByName("CUSTOMER_CONDITIONS");
  const targetCont = ss.getSheetByName("CONTRACTS");
  const targetBdg = ss.getSheetByName("BUDGETS");

  const data = sourceSheet.getDataRange().getValues();
  if (data.length < 2) return;

  let count = 0;
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const mde = String(row[0] || "").trim();
    const customerCode = String(row[1] || "").trim();
    const customerName = String(row[2] || "").trim();
    const condQty = Number(row[3]) || 0;
    const condUom = String(row[4] || "Cartons").trim();
    const condDesc = String(row[5] || "").trim();
    const commencingOn = row[6] ? Utilities.formatDate(new Date(row[6]), "GMT+7", "yyyy-MM-dd") : "2026-01-01";
    const expiringOn = row[7] ? Utilities.formatDate(new Date(row[7]), "GMT+7", "yyyy-MM-dd") : "2026-12-31";

    if (!customerCode || !customerName) continue;

    // Team mapping: MDE-B1 -> B1
    const teamMatch = mde.match(/B[1-7]/i);
    const team = teamMatch ? teamMatch[0].toUpperCase() : "B1";

    // Insert or update customer
    targetCust.appendRow([
      customerCode, customerName, team, mde, "", "", "", "ACTIVE", new Date()
    ]);

    // Insert condition
    targetCond.appendRow([
      "CND-" + customerCode, customerCode, condQty, condUom, condDesc, new Date()
    ]);

    // Insert Contract Cycle 1
    const contractId = "CNT-" + customerCode + "-01";
    const budgetId = "BDG-" + customerCode + "-01";

    targetCont.appendRow([
      contractId, customerCode, customerName, team, commencingOn, expiringOn, 1, "ACTIVE", "Imported from Excel", new Date()
    ]);

    // Default Annual Budget Amount: 30,000,000 LAK
    const annualAmount = 30000000;
    targetBdg.appendRow([
      budgetId, contractId, customerCode, team, annualAmount, 0, annualAmount, 0, "NORMAL", false, "", new Date()
    ]);

    count++;
  }

  Logger.log("Imported " + count + " customers successfully!");
}
`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Google Apps Script Backend & Deployment Guide
              </h3>
              <p className="text-xs text-slate-400">
                Spreadsheet ID: <code className="text-blue-300 font-mono">{settings.spreadsheetId}</code>
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

        {/* Tab selection */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('SETUP')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'SETUP' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            1. Setup Guide (ຂັ້ນຕອນຕິດຕັ້ງ)
          </button>
          <button
            onClick={() => setActiveTab('CODE_GS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'CODE_GS' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            Code.gs (API Backend)
          </button>
          <button
            onClick={() => setActiveTab('DB_SETUP')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'DB_SETUP' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            DatabaseSetup.gs (10 Sheets)
          </button>
          <button
            onClick={() => setActiveTab('IMPORT_GS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'IMPORT_GS' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            CustomerImport.gs
          </button>
          <button
            onClick={() => setActiveTab('GITHUB_PAGES')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'GITHUB_PAGES' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            GitHub Pages Deploy
          </button>
        </div>

        {/* Modal content body */}
        <div className="p-6 max-h-[65vh] overflow-y-auto">
          
          {/* TAB 1: SETUP GUIDE */}
          {activeTab === 'SETUP' && (
            <div className="space-y-6 text-xs text-slate-700">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                <h4 className="font-bold text-sm text-blue-900 mb-1">
                  {lang === 'lo' ? 'ວິທີການເຊື່ອມຕໍ່ Google Apps Script ກັບ Google Sheets ຂອງທ່ານ:' : 'How to deploy Apps Script backend to your Google Sheets:'}
                </h4>
                <p className="text-blue-800 leading-relaxed">
                  {lang === 'lo'
                    ? 'ທ່ານສາມາດຕິດຕັ້ງ Backend ໄດ້ງ່າຍໆໃນ 4 ຂັ້ນຕອນ ເພື່ອໃຫ້ເວັບແອັບສາມາດອ່ານ ແລະ ຂຽນຂໍ້ມູນລົງໃນ Google Sheet ຕົວຈິງໄດ້.'
                    : 'Deploy this backend in 4 simple steps to enable real-time reading and writing to your Google Sheets spreadsheet.'}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                    1
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">
                      {lang === 'lo' ? 'ເປີດ Google Sheet ແລະ Apps Script Editor' : 'Open Google Sheet and Apps Script Editor'}
                    </h5>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">
                      {lang === 'lo'
                        ? 'ເປີດ Google Sheet ID: YOUR_SPREADSHEET_ID ຈາກນັ້ນໄປທີ່ເມນູ Extensions > Apps Script.'
                        : 'Open Google Sheet ID: YOUR_SPREADSHEET_ID, then click Extensions > Apps Script in the top toolbar.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                    2
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">
                      {lang === 'lo' ? 'ວາງ Code.gs ໄຟລ໌ລວມ ແລະ Run' : 'Install unified Code.gs and Run'}
                    </h5>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">
                      {lang === 'lo'
                        ? 'ວາງສະເພາະ Code.gs ໄຟລ໌ລວມ ແລ້ວ Run initializeDatabase(). ບໍ່ຕ້ອງວາງ .gs ໄຟລ໌ອື່ນຊ້ຳ ເພາະລວມໄວ້ແລ້ວ.'
                        : 'Install only the unified Code.gs from the Code.gs tab, then run initializeDatabase() once. Do not also paste separate .gs files: their functions are already included.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                    3
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">
                      {lang === 'lo' ? 'ກັອບປີ້ໂຄດ Code.gs ແລະ Deploy Web App' : 'Paste Code.gs and Deploy as Web App'}
                    </h5>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">
                      {lang === 'lo'
                        ? 'ກັອບປີ້ໂຄດຈາກແທັບ "Code.gs", ຈາກນັ້ນກົດປຸ່ມ Deploy (ມຸມຂວາເທິງ) > New deployment > ເລືອກ Web App:\n• Execute as: Me\n• Who has access: Anyone'
                        : 'Paste Code.gs, then click Deploy > New deployment > Web App:\n• Execute as: Me\n• Who has access: Anyone (required for frontend fetch access).'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                    4
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">
                      {lang === 'lo' ? 'ເຊື່ອມຕໍ່ URL ເຂົ້າກັບແອັບນີ້' : 'Connect Web App URL in App Settings'}
                    </h5>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">
                      {lang === 'lo'
                        ? 'ກັອບປີ້ Web App URL ທີ່ໄດ້ (ລົງທ້າຍດ້ວຍ /exec) ມາວາງໃສ່ໃນໜ້າ "Settings" ຂອງແອັບນີ້ ແລ້ວກົດ Test ແລະ Sync ໄປ Google Sheets.'
                        : 'Copy the generated Web App URL (ending in /exec) and paste it into the Settings tab in this app, then click Test and Sync to Google Sheets.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CODE.GS */}
          {activeTab === 'CODE_GS' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-700">Code.gs</span>
                <button
                  onClick={() => copyToClipboard(codeGsContent, 'codeGs')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer shadow-xs"
                >
                  {copiedFile === 'codeGs' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedFile === 'codeGs' ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 text-slate-200 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-[50vh] border border-slate-800">
                {codeGsContent}
              </pre>
            </div>
          )}

          {/* TAB 3: DB_SETUP */}
          {activeTab === 'DB_SETUP' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-700">DatabaseSetup.gs</span>
                <button
                  onClick={() => copyToClipboard(dbSetupContent, 'dbSetup')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer shadow-xs"
                >
                  {copiedFile === 'dbSetup' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedFile === 'dbSetup' ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 text-slate-200 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-[50vh] border border-slate-800">
                {dbSetupContent}
              </pre>
            </div>
          )}

          {/* TAB 4: IMPORT_GS */}
          {activeTab === 'IMPORT_GS' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-700">CustomerImport.gs</span>
                <button
                  onClick={() => copyToClipboard(importGsContent, 'importGs')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer shadow-xs"
                >
                  {copiedFile === 'importGs' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedFile === 'importGs' ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 text-slate-200 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-[50vh] border border-slate-800">
                {importGsContent}
              </pre>
            </div>
          )}

          {/* TAB 5: GITHUB PAGES */}
          {activeTab === 'GITHUB_PAGES' && (
            <div className="space-y-4 text-xs text-slate-700">
              {/* Alert explaining White Screen issue */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <h4 className="font-bold text-sm text-amber-900 mb-1">
                  {lang === 'lo' ? '⚠️ ວິທີແກ້ໄຂ "ເວັບຂຶ້ນຈໍຂາວ" (Failed to load resource: main.tsx 404)' : '⚠️ Fixing White Screen (Failed to load resource: main.tsx 404)'}
                </h4>
                <p className="text-amber-800 leading-relaxed">
                  {lang === 'lo'
                    ? 'ສາເຫດທີ່ຂຶ້ນຈໍຂາວ: GitHub Pages ເປັນພຽງ Static Web Server ບໍ່ສາມາດ Run ໄຟລ໌ source code TypeScript (/src/main.tsx) ໂດຍກົງໄດ້. ທ່ານຕ້ອງໃຫ້ GitHub Actions build ໄຟລ໌ອອກມາເປັນ JavaScript ກ່ອນ.'
                    : 'Cause: GitHub Pages is a static server and cannot run raw TypeScript source files (/src/main.tsx). You must deploy the compiled bundle via GitHub Actions.'}
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <span className="font-bold text-slate-900 text-xs">
                    {lang === 'lo' ? 'ວິທີທີ່ 1 (ແນະນຳ): ໃຊ້ GitHub Actions (ອັດຕະໂນມັດ 100%)' : 'Method 1 (Recommended): GitHub Actions (100% Automated)'}
                  </span>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 mt-1.5 leading-relaxed">
                    <li>
                      {lang === 'lo'
                        ? 'ໂຄງການນີ້ໄດ້ເພີ່ມໄຟລ໌ .github/workflows/deploy.yml ໃຫ້ຮຽບຮ້ອຍແລ້ວ'
                        : 'The workflow file .github/workflows/deploy.yml is already added to this project.'}
                    </li>
                    <li>
                      {lang === 'lo'
                        ? 'ເຂົ້າໄປທີ່ GitHub Repository ຂອງທ່ານ > ເມນູ Settings > ເລືອກ Pages (ເມນູດ້ານຊ້າຍ)'
                        : 'Go to your GitHub Repository > Settings > Pages (left sidebar).'}
                    </li>
                    <li>
                      {lang === 'lo'
                        ? 'ຢູ່ຊ່ອງ "Build and deployment" > ບ່ອນ Source: ປ່ຽນຈາກ "Deploy from a branch" ມາເປັນ "GitHub Actions"'
                        : 'Under "Build and deployment" > Source: Change from "Deploy from a branch" to "GitHub Actions".'}
                    </li>
                    <li>
                      {lang === 'lo'
                        ? 'ຫຼັງຈາກນັ້ນ Push ໂຄດຂຶ້ນ GitHub, ລະບົບຈະ Build ແລະ Deploy ອັດຕະໂນມັດ 100% ໂດຍບໍ່ມີຈໍຂາວອີກຕໍ່ໄປ!'
                        : 'Push your code to GitHub. GitHub will automatically run the build and publish the site!'}
                    </li>
                  </ol>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <span className="font-bold text-slate-900 text-xs">
                    {lang === 'lo' ? 'ວິທີທີ່ 2: Build ແລະ Deploy ໂຟນເດີ dist ດ້ວຍຕົນເອງ' : 'Method 2: Manual Build & Deploy dist Folder'}
                  </span>
                  <div className="mt-1.5 space-y-1 text-slate-600 leading-relaxed">
                    <p>
                      {lang === 'lo' ? 'ຖ້າທ່ານຕ້ອງການ Deploy ດ້ວຍຕົນເອງ, ໃຫ້ Build ໂຄງການກ່ອນ:' : 'If deploying manually, run the build command first:'}
                    </p>
                    <pre className="p-2 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px]">
                      npm run build
                    </pre>
                    <p className="mt-1">
                      {lang === 'lo'
                        ? 'ຈາກນັ້ນນຳເອົາໄຟລ໌ທັງໝົດທີ່ຢູ່ໃນໂຟນເດີ dist/ (index.html, assets, icon.svg...) ໄປວາງໃສ່ Branch ທີ່ທ່ານເລືອກ Deploy ໃນ GitHub Pages.'
                        : 'Then upload the contents of the dist/ directory to your designated GitHub Pages branch.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
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
