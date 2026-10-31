/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ONE-CLICK GOOGLE SHEETS DATABASE INITIALIZATION
 * Creates all 10 required sheets with exact columns and styling:
 * 1. CUSTOMERS
 * 2. CUSTOMER_CONDITIONS
 * 3. CONTRACTS
 * 4. BUDGETS
 * 5. BUDGET_TRANSACTIONS
 * 6. USERS
 * 7. CATEGORIES
 * 8. ACTIVITY_LOG
 * 9. SETTINGS
 * 10. SESSIONS
 */

function initializeDatabase() {
  const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID";
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

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
    }
    
    // Clear and set headers if empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    }

    // Apply corporate header styling
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#0f172a");
    headerRange.setFontColor("#ffffff");
    headerRange.setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  // Pre-seed default Categories if empty
  const catSheet = ss.getSheetByName("CATEGORIES");
  if (catSheet.getLastRow() === 1) {
    const defaultCategories = [
      ["CAT-01", "ປ້າຍໂຄສະນາ ແລະ POSM", "POSM / Signboard", "POSM", "Signboards, display units, menu stands"],
      ["CAT-02", "ງານອີເວັ້ນ ແລະ ສະໜັບສະໜູນ", "Event & Sponsorship", "EVENT", "Local events, sports, festival sponsorships"],
      ["CAT-03", "ໂປຣໂມຊັ່ນການຄ້າ", "Trade Promotion", "PROMO", "Trade incentive discounts and bundles"],
      ["CAT-04", "ແຈກຊີມ ແລະ ກິດຈະກຳລູກຄ້າ", "Sampling & Activation", "SAMPLING", "On-ground customer activation"],
      ["CAT-05", "ສ່ວນຫຼຸດພິເສດ", "Rebate & Discount", "REBATE", "Quarterly and annual contract rebates"],
      ["CAT-06", "ສື່ດິຈິຕອນ ແລະ ໂຄສະນາ", "Media & Digital", "MEDIA", "Social media, billboard, radio advertising"],
      ["CAT-07", "ລາງວັນ ແລະ ແຮງຈູງໃຈລູກຄ້າ", "Customer Incentive", "INCENTIVE", "Customer loyalty trips and gifts"]
    ];
    defaultCategories.forEach(row => catSheet.appendRow(row));
  }

  // Pre-seed default Admin and Team users
  const userSheet = ss.getSheetByName("USERS");
  if (userSheet.getLastRow() === 1) {
    userSheet.appendRow([
      "USR-001", "admin", "CHANGE_ME_ADMIN_PASSWORD", "ສຸລິຍາ ມະນີວົງ (Admin)", "admin.mkt@example.invalid", "ADMIN", "ALL", true, new Date(), ""
    ]);
    const teams = ["B1", "B2", "B3", "B4", "B5", "B6", "B7"];
    teams.forEach(tm => {
      userSheet.appendRow([
        "USR-" + tm, tm.toLowerCase() + "_user", tm.toLowerCase() + "_123", "Leader Team " + tm, tm.toLowerCase() + "@example.invalid", "TEAM_USER", tm, true, new Date(), ""
      ]);
    });
  }

  Logger.log("✅ Initialization complete! All 10 sheets configured with styling.");
}
