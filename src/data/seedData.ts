/**
 * Pre-seeded Customer Data across Teams B1-B7 (~578 customers)
 * Conforming with Google Spreadsheet schema
 */

import { Customer, CustomerCondition, Contract, Budget, BudgetTransaction, User, Team, TEAMS, AppSettings } from '../types';
import { resolveBackendUrl } from '../config/backend';

export const INITIAL_SETTINGS: AppSettings = {
  spreadsheetId: 'YOUR_SPREADSHEET_ID',
  appsScriptUrl: resolveBackendUrl(undefined),
  currencyCode: 'LAK',
  currencySymbol: '₭',
  currencyPosition: 'after',
  pricePerCrate: 240000, // 240,000 Kip per carton/crate
  contractAlertDays: 30,
  warningThresholdPercent: 80,
  syncMode: 'local',
  language: 'lo'
};

export const INITIAL_USERS: User[] = [
  {
    id: 'USR-001',
    username: 'admin',
    password: 'CHANGE_ME_ADMIN_PASSWORD',
    fullName: 'ສຸລິຍາ ມະນີວົງ (Sys Admin)',
    email: 'admin.mkt@example.invalid',
    role: 'ADMIN',
    team: 'ALL',
    isActive: true,
    createdAt: '2026-01-01',
    lastLogin: '2026-10-30 08:30'
  },
  {
    id: 'USR-B1',
    username: 'b1_user',
    password: 'CHANGE_ME_TEAM_B1_PASSWORD',
    fullName: 'ຄຳແພງ ວົງສາ (Team Leader B1)',
    email: 'b1.mkt@example.invalid',
    role: 'TEAM_USER',
    team: 'B1',
    isActive: true,
    createdAt: '2026-01-05',
    lastLogin: '2026-10-29 14:15'
  },
  {
    id: 'USR-B2',
    username: 'b2_user',
    password: 'CHANGE_ME_TEAM_B2_PASSWORD',
    fullName: 'ສົມສັກ ແກ້ວມະນີ (Team B2)',
    email: 'b2.mkt@example.invalid',
    role: 'TEAM_USER',
    team: 'B2',
    isActive: true,
    createdAt: '2026-01-05',
    lastLogin: '2026-10-28 11:00'
  },
  {
    id: 'USR-B3',
    username: 'b3_user',
    password: 'CHANGE_ME_TEAM_B3_PASSWORD',
    fullName: 'ມານີວັນ ສີລິວົງ (Team B3)',
    email: 'b3.mkt@example.invalid',
    role: 'TEAM_USER',
    team: 'B3',
    isActive: true,
    createdAt: '2026-01-05',
    lastLogin: '2026-10-29 09:20'
  },
  {
    id: 'USR-B4',
    username: 'b4_user',
    password: 'CHANGE_ME_TEAM_B4_PASSWORD',
    fullName: 'ບຸນທັນ ຈັນທະວົງ (Team B4)',
    email: 'b4.mkt@example.invalid',
    role: 'TEAM_USER',
    team: 'B4',
    isActive: true,
    createdAt: '2026-01-05',
    lastLogin: '2026-10-25 16:40'
  },
  {
    id: 'USR-B5',
    username: 'b5_user',
    password: 'CHANGE_ME_TEAM_B5_PASSWORD',
    fullName: 'ອານຸສອນ ພົມມະຈັນ (Team B5)',
    email: 'b5.mkt@example.invalid',
    role: 'TEAM_USER',
    team: 'B5',
    isActive: true,
    createdAt: '2026-01-05',
    lastLogin: '2026-10-27 10:10'
  },
  {
    id: 'USR-B6',
    username: 'b6_user',
    password: 'CHANGE_ME_TEAM_B6_PASSWORD',
    fullName: 'ດາວອນ ໄຊຍະສິດ (Team B6)',
    email: 'b6.mkt@example.invalid',
    role: 'TEAM_USER',
    team: 'B6',
    isActive: true,
    createdAt: '2026-01-05',
    lastLogin: '2026-10-29 17:05'
  },
  {
    id: 'USR-B7',
    username: 'b7_user',
    password: 'CHANGE_ME_TEAM_B7_PASSWORD',
    fullName: 'ພຸດທະສອນ ລັດຕະນະ (Team B7)',
    email: 'b7.mkt@example.invalid',
    role: 'TEAM_USER',
    team: 'B7',
    isActive: true,
    createdAt: '2026-01-05',
    lastLogin: '2026-10-30 07:15'
  }
];

