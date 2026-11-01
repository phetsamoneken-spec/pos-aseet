/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MKT Customer Budget Management Web App
 * Teams B1 - B7
 */

import React, { useState, useEffect } from 'react';
import { ThemeSwitcher, useDashboardTheme } from './components/ThemeSwitcher';
import { storage } from './services/storage';
import { translations, Language } from './locales/translations';
import { Team, User } from './types';

// Components
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { OfflineIndicator } from './components/OfflineIndicator';

// Views
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { CustomersView } from './views/CustomersView';
import { BudgetManagementView } from './views/BudgetManagementView';
import { TransactionsView } from './views/TransactionsView';
import { ContractManagementView } from './views/ContractManagementView';
import { ReportsView } from './views/ReportsView';
import { UsersView } from './views/UsersView';
import { SettingsView } from './views/SettingsView';

// Modals
import { CustomerDetailModal } from './views/CustomerDetailModal';
import { AddTransactionModal } from './views/AddTransactionModal';
import { AddContractModal } from './views/AddContractModal';
import { AddCustomerModal } from './views/AddCustomerModal';
import { GasDocsModal } from './views/GasDocsModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(storage.getCurrentUser());
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedTeam, setSelectedTeam] = useState<Team | 'ALL'>('ALL');
  const [navigationOpen, setNavigationOpen] = useState(false);
  const { theme, setTheme } = useDashboardTheme(currentUser?.username || 'guest');

  // Modal States
  const [detailCustomerCode, setDetailCustomerCode] = useState<string | null>(null);
  const [addTransactionCustomerCode, setAddTransactionCustomerCode] = useState<string | null>(null);
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const [addContractCustomerCode, setAddContractCustomerCode] = useState<string | null>(null);
  const [showAddContractModal, setShowAddContractModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showGasDocsModal, setShowGasDocsModal] = useState(false);

  // Re-render on storage updates
  useEffect(() => {
    const unsubscribe = storage.subscribe(() => {
      const user = storage.getCurrentUser();
      setCurrentUser(user ? { ...user } : null);
      if (user && user.role !== 'ADMIN' && user.team !== 'ALL') {
        setSelectedTeam(user.team);
      }
    });

    // Check initial user team
    const initialUser = storage.getCurrentUser();
    if (initialUser && initialUser.role !== 'ADMIN' && initialUser.team !== 'ALL') {
      setSelectedTeam(initialUser.team);
    }

    return () => unsubscribe();
  }, []);

  // Not logged in -> Show Login
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
        <LoginView />
        <OfflineIndicator language="lo" />
      </div>
    );
  }

  const settings = storage.getSettings();
  const lang: Language = settings.language;
  const isAdmin = currentUser.role === 'ADMIN';

  const handleOpenAddTransaction = (customerCode?: string) => {
    setAddTransactionCustomerCode(customerCode || null);
    setShowAddTransactionModal(true);
  };

  const handleOpenAddContract = (customerCode?: string) => {
    setAddContractCustomerCode(customerCode || null);
    setShowAddContractModal(true);
  };

  return (
    <div className={`mkt-shell theme-${theme} min-h-screen flex flex-col font-sans`}>
      
      <ThemeSwitcher theme={theme} onChange={setTheme} />
      {/* Global Header */}
      <Header
        currentView={currentView}
        onSelectView={setCurrentView}
        selectedTeam={selectedTeam}
        onSelectTeam={setSelectedTeam}
        navigationOpen={navigationOpen}
        setNavigationOpen={setNavigationOpen}
        onOpenGasDocs={() => setShowGasDocsModal(true)}
      />

      <div className="flex-1 flex w-full">
        
        {/* Sidebar */}
        <Sidebar
          currentView={currentView}
          onSelectView={setCurrentView}
          navigationOpen={navigationOpen}
          setNavigationOpen={setNavigationOpen}
          onOpenGasDocs={() => setShowGasDocsModal(true)}
        />

        {/* Main Content Area */}
        <main className="mkt-main flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          {currentView === 'dashboard' && (
            <DashboardView
              selectedTeam={selectedTeam}
              onSelectTeam={setSelectedTeam}
              onNavigate={setCurrentView}
              onOpenAddTransaction={() => handleOpenAddTransaction()}
              onOpenAddContract={() => handleOpenAddContract()}
            />
          )}

          {currentView === 'customers' && (
            <CustomersView
              selectedTeam={selectedTeam}
              onSelectTeam={setSelectedTeam}
              onOpenCustomerDetail={(code) => setDetailCustomerCode(code)}
              onOpenAddCustomer={() => setShowAddCustomerModal(true)}
              onOpenAddTransaction={(code) => handleOpenAddTransaction(code)}
            />
          )}

          {currentView === 'budgets' && (
            <BudgetManagementView
              selectedTeam={selectedTeam}
              onSelectTeam={setSelectedTeam}
              onOpenCustomerDetail={(code) => setDetailCustomerCode(code)}
              onOpenAddTransaction={(code) => handleOpenAddTransaction(code)}
            />
          )}

          {currentView === 'transactions' && (
            <TransactionsView
              selectedTeam={selectedTeam}
              onSelectTeam={setSelectedTeam}
              onOpenAddTransaction={() => handleOpenAddTransaction()}
              onOpenCustomerDetail={(code) => setDetailCustomerCode(code)}
            />
          )}

          {currentView === 'contracts' && (
            <ContractManagementView
              selectedTeam={selectedTeam}
              onSelectTeam={setSelectedTeam}
              onOpenCustomerDetail={(code) => setDetailCustomerCode(code)}
              onOpenAddContract={(code) => handleOpenAddContract(code)}
            />
          )}

          {currentView === 'reports' && (
            <ReportsView
              selectedTeam={selectedTeam}
              onSelectTeam={setSelectedTeam}
            />
          )}

          {currentView === 'users' && isAdmin && (
            <UsersView />
          )}

          {currentView === 'settings' && (
            <SettingsView
              onOpenGasDocs={() => setShowGasDocsModal(true)}
            />
          )}
        </main>
      </div>

      {/* Offline Alert Indicator */}
      <OfflineIndicator language={lang} />

      {/* Modals */}
      {detailCustomerCode && (
        <CustomerDetailModal
          customerCode={detailCustomerCode}
          onClose={() => setDetailCustomerCode(null)}
          onOpenAddTransaction={(code) => {
            setDetailCustomerCode(null);
            handleOpenAddTransaction(code);
          }}
          onOpenAddContract={(code) => {
            setDetailCustomerCode(null);
            handleOpenAddContract(code);
          }}
        />
      )}

      {showAddTransactionModal && (
        <AddTransactionModal
          initialCustomerCode={addTransactionCustomerCode || undefined}
          onClose={() => {
            setShowAddTransactionModal(false);
            setAddTransactionCustomerCode(null);
          }}
          onSuccess={() => {
            setShowAddTransactionModal(false);
            setAddTransactionCustomerCode(null);
          }}
        />
      )}

      {showAddContractModal && (
        <AddContractModal
          initialCustomerCode={addContractCustomerCode || undefined}
          onClose={() => {
            setShowAddContractModal(false);
            setAddContractCustomerCode(null);
          }}
          onSuccess={() => {
            setShowAddContractModal(false);
            setAddContractCustomerCode(null);
          }}
        />
      )}

      {showAddCustomerModal && (
        <AddCustomerModal
          onClose={() => setShowAddCustomerModal(false)}
          onSuccess={() => setShowAddCustomerModal(false)}
        />
      )}

      {showGasDocsModal && (
        <GasDocsModal
          onClose={() => setShowGasDocsModal(false)}
        />
      )}

    </div>
  );
}
