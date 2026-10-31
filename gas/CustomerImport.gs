/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
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
 */

function importExistingCustomerData() {
  const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID";
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Source sheet containing raw customer columns
  const sourceSheet = ss.getSheetByName("Sheet1") || ss.getSheetByName("RawCustomers") || ss.getSheets()[0];
  const targetCust = ss.getSheetByName("CUSTOMERS");
  const targetCond = ss.getSheetByName("CUSTOMER_CONDITIONS");
  const targetCont = ss.getSheetByName("CONTRACTS");
  const targetBdg = ss.getSheetByName("BUDGETS");

  if (!sourceSheet || !targetCust) {
    Logger.log("Please run initializeDatabase() first.");
    return;
  }

  const data = sourceSheet.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log("No data rows found in source sheet.");
    return;
  }

  // Build existing codes set to prevent duplicate overwriting
  const existingCustCodes = new Set();
  const custData = targetCust.getDataRange().getValues();
  for (let c = 1; c < custData.length; c++) {
    existingCustCodes.add(String(custData[c][0]).trim());
  }

  let importedCount = 0;
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const mde = String(row[0] || "").trim();
    const customerCode = String(row[1] || "").trim();
    const customerName = String(row[2] || "").trim();
    const condQty = Number(row[3]) || 0;
    const condUom = String(row[4] || "Cartons").trim();
    const condDesc = String(row[5] || "").trim();
    
    let commencingOn = "2026-01-01";
    if (row[6]) {
      try {
        commencingOn = Utilities.formatDate(new Date(row[6]), "GMT+7", "yyyy-MM-dd");
      } catch (e) {}
    }

    let expiringOn = "2026-12-31";
    if (row[7]) {
      try {
        expiringOn = Utilities.formatDate(new Date(row[7]), "GMT+7", "yyyy-MM-dd");
      } catch (e) {}
    }

    if (!customerCode || !customerName) continue;

    // Team mapping: MDE-B1 -> B1, MDE-B2 -> B2, etc.
    const teamMatch = mde.match(/B[1-7]/i);
    const team = teamMatch ? teamMatch[0].toUpperCase() : "B1";

    if (!existingCustCodes.has(customerCode)) {
      // 1. Add CUSTOMER
      targetCust.appendRow([
        customerCode,
        customerName,
        team,
        `MDE-${team}`,
        "",
        "",
        "Vientiane",
        "ACTIVE",
        new Date()
      ]);
      existingCustCodes.add(customerCode);

      // 2. Add CUSTOMER_CONDITIONS
      targetCond.appendRow([
        "CND-" + customerCode,
        customerCode,
        condQty,
        condUom,
        condDesc,
        new Date()
      ]);

      // 3. Add CONTRACT Cycle 1
      const contractId = "CNT-" + customerCode + "-01";
      const budgetId = "BDG-" + customerCode + "-01";

      targetCont.appendRow([
        contractId,
        customerCode,
        customerName,
        team,
        commencingOn,
        expiringOn,
        1,
        "ACTIVE",
        "Initial Excel import",
        new Date()
      ]);

      // 4. Add BUDGET (Default annual amount 30,000,000 LAK)
      const defaultBudget = 30000000;
      targetBdg.appendRow([
        budgetId,
        contractId,
        customerCode,
        team,
        defaultBudget,
        0,
        defaultBudget,
        0,
        "NORMAL",
        false,
        "",
        new Date()
      ]);

      importedCount++;
    }
  }

  Logger.log("✅ Successfully imported " + importedCount + " customers across teams B1-B7!");
}
