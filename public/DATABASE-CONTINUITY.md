# Sheet ກາງ, ສຳຮອງ ແລະການແກ້ຂໍ້ມູນ — 2026.11.01.15

## ເປີດໃຊ້

1. ໃນ Apps Script project ເດີມ ສຳຮອງ Code.gs ເກົ່າ ແລ້ວນຳ Code.gs ຈາກ release ນີ້ແທນ → Save.
2. Deploy → Manage deployments → ເລືອກ deployment ເດີມ → Edit → New version → Deploy. ໃຊ້ URL ເດີມ ແລະເກັບ Script Properties ເດີມໄວ້. ບໍ່ຕ້ອງ Run initializeDatabase ຫຼື reset ລະຫັດ.
3. Reload ເວັບ ແລະ Login ໃໝ່ດ້ວຍລະຫັດເດີມ. ບັນຊີ User ແລະ password hash ຍ້າຍຄົບ; session ເຂົ້າໃຊ້ເກົ່າບໍ່ຍ້າຍ.

ເຈົ້າຂອງໄດ້ກຽມເສັ້ນທາງໃນ SETTINGS ຂອງ Sheet ເດີມ: primaryDatabaseId ແລະ databaseRouteState=PENDING. ID ເປັນຄ່າສ່ວນຕົວໃນ Sheet; ບໍ່ຢູ່ໃນ public Git. ເມື່ອ backend ໃໝ່ເລີ່ມເຮັດວຽກ ມັນຈະຄັດລອກຕາຕະລາງໃຊ້ງານຫຼ້າສຸດອີກຄັ້ງພາຍໃຕ້ script lock, ກວດຄ່າກັບຄືນ ແລ້ວໃຊ້ Sheet ໃໝ່ເປັນຖານຂໍ້ມູນດຽວ.

ຂໍ້ມູນທີ່ມີຢູ່ໃນ Sheet ປາຍທາງກ່ອນເປີດໃຊ້ຈະເກັບເປັນ PRE_CUTOVER_*. ການ Login ຂອງ deployment ເກົ່າທີ່ຍັງຂຽນໄປ Sheet ເດີມຈະຖືກປິດຫຼັງຈາກກວດວ່າຂໍ້ມູນ ແລະ User ຢູ່ Sheet ໃໝ່ຄົບແລ້ວ. ເປີດແອັບເວີຊັນຫຼ້າສຸດແລະ Login ໃໝ່; ລະຫັດເດີມຍັງໃຊ້ໄດ້.

## ການໃຊ້ງານ

- ເພີ່ມ, ແກ້ໄຂ ແລະລົບຮ້ານ ຈະລໍ Sheet ຢືນຢັນກ່ອນສະແດງວ່າສຳເລັດ. Admin ເຮັດໄດ້ທຸກທີມ; User ເຮັດໄດ້ສະເພາະທີມຂອງຕົນ.
- ປຸ່ມຮູບດິນສໍໃນ Customers ໃຊ້ແກ້ໄຂຂໍ້ມູນຮ້ານ. User ແກ້ຂໍ້ມູນຕິດຕໍ່ໄດ້; ເງື່ອນໄຂ, ຈຳນວນສິນຄ້າ ແລະງົບເປັນສິດ Admin.
- ເພີ່ມລາຍຈ່າຍ, ຍົກເລີກລາຍຈ່າຍ, ແກ້ງົບ ແລະຈັດການ User ບັນທຶກລົງ Sheet ໂດຍກົງ.
- ລົບຮ້ານ/ລົບ User ໃຊ້ Status=DELETED ພ້ອມ Deleted At. ບັນຊີທີ່ລົບ Login ບໍ່ໄດ້. ປະຫວັດສັນຍາ, ງົບ ແລະລາຍຈ່າຍຍັງຢູ່ໃນ Sheet ແລະສຳຮອງ.
- CHANGE_HISTORY ເກັບຜູ້ດຳເນີນການ, ເວລາ, ປະເພດການປ່ຽນແປງ ແລະຄ່າກ່ອນ/ຫຼັງ. ຕາຕະລາງໃຊ້ງານມີ Created At, Updated At, Deleted At ຫຼື Cancelled At ຕາມປະເພດຂໍ້ມູນ. ເວລາເກັບເປັນ ISO-8601; ໜ້າ User ສະແດງເວລາແກ້ໄຂຕາມ Asia/Bangkok.
- ຂໍ້ມູນໃນເຄື່ອງອື່ນຈະ refresh ເມື່ອ Login, ກັບມາໜ້າແອັບ ຫຼືກົດໂຫຼດຈາກ Sheet. User ເຫັນສະເພາະທີມທີ່ Admin ກຳນົດ.

## ສຳຮອງ

- INITIAL_* ແລະ BACKUP_*: ສຳຮອງຕອນຍ້າຍຂໍ້ມູນ ແລະສຳຮອງເກົ່າ.
- DATABASE_BACKUPS: ສຳຮອງຖານຂໍ້ມູນໃຊ້ງານ ລວມ USERS/password hashes ໃນການຂຽນຄັ້ງທຳອິດຂອງມື້. Admin ກົດ Settings → “ສຳຮອງຂໍ້ມູນທັງໝົດ ລວມ User” ເພື່ອສ້າງສຳຮອງເພີ່ມໄດ້.
- BROWSER_RECOVERY: ຂໍ້ມູນເກົ່າໃນ browser ທີ່ຍັງບໍ່ Sync. ແອັບຈະສຳຮອງມັນກ່ອນໂຫຼດຂໍ້ມູນຫຼ້າສຸດຈາກ Sheet; ຂໍ້ຄວາມ “Existing local edits need review” ຈະບໍ່ບລັອກການເພີ່ມ/ແກ້/ລົບອີກ. ມີປຸ່ມດາວໂຫຼດສຳຮອງເກົ່າໃນແອັບ.
- ການສຳຮອງລົ້ມເຫຼວຈະເກັບຂໍ້ມູນ browser ເດີມໄວ້. ຂໍ້ມູນເກົ່າທີ່ບໍ່ເຄີຍເຜີຍແຜ່ຢູ່ໃນ BROWSER_RECOVERY ໃຫ້ Admin ກວດ; ຍອດລາຍຈ່າຍເກົ່າບໍ່ຖືກຫັກຊ້ຳຈາກງົບໃຊ້ງານ.

Session credentials are excluded from database transfers and backups. Browser recovery includes safe account profiles; it omits plaintext passwords, password hashes and session tokens from browser payloads. The authoritative USERS table and its existing bcrypt hashes are retained in the private database and its database backups. They are never returned to regular app clients.

Backup JSON is split into checksum-protected, Unicode-safe chunks. Native Date values in full database snapshots use `{"$date":"ISO-8601 timestamp"}` so their type can be recovered when restoring. CHANGE_HISTORY retains individual before/after records between daily snapshots; APP_WRITES retains recoverable, idempotent mutation plans. Partial writes complete before later authenticated reads/writes. Stale full snapshots remain guarded by server revisions.

Tests include an actual Apps Script mock cutover into a separate spreadsheet, unchanged user hashes, fresh login, retirement of old writes, scoped browser recovery, failure retention, user deletion audit, customer editing and financial invariants. A production-bundle DOM flow reproduces the screenshot's dirty cache, then edits/adds/deletes through real doPost handlers against in-memory Sheet tables. The owner must install and deploy this Code.gs before live automatic writes and routing activate.
