# Prompt: Build "Tommy Market" – Sales, Inventory, Credit & Transfer Verification App

You are a senior full-stack engineer. Build a production-ready web app for a small food shop in Ethiopia that sells meat, fish and dairy **by kg or by piece**. Follow this document exactly. If something is ambiguous, choose the simplest option that keeps money and stock numbers correct, and write the assumption in `DECISIONS.md`.

The Prisma schema is in `schema.prisma` (attached). Use it as the source of truth. Do not redesign it without a written reason; small additions are allowed.

---

## 1. Business context

- A salesperson (role `SALES`) sells in the shop all day. The owner (role `ADMIN`) is usually not present.
- Today the salesperson sends a daily chat message like:
  ```
  10/02/2019
  Ambaza 4.7kg×700
  Chekin 5.6kg×1050
  Cheese 3.7kg×850
  Total cash 4,850
  Total transfer 12,920
  Total daily birr 17,770
  ```
  plus photos of transfer receipts. Totals are typed by hand, item names are spelled differently each time, prices change over time, and stock is not tracked. The app replaces this.
- Payments: **cash**, **bank transfer** (CBE, Telebirr, Awash, etc.) and **credit** (customer pays later).
- Dates are used in the **Ethiopian calendar** (e.g. 10/02/2019). Store real `Date` values in the database and **display Ethiopian dates by default**, with a toggle for Gregorian. Use a small tested conversion utility in `lib/ethiopian-date.ts` and add unit tests for it.
- Currency is Ethiopian birr (ETB). Quantities can be decimals (0.3 kg, 4.7 kg).

## 2. Tech stack (use only this)

- **Next.js 15** (App Router, TypeScript strict, Server Actions + Route Handlers)
- **Prisma** ORM with **Supabase Postgres**
  - `DATABASE_URL` = pooled connection (port 6543, `pgbouncer=true`), `DIRECT_URL` = direct connection for migrations
- **Supabase Auth** (email/password; log users in with a **username** by mapping it to `username@tommy.local`; no SMS provider needed)
- **Supabase Storage** (private bucket `transfer-screenshots` and private bucket `reports`; always serve with short-lived signed URLs)
- UI: Tailwind CSS + shadcn/ui, lucide-react icons, Recharts for charts
- Forms: react-hook-form + zod (share zod schemas between client and server)
- PDF: **@react-pdf/renderer** on the server (works on serverless; embed the **Noto Sans Ethiopic** font so Amharic prints correctly)
- Offline: PWA (manifest + service worker) with a local queue for new sales (IndexedDB via `idb`), synced with the `clientId` idempotency key
- No other backend, no other database, no extra paid services.

## 3. Roles and permissions (enforce on the SERVER, never only in the UI)

| Action | SALES | ADMIN |
|---|---|---|
| Create a sale (cash / transfer / credit / split) | yes | yes |
| Upload transfer screenshot and reference | yes | yes |
| Verify or reject a transfer | no | yes |
| View current stock (quantities) | yes | yes |
| View cost price, profit, supplier data | **no** | yes |
| Record purchases, waste, adjustments, stock counts | no | yes |
| Record expenses | no | yes |
| Void a sale | no | yes (reason required) |
| Edit anything on a closed day | no | yes (reopen, audit-logged) |
| Manage items, prices, customers, users | no | yes |
| Record a customer debt payment | yes | yes |
| Close the day | yes (submit) | yes (final close) |

Create a `requireRole()` helper used by every server action and route handler. Hide cost/profit fields in server queries for SALES (do not just hide them in the UI). Because Prisma connects directly and bypasses Supabase RLS, authorization lives in this server layer. Also enable RLS with deny-all on tables for the public API so the anon key cannot read anything.

## 4. Core business rules (must be exact)

**Money and quantity**
- Use `Decimal` everywhere (Prisma Decimal / decimal.js). Never use JS floating point for money or kg.
- All stock, sale, payment and closing writes happen inside a single `prisma.$transaction`.

**Sales**
1. A sale has line items (`item`, `qty`, `unitPrice`). `unitPrice` defaults to the item's current `sellPrice` and may be changed per sale by the user (store what was used).
2. On save, copy the item's current `avgCost` into `SaleItem.unitCost` (profit is then fixed forever).
3. Create one `StockMovement(type=SALE, qty=-qty)` per line and update `Item.stockQty` in the same transaction.
4. Block a sale if `qty > stockQty` for an item, unless the user is ADMIN or a setting `allowNegativeStock` is on. Show a clear warning.
5. Payments for a sale: any split of cash + transfer + the remainder as **credit**. `sale.balanceDue = total - sum(payments)`. If `balanceDue > 0`, a `customerId` is **required** (walk-in customers cannot take credit).
6. Credit limit: if `customer outstanding + this balanceDue > creditLimit`, block unless ADMIN overrides. If the customer has any unpaid sale older than `maxDebtDays`, block new credit unless ADMIN overrides.
7. Voiding a sale (ADMIN only): set status `VOIDED`, create `SALE_VOID` movements to restore stock, reverse its balance, keep all rows, write an audit log. Never hard-delete sales, payments or movements.
8. `clientId` (UUID created on the device) makes offline sync idempotent: sending the same sale twice must not create two sales.

