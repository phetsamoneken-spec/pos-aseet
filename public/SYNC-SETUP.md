# User accounts: see [USER-ACCOUNTS.md](USER-ACCOUNTS.md) for private admin bootstrap and USERS synchronization.

# MKT Budget — Code.gs ໄຟລ໌ດຽວ

1. ເປີດ Spreadsheet ຂອງທ່ານ: https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit
2. Extensions → Apps Script. ສຳຮອງ script ເກົ່າກ່ອນ. ໃຊ້ Code.gs ໄຟລ໌ລວມນີ້ເທົ່ານັ້ນ; ຢ່າວາງ DatabaseSetup.gs ຫຼື CustomerImport.gs ຊ້ຳ ເພາະຟັງຊັນລວມໄວ້ແລ້ວ.
3. ເປີດ Apps Script → Project Settings (ຮູບເຟືອງ) → Script Properties → Add script property. ຊື່: SPREADSHEET_ID; ຄ່າ: ID ຈິງລະຫວ່າງ /d/ ແລະ /edit ໃນ URL ຂອງ Sheet. ເພີ່ມ INITIAL_ADMIN_PASSWORD ເປັນລະຫັດ Admin ທີ່ເລືອກເອງ (8–72 ຕົວອັກສອນ). ກົດ Save script properties. ຢ່າໃສ່ YOUR_SPREADSHEET_ID. Run initializeDatabase() ແລະອະນຸຍາດ Google ເມື່ອຖືກຮ້ອງຂໍ. ຟັງຊັນເດີມຈະສ້າງ 10 tabs ທີ່ຂາດ ແລະໃສ່ categories/users ເລີ່ມຕົ້ນໃນ tabs ທີ່ຫວ່າງ; ບໍ່ລຶບຂໍ້ມູນເກົ່າ.
4. Deploy → New deployment → Web app. Execute as: Me. Who has access: Anyone (ຖ້າອົງກອນອະນຸຍາດ). Copy URL ທີ່ລົງທ້າຍ /exec. ຖ້າໃຊ້ deployment ເກົ່າ: Manage deployments → Edit → New version → Deploy.
5. ເຂົ້າແອັບດ້ວຍ Admin → Settings → ວາງ Web App URL → Test → Save → Sync ໄປ Google Sheets.
6. ເມື່ອສຳເລັດຈະສະແດງຈຳນວນ records ທີ່ຂຽນ. ກວດ tabs CUSTOMERS, CUSTOMER_CONDITIONS, CONTRACTS, BUDGETS, BUDGET_TRANSACTIONS, ACTIVITY_LOG ແລະ SETTINGS ໃນ Sheet. ລອງ Sync ຊ້ຳ: ID ເກົ່າຄວນອັບເດດ ບໍ່ເພີ່ມແຖວຊ້ຳ.

## Behavior

- Manual one-way app → Sheets sync. Click Sync after saving changes in the app. This does not automatically sync each edit and does not read Sheet edits back into the app.
- Customers, conditions, all contract cycles, budgets, transactions (including cancellations), logs and saved app settings are sent. Passwords, sessions and browser authentication are not exported by bulk sync.
- Existing records are updated by ID; new IDs are appended. Rows missing from the app remain in the Sheet. This includes records deleted locally: sync is non-destructive and will not delete them remotely.
- Existing additional columns and formulas are retained. Duplicate IDs or an unexpected first-column header are rejected before business data is written.
- Last submitted values win for matching IDs. This is not conflict resolution between multiple devices. Do not use simultaneous independent app copies as a shared live database.
- A spreadsheet is not transactional across tabs. On a write failure, the response reports completed tabs and failure; retrying the same payload is safe by ID.
- The retained legacy ADD_TRANSACTION / CANCEL_TRANSACTION / NEW_CONTRACT_CYCLE / UPDATE_BUDGET endpoints remain available. The app uses SYNC_BULK_DATA for this manual workflow.
- User-account endpoints now require backend sign-in; legacy business-data endpoints retain their original authorization behavior. “Anyone” makes the endpoint writable by callers who have the URL. The app's Admin check is a browser UI check, not backend authorization; restrict the deployment and add server authentication before using this as a shared production database.

## Verification

The single-file backend was executed against in-memory Apps Script/Sheets mocks, including real row writes, repeat sync, retained rows/formulas, cancellation fields, duplicate rejection and partial failure/retry. Frontend payload and error handling were tested with mocked fetch. TypeScript and production build passed. No live Sheet or deployed Apps Script endpoint has been tested or modified by this task.
