/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MKT CUSTOMER BUDGET MANAGEMENT - GOOGLE APPS SCRIPT WEB APP BACKEND
 * Spreadsheet ID: YOUR_SPREADSHEET_ID
 * Teams Supported: B1, B2, B3, B4, B5, B6, B7
 */

const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID";

// Install this Code.gs ONLY. It includes initializeDatabase() and importExistingCustomerData().
// Sync is an app -> Sheet upsert, not a two-way merge. Missing records are never deleted.
const SYNC_TABLES = [
  ['customers', 'CUSTOMERS', ['Customer Code','Customer Name','Team','MDE','Phone','Address','Province','Status','Created At','Contact Person'], ['code','name','team','mde','phone','address','province','status','createdAt','contactPerson']],
  ['conditions', 'CUSTOMER_CONDITIONS', ['ID','Customer Code','Condition Quantity','Condition UOM','Product Description','Updated At','Price per Unit'], ['id','customerCode','conditionQuantity','conditionUOM','conditionProductDescription','updatedAt','pricePerUnit']],
  ['contracts', 'CONTRACTS', ['Contract ID','Customer Code','Customer Name','Team','Commencing On','Expiring On','Cycle Number','Status','Notes','Created At'], ['id','customerCode','customerName','team','commencingOn','expiringOn','cycleNumber','status','notes','createdAt']],
  ['budgets', 'BUDGETS', ['Budget ID','Contract ID','Customer Code','Team','Annual Amount','Total Used','Remaining Amount','Utilization (%)','Status','Allow Exception','Exception Reason','Updated At'], ['id','contractId','customerCode','team','annualAmount','totalUsed','remainingAmount','utilizationPercentage','status','allowException','exceptionReason','updatedAt']],
  ['transactions', 'BUDGET_TRANSACTIONS', ['Transaction ID','Date','Customer Code','Customer Name','Team','Contract ID','Budget ID','Category','Description','Amount','Invoice Ref','Created By','Created At','Status','Cancellation Reason','Cancelled By','Cancelled At'], ['id','date','customerCode','customerName','team','contractId','budgetId','category','description','amount','invoiceRef','createdBy','createdAt','status','cancellationReason','cancelledBy','cancelledAt']],
  ['logs', 'ACTIVITY_LOG', ['Log ID','Timestamp','User','Role','Team','Action','Details'], ['id','timestamp','user','role','team','action','details']],
  ['settingsRows', 'SETTINGS', ['Setting Key','Setting Value','Description','Updated At'], ['key','value','description','updatedAt']]
];

function syncCell_(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    if (!isFinite(value)) throw new Error('Non-finite number in sync payload');
    return value;
  }
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') throw new Error('Only text, numbers and booleans can be synced');
  // Treat imported text as text, including strings that resemble Sheet formulas.
  return /^[=+@-]/.test(value) ? "'" + value : value;
}

function planSyncTable_(ss, table, records) {
  if (!Array.isArray(records)) throw new Error(table[0] + ' must be an array');
  const sheet = ss.getSheetByName(table[1]);
  const existing = sheet && sheet.getLastRow() > 0 ? sheet.getDataRange().getValues() : [];
  const formulas = existing.length ? sheet.getDataRange().getFormulas() : [];
  const headers = existing.length ? existing[0].map(String) : [];
  if (headers.length && headers[0] !== table[2][0]) {
    throw new Error(table[1] + ': unexpected ID column; existing sheet was not overwritten');
  }
  if (new Set(headers).size !== headers.length) throw new Error(table[1] + ': duplicate headers');
  table[2].forEach(function(header) { if (headers.indexOf(header) < 0) headers.push(header); });
  const rows = existing.slice(1).map(function(row, i) {
    return headers.map(function(_, col) {
      return formulas[i + 1] && formulas[i + 1][col] || (row[col] === undefined ? '' : row[col]);
    });
  });
  const index = new Map();
  rows.forEach(function(row, i) {
    if (row[0] === '') return;
    const key = String(row[0]);
    if (index.has(key)) throw new Error(table[1] + ': duplicate existing ID ' + key);
    index.set(key, i);
  });
  const seen = new Set();
  let inserted = 0, updated = 0;
  records.forEach(function(record) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Invalid record in ' + table[1]);
    const id = record[table[3][0]];
    if ((typeof id !== 'string' && typeof id !== 'number') || String(id).trim() === '') throw new Error('Missing ID in ' + table[1]);
    const key = String(id);
    if (seen.has(key)) throw new Error('Duplicate incoming ID in ' + table[1] + ': ' + key);
    seen.add(key);
    let row;
    if (index.has(key)) { row = rows[index.get(key)]; updated++; }
    else { row = headers.map(function() { return ''; }); index.set(key, rows.length); rows.push(row); inserted++; }
    table[3].forEach(function(field, i) {
      if (Object.prototype.hasOwnProperty.call(record, field)) row[headers.indexOf(table[2][i])] = syncCell_(record[field]);
    });
  });
  return { sheetName: table[1], headers: headers, rows: rows, inserted: inserted, updated: updated, received: records.length };
}