**Transfers**
1. A transfer payment requires: amount, bank, reference number, screenshot. Set `verifyStatus=PENDING`.
2. Reject on save if `(bankName, reference)` already exists, or if the SHA-256 hash of the image already exists (`imageHash`). Show who used it and when.
3. ADMIN sees a **Transfers queue**: screenshot on one side, entered details on the other, buttons Verify / Reject (reason required). Support bulk verify.
4. Only `VERIFIED` transfers count as confirmed revenue. `PENDING` transfers are shown separately and flagged in every report. `REJECTED` transfers turn the amount back into credit/unpaid and notify the admin on the dashboard.
5. Phase 2 (optional, keep the code ready for it): OCR on screenshots to prefill amount and reference. A human check stays the final authority.

**Credit and debt payments**
1. Customer balance is always **calculated** (sum of `balanceDue` of non-voided sales), never typed.
2. A debt payment (`Payment.kind=DEBT`, method cash or transfer, transfer follows the same verification flow) is allocated to the oldest unpaid sales first by default, or to sales chosen by the user. Write `PaymentAllocation` rows and reduce each sale's `balanceDue` / increase `paidAmount`. A pending transfer does not reduce the balance until it is verified.
3. ADMIN can write off bad debt (reason required, audit-logged).

**Inventory**
- Stock only changes through `StockMovement` rows. `Item.stockQty` is a cache; add a script/route `npm run stock:reconcile` that recomputes it from movements and reports differences.
- Purchase (ADMIN): creates `Purchase` + `PurchaseItem` + `PURCHASE` movements. Update `avgCost` with the **weighted average**:
  `newAvg = (oldQty*oldAvg + inQty*inCost) / (oldQty + inQty)` (if `oldQty <= 0`, `newAvg = inCost`).
- Waste (ADMIN): `WASTE` movement with a required reason (spoiled, trimmed, sample, other).
- Stock count (ADMIN): enter counted qty per item, show the difference, on apply create `COUNT_ADJUSTMENT` movements.
- Low-stock alert when `stockQty <= lowStockLevel`.

**Profit**
- Gross profit of a sale = `sum(qty * (unitPrice - unitCost))`. Net profit for a period = gross profit - expenses. Count only non-voided sales. Credit sales count as revenue/profit when sold, but **not** as cash received.

**Daily closing**
1. Expected cash = cash received (sales + debt payments) - cash expenses.
2. SALES enters counted cash and submits; the difference is shown and flagged if not zero.
3. ADMIN does the final close. Closing saves a snapshot into `DailyClosing` and generates the PDF reports (see section 6). A closed day is locked for SALES. ADMIN can reopen (reason required, audit-logged); a new close creates a new `pdfVersion` and keeps the old files.

**Audit log**
- Write `AuditLog` for: sale void, price change, any edit after close, transfer verify/reject, debt write-off, stock adjustment, purchase edits, user role changes, day close/reopen. Store `before` and `after` JSON.

## 5. Screens

**Sales app (mobile-first, big touch targets, works offline)**
- **Today**: totals so far (cash, transfer, credit), "New sale" button, list of today's sales, sync status badge.
- **New sale**: searchable item tiles, numeric keypad for kg, price auto-filled and editable, running total in a sticky bottom bar. Payment step with big buttons **Cash / Transfer / Credit / Split**. Transfer step asks for bank, reference, screenshot (camera or gallery, compressed client-side). Credit step picks or creates a customer.
- **Stock**: current quantities and low-stock marks (no cost).
- **Customers**: balances and a "Receive payment" button.
- **End of day**: counted cash, submit the day.

**Admin (responsive, desktop-optimized)**
- **Dashboard**: today vs yesterday, 7/30-day sales chart, cash vs transfer vs credit split, gross profit, top and slow items, and **action cards**: pending transfers, overdue credit, low stock, days not closed.
- **Transfers queue** (see rules above).
- **Sales**: filter by date (Ethiopian calendar picker), user, item, payment type, customer; open a sale to see items, payments, audit trail; void.
- **Inventory**: stock list, purchases, waste, stock counts, movement history per item.
- **Customers**: balances, aging buckets (0-7, 8-15, 16-30, 30+ days), statement PDF, collect payment.
- **Expenses**.
- **Reports**: daily / weekly / monthly, profit by item, waste report, stock value, export to PDF and Excel (xlsx).
- **Items & prices**: edit price (creates `PriceHistory`), unit, low-stock level, active flag.
- **Users**: create sales users, reset password, deactivate.
- **Audit log** viewer.
- Light and dark mode, English UI with Amharic item labels (`nameAm`), Ethiopian date by default.