// Product condition samples matching real Lao beverage & consumer marketing items
const SAMPLE_PRODUCTS = [
  { desc: 'Beerlao Lager Can 330ml x 24', uom: 'Cartons' },
  { desc: 'Beerlao Gold Bottle 330ml x 24', uom: 'Cases' },
  { desc: 'Beerlao Dark Bottle 330ml x 24', uom: 'Cases' },
  { desc: 'Carlsberg Beer Can 330ml x 24', uom: 'Cartons' },
  { desc: 'Sommo Lemon Drink Can 320ml', uom: 'Cartons' },
  { desc: 'Tiger Draught Keg 30 Liters', uom: 'Kegs' },
  { desc: 'Namthip Drinking Water 600ml x 24', uom: 'Packs' },
  { desc: 'Heineken Silver Can 330ml x 24', uom: 'Cartons' },
  { desc: 'Tuborg Green Beer Can 330ml x 24', uom: 'Cartons' },
  { desc: 'Lao Spirit Special Blend 700ml', uom: 'Cases' }
];

const LAO_PRE_NAMES = [
  'ຮ້ານອາຫານ', 'ໂຮງແຮມ', 'ສັບພະສິນຄ້າ', 'ຣີສອດ', 'ຮ້ານມິນິມາດ', 'ຕົວແທນຈຳໜ່າຍ',
  'ບາ & ບຣິດໂຕຣ', 'ສູນການຄ້າ', 'ຮ້ານສະດວກຊື້', 'ສະໂມສອນ'
];

const LAO_CORP_NAMES = [
  'ດາວເຮືອງ (Dao Heuang)', 'ວຽງຈັນເຊັນເຕີ (Vientiane Center)', 'ພົງສະຫວັນ (Phongsavanh Group)',
  'ໂສກໄຊ ມາດ (Sokxay Mart)', 'ຕະຫຼາດເຊົ້າຊັອບປິ້ງ (Talat Sao Mall)', 'ຂອບໃຈເດີ (Khop Chai Deu)',
  'ແລນມາກ ແມ່ຂອງ (Landmark Mekong)', 'ຄລາວພລາຊາ (Crowne Plaza Vientiane)', 'ປາກເຊ ເທຣດດິ້ງ (Pakse Trading)',
  'ຫຼວງພະບາງ ບູຕິກ (Luang Prabang Boutique)', 'ວັງວຽງ ຣິເວີໄຊ (Vang Vieng Riverside)', 'ສະຫວັນ ພາກ (Savan Park)',
  'ທ່າແຂກ ດີສຕຣິບິວເຕີ (Thakhek Dist)', 'ອຸດົມໄຊ ຄ້າຂາຍ (Oudomxay Trade)', 'ບໍ່ແກ້ວ ໂກເດັນ (Bokeo Golden)',
  'ໄຊຍະບູລີ ມາດ (Xayaboury Mart)', 'ຊຽງຂວາງ ການຄ້າ (Xiengkhouang Co)', 'ສາລະວັນ ຣີສອດ (Saravan Resort)',
  'ເຊກອງ ມິນິມາດ (Sekong Minimart)', 'ອັດຕະປື ພລາຊາ (Attapeu Plaza)', 'ໄຊສົມບູນ ວິວ (Xaysomboun View)',
  'ແກ້ວອຸດົມ ຮ້ານຄ້າ (Keo Oudom)', 'ສີໂຄດຕະບອງ ຊັອບ (Sikhottabong)', 'ໄຊເສດຖາ ບຣາເດີສ (Saysettha Brothers)',
  'ຫາດຊາຍຟອງ ສະໂຕ (Hatsayfong Store)', 'ຈັນທະບູລີ ກຣຸບ (Chanthabouly Group)', 'ສີສັດຕະນາກ ພອຍ (Sisattanak Point)'
];

const PROVINCES = [
  'ນະຄອນຫຼວງວຽງຈັນ (Vientiane Capital)',
  'ຫຼວງພະບາງ (Luang Prabang)',
  'ຈຳປາສັກ (Champasak)',
  'ສະຫວັນນະເຂດ (Savannakhet)',
  'ວຽງຈັນ (Vientiane Province / Vangvieng)',
  'ຄຳມ່ວນ (Khammouane)',
  'ບໍ່ແກ້ວ (Bokeo)'
];

/**
 * Generate full seed dataset of 578 customers across teams B1-B7
 */
