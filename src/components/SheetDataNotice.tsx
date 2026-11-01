import React, {useEffect,useState} from 'react';
import {RefreshCw} from 'lucide-react';
import {storage} from '../services/storage';

export function SheetDataNotice(){
  const [state,setState]=useState(storage.getSheetDataState());
  const [backupError,setBackupError]=useState('');
  useEffect(()=>storage.subscribe(()=>setState({...storage.getSheetDataState()})),[]);
  if(!storage.getSettings().appsScriptUrl)return null;
  const lang=storage.getSettings().language;
  const load=async()=>{
    setBackupError('');
    const dirty=storage.hasUnsyncedBusinessData();
    if(dirty){
      if(!window.confirm(lang==='lo'?'ໂຫຼດຂໍ້ມູນຈາກ Sheet ແທນຂໍ້ມູນໃນ browser ນີ້ບໍ່? ແອັບຈະດາວໂຫຼດໄຟລ໌ສຳຮອງ JSON ຂອງຂໍ້ມູນເດີມກ່ອນ.':'Replace this browser’s business data with the Sheet data? A JSON backup of the current data will download first.'))return;
      try{
        const url=URL.createObjectURL(new Blob([JSON.stringify(storage.exportBusinessBackup(),null,2)],{type:'application/json'}));
        const link=document.createElement('a');link.href=url;link.download=`FOC-business-backup-${Date.now()}.json`;
        document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      }catch{setBackupError('Could not create the backup. Existing data was kept.');return;}
    }
    await storage.loadBusinessFromSheets(dirty);
  };
  return <div className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-xs ${state.status==='error'||state.status==='local'?'border-amber-200 bg-amber-50 text-amber-900':'border-slate-200 bg-white text-slate-600'}`}>
    <p role={state.status==='error'?'alert':'status'} className="min-w-0 flex-1">{backupError || state.message || (lang==='lo'?'ຂໍ້ມູນລູກຄ້າຈາກ Google Sheet':'Customer data from Google Sheets')}</p>
    <button type="button" onClick={load} disabled={state.status==='loading'} className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 font-semibold disabled:opacity-50">
      <RefreshCw className={`h-4 w-4 ${state.status==='loading'?'animate-spin':''}`} />{lang==='lo'?'ໂຫຼດຈາກ Sheet':'Load from Sheet'}
    </button>
    {state.status==='error'&&storage.getCurrentUser()?.role==='ADMIN'&&<a href="https://raw.githubusercontent.com/phetsamoneken-spec/foc-support/main/gas/Code.gs" target="_blank" rel="noreferrer" className="font-semibold text-blue-700 underline">Code.gs</a>}
  </div>;
}