## 6. PDF reports (downloadable)

Generate with `@react-pdf/renderer` on the server, store in the private `reports` bucket, and return a signed download URL. Provide a **Download PDF** button on the closed-day screen and a list of all past reports.

**Admin PDF (A4, one or two pages):**
1. Header: shop name, date (Ethiopian, Gregorian in small text), prepared by, status (CLOSED, or a "N transfers pending" warning).
2. Summary cards: Total daily birr, Cash, Transfer verified, Transfer pending, Credit given, Debt collected, Gross profit.
3. Sales table: item, qty, unit price, amount, with a subtotal per item and a grand total (same layout the owner is used to).
4. Payment breakdown chart (cash / transfer / credit).
5. Transfers list: bank, reference, amount, status (verified / pending / rejected).
6. Credit: customers who took credit today, customers who paid.
7. Cash check: expected, counted, difference.
8. Stock: low-stock items and waste of the day.
9. Profit by item and margin.
10. Footer: report ID, version, generated time, QR code linking to the day in the app.

**Sales PDF:** same but **without cost, profit and margin**.

Also: weekly and monthly PDF with trend charts (same template components), and a **customer statement PDF** (date, items, amount, paid, balance).

## 7. Project structure

```
app/
  (auth)/login
  (sales)/today, sales/new, stock, customers, end-of-day
  (admin)/dashboard, transfers, sales, inventory, purchases,
          customers, expenses, reports, items, users, audit
  api/ (route handlers: pdf download, sync, cron)
lib/
  prisma.ts, supabase/{server,client,admin}.ts
  auth.ts (requireRole), money.ts (Decimal helpers), ethiopian-date.ts
  services/ (sale.ts, payment.ts, inventory.ts, closing.ts, report.ts, audit.ts)
  validators/ (zod schemas)
components/ (ui, sales, admin, pdf)
prisma/ (schema.prisma, seed.ts)
tests/
```

Put all business logic in `lib/services/*` (pure, testable functions that take a Prisma transaction client). Server actions only validate input, check role, call a service, and revalidate.

## 8. Seed data

Create `prisma/seed.ts` with:
- 1 admin and 1 sales user (print the temporary passwords).
- Items (kg unless noted) with sell prices: Ambaza 700, Feleto 700, Koroso 700, Drum stick 750, Cheese 850, Telapia 900, Nati telapiha 900, Chekin 1300, Prop cheese 1300, Brest 1300, Suwarma 1300, Whole chekin 1200 (piece), Butter 350 (piece).
- Opening stock and a few purchases so the app is not empty.

## 9. Build order (finish and test each step before the next)

1. Project setup, Supabase connection, migrations, seed, auth, roles, layout.
2. Items and price history.
3. Sales entry with cash only, totals, today view, Ethiopian dates.
4. Transfers: screenshot upload, duplicate checks, admin queue.
5. Daily closing and **PDF reports**.
6. Inventory: purchases, movements, weighted average cost, waste, stock count, low-stock alerts.
7. Customers and credit: credit sales, debt payments, allocation, aging, statements.
8. Profit reports, dashboard, expenses, audit log viewer.
9. PWA offline queue and sync.
10. Hardening: tests, error handling, backups notes, deployment guide.

## 10. Quality requirements and acceptance tests

- TypeScript strict, ESLint clean, no `any` in services.
- Unit tests (Vitest) for: weighted average cost, stock updates, credit allocation, profit calculation, Ethiopian date conversion, duplicate transfer detection, closing totals.
- Integration test: create a sale with split cash + transfer + credit, verify the transfer, pay part of the debt, void another sale; assert stock, balances, closing totals and profit are exactly right.
- Check these invariants in a test and expose them in an admin "Health check" page:
  1. `Item.stockQty == SUM(StockMovement.qty)` for every item.
  2. For every sale: `balanceDue == total - paid` and never negative.
  3. For every closed day: `totalSales == cashReceived + transferVerified + transferPending + creditGiven - debtCollected` is **not** required, but `expectedCash` must match the formula in section 4.
  4. No two payments share a `(bankName, reference)` or an `imageHash`.
- Accessibility basics, mobile viewport 360px works, loading and error states on every screen.
- Security: server-side role checks on every action, private storage buckets, signed URLs, rate-limit login, validate uploaded file type and size (images only, max 5 MB after compression), no secrets in client code.

## 11. Deliverables

- Full source code, `.env.example`, README with setup (Supabase project, buckets, env vars, `prisma migrate`, seed, run), deployment notes (Vercel + Supabase), and `DECISIONS.md`.
- Start with step 1 now. After each step, summarize what was built, what was tested, and what is next. Ask me only when a decision changes money or stock numbers.