export function generateSeedData(): {
  customers: Customer[];
  conditions: CustomerCondition[];
  contracts: Contract[];
  budgets: Budget[];
  transactions: BudgetTransaction[];
} {
  const customers: Customer[] = [];
  const conditions: CustomerCondition[] = [];
  const contracts: Contract[] = [];
  const budgets: Budget[] = [];
  const transactions: BudgetTransaction[] = [];

  // Total targets across teams B1-B7 (~82-84 per team = 578 customers)
  const targetPerTeam: Record<string, number> = {
    B1: 83,
    B2: 83,
    B3: 82,
    B4: 83,
    B5: 82,
    B6: 83,
    B7: 82
  };

  let globalCustomerIndex = 1;

  const REAL_SAMPLE_NAMES = [
    'ຮ້ານປີ້ງແບ້ ຄຳຜົງ',
    'ສຸມອາຫານເສດຖາ 2',
    'ຮ້ານອາຫານ ແຖມທ່ຽງ',
    'ຮ້ານ ເຝີ ນາງ ສຸກ',
    'ຮ້ານນ້ຳປັ່ນດອກເກດ',
    'ຮ້ານອາຫານພັນມາວາ',
    'ຮ້ານອາຫານ ດາວເຮືອງ',
    'ໂຮງແຮມ ແລນມາກ ແມ່ຂອງ',
    'ສັບພະສິນຄ້າ ວຽງຈັນເຊັນເຕີ',
    'ໂສກໄຊ ມາດ',
    'ຂອບໃຈເດີ ບຣາສເຊີຣີ',
    'ຮ້ານອາຫານ ວັງວຽງ ຣິເວີໄຊ',
    'ຄລາວພລາຊາ ວຽງຈັນ',
    'ປາກເຊ ເທຣດດິ້ງ ມາດ',
    'ຫຼວງພະບາງ ບູຕິກ ຣີສອດ'
  ];

  TEAMS.forEach((team) => {
    const count = targetPerTeam[team];
    for (let i = 1; i <= count; i++) {
      const codeNumber = 10000 + (team.charCodeAt(1) - 49) * 1000 + i * 18;
      const customerCode = `CD-VTE-${codeNumber}`;
      
      let customerName = '';
      if (team === 'B1' && i <= REAL_SAMPLE_NAMES.length) {
        customerName = REAL_SAMPLE_NAMES[i - 1];
      } else {
        const pre = LAO_PRE_NAMES[(i + globalCustomerIndex) % LAO_PRE_NAMES.length];
        const corp = LAO_CORP_NAMES[(i * 3 + globalCustomerIndex) % LAO_CORP_NAMES.length];
        const branchNum = (i % 8) + 1;
        customerName = `${pre} ${corp} ສາຂາ ${branchNum}`;
      }
      
      const province = PROVINCES[(i + globalCustomerIndex) % PROVINCES.length];
      const mde = `MDE-${team}`;

      const customer: Customer = {
        code: customerCode,
        name: customerName,
        team,
        mde,
        phone: `+856 20 ${50000000 + globalCustomerIndex * 137}`,
        address: `ຖະໜົນໃຫຍ່, ເມືອງສີສັດຕະນາກ, ${province}`,
        province,
        contactPerson: `ທ່ານ ຜູ້ຈັດການ (${customerCode})`,
        status: 'ACTIVE',
        createdAt: '2026-01-01'
      };
      customers.push(customer);

      // Condition Qty (Cartons of beer)
      const prod = SAMPLE_PRODUCTS[(i + globalCustomerIndex) % SAMPLE_PRODUCTS.length];
      // Generate clean carton quantities: e.g. 125, 250, 500, 750, 1000 cartons
      const cartonSteps = [125, 250, 350, 500, 750, 1000, 1250, 1500];
      const conditionQty = cartonSteps[(i + globalCustomerIndex) % cartonSteps.length];

      const condition: CustomerCondition = {
        id: `CND-${customerCode}`,
        customerCode,
        conditionQuantity: conditionQty,
        conditionUOM: prod.uom,
        conditionProductDescription: prod.desc,
        pricePerUnit: 240000,
        updatedAt: '2026-01-05'
      };
      conditions.push(condition);

      // Contract Dates (Contract-based annual cycle, not calendar year)
      const startMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      const sMonth = startMonths[i % 12];
      const sDay = (i % 25) + 1;
      
      let startYear = 2025;
      let endYear = 2028;
      let status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'UPCOMING' = 'ACTIVE';

      if (i % 12 === 0) {
        // Expired
        startYear = 2024;
        endYear = 2026;
        const commencingOn = `${startYear}-09-15`;
        const expiringOn = `${endYear}-09-14`;
        status = 'EXPIRED';
        
        createContractAndBudget(customerCode, customerName, team, commencingOn, expiringOn, status, conditionQty, i);
      } else if (i % 7 === 0) {
        // Expiring Soon (Nov or Dec 2026)
        startYear = 2024;
        endYear = 2026;
        const commencingOn = `${startYear}-11-15`;
        const expiringOn = `${endYear}-11-14`;
        status = 'EXPIRING_SOON';
        
        createContractAndBudget(customerCode, customerName, team, commencingOn, expiringOn, status, conditionQty, i);
      } else {
        // Active multi-year contract matching user's real contract duration e.g. 2025-05-19 to 2028-05-18
        const commMonth = String(sMonth).padStart(2, '0');
        const commDay = String(sDay).padStart(2, '0');
        const commencingOn = `2025-${commMonth}-${commDay}`;
        const expiringOn = `2028-${commMonth}-${commDay}`;
        status = 'ACTIVE';

        createContractAndBudget(customerCode, customerName, team, commencingOn, expiringOn, status, conditionQty, i);
      }

      globalCustomerIndex++;
    }
  });

  function createContractAndBudget(
    customerCode: string,
    customerName: string,
    team: Team,
    commencingOn: string,
    expiringOn: string,
    contractStatus: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'UPCOMING',
    conditionQty: number,
    seedIndex: number
  ) {
    const contractId = `CNT-${customerCode}-01`;
    const budgetId = `BDG-${customerCode}-01`;

    const contract: Contract = {
      id: contractId,
      customerCode,
      customerName,
      team,
      commencingOn,
      expiringOn,
      cycleNumber: 1,
      status: contractStatus,
      notes: `ສັນຍາການຕະຫຼາດຮອບທີ 1 ປະຈຳຮ້ານ ${customerName}`,
      createdAt: commencingOn
    };
    contracts.push(contract);

    // CRITICAL: Budget is calculated as Condition Quantity * 240,000 Kip/crate
    const annualAmount = conditionQty * 240000;

    // Usage ratio based on status & index
    let usageRatio = 0.45;
    if (contractStatus === 'EXPIRING_SOON') {
      usageRatio = 0.88; // Warning
    } else if (contractStatus === 'EXPIRED') {
      usageRatio = 0.98;
    } else if (seedIndex % 5 === 0) {
      usageRatio = 0.84; // >80% warning
    } else if (seedIndex % 11 === 0) {
      usageRatio = 1.0; // 100% full
    } else {
      usageRatio = ((seedIndex * 7) % 65 + 10) / 100;
    }

    const totalUsed = Math.round((annualAmount * usageRatio) / 100000) * 100000;
    const remainingAmount = annualAmount - totalUsed;
    const utilizationPercentage = Math.round((totalUsed / annualAmount) * 1000) / 10;

    let budgetStatus: 'NORMAL' | 'WARNING_80' | 'CRITICAL_100' | 'EXCEEDED' = 'NORMAL';
    if (utilizationPercentage >= 100) {
      budgetStatus = 'CRITICAL_100';
    } else if (utilizationPercentage >= 80) {
      budgetStatus = 'WARNING_80';
    }

    const budget: Budget = {
      id: budgetId,
      contractId,
      customerCode,
      team,
      annualAmount,
      totalUsed,
      remainingAmount,
      utilizationPercentage,
      status: budgetStatus,
      updatedAt: '2026-10-25'
    };
    budgets.push(budget);

    // Create realistic sample transactions for the first 35 customers of each team
    if (seedIndex <= 20 && totalUsed > 0) {
      const categories = [
        'POSM / Signboard',
        'Trade Promotion',
        'Event & Sponsorship',
        'Sampling & Activation',
        'Rebate & Discount',
        'Customer Incentive'
      ];

      const splitCount = Math.min(3, Math.floor(totalUsed / 5000000) || 1);
      const splitAmount = Math.floor(totalUsed / splitCount);

      for (let t = 1; t <= splitCount; t++) {
        const txnId = `TXN-${customerCode}-${String(t).padStart(2, '0')}`;
        const cat = categories[(seedIndex + t) % categories.length];
        
        transactions.push({
          id: txnId,
          date: `2026-0${Math.min(9, (t * 2) + 1)}-15`,
          customerCode,
          customerName,
          team,
          contractId,
          budgetId,
          category: cat,
          description: `ຄ່າດຳເນີນງານ ${cat} ຕາມເງື່ອນໄຂສັນຍາຮອບປີ`,
          amount: splitAmount,
          invoiceRef: `INV-2026-${String(seedIndex * 10 + t).padStart(4, '0')}`,
          createdBy: `${team.toLowerCase()}_user`,
          createdAt: `2026-0${Math.min(9, (t * 2) + 1)}-15 10:30`,
          status: 'ACTIVE'
        });
      }
    }
  }

  return { customers, conditions, contracts, budgets, transactions };
}
