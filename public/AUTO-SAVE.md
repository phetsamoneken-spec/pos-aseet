# ບັນທຶກແອັບ → Sheet ອັດຕະໂນມັດ — 2026.11.01.13

ການເພີ່ມຮ້ານ, ລົບຮ້ານ, ເພີ່ມລາຍຈ່າຍ, ຍົກເລີກລາຍຈ່າຍ, ເພີ່ມຮອບສັນຍາ ແລະປັບງົບປະມານ ຈະສົ່ງໄປ Google Sheet ຈາກປຸ່ມບັນທຶກໃນແອັບໂດຍກົງ. ບໍ່ຕ້ອງກົດ Admin Sync ສຳລັບລາຍການໃໝ່ເຫຼົ່ານີ້.

## ຕິດຕັ້ງໃຫ້ຄົບ

1. ສຳຮອງ Code.gs ເດີມ. ນຳ Code.gs ຈາກຊຸດນີ້ແທນໂຄດເກົ່າ ແລ້ວ Save. ເກັບ Script Properties ແລະລະຫັດເດີມໄວ້.
2. Deploy → Manage deployments → ເລືອກ deployment ເດີມ → Edit → New version → Deploy. ໃຊ້ /exec URL ເດີມ; ບໍ່ຕ້ອງ Run initializeDatabase ຫຼືລ້າງ Sheet.
3. Reload ແອັບ ແລະ Login. ການບັນທຶກຈະສະແດງວ່າສຳເລັດຫຼັງ Sheet ຢືນຢັນແລ້ວ.
4. ຖ້າເນັດຂາດ ຫຼືການສົ່ງບໍ່ສຳເລັດ ແບບຟອມຈະສະແດງຂໍ້ຜິດພາດ. ກົດບັນທຶກຊ້ຳດ້ວຍຂໍ້ມູນເດີມ ຫຼືກົດ “ລອງບັນທຶກຊ້ຳ” ໃນໜ້າແອັບ. ລາຍການທີ່ຄ້າງຖືກເກັບໄວ້ຕາມບັນຊີ/URL ແລະລອງສົ່ງເມື່ອ Login, ກັບມາໜ້າແອັບ ຫຼືເນັດກັບຄືນ. ການສົ່ງຊ້ຳບໍ່ສ້າງຮ້ານ/ລາຍຈ່າຍຊ້ຳ.
5. ເຄື່ອງອື່ນຈະເຫັນຂໍ້ມູນໃໝ່ເມື່ອ Login, ກັບມາໜ້າແອັບ ຫຼືກົດ “ໂຫຼດຈາກ Sheet”. ບໍ່ແມ່ນການ push ທຸກວິນາທີ.

## ສິດ ແລະການລົບ

- Admin ເພີ່ມ/ລົບຮ້ານໄດ້ທຸກທີມ. User ເຮັດໄດ້ສະເພາະທີມທີ່ກຳນົດໃນ USERS.
- ລົບຮ້ານ = ປ່ຽນ Status ໃນ CUSTOMERS ເປັນ DELETED ແລະຖອນອອກຈາກລາຍຊື່ໃນແອັບ. ແຖວປະຫວັດສັນຍາ, ງົບປະມານ ແລະລາຍຈ່າຍບໍ່ຖືກລຶບ. “ລົບທັງໝົດ” ຂອງ Admin ໃຊ້ຫຼັກການດຽວກັນ.
- ຍົກເລີກລາຍຈ່າຍ = ປ່ຽນ Status ເປັນ CANCELLED ພ້ອມເຫດຜົນ/ຜູ້ຍົກເລີກ ແລະຄືນງົບໃຫ້ຮອບປີເດີມ.
- ອັບໂຫຼດ Excel, Settings, ປັບງົບ, ປ່ຽນລາຄາ, ເພີ່ມຮອບສັນຍາ ແລະລົບທັງໝົດຍັງເປັນສິດ Admin.

## Existing local edits and full publication

Normal forms are acknowledgement-first: they do not add an optimistic local record while the Sheet save is pending. A durable per-account operation ID makes retries safe after a lost response or Reload. Only one outstanding operation per account/browser is submitted at a time; a definitely rejected validation error allows correcting the form. Uncertain requests remain available for retry. Browser storage must be enabled.

Old edits made by previous app versions remain local until reviewed. They are not silently replaced or uploaded as a whole database. Back up those edits before loading current Sheet data. Excel remains an Admin full-publication workflow; full publication now requires the revision of the Sheet snapshot originally loaded. If another device or a direct Sheet edit changes the business records, a stale full snapshot is rejected and local data is retained for review. A cache from a release that did not record a server revision must first be backed up and reconciled with the current Sheet.

## Backend details

MUTATE_BUSINESS authenticates the session against USERS and uses the current Sheet rows and annual budget rules under the script lock. Caller-supplied roles, createdBy, balances and team assignments do not grant permissions. Team-created allowances use the Admin's shared crate price. New contract cycles cannot overlap existing cycles.

APP_WRITES is created automatically. It stores server-generated row plans and operation receipts, split into checksum-protected chunks. A partially applied write is completed by replaying its absolute upserts before a later business read/write. A completed operation is acknowledged without applying it again. This retains balance accuracy after timeouts and partial multi-table writes. Keep this tab with the database; it is part of write recovery and duplicate prevention. ACTIVITY_LOG records the actual account and action.

Tests execute the actual Apps Script doPost against an in-memory Sheets implementation, and the storage service against that same backend. Coverage includes team/admin enforcement, shared writes, two writers, validation failures, lost responses, Reload retries, partial-write recovery, stale full snapshots, account switches and retained financial history. A production-bundle DOM flow exercises Admin store creation, an independent Team expense/delete, and Sheet refresh on the other browser. Live deployment still requires the owner to install and deploy this Code.gs.
