/**
 * MKT Customer Budget Management - Type Definitions
 */

export type UserRole = 'ADMIN' | 'TEAM_USER';

export type Team = 'B1' | 'B2' | 'B3' | 'B4' | 'B5' | 'B6' | 'B7' | 'ALL';

export const TEAMS: Team[] = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7'];

export interface User {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  email?: string;
  role: UserRole;
  team: Team; // 'ALL' for admin, or 'B1'..'B7' for team users
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export type ContractStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'UPCOMING';

export type BudgetStatus = 'NORMAL' | 'WARNING_80' | 'CRITICAL_100' | 'EXCEEDED';

export interface Customer {
  code: string; // Unique Customer Code e.g. CUST-B1-001
  name: string; // Customer Name
  team: Team; // B1 .. B7
  mde: string; // MDE-B1 .. MDE-B7
  phone?: string;
  address?: string;
  province?: string;
  contactPerson?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DELETED';
  createdAt: string;
}

export interface CustomerCondition {
  id: string;
  customerCode: string;
  conditionQuantity: number;
  conditionUOM: string; // e.g. "Cartons", "Kegs", "Cases", "Displays"
  conditionProductDescription: string; // e.g. "Beerlao Gold 330ml Can"
  pricePerUnit?: number; // e.g. 240,000 LAK / carton
  updatedAt: string;
}

export interface Contract {
  id: string; // e.g. CNT-2026-0001
  customerCode: string;
  customerName: string;
  team: Team;
  commencingOn: string; // YYYY-MM-DD
  expiringOn: string; // YYYY-MM-DD
  cycleNumber: number; // 1, 2, 3...
  status: ContractStatus;
  notes?: string;
  createdAt: string;
}

export interface Budget {
  id: string; // e.g. BDG-2026-0001
  contractId: string;
  customerCode: string;
  team: Team;
  annualAmount: number; // Configurable monetary budget
  unallocatedUsed?: number; // Legacy spending without dated transaction records
  periodNumber?: number; // Anniversary year within the contract
  periodStart?: string; // Inclusive YYYY-MM-DD
  periodEnd?: string; // Inclusive, capped at contract expiry
  totalUsed: number;
  remainingAmount: number;
  utilizationPercentage: number;
  status: BudgetStatus;
  allowException?: boolean;
  exceptionReason?: string;
  updatedAt: string;
}

export type TransactionCategory =
  | 'POSM / Signboard'
  | 'Event & Sponsorship'
  | 'Trade Promotion'
  | 'Sampling & Activation'
  | 'Rebate & Discount'
  | 'Media & Digital'
  | 'Customer Incentive'
  | 'Other';

export interface BudgetTransaction {
  id: string; // e.g. TXN-2026-0001
  date: string; // YYYY-MM-DD
  customerCode: string;
  customerName: string;
  team: Team;
  contractId: string;
  budgetId: string;
  category: TransactionCategory | string;
  description: string;
  amount: number;
  invoiceRef?: string;
  createdBy: string;
  createdAt: string;
  status: 'ACTIVE' | 'CANCELLED';
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  role: UserRole;
  team: Team;
  action: string;
  details: string;
}

export interface AppSettings {
  spreadsheetId: string;
  appsScriptUrl: string;
  currencyCode: 'LAK' | 'USD' | 'THB';
  currencySymbol: string;
  currencyPosition: 'before' | 'after';
  pricePerCrate: number; // default: 240,000 Kip per beer carton/crate
  contractAlertDays: number; // default: 30 days
  warningThresholdPercent: number; // default: 80%
  syncMode: 'local' | 'gas';
  language: 'lo' | 'en';
  dashboardTheme?: 'glass' | 'executive' | 'neon' | 'minimal' | 'luxury';
}

export interface DashboardMetrics {
  totalCustomers: number;
  totalAnnualBudget: number;
  totalBudgetUsed: number;
  totalRemainingBudget: number;
  overallUtilizationRate: number;
  activeContracts: number;
  expiringContracts: number;
  expiredContracts: number;
  teamBudgets: Record<Team, {
    customerCount: number;
    annualBudget: number;
    usedBudget: number;
    remainingBudget: number;
    utilization: number;
  }>;
  categoryUsage: Record<string, number>;
  monthlyUsage: { month: string; amount: number }[];
}
