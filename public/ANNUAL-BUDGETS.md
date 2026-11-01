# ງົບປະມານຕາມວັນຄົບຮອບສັນຍາ — 2026.11.01.11

ງົບປະມານແຍກເປັນປີຕາມວັນເລີ່ມສັນຍາ; ບໍ່ນັບຕາມວັນທີ 1 ມັງກອນ. ຕົວຢ່າງ ສັນຍາ 19/05/2025–18/05/2028:

- ປີ 1: 19/05/2025–18/05/2026
- ປີ 2: 19/05/2026–18/05/2027
- ປີ 3: 19/05/2027–18/05/2028

ແຕ່ລະປີໄດ້ງົບເຕັມຕາມຈຳນວນປະຈຳປີທີ່ Admin ກຳນົດ. ບໍ່ຍົກຍອດເຫຼືອ ຫຼືຍອດໃຊ້ຂ້າມປີ. ປະຫວັດລາຍຈ່າຍຍັງຢູ່ຄົບ. ຖ້າມີລາຍຈ່າຍລົງວັນທີໃນປີໃໝ່ແລ້ວ ຍອດນັ້ນຈະຫັກຈາກງົບປີໃໝ່.

ໃຊ້ວັນທີຕາມເວລາລາວ (UTC+7) ໃນທຸກເຄື່ອງ. ແອັບທີ່ເປີດຄ້າງຈະກວດວັນໃໝ່ທຸກ 30 ວິນາທີ ແລະເມື່ອກັບມາໜ້າແອັບ. ຖ້າເລີ່ມວັນທີ 29 ກຸມພາ ປີທີ່ບໍ່ມີວັນທີນີ້ຈະໃຊ້ 28 ກຸມພາ; ປີອະທິກະສຸລະທິນຖັດໄປກັບຄືນ 29 ກຸມພາ. ຮອບສຸດທ້າຍບໍ່ເກີນວັນສິ້ນສຸດສັນຍາ.

## ອັບເດດ Apps Script

1. ສຳຮອງ Code.gs ເກົ່າ ແລ້ວນຳ Code.gs ຈາກ release ນີ້ແທນ ແລະ Save. ເກັບ Script Properties ແລະລະຫັດເດີມ.
2. Deploy → Manage deployments → Edit deployment ເດີມ → New version → Deploy. ໃຊ້ /exec URL ເດີມ. ບໍ່ຕ້ອງ Run initializeDatabase ຫຼືລ້າງ Sheet.
3. Reload ແອັບ → Login. ຂໍ້ມູນທີ່ໂຫຼດຈະຄິດແຍກຕາມຮອບປີ. ຂໍ້ມູນໃນ browser ທີ່ຍັງບໍ່ Sync ຍັງເກັບໄວ້ຕາມລະບົບເດີມ.
4. Admin Sync ເພື່ອບັນທຶກຮອບປີລົງ BUDGETS. ແອັບຈະເພີ່ມ Budget Year, Period Start, Period End, Legacy Undated Used ໂດຍບໍ່ລົບແຖວເກົ່າ. ເບິ່ງຮ້ານ → Contract Cycles ເພື່ອກວດຍອດແຕ່ລະປີ.

## Migration and accounting details

- This is annual budget renewal within the existing contract. Contract start/end dates and contract cycle numbers remain unchanged.
- The first annual budget retains its original ID. Later years use deterministic IDs such as BDG-STORE-01-Y2, so repeated reads and syncs do not duplicate years.
- Existing dated transactions are assigned by their transaction date, retaining their IDs and status. Cancelled transactions remain in history and do not count as used. Backdated transactions and cancellations affect their original annual year.
- Legacy total spending that has no matching dated transactions is retained in the first annual budget as Legacy Undated Used. It is never silently discarded or carried into the new year. Admin should review undated historical spending if a more precise allocation is required.
- Current dashboard/customer/report budget totals count one current annual budget per customer's selected contract. Detailed transaction reports and the annual-history table retain previous years.
- Annual periods are derived consistently on the browser and on authenticated backend reads. A read does not modify Sheet cells. New annual rows are persisted by Admin Sync or an authenticated transaction write; no scheduled trigger or open Admin browser is required to display the correct year.
- New web transaction writes select and validate the annual budget by date and retain account/team enforcement. Full browser-to-Sheet snapshots still require Admin. Regular local edits retain the existing explicit Sync workflow.
- Updating the current annual allowance or the master quantity also updates future annual allowances within that contract; historical annual allowances and spending are retained.
