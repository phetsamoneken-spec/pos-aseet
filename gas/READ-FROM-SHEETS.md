> Version 2026.11.01.15 archives old local edits to BROWSER_RECOVERY before loading authoritative data. See DATABASE-CONTINUITY.md for the prepared primary database migration and user-inclusive backups.

> Version 2026.11.01.13: normal add/delete/expense/budget forms save automatically through MUTATE_BUSINESS. Full Excel publication uses a server revision check. See [AUTO-SAVE.md](AUTO-SAVE.md).

> Admin-only import and shared settings: see [ADMIN-POLICY.md](ADMIN-POLICY.md). This release requires deploying the updated Code.gs.

# ໂຫຼດຂໍ້ມູນລູກຄ້າຈາກ Sheet ໃນເຄື່ອງອື່ນ — 2026.11.01.8

1. ເປີດ gas/Code.gs ຂອງສະບັບນີ້. ສຳຮອງ script ເກົ່າ ແລ້ວນຳໂຄດທັງໝົດແທນ Code.gs ໃນ Apps Script. ໃຊ້ໄຟລ໌ລວມນີ້ພຽງໄຟລ໌ດຽວ.
2. ກົດ Save. ເກັບ Script Properties ເດີມ SPREADSHEET_ID ແລະ INITIAL_ADMIN_PASSWORD ໄວ້. ຖ້າ Login ໄດ້ແລ້ວ ບໍ່ຈຳເປັນ Run initializeDatabase ຫຼືຕັ້ງລະຫັດໃໝ່.
3. Deploy → Manage deployments → ເລືອກ Web app ເດີມ → Edit (ຮູບດິນສໍ) → Version: New version → Deploy. Execute as: Me; Access: Anyone ຕາມນະໂຍບາຍບັນຊີ Google ຂອງທ່ານ. ແອັບກວດ session ແລະທີມຢູ່ backend ສຳລັບການອ່ານນີ້.
4. ໃຊ້ deployment ເດີມເພື່ອຮັກສາ URL /exec. ຖ້າສ້າງ URL ໃໝ່ ຕ້ອງປ່ຽນ configuration ຂອງແອັບດ້ວຍ.
5. ໃນເຄື່ອງອື່ນ ເປີດ https://phetsamoneken-spec.github.io/foc-support/ → Reload ສະບັບໃໝ່ → Logout/Login. ແອັບຈະໂຫຼດລູກຄ້າ, ເງື່ອນໄຂ, ສັນຍາ, ງົບປະມານ ແລະລາຍຈ່າຍຈາກ Sheet.
6. Admin ເຫັນທຸກທີມ. User ເຫັນສະເພາະທີມ B1–B7 ທີ່ລະບຸໃນ USERS. ປຸ່ມ “ໂຫຼດຈາກ Sheet” ດ້ານເທິງໜ້າໃຊ້ສຳລັບດຶງຂໍ້ມູນລ່າສຸດອີກຄັ້ງ.

## ຂໍ້ມູນທີ່ຍັງຢູ່ເຄື່ອງເກົ່າ

- ຖ້າຂໍ້ມູນຢູ່ໃນ Sheet ແລ້ວ ບໍ່ຕ້ອງ upload ຊ້ຳເພື່ອໂຫຼດໃນເຄື່ອງໃໝ່.
- ປຸ່ມເພີ່ມ/ລົບຮ້ານ ແລະບັນທຶກລາຍຈ່າຍສົ່ງໄປ Sheet ອັດຕະໂນມັດ. ເຄື່ອງອື່ນຮັບຂໍ້ມູນລ່າສຸດເມື່ອໂຫຼດຈາກ Sheet; ເບິ່ງ AUTO-SAVE.md.
- ຖ້າແອັບພົບການແກ້ໄຂທີ່ຍັງບໍ່ Sync ມັນຈະບໍ່ໂຫຼດຂໍ້ມູນໃໝ່ມາທັບອັດຕະໂນມັດ. ໃຫ້ Sync ກ່ອນ ຫຼືກົດໂຫຼດແບບຢືນຢັນ; ແອັບຈະດາວໂຫຼດ JSON ສຳຮອງຂໍ້ມູນເດີມກ່ອນແທນທີ່.
- ບໍ່ແມ່ນການ upload ທຸກການແກ້ໄຂແບບທັນທີ ຫຼືລະບົບແກ້ຂໍ້ຂັດແຍ່ງລະຫວ່າງຫຼາຍເຄື່ອງ. ຄວນ upload ແລະໂຫຼດຂໍ້ມູນລ່າສຸດກ່ອນເລີ່ມຮອບການແກ້ໄຂ.

## Validation

Mock Apps Script tests check session authorization, server-owned team scope, linked-table filtering, dates, numbers, headers and disabled public customer GET. Frontend tests check exact financial values, zero quantities, tombstones, persistence, unsynced-change protection, malformed responses and account/read races. Production-bundle DOM checks exercise independent browser contexts signing in and loading the same Sheet fixture. Actual Sheet reads still require verification after the owner deploys this Code.gs.
