# User accounts stored in Google Sheets

## ຕິດຕັ້ງ

1. ດາວໂຫຼດ Code.gs ສະບັບໃໝ່ ແລ້ວໃຊ້ພຽງໄຟລ໌ລວມນີ້ໃນ Apps Script. ສຳຮອງ script ເກົ່າກ່ອນ.
2. Apps Script → Project Settings → Script Properties: ຕັ້ງ SPREADSHEET_ID ເປັນ ID ຂອງ Sheet ແລະ INITIAL_ADMIN_PASSWORD ເປັນລະຫັດ Admin ທີ່ທ່ານເລືອກເອງ (8–72 ຕົວອັກສອນ, ບໍ່ເກີນ 72 UTF-8 bytes). ຢ່າເອົາລະຫັດນີ້ຂຶ້ນ GitHub.
3. Run initializeDatabase(). ສ້າງ admin ໃນ USERS ຖ້າຍັງບໍ່ມີ; ປ່ຽນລະຫັດຂໍ້ຄວາມເດີມໃນ USERS ເປັນ bcrypt hash. ບັນຊີຕົວຢ່າງ CHANGE_ME ທີ່ບໍ່ແມ່ນ Admin ຈະຖືກປິດ ຈົນກວ່າ Admin ຈະຕັ້ງລະຫັດໃໝ່.
4. Deploy → Manage deployments → Edit → New version → Deploy. ໃຊ້ URL /exec ໃນແອັບ.
5. ເວັບ FOC Support ທີ່ publish ແລ້ວໃຊ້ backend ຮ່ວມອັດຕະໂນມັດ. ໃນໜ້າ Login ໃສ່ພຽງ username ແລະລະຫັດຂອງບັນຊີໃນ Sheet. Admin ສາມາດປ່ຽນ URL ໃນ Settings ໄດ້ ຖ້າໃຊ້ deployment ອື່ນ. ຜູ້ທີ່ນຳ source ໄປ deploy ເອງໃຫ້ຕັ້ງ src/config/backend.ts ເປັນ backend ຂອງຕົນ.
6. ກົດ Sync Users → Sheet ເພື່ອຍ້າຍ User ທີ່ເຄີຍບັນທຶກໃນ browser ໄປ USERS. ບັນຊີທີ່ຍັງໃຊ້ CHANGE_ME ຈະຖືກຂ້າມ. ລະຫັດສຳລັບບັນຊີໃໝ່ຕ້ອງມີ 8–72 ຕົວອັກສອນ.
7. ຫຼັງຈາກນັ້ນ Add/Edit/Reset Password/Enable/Disable/Delete ໃນ Users ຈະບັນທຶກຜ່ານ backend ໂດຍກົງ. Load Users from Sheet ໃຊ້ໂຫຼດລາຍຊື່ໃນ Sheet.

## What is stored

- USERS: user ID, username, **bcrypt password hash** (cost 10, unique random salt), name, email, role, team, active flag, creation time, last login.
- SESSIONS: only SHA-256 digests of random session tokens; sessions expire after four hours. A password change, disabled account, or deleted account invalidates its prior sessions.
- Login and user administration are checked server-side. A caller-provided role is not authorization. Admins manage accounts; a signed-in user can edit their own profile/password without changing role or team.
- Passwords and hashes are never returned by the users API. Remote cached user records contain no newly entered plaintext password. The original local-only mode remains available when no Apps Script URL is configured.
- Legacy browser passwords are sent only in the authenticated migration request and hashed by the server. After successful migration the cached user list is replaced with password-free records. Never edit the Password Hash column manually.
- User account sync is separate from the existing business-data Sync button. Account changes are saved directly after backend sign-in.
- On another device, open the same published FOC Support app and use the Sheet account credentials. The production build supplies the shared backend automatically, with no URL field on Sign In. Business data is still browser-local; this change does not implement importing budgets/customers from Sheets.
- This adds server authentication to **user-account endpoints**. Existing legacy business-data endpoints retain their prior behavior; it is not a complete authorization audit of the entire backend.

## Verification

Mock Apps Script/Sheets tests exercise password hashing, login failures, role checks, migration, independent login, password reset/session invalidation, disabling and deleting users. Frontend tests exercise login/session handling and remote user mutations. A live Apps Script deployment and actual Sheet writes still need verification after installation.

bcryptjs 3.0.3 is embedded in Code.gs, with its BSD license included. Only synchronous APIs are used in Apps Script.