function handleBulkSync(p) {
  if (!p || typeof p !== 'object') throw new Error('Missing sync payload');
  if (p.spreadsheetId && p.spreadsheetId !== SPREADSHEET_ID) throw new Error('Spreadsheet ID does not match Code.gs');
  const ss = getSpreadsheet();
  const data = Object.assign({}, p);
  if (p.settings !== undefined) {
    if (!p.settings || typeof p.settings !== 'object' || Array.isArray(p.settings)) throw new Error('settings must be an object');
    const allowed = ['spreadsheetId','appsScriptUrl','currencyCode','currencySymbol','currencyPosition','pricePerCrate','contractAlertDays','warningThresholdPercent','syncMode','language'];
    data.settingsRows = allowed.filter(function(key) { return Object.prototype.hasOwnProperty.call(p.settings, key); }).map(function(key) {
      return { key: key, value: p.settings[key], description: 'Synced from MKT app', updatedAt: new Date().toISOString() };
    });
  }
  // Validate every table before writing any business data.
  const plans = SYNC_TABLES.filter(function(table) { return data[table[0]] !== undefined; }).map(function(table) {
    return planSyncTable_(ss, table, data[table[0]]);
  });
  if (!plans.length) throw new Error('No supported data supplied');
  const counts = {}, appliedSheets = [];
  try {
    plans.forEach(function(plan) {
      const sheet = ss.getSheetByName(plan.sheetName) || ss.insertSheet(plan.sheetName);
      const values = [plan.headers].concat(plan.rows);
      if (sheet.getMaxColumns() < plan.headers.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), plan.headers.length - sheet.getMaxColumns());
      if (sheet.getMaxRows() < values.length) sheet.insertRowsAfter(sheet.getMaxRows(), values.length - sheet.getMaxRows());
      sheet.getRange(1, 1, values.length, plan.headers.length).setValues(values);
      appliedSheets.push(plan.sheetName);
      counts[plan.sheetName] = { received: plan.received, inserted: plan.inserted, updated: plan.updated };
    });
    SpreadsheetApp.flush();
  } catch (error) {
    return { success: false, error: String(error), message: 'Sync incomplete. Some writes may have completed; retry is safe by ID.', appliedSheets: appliedSheets, counts: counts };
  }
  const total = plans.reduce(function(sum, plan) { return sum + plan.received; }, 0);
  return { success: true, syncVersion: 2, message: 'Saved ' + total + ' records across ' + plans.length + ' sheets (upsert by ID).', counts: counts, spreadsheetId: SPREADSHEET_ID, syncedAt: new Date().toISOString() };
}

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/**
 * Handle HTTP GET Requests
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || "ping";

    if (action === "ping") {
      return jsonResponse({
        success: true,
        message: "MKT Customer Budget Management Web App Backend Active",
        timestamp: new Date().toISOString(),
        spreadsheetId: SPREADSHEET_ID
      });
    }

    if (action === "getCustomers") {
      const team = (e.parameter && e.parameter.team) || "ALL";
      const ss = getSpreadsheet();
      const sheet = ss.getSheetByName("CUSTOMERS");
      if (!sheet) {
        return jsonResponse({ success: false, message: "CUSTOMERS sheet not found" });
      }
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const customers = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;
        if (team !== "ALL" && row[2] !== team) continue;
        customers.push({
          code: row[0],
          name: row[1],
          team: row[2],
          mde: row[3],
          phone: row[4],
          address: row[5],
          province: row[6],
          status: row[7],
          createdAt: row[8]
        });
      }
      return jsonResponse({ success: true, count: customers.length, data: customers });
    }

    return jsonResponse({ success: false, message: "Unknown action" });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * Handle HTTP POST Requests with Concurrency Lock
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    // Wait up to 10 seconds to prevent concurrent write collisions
    lock.waitLock(10000);

    let postData = {};
    if (e && e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    } else {
      return jsonResponse({ success: false, message: "No post data received" });
    }

    const action = postData.action;
    const payload = postData.payload || {};

    let result = { success: false, message: "Unknown action" };

    switch (action) {
      case "ADD_TRANSACTION":
        result = handleAddTransaction(payload);
        break;
      case "CANCEL_TRANSACTION":
        result = handleCancelTransaction(payload);
        break;
      case "NEW_CONTRACT_CYCLE":
        result = handleNewContractCycle(payload);
        break;
      case "UPDATE_BUDGET":
        result = handleUpdateBudget(payload);
        break;
      case "SYNC_BULK_DATA":
        result = handleBulkSync(payload);
        break;
      default:
        result = { success: false, message: "Unsupported action: " + action };
    }

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function handleAddTransaction(p) {
  const ss = getSpreadsheet();
  const txnSheet = ss.getSheetByName("BUDGET_TRANSACTIONS");
  const budgetSheet = ss.getSheetByName("BUDGETS");
  const logSheet = ss.getSheetByName("ACTIVITY_LOG");

  if (!txnSheet) return { success: false, message: "BUDGET_TRANSACTIONS sheet not found" };

  txnSheet.appendRow([
    p.id,
    p.date,
    p.customerCode,
    p.customerName,
    p.team,
    p.contractId,
    p.budgetId,
    p.category,
    p.description,
    p.amount,
    p.invoiceRef || "",
    p.createdBy,
    new Date(),
    "ACTIVE",
    ""
  ]);

  if (logSheet) {
    logSheet.appendRow([
      "LOG-" + Date.now(),
      new Date(),
      p.createdBy,
      "USER",
      p.team,
      "ADD_TRANSACTION",
      "Recorded " + p.amount + " for " + p.customerName + " (" + p.category + ")"
    ]);
  }

  return { success: true, message: "Transaction added successfully", id: p.id };
}

function handleCancelTransaction(p) {
  const ss = getSpreadsheet();
  const txnSheet = ss.getSheetByName("BUDGET_TRANSACTIONS");
  const logSheet = ss.getSheetByName("ACTIVITY_LOG");
  if (!txnSheet) return { success: false, message: "Sheet not found" };

  const data = txnSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(p.txnId)) {
      txnSheet.getRange(i + 1, 14).setValue("CANCELLED");
      txnSheet.getRange(i + 1, 15).setValue(p.reason || "Cancelled by user");
      
      if (logSheet) {
        logSheet.appendRow([
          "LOG-" + Date.now(),
          new Date(),
          p.cancelledBy || "user",
          "USER",
          p.team || "ALL",
          "CANCEL_TRANSACTION",
          "Cancelled transaction " + p.txnId + " - Reason: " + (p.reason || "None")
        ]);
      }
      return { success: true, message: "Transaction cancelled" };
    }
  }

  return { success: false, message: "Transaction ID not found" };
}

function handleNewContractCycle(p) {
  const ss = getSpreadsheet();
  const contractSheet = ss.getSheetByName("CONTRACTS");
  const budgetSheet = ss.getSheetByName("BUDGETS");
  const logSheet = ss.getSheetByName("ACTIVITY_LOG");

  if (!contractSheet || !budgetSheet) {
    return { success: false, message: "Required sheets not found" };
  }

  const contractId = "CNT-" + p.customerCode + "-" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd");
  const budgetId = "BDG-" + p.customerCode + "-" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd");

  contractSheet.appendRow([
    contractId,
    p.customerCode,
    p.customerName,
    p.team,
    p.commencingOn,
    p.expiringOn,
    p.cycleNumber || 2,
    "ACTIVE",
    p.notes || "New contract cycle",
    new Date()
  ]);

  budgetSheet.appendRow([
    budgetId,
    contractId,
    p.customerCode,
    p.team,
    p.annualAmount || 0,
    0,
    p.annualAmount || 0,
    0,
    "NORMAL",
    false,
    "",
    new Date()
  ]);

  if (logSheet) {
    logSheet.appendRow([
      "LOG-" + Date.now(),
      new Date(),
      p.createdBy || "admin",
      "ADMIN",
      p.team,
      "NEW_CONTRACT_CYCLE",
      "Created cycle for " + p.customerName + " with annual budget " + p.annualAmount
    ]);
  }

  return { success: true, message: "Contract cycle activated", contractId, budgetId };
}

function handleUpdateBudget(p) {
  const ss = getSpreadsheet();
  const budgetSheet = ss.getSheetByName("BUDGETS");
  if (!budgetSheet) return { success: false, message: "BUDGETS sheet not found" };

  const data = budgetSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(p.budgetId)) {
      budgetSheet.getRange(i + 1, 5).setValue(p.newAmount);
      const used = Number(data[i][5]) || 0;
      const rem = Number(p.newAmount) - used;
      budgetSheet.getRange(i + 1, 7).setValue(rem);
      budgetSheet.getRange(i + 1, 8).setValue(p.newAmount > 0 ? (used / p.newAmount) * 100 : 0);
      budgetSheet.getRange(i + 1, 12).setValue(new Date());
      return { success: true, message: "Budget updated" };
    }
  }

  return { success: false, message: "Budget ID not found" };
}


function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}


// Database initialization and optional legacy customer import: included in this file.
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
