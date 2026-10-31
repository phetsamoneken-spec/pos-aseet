import React, { useEffect, useState } from 'react';
import { Palette, Check, ChevronDown } from 'lucide-react';
export type DashboardTheme = 'glass' | 'executive' | 'neon' | 'minimal' | 'luxury';
const choices: { id: DashboardTheme; label: string; lo: string; colors: string[] }[] = [
  { id:'glass', label:'Glassmorphism + 3D', lo:'ກະຈົກ 3D', colors:['#131d47','#665aca','#83e9f3'] },
  { id:'executive', label:'Modern Executive', lo:'ຜູ້ບໍລິຫານ', colors:['#f1f5ff','#4f46e5','#9fd3ff'] },
  { id:'neon', label:'Futuristic AI Neon', lo:'ນີອອນ AI', colors:['#07111f','#00e5e5','#8b5cf6'] },
  { id:'minimal', label:'Minimal Finance', lo:'ລຽບງ່າຍ', colors:['#effaf4','#18866b','#badbca'] },
  { id:'luxury', label:'Luxury Enterprise', lo:'ຫຼູຫຼາ', colors:['#101a2c','#cba660','#758399'] },
];
export function useDashboardTheme(username: string) {
  const key = `mkt-dashboard-theme-v1:${username}`;
  const [theme, setInternal] = useState<DashboardTheme>(() => {
    try { const saved = localStorage.getItem(key); return choices.some(x=>x.id===saved) ? saved as DashboardTheme : 'glass'; } catch { return 'glass'; }
  });
  useEffect(() => {
    try { const saved = localStorage.getItem(key); setInternal(choices.some(x=>x.id===saved) ? saved as DashboardTheme : 'glass'); } catch { setInternal('glass'); }
  }, [key]);
  const setTheme = (value: DashboardTheme) => { setInternal(value); try { localStorage.setItem(key,value); } catch {} };
  return { theme, setTheme };
}
export function ThemeSwitcher({ theme, onChange }: { theme: DashboardTheme; onChange: (theme: DashboardTheme) => void }) {
  const [open, setOpen] = useState(false);
  const active = choices.find(x=>x.id===theme)!;
  return <div className="mkt-theme-switcher no-print" aria-label="Dashboard appearance">
    <button type="button" className="mkt-theme-trigger" onClick={()=>setOpen(!open)} aria-expanded={open} aria-label="Change dashboard theme">
      <Palette size={17}/><span className="hidden sm:inline">{active.label}</span><ChevronDown size={14}/>
    </button>
    {open && <><button className="mkt-theme-backdrop" aria-label="Close themes" onClick={()=>setOpen(false)}/><div className="mkt-theme-menu" role="group" aria-label="Choose dashboard theme">
      <div className="mkt-theme-menu-heading">Dashboard Appearance <small>ປ່ຽນຮູບແບບ Dashboard</small></div>
      {choices.map(c=><button type="button" key={c.id} onClick={()=>{onChange(c.id);setOpen(false)}} className={`mkt-theme-option ${theme===c.id?'active':''}`} aria-pressed={theme===c.id}>
        <span className="mkt-theme-swatches">{c.colors.map((color,i)=><i key={i} style={{background:color}}/>)}</span>
        <span className="flex-1 text-left"><strong>{c.label}</strong><small>{c.lo}</small></span>
        {theme===c.id && <Check size={17}/>}
      </button>)}
      <p className="mkt-theme-hint">Appearance only. Budget records and permissions are unchanged.</p>
    </div></>}
  </div>;
}
