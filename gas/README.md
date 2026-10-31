# MKT Customer Budget Management - Google Apps Script & Deployment Guide

Spreadsheet ID: `YOUR_SPREADSHEET_ID`  
Target Teams: `B1, B2, B3, B4, B5, B6, B7`  
Hosting: GitHub Pages & AI Studio PWA  

---

## 1. Database Architecture (10 Sheets)

1. **CUSTOMERS**: Customer Code (Unique PK), Customer Name, Team (B1-B7), MDE (MDE-B1..B7), Phone, Address, Province, Status, Created At.
2. **CUSTOMER_CONDITIONS**: ID, Customer Code (FK), Condition Quantity, Condition UOM, Product Description, Updated At.
3. **CONTRACTS**: Contract ID (Unique PK), Customer Code (FK), Customer Name, Team, Commencing On, Expiring On, Cycle Number, Status, Notes, Created At.
4. **BUDGETS**: Budget ID (Unique PK), Contract ID (FK), Customer Code, Team, Annual Amount, Total Used, Remaining Amount, Utilization (%), Status, Allow Exception, Exception Reason, Updated At.
5. **BUDGET_TRANSACTIONS**: Transaction ID (Unique PK), Date, Customer Code, Customer Name, Team, Contract ID, Budget ID, Category, Description, Amount, Invoice Ref, Created By, Created At, Status, Cancellation Reason.
6. **USERS**: User ID, Username, Password Hash, Full Name, Email, Role (ADMIN / TEAM_USER), Assigned Team (ALL or B1-B7), Is Active, Created At, Last Login.
7. **CATEGORIES**: Category ID, Name Lao, Name English, Code, Description.
8. **ACTIVITY_LOG**: Log ID, Timestamp, User, Role, Team, Action, Details.
9. **SETTINGS**: Setting Key, Setting Value, Description, Updated At.
10. **SESSIONS**: Session ID, Username, Token, Expires At, Created At.

---

## 2. Google Apps Script Deployment Steps

1. Open Google Spreadsheet `https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit`.
2. In the top menu, go to **Extensions** > **Apps Script**.
3. Paste only the unified `gas/Code.gs`. It includes initialization and optional import functions. Do not also paste the separate legacy files. See [SYNC-SETUP.md](SYNC-SETUP.md) for the complete manual sync workflow.
4. In the Apps Script toolbar, select function `initializeDatabase` and click **Run**. Grant standard Google permissions.
   - This automatically initializes all 10 sheets with exact headers, frozen top rows, and corporate dark navy styling.
5. Next, run function `importExistingCustomerData()` to import all raw customer records and link them to their initial contract cycle and budget.
6. Deploy the Web App:
   - Click the blue **Deploy** button (top right) > **New deployment**.
   - Select type: **Web app**.
   - Description: `MKT Budget Management v1`.
   - **Execute as**: `Me` (your account).
   - **Who has access**: `Anyone`.
   - Click **Deploy**.
   - Copy the Web App URL (e.g. `https://script.google.com/macros/s/.../exec`).
7. In the MKT Budget Management web app, go to **Settings (ຕັ້ງຄ່າລະບົບ)**, paste the Web App URL into the field, and click **Test Connection (ທົດສອບ)**.

---

## 3. GitHub Pages Deployment Steps

1. Build static assets:
   ```bash
   npm run build
   ```
2. The `dist/` directory contains standard static files, `index.html`, PWA `manifest.json`, and service worker.
3. Push to your GitHub repository and enable GitHub Pages on the `main` or `gh-pages` branch.
4. Set custom domain or access via `https://<username>.github.io/<repo>/`.

---

## 4. Role-Based Access Control (RBAC) Testing

| User | Username | Password | Role | Team Permission |
|------|----------|----------|------|-----------------|
| Admin | `admin` | `CHANGE_ME_ADMIN_PASSWORD` | `ADMIN` | Full access across all teams B1-B7, budget adjustments, user accounts, and exception overrides |
| Team B1 | `b1_user` | `CHANGE_ME_TEAM_B1_PASSWORD` | `TEAM_USER` | Restricted strictly to Team B1 customers and transactions |
| Team B2 | `b2_user` | `CHANGE_ME_TEAM_B2_PASSWORD` | `TEAM_USER` | Restricted strictly to Team B2 customers and transactions |
| Team B3 | `b3_user` | `CHANGE_ME_TEAM_B3_PASSWORD` | `TEAM_USER` | Restricted strictly to Team B3 customers and transactions |
| Team B4 | `b4_user` | `CHANGE_ME_TEAM_B4_PASSWORD` | `TEAM_USER` | Restricted strictly to Team B4 customers and transactions |
| Team B5 | `b5_user` | `CHANGE_ME_TEAM_B5_PASSWORD` | `TEAM_USER` | Restricted strictly to Team B5 customers and transactions |
| Team B6 | `b6_user` | `CHANGE_ME_TEAM_B6_PASSWORD` | `TEAM_USER` | Restricted strictly to Team B6 customers and transactions |
| Team B7 | `b7_user` | `CHANGE_ME_TEAM_B7_PASSWORD` | `TEAM_USER` | Restricted strictly to Team B7 customers and transactions |

---

## 5. Contract Cycle & Budget Verification

- Budget calculations follow:
  $$\text{Remaining Budget} = \text{Annual Budget Amount} - \text{Total Used}$$
  $$\text{Utilization Percentage} = \frac{\text{Total Used}}{\text{Annual Budget Amount}} \times 100\%$$
- Warning status flags:
  - `< 80%`: Normal (Green / Emerald)
  - `80% - 99%`: Warning threshold (Amber / Orange)
  - `100%`: Full budget reached (Red / Rose)
  - `> 100%`: Over-budget (Blocked without Admin override)
- When renewing contract for a new period, Cycle 2 is created with new Commencing/Expiring dates and new budget while Cycle 1 and historical transactions remain completely preserved.
