import React from 'react';
import { APP_VERSION } from '../services/appUpdates';
import {
  LayoutDashboard,
  Users,
  Wallet,
  ReceiptText,
  FileCheck2,
  BarChart3,
  UserCog,
  Settings,
  Code2,
  CalendarCheck,
  Sparkles,
  X
} from 'lucide-react';
import { storage } from '../services/storage';
import { translations, Language } from '../locales/translations';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  onOpenGasDocs: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  mobileMenuOpen,
  setMobileMenuOpen,
  onOpenGasDocs
}) => {
  const currentUser = storage.getCurrentUser();
  const settings = storage.getSettings();
  const lang: Language = settings.language;
  const t = translations[lang];
  const isAdmin = currentUser?.role === 'ADMIN';

  const navItems = [
    {
      id: 'dashboard',
      label: t.navDashboard,
      icon: LayoutDashboard,
      adminOnly: false
    },
    {
      id: 'customers',
      label: t.navCustomers,
      icon: Users,
      badge: '578',
      adminOnly: false
    },
    {
      id: 'budgets',
      label: t.navBudgets,
      icon: Wallet,
      adminOnly: false
    },
    {
      id: 'transactions',
      label: t.navTransactions,
      icon: ReceiptText,
      adminOnly: false
    },
    {
      id: 'contracts',
      label: t.navContracts,
      icon: FileCheck2,
      adminOnly: false
    },
    {
      id: 'reports',
      label: t.navReports,
      icon: BarChart3,
      adminOnly: false
    },
    {
      id: 'users',
      label: t.navUsers,
      icon: UserCog,
      adminOnly: true
    },
    {
      id: 'settings',
      label: t.navSettings,
      icon: Settings,
      adminOnly: false
    }
  ];

  const handleSelect = (id: string) => {
    onSelectView(id);
    if (mobileMenuOpen) setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 text-slate-300 transform transition-transform duration-200 ease-in-out lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col justify-between shadow-2xl lg:shadow-none`}
      >
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Header on mobile inside drawer with Close button */}
          <div className="flex items-center justify-between px-2 pb-3 border-b border-slate-800 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-sm">
                MKT
              </div>
              <div>
                <p className="font-bold text-white text-sm leading-tight">{t.appName}</p>
                <p className="text-[10px] text-slate-400">Teams B1 - B7</p>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              if (item.adminOnly && !isAdmin) return null;
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Google Apps Script Quick Action Box (Admin Only) */}
          {isAdmin && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-800/40 border border-slate-700/80">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                <Code2 className="w-4 h-4" />
                <span>Google Apps Script</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                {lang === 'lo'
                  ? 'ໂຄດ Apps Script ພ້ອມ Deploy ໃນ Spreadsheet ຂອງທ່ານ'
                  : 'Backend code ready for deployment to your Google Sheet'}
              </p>
              <button
                onClick={() => {
                  onOpenGasDocs();
                  if (mobileMenuOpen) setMobileMenuOpen(false);
                }}
                className="mt-3 w-full py-1.5 px-3 text-[11px] font-semibold text-white bg-blue-600/90 hover:bg-blue-600 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>{lang === 'lo' ? 'ເບິ່ງໂຄດ Backend .gs' : 'View GAS Backend'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer info in sidebar */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>PWA v{APP_VERSION}</span>
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {lang === 'lo' ? 'ພ້ອມໃຊ້ງານ' : 'Ready'}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
