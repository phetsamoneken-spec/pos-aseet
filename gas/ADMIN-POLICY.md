# Admin control and shared configuration — 2026.11.01.10

## ຕິດຕັ້ງ

1. ສຳຮອງ script ເດີມ. ນຳ Code.gs ໃນຊຸດນີ້ແທນ Code.gs ເກົ່າໃນ Apps Script ແລ້ວ Save. ເກັບ Script Properties ເດີມໄວ້; ບໍ່ຕ້ອງຕັ້ງລະຫັດ Admin ໃໝ່.
2. Deploy → Manage deployments → ເລືອກ deployment ເດີມ → Edit → New version → Deploy. ໃຊ້ URL /exec ເດີມ.
3. ເປີດ FOC Support ແລ້ວ Reload. ເຂົ້າດ້ວຍ Admin → Settings → ເລືອກຄ່າ ແລະຮູບແບບສີ → ບັນທຶກ. ແອັບຈະບັນທຶກຄ່າກາງໄປ Sheet ດ້ວຍ SAVE_SHARED_SETTINGS.
4. Admin ອັບໂຫຼດ Excel ໃນ Customers ໄດ້. ຫຼັງນຳເຂົ້າແລ້ວແອັບຈະເຜີຍແຜ່ໄປ Sheet ອັດຕະໂນມັດ. ຖ້າລົ້ມເຫຼວຈະສະແດງວ່າຍັງບໍ່ເຜີຍແຜ່ ແລະໃຫ້ລອງສົ່ງຊ້ຳ; ບໍ່ນຳເຂົ້າຊ້ຳເມື່ອກົດ retry.
5. User ເຂົ້າຜ່ານລິ້ງແອັບເດີມ ແລ້ວ Login. User ເຫັນແຕ່ທີມທີ່ Admin ກຳນົດໃນ USERS; ບໍ່ມີ Upload Excel, Settings, ປຸ່ມເປີດ Sheet ຫຼືປຸ່ມປ່ຽນພາສາກາງ. ຄ່າເງິນ, ລາຄາ, ແຈ້ງເຕືອນ, ພາສາ ແລະສີມາຈາກຄ່າ Admin ໃນ Sheet.
6. ຂໍ້ມູນຈະໂຫຼດເມື່ອ Login, ກັບມາໜ້າແອັບ ຫຼືກົດ “ໂຫຼດຈາກ Sheet”. ຖ້າມີການແກ້ໄຂລູກຄ້າ/ລາຍຈ່າຍທີ່ຍັງບໍ່ Sync, ແອັບຈະເກັບຂໍ້ມູນນັ້ນໄວ້ ແລະໂຫຼດສະເພາະຄ່າກາງ/ສິດທີມກ່ອນ. ການແກ້ຮ້ານ ແລະລາຍຈ່າຍທົ່ວໄປຍັງໃຊ້ Admin Sync ຈາກ browser ທີ່ມີການແກ້ໄຂ.

The published app pins its deployment-owned backend on every device. The URL is read-only in production Settings; source changes use src/config/backend.ts and an app deployment. Per-browser overrides remain available only in local development.

## Enforcement and data integrity

- Import and configuration checks exist in the UI, the browser data service, and the backend publication API. Hiding the controls is not the authorization boundary.
- SYNC_BULK_DATA and SAVE_SHARED_SETTINGS require a valid session belonging to an active Admin. A caller-provided role is ignored. The legacy transaction endpoints now require a session and enforce the stored team; legacy budget/contract administration requires Admin.
- GET_BUSINESS_DATA and GET_SHARED_SETTINGS return only allowlisted common settings and the authenticated account's current role/team. They do not return passwords, session tokens, or a caller-controlled backend URL inside common settings.
- Master replacement validates the file before changing data. Stores absent from the file are archived; existing contracts, budgets, transactions, and spending totals are retained. Updated quantities recalculate the current budget without resetting spending. Existing deletion flags remain in place.
- Settings are common to all devices only after successful publication. Admin's unsaved draft settings are retained locally and are not presented as published on errors.
- This is shared Sheet snapshots with explicit publication, not a live per-keystroke database or a conflict-resolution system. Existing local business edits are protected from automatic replacement.

Tests cover direct unauthorized import/settings calls, authenticated backend rejection, successful Admin publication, retained financial history, scoped reads and configuration, updated account assignment, and a production-bundle DOM flow with independent Admin/User browsers. Real backend enforcement requires deploying this Code.gs.
