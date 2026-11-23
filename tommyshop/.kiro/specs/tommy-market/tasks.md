# Implementation Plan: Tommy Market

## Overview

Implement the Tommy Market sales, inventory, credit, and transfer-verification web application in 10 sequential build phases. Each phase is complete and independently testable before the next begins. All business logic lives in pure `lib/services/*` functions that accept a Prisma transaction client. Server actions are thin orchestrators: validate → check role → call service → revalidate. All money and quantity values use `decimal.js` via Prisma's Decimal type. Dates are stored as Gregorian and displayed as Ethiopian by default.

---

## Tasks

- [x] 1. Phase 1: Project Setup, Database, Auth, Roles, and Layout
  - [x] 1.1 Install all production and dev dependencies
    - Run `npm install @prisma/client @supabase/supabase-js @supabase/ssr decimal.js zod react-hook-form @hookform/resolvers @react-pdf/renderer idb recharts lucide-react next-themes next-pwa`
    - Run `npm install -D prisma vitest @vitest/coverage-v8 fast-check @types/node tsx`
    - Run `npx shadcn@latest init` and configure `components.json` for the project (add Button, Input, Label, Card, Badge, Toggle, Select, Tabs, Dialog, Skeleton, Sonner)
    - _Requirements: 1.1, 2.1, 10.1, 13.1_

  - [x] 1.2 Copy schema and configure Prisma
    - Copy `docs/schema.prisma` to `prisma/schema.prisma`
    - Create `.env.local` from `.env.example` and populate `DATABASE_URL` (port 6543, `?pgbouncer=true`), `DIRECT_URL` (port 5432), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
    - Create `.env.example` documenting all required env vars with placeholder values and inline comments
    - Run `npx prisma generate` to generate the Prisma client
    - _Requirements: 1.1_

  - [x] 1.3 Run initial database migration
    - Run `npx prisma migrate dev --name init` to apply the schema to the Supabase database
    - Verify that all tables from `schema.prisma` are created in Supabase (Profile, Item, PriceHistory, Sale, SaleItem, Payment, PaymentAllocation, StockMovement, StockCount, StockCountItem, Purchase, PurchaseItem, Supplier, Expense, DailyClosing, AuditLog, Customer)
    - _Requirements: 1.1_

  - [x] 1.4 Write and run RLS deny-all migration
    - Create migration file `prisma/migrations/TIMESTAMP_enable_rls/migration.sql` with the `DO $$ ... FOR t IN SELECT tablename ... EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY') ... CREATE POLICY deny_anon ... END $$` block
    - Apply with `npx prisma migrate deploy` or run SQL directly in Supabase SQL editor
    - Verify: querying any table with the anon key returns a permission error
    - _Requirements: 1.7_

  - [x] 1.5 Create Supabase Storage buckets
    - In Supabase dashboard (or via service-role SDK in a setup script), create private bucket `transfer-screenshots` with 5 MB max file size and allowed MIME types: image/jpeg, image/png, image/webp
    - Create private bucket `reports` for generated PDFs
    - Verify that both buckets are non-public (no public URL access)
    - _Requirements: 4.5, 8.4, 14.2_

  - [x] 1.6 Implement core library singletons
    - Create `src/lib/prisma.ts`: PrismaClient singleton with `globalThis` guard and `PrismaTransaction` type export
    - Create `src/lib/supabase/server.ts`: `createServerClient()` using `@supabase/ssr` with cookie adapter for Next.js
    - Create `src/lib/supabase/client.ts`: `createBrowserClient()` using `@supabase/ssr`
    - Create `src/lib/supabase/admin.ts`: `supabaseAdmin` client using `SUPABASE_SERVICE_ROLE_KEY` and `getSignedUrl(bucket, path, expiresInSeconds)` helper
    - _Requirements: 1.1, 14.2, 14.5_

  - [x] 1.7 Implement `lib/auth.ts`
    - Export `AuthError` class with `status: 401 | 403` field
    - Export `getSession()`: calls `supabase.auth.getUser()`, throws `AuthError(401)` if not authenticated
    - Export `requireRole(minimumRole: Role): Promise<Profile>`: calls `getSession()`, fetches Profile with `isActive: true`, throws `AuthError(401)` if not found, throws `AuthError(403)` if SALES tries to access ADMIN action
    - Export `usernameToEmail(username: string): string` mapping `username → username@tommy.local`
    - _Requirements: 1.1, 1.4, 1.5, 1.6_

  - [x] 1.8 Implement `lib/money.ts`
    - Export `toDecimal(value: number | string | Decimal): Decimal`
    - Export `formatETB(value: Decimal, decimalPlaces?: number): string` (e.g. "1,234.50")
    - Export `sumDecimals(values: Decimal[]): Decimal`
    - Export `ZERO: Decimal` constant
    - Ensure all functions use `decimal.js` with no native JS arithmetic on monetary values
    - _Requirements: 13.1_

  - [x] 1.9 Implement `lib/ethiopian-date.ts`
    - Implement `toEthiopian(date: Date): EthDate` using Julian Day Number approach
    - Implement `toGregorian(eth: EthDate): Date`
    - Implement `formatEthiopian(date: Date, includeYear?: boolean): string` (e.g. "10/02/2016 ዓ.ም")
    - Implement `ethiopianMonthName(month: number): string` returning Amharic month names
    - Implement `isEthiopianLeapYear(year: number): boolean`
    - Export `EthDate` type `{ year: number; month: number; day: number }`
    - _Requirements: 12.1, 12.4, 12.5_

  - [x] 1.10 Create login page and server action
    - Create `src/app/(auth)/login/page.tsx`: RSC shell rendering a client `LoginForm` component with username and password fields using react-hook-form + zod (`LoginSchema`)
    - Create `src/app/(auth)/login/actions.ts`: `signInAction(formData)` server action — maps username to email, calls `supabase.auth.signInWithPassword()`, loads Profile, checks `isActive`, sets cookie, redirects to role-appropriate home; includes IP-based rate limiting (5 attempts / 60 s)
    - Create root `src/app/page.tsx` redirect: unauthenticated → `/login`, SALES → `/sales/today`, ADMIN → `/admin/dashboard`
    - Add `src/app/error.tsx` global error boundary: redirects to `/login` on `AuthError(401)`, renders "Access Denied" on `AuthError(403)`
    - _Requirements: 1.1, 1.2, 1.3, 14.3_

  - [x] 1.11 Create Sales layout and Admin layout
    - Create `src/app/(sales)/layout.tsx`: `SalesLayout` with header (shop name + `SyncBadge`), bottom tab bar (Today, New Sale, Stock, Customers, End of Day) with ≥ 44px touch targets, wraps `requireRole('SALES')`
    - Create `src/app/(admin)/layout.tsx`: `AdminLayout` with left sidebar navigation (Dashboard, Transfers, Sales, Inventory, Customers, Expenses, Reports, Items, Users, Audit, Health), wraps `requireRole('ADMIN')`
    - Both layouts include the `EthiopianDateToggle` context provider so all date displays on a page can be switched simultaneously
    - _Requirements: 1.5, 1.6, 12.2, 12.3_

  - [x] 1.12 Create Prisma seed file
    - Create `prisma/seed.ts` with: 1 ADMIN user + 1 SALES user (print temp passwords to stdout), all 13 catalog items from plan.md section 8 with correct sellPrice/unit, opening stock movements (ADJUSTMENT type) so item stockQty starts non-zero, 2–3 sample purchases to give non-zero avgCost values
    - Configure `package.json` `"prisma": { "seed": "tsx prisma/seed.ts" }`
    - Run `npx prisma db seed` and verify data appears in Supabase
    - _Requirements: 2.6_

  - [ ]* 1.13 Write unit tests for `ethiopian-date.ts` and `money.ts`
    - Configure `vitest.config.ts` with `environment: 'node'`, `coverage: { provider: 'v8', include: ['src/lib/**'] }`
    - In `tests/unit/ethiopian-date.test.ts`: test known conversions (Sep 11 2023 → Meskerem 1, 2016), Pagume handling, leap year (day 6 of Pagume 2015), and all Amharic month names
    - **Property 34: Ethiopian calendar round-trip** — `fc.assert(fc.property(validEthDateArb, eth => toEthiopian(toGregorian(eth)) deepEquals eth))`
    - **Validates: Requirements 12.5, 12.6**
    - In `tests/unit/money.test.ts`: test `formatETB`, `sumDecimals` with Decimal values, verify no floating-point drift on `4.70 × 700 = 3290.00`
    - Run `npx vitest --run tests/unit/ethiopian-date.test.ts tests/unit/money.test.ts`

  - [x] 1.14 Checkpoint — verify project foundation
    - Ensure all tests in Phase 1 pass, `npx prisma studio` shows seeded data, login page works for both seeded users and redirects correctly, ask the user if questions arise.

---

- [x] 2. Phase 2: Items and Price History
  - [x] 2.1 Implement `lib/services/audit.ts`
    - Export `writeLog(tx, userId, action, entity, entityId, before, after)` that creates an `AuditLog` row inside the given transaction
    - Function must throw if the insert fails (so the parent transaction rolls back — Requirement 11.1)
    - _Requirements: 11.1, 11.2_

  - [ ] 2.2 Implement Items CRUD server actions
    - Create `src/app/(admin)/items/actions.ts`
    - `updatePrice(itemId, newPrice)`: requires ADMIN, reads current Item (snapshot for `before`), creates `PriceHistory` row, updates `Item.sellPrice`, calls `writeLog(tx, adminId, 'PRICE_CHANGE', 'Item', itemId, before, after)` — all inside a single `prisma.$transaction`
    - `toggleItemActive(itemId)`: requires ADMIN, flips `Item.isActive`, writes AuditLog
    - `updateItemDetails(itemId, data)`: requires ADMIN, updates `name, nameAm, unit, category, lowStockLevel`
    - `createItem(data)`: requires ADMIN, creates new Item with initial PriceHistory row
    - _Requirements: 2.2, 2.3, 11.1_

  - [x] 2.3 Build Item list page
    - Create `src/app/(admin)/items/page.tsx`: RSC that fetches all items (ADMIN select includes `avgCost`), renders a table with name, nameAm, unit, sellPrice, avgCost, stockQty, isActive, and an "Edit Price" button per row
    - Create `src/app/(admin)/items/[id]/page.tsx`: item detail with inline price-edit form (react-hook-form, `PriceSchema` Zod validation), low-stock level edit, active toggle, and PriceHistory list (date + old/new price)
    - Low-stock items are visually highlighted in the list (`stockQty <= lowStockLevel`)
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

  - [ ]* 2.4 Write property test for price change → PriceHistory + Item update
    - **Property 4: Price change creates PriceHistory and updates Item**
    - In `tests/unit/item.test.ts`: for any item with any `sellPrice` and any new `newPrice ≠ currentPrice`, after `updatePrice()`, verify `PriceHistory` row exists with `sellPrice = oldPrice`, and `Item.sellPrice = newPrice`
    - **Validates: Requirements 2.2, 2.3**

  - [x] 2.5 Checkpoint — verify items phase
    - All item CRUD actions work in the browser, price edit creates a PriceHistory row, audit log has PRICE_CHANGE entries, property test passes, ask the user if questions arise.

---

- [x] 3. Phase 3: Sales Entry (Cash Only), Totals, Today View, Ethiopian Dates
  - [x] 3.1 Implement sale Zod validators
    - Create `src/lib/validators/sale.ts`
    - `SaleItemSchema`: `{ itemId: uuid, qty: positiveDecimal, unitPrice: positiveDecimal }`
    - `CreateSaleSchema`: `{ clientId: uuid, businessDate: date, items: array(SaleItemSchema, min 1), payments: array(PaymentSchema), customerId: optional uuid, note: optional string, adminOverrideCreditLimit: boolean, adminOverrideMaxDebtDays: boolean }`
    - `VoidSaleSchema`: `{ saleId: uuid, reason: string(min 1) }`
    - Export schemas and inferred TypeScript types for use on both client and server
    - _Requirements: 3.1, 14.4_

  - [x] 3.2 Implement `lib/services/sale.ts` — cash-only createSale
    - Implement `createSale(tx, userId, role, input)`: check clientId idempotency (early return), validate stock per item (block SALES if `qty > stockQty` and `!allowNegativeStock`), create Sale row, create SaleItem rows (copy `avgCost` → `unitCost`, compute `lineTotal = qty × unitPrice` with Decimal), create SALE StockMovements with negative qty, update `Item.stockQty`, create Payment rows (cash only in this phase), set `Sale.balanceDue = total − sum(payments)`
    - Implement `getSaleForRole(saleId, role)`: query with `saleSelect(role)` that omits `unitCost` for SALES
    - Implement `voidSale(tx, adminId, saleId, reason)`: mark VOIDED, create SALE_VOID movements, restore stockQty, zero balanceDue, write AuditLog — all in tx
    - _Requirements: 3.1–3.11, 7.1–7.7, 13.1_

  - [x] 3.3 Build New Sale page and cash payment flow
    - Create `src/app/(sales)/sales/new/page.tsx` and client components:
      - `ItemSearchGrid`: searchable grid of active item tiles (shows `name`, `nameAm`, `stockQty`, `sellPrice`); tapping a tile opens qty + unit price input (numeric keypad friendly)
      - Running total sticky bottom bar showing line items and grand total (all Decimal)
      - Payment step: big buttons **Cash** / **Transfer** / **Credit** / **Split** (Transfer and Credit are wired but show "coming in next phase" if not yet implemented)
      - Cash step: single amount input, confirm button
    - Create `src/app/(sales)/sales/new/actions.ts`: `createSaleAction` server action — `requireRole('SALES')`, parse `CreateSaleSchema`, call `createSale()` in `prisma.$transaction`, `revalidatePath('/sales/today')`, return `ActionResult<Sale>`
    - _Requirements: 3.1–3.6, 3.8, 3.9, 3.10, 3.13_

  - [x] 3.4 Build Today page with Ethiopian date display
    - Create `src/app/(sales)/today/page.tsx`: RSC that fetches today's sales for the current user, renders daily totals cards (Cash, Transfer, Credit), sale list with item names and Ethiopian dates
    - Create `EthiopianDateToggle` component in `src/components/ui/EthiopianDateToggle.tsx`: a Toggle that switches all date displays on the page between Ethiopian and Gregorian; state saved to `localStorage`
    - Display `formatEthiopian(sale.businessDate)` by default, Gregorian on toggle
    - Add an empty state with "No sales today — tap New Sale to start"
    - _Requirements: 3.12, 12.2, 12.3, 12.4_

  - [ ]* 3.5 Write property tests for sale creation (Properties 6–13)
    - In `tests/unit/sale.test.ts`:
    - **Property 6: unitPrice defaults to current sellPrice** — for any item sellPrice, `SaleItem.unitPrice == item.sellPrice` when no override given
    - **Property 7: avgCost snapshot at sale time** — `SaleItem.unitCost == item.avgCost` at transaction commit time
    - **Property 8: Stock movements created on sale** — N items → exactly N SALE movements with `qty = -saleItem.qty`
    - **Property 9: StockQty updated on sale** — `Item.stockQty` after sale = previous `stockQty − saleQty` = `SUM(StockMovement.qty)`
    - **Property 10: Sale total Decimal correctness** — `Sale.total == SUM(qty × unitPrice)` with Decimal, no float drift
    - **Property 11: balanceDue arithmetic invariant** — `balanceDue == total − SUM(payment.amount)`, never negative
    - **Property 12: Stock blocking for SALES role** — `qty > stockQty` → no Sale/SaleItem/StockMovement rows created
    - **Property 13: Sale idempotency via clientId** — same clientId submitted twice → one Sale row, same response
    - **Validates: Requirements 3.1–3.11, 13.1, 13.3**

  - [x] 3.6 Checkpoint — verify sales entry
    - Create a cash-only sale in the browser, verify Today page totals update, Ethiopian date shows correctly, toggle switches to Gregorian, Item.stockQty decrements, all property tests pass. Ask the user if questions arise.

---

- [x] 4. Phase 4: Transfers — Screenshot Upload, Duplicate Checks, Admin Queue
  - [x] 4.1 Implement `/api/upload` route handler
    - Create `src/app/api/upload/route.ts`: `POST` handler — `requireRole('SALES')`, read FormData (`file`, `imageHash`), validate MIME in `['image/jpeg','image/png','image/webp']` and size ≤ 5 MB, recompute SHA-256 server-side and compare to `clientHash` (reject on mismatch), call `supabaseAdmin.storage.from('transfer-screenshots').upload(path, buffer)`, return `{ storagePath, imageHash }`
    - _Requirements: 4.1, 14.1, 14.2, 14.5_

  - [x] 4.2 Add transfer payment step to sale form
    - Extend `CreateSaleSchema` in `lib/validators/sale.ts` to include transfer payment fields: `bankName`, `reference`, `screenshotPath`, `imageHash`
    - In `src/app/(sales)/sales/new/page.tsx`, wire the **Transfer** button to a multi-step form: (1) enter bank + reference, (2) camera/gallery pick → client-side compress to ≤ 5 MB using canvas API → compute SHA-256 → POST to `/api/upload` → store `storagePath + imageHash`
    - Add transfer payment to the payment split logic in `createSaleAction`
    - _Requirements: 3.14, 4.1, 4.4_

  - [x] 4.3 Implement duplicate detection in `lib/services/payment.ts`
    - Create `src/lib/services/payment.ts`
    - `createPayment(tx, userId, input)`: for TRANSFER kind, check `tx.payment.findUnique({ where: { bankName_reference: ... } })` and `tx.payment.findUnique({ where: { imageHash: ... } })`; throw `ConflictError` with conflict details if either exists; set `verifyStatus = PENDING` for transfers, `NOT_REQUIRED` for cash
    - `verifyTransfer(tx, adminId, paymentId)`: set `verifyStatus = VERIFIED`, record `verifiedById + verifiedAt`; if `kind = DEBT`, call `allocateDebtPayment`
    - `rejectTransfer(tx, adminId, paymentId, reason)`: set `verifyStatus = REJECTED`, write AuditLog; if `kind = SALE`, re-add amount to `Sale.balanceDue`
    - `allocateDebtPayment(tx, paymentId, customerId, salesOverride?)`: oldest-first allocation (or manual override); only runs for CASH or VERIFIED transfers
    - _Requirements: 4.2, 4.3, 4.4, 4.7, 4.8, 5.4, 5.6, 5.7_

  - [x] 4.4 Build Admin Transfers queue page
    - Create `src/app/(admin)/transfers/page.tsx`: RSC that fetches all PENDING transfers, for each calls `getSignedUrl('transfer-screenshots', payment.screenshotPath, 300)`, renders a two-panel layout (screenshot on left, details on right) with Verify / Reject (reason dialog) buttons; includes a "Select All + Bulk Verify" checkbox
    - Create `src/app/(admin)/transfers/actions.ts`:
      - `verifyTransferAction(paymentId)`: `requireRole('ADMIN')`, call `verifyTransfer()` in tx
      - `rejectTransferAction(paymentId, reason)`: `requireRole('ADMIN')`, call `rejectTransfer()` in tx
      - `bulkVerifyAction(paymentIds[])`: `requireRole('ADMIN')`, single `prisma.$transaction` verifying all at once
    - _Requirements: 4.6, 4.7, 4.8, 4.9_

  - [ ]* 4.5 Write property tests for transfer verification (Properties 14–19)
    - In `tests/unit/payment.test.ts`:
    - **Property 14: Transfer SHA-256 hash stored correctly** — `Payment.imageHash == SHA256(imageBytes)` for any input bytes
    - **Property 15: Transfer duplicate rejection** — existing `(bankName, reference)` or matching `imageHash` → `ConflictError` thrown, no new Payment row
    - **Property 16: New transfer always starts as PENDING** — any passing transfer → `verifyStatus = PENDING`
    - **Property 17: Transfer verification state transition** — verify → `VERIFIED` with `verifiedById/verifiedAt`; reject with reason → `REJECTED` + AuditLog entry
    - **Property 18: Bulk verification** — any set of PENDING transfers bulk-verified → all `verifyStatus = VERIFIED` atomically
    - **Property 19: Unverified transfers excluded from revenue** — PENDING or REJECTED amount not counted in confirmed revenue total
    - **Validates: Requirements 4.1–4.10**

  - [x] 4.6 Checkpoint — verify transfer phase
    - Create a sale with transfer payment, check it shows as PENDING in admin queue, verify and reject flows work, duplicate screenshot/reference is rejected with clear message, bulk verify works, property tests pass. Ask the user if questions arise.

---

- [ ] 5. Phase 5: Daily Closing and PDF Reports
  - [x] 5.1 Implement `lib/services/closing.ts`
    - `submitDayEnd(tx, salesUserId, businessDate, countedCash)`: get-or-create `DailyClosing` for the date, compute live totals from DB (cashReceived, expectedCash = cashReceived − cashExpenses), set `countedCash` and `cashDifference`; return closing snapshot
    - `closeDay(tx, adminId, businessDate)`: recompute all snapshot fields (totalSales, cashReceived, transferVerified, transferPending, creditGiven, debtCollected, cashExpenses, expectedCash, grossProfit), set `status = CLOSED`, call `generateDailyAdminPdf` + `generateDailySalesPdf`, write paths to DailyClosing, write AuditLog `CLOSE_DAY`
    - `reopenDay(tx, adminId, businessDate, reason)`: throws if reason is empty, sets `status = OPEN`, increments `pdfVersion`, writes AuditLog `REOPEN_DAY`
    - Block all SALES mutations when `DayStatus = CLOSED`: add a `checkDayNotClosed(businessDate)` guard called at the top of `createSale`, `createPayment`, and `createExpense`
    - _Requirements: 8.1–8.8, 13.2_

  - [x] 5.2 Build Sales end-of-day page
    - Create `src/app/(sales)/end-of-day/page.tsx`: shows today's running totals (read-only), a "Counted Cash" numeric input, and a Submit button
    - Create `src/app/(sales)/end-of-day/actions.ts`: `submitDayEndAction(countedCash)` — `requireRole('SALES')`, call `submitDayEnd()` in tx, return `ActionResult<DailyClosing>` showing `expectedCash`, `cashDifference`, visual flag if difference ≠ 0
    - _Requirements: 8.1, 8.2_

  - [x] 5.3 Build Admin close-day UI
    - Create `src/app/(admin)/reports/[date]/page.tsx`: shows snapshot details, Verify / Close Day button, Reopen Day (with reason dialog); for a closed day shows PDF download links
    - Create corresponding actions: `closeDayAction(businessDate)`, `reopenDayAction(businessDate, reason)`
    - Add "Days Not Closed" alert query to Admin dashboard (placeholder page until Phase 8)
    - _Requirements: 8.3, 8.6, 8.8_

  - [-] 5.4 Implement PDF component hierarchy
    - Download Noto Sans Ethiopic TTF font to `public/fonts/NotoSansEthiopic-Regular.ttf` and `NotoSansEthiopic-Bold.ttf`
    - Create `src/components/pdf/fonts.ts`: `Font.register` for both weights
    - Create shared components: `ReportHeader`, `SummaryCards`, `SalesTable`, `TransfersList`, `CreditSummary`, `CashCheck`, `StockSummary`, `ProfitTable`, `ReportFooter` in `src/components/pdf/shared/`
    - Create `src/components/pdf/DailyReportAdmin.tsx`: full report with all sections
    - Create `src/components/pdf/DailyReportSales.tsx`: same but omitting `GrossProfit`, `StockSummary`, `ProfitTable` (Requirement 8.9)
    - Create `src/components/pdf/CustomerStatement.tsx`
    - _Requirements: 9.4, 9.6, 8.9_

  - [ ] 5.5 Implement `lib/services/report.ts`
    - `generateDailyAdminPdf(closingId)`: `renderToBuffer(<DailyReportAdmin closing={...} />)`, upload to `reports/admin/${date}-v${version}.pdf`, update `DailyClosing.pdfAdminPath`, return signed URL
    - `generateDailySalesPdf(closingId)`: same with `DailyReportSales`, upload to `reports/sales/...`
    - `generateCustomerStatementPdf(customerId, from, to)`: render `CustomerStatement`, upload, return signed URL
    - _Requirements: 8.4, 9.4, 9.7, 5.10_

  - [ ] 5.6 Create `/api/pdf/[closingId]/route.ts`
    - `GET` handler: `requireRole('SALES')` (both roles can download their version), fetch `DailyClosing`, pick `pdfAdminPath` (ADMIN) or `pdfSalesPath` (SALES), call `getSignedUrl(...)`, return 302 redirect to signed URL
    - _Requirements: 8.4, 9.7_

  - [ ]* 5.7 Write property tests for daily closing (Properties 31–33)
    - In `tests/unit/closing.test.ts`:
    - **Property 31: expectedCash formula** — for any (cashSales, cashDebtPayments, cashExpenses): `expectedCash == cashSales + cashDebtPayments − cashExpenses` using Decimal
    - **Property 32: Closed day blocks SALES mutations** — with `DayStatus = CLOSED`, any SALES create-sale/payment/expense action returns error and creates no DB rows
    - **Property 33: PDF version increment on reopen/close** — after reopen + close cycle, `pdfVersion` is strictly greater and old + new PDF paths exist
    - **Validates: Requirements 8.2, 8.5, 8.7**

  - [ ] 5.8 Checkpoint — verify closing and PDF phase
    - Submit end-of-day as SALES, close as ADMIN, download Admin and Sales PDFs (verify Amharic renders), reopen and re-close increments version, closed day blocks new sales. Ask the user if questions arise.

---

- [ ] 6. Phase 6: Inventory — Purchases, Movements, Weighted Avg Cost, Waste, Stock Count, Low-Stock Alerts
  - [ ] 6.1 Implement inventory Zod validators
    - Create `src/lib/validators/inventory.ts`
    - `CreatePurchaseSchema`: `{ supplierId?: uuid, purchaseDate: date, items: array({ itemId, qty: positiveDecimal (> 0), unitCost: positiveDecimal }), note?, amountPaid? }`
    - `WasteSchema`: `{ itemId: uuid, qty: positiveDecimal, reason: enum('spoiled','trimmed','sample','other'), businessDate: date, note? }`
    - `StockCountItemSchema`, `ApplyStockCountSchema`
    - _Requirements: 6.4, 14.4_

  - [ ] 6.2 Implement `lib/services/inventory.ts`
    - `computeNewAvgCost(oldQty, oldAvg, inQty, inCost): Decimal`: the weighted average formula; if `oldQty <= 0` return `inCost`
    - `recordPurchase(tx, adminId, input)`: create Purchase + PurchaseItem rows, create PURCHASE StockMovements (positive qty), update `Item.avgCost` and `Item.stockQty` per item (all in tx); write AuditLog for each item
    - `recordWaste(tx, adminId, input)`: create WASTE StockMovement (negative qty), update `Item.stockQty`
    - `applyStockCount(tx, adminId, stockCountId)`: for each `StockCountItem` where `countedQty ≠ systemQty`, create COUNT_ADJUSTMENT movement with `qty = countedQty − systemQty`, update `Item.stockQty`, mark `StockCount.applied = true`
    - `reconcileStock()`: read-only — for each item compute `SUM(StockMovement.qty)`, compare to `Item.stockQty`, return discrepancy report
    - _Requirements: 6.1–6.9, 13.2_

  - [ ] 6.3 Build Supplier CRUD
    - Create `src/app/(admin)/inventory/suppliers/page.tsx`: simple list of suppliers with Add Supplier form (name, phone, note)
    - Supplier server actions in `src/app/(admin)/inventory/actions.ts`: `createSupplier`, `updateSupplier`, `deactivateSupplier`
    - _Requirements: 6.2_

  - [ ] 6.4 Build Purchases page
    - Create `src/app/(admin)/inventory/purchases/page.tsx`: list of purchases with date, supplier, total cost, items count; "Record Purchase" button opens form
    - Purchase form: supplier select (optional), date, add item lines (item search, qty, unit cost), note, amount paid
    - Create `src/app/(admin)/inventory/purchases/actions.ts`: `recordPurchaseAction` — `requireRole('ADMIN')`, parse `CreatePurchaseSchema`, call `recordPurchase()` in tx
    - _Requirements: 6.2, 6.3, 6.4, 6.10_

  - [ ] 6.5 Build Waste recording form and Stock count page
    - In `src/app/(admin)/inventory/page.tsx`: add "Record Waste" button → modal form (item search, qty, reason, date)
    - `recordWasteAction` in inventory actions file
    - Create `src/app/(admin)/inventory/stock-counts/page.tsx`: table of all active items with `systemQty` column and `countedQty` number input; "Apply Count" button shows diff and confirms
    - `createStockCountAction`, `applyStockCountAction` in `src/app/(admin)/inventory/stock-counts/actions.ts`
    - _Requirements: 6.5, 6.6, 6.7_

  - [ ] 6.6 Build inventory list and movement history views
    - Create `src/app/(admin)/inventory/page.tsx` (or extend existing): stock table with all items, qty, low-stock highlight, link to movement history
    - Create `src/app/(admin)/inventory/[itemId]/movements/page.tsx`: paginated list of all StockMovements for an item (date, type, qty, reason, refType)
    - Create `src/app/(sales)/stock/page.tsx`: item list with `stockQty` and low-stock badge, no cost fields (SALES select)
    - _Requirements: 2.5, 6.9_

  - [ ] 6.7 Create `npm run stock:reconcile` script
    - Create `scripts/reconcile.ts`: imports `reconcileStock()` from `lib/services/inventory.ts`, prints discrepancy report to stdout
    - Add `"stock:reconcile": "tsx scripts/reconcile.ts"` to `package.json` scripts
    - _Requirements: 6.8_

  - [ ]* 6.8 Write property tests for inventory (Properties 25, 26)
    - In `tests/unit/inventory.test.ts`:
    - **Property 25: Weighted average cost formula** — for any `(oldQty > 0, oldAvg, inQty > 0, inCost)`: result equals `(oldQty × oldAvg + inQty × inCost) / (oldQty + inQty)`; for `oldQty ≤ 0`: result equals `inCost` — using `fc.assert` with Decimal arbitraries
    - **Property 26: Stock count adjustment movements** — for any stock count with M items having `countedQty ≠ systemQty` and K items matching: exactly M COUNT_ADJUSTMENT movements created, K items unchanged, each movement `qty = countedQty − systemQty`
    - Add unit tests for weighted avg cost: concrete examples (oldQty=5, oldAvg=700, inQty=2, inCost=800 → result = 728.57...)
    - **Validates: Requirements 6.3, 6.7**

  - [ ] 6.9 Checkpoint — verify inventory phase
    - Record a purchase, verify avgCost updates, record waste, do a stock count and apply it, run `npm run stock:reconcile` with zero discrepancies, low-stock alert appears, property tests pass. Ask the user if questions arise.

---

- [ ] 7. Phase 7: Customers and Credit — Credit Sales, Debt Payments, Allocation, Aging, Statements
  - [ ] 7.1 Implement Customer CRUD
    - Create `src/app/(admin)/customers/page.tsx`: customer list with name, outstanding balance, aging bucket summary
    - Create `src/app/(admin)/customers/[id]/page.tsx`: customer detail — full aging table (0–7, 8–15, 16–30, 30+ days), unpaid sales list, payment history, statement download button, Write Off Debt button, Edit creditLimit/maxDebtDays
    - Create `src/app/(admin)/customers/actions.ts`: `createCustomer`, `updateCustomer`, `updateCreditSettings(customerId, creditLimit, maxDebtDays)`
    - _Requirements: 5.1, 5.9_

  - [ ] 7.2 Implement credit payment validators
    - Extend `src/lib/validators/payment.ts` with `CreateDebtPaymentSchema`: `{ customerId: uuid, amount: positiveDecimal, method: enum('CASH','TRANSFER'), businessDate: date, bankName?, reference?, screenshotPath?, imageHash?, salesOverride?: uuid[] }`
    - _Requirements: 5.4, 5.5, 14.4_

  - [ ] 7.3 Wire credit sales flow into `createSale()`
    - In `lib/services/sale.ts`, extend `createSale` to handle `balanceDue > 0`:
      - Require `customerId` (throw `BusinessRuleError` if missing)
      - Compute `outstanding` = sum of `balanceDue` from non-voided sales for this customer
      - If `outstanding + newBalanceDue > creditLimit` and not `adminOverrideCreditLimit`, throw `BusinessRuleError`
      - If customer has any sale with `businessDate < today − maxDebtDays` and `balanceDue > 0` and not `adminOverrideMaxDebtDays`, throw `BusinessRuleError`
    - In sale form, wire the **Credit** and **Split** payment buttons: Credit step shows customer search/create; Split shows cash amount + credit remainder
    - _Requirements: 3.6, 3.7, 5.2, 5.3_

  - [ ] 7.4 Build Sales customers page and "Receive Payment" flow
    - Create `src/app/(sales)/customers/page.tsx`: list customers with outstanding balance, "Receive Payment" button
    - Create `src/app/(sales)/customers/[id]/page.tsx`: show unpaid sales, payment amount input, manual sale selection toggle
    - Create customer payment server action: `recordDebtPaymentAction(input)` — `requireRole('SALES')`, parse `CreateDebtPaymentSchema`, call `createPayment()` + `allocateDebtPayment()` in a single tx
    - _Requirements: 5.1, 5.4, 5.5_

  - [ ] 7.5 Implement debt write-off and statement PDF
    - In admin customers actions: `writeOffDebtAction(customerId, saleIds[], reason)` — `requireRole('ADMIN')`, require reason, zero `balanceDue` on selected sales, write AuditLog with before/after JSON
    - In `lib/services/report.ts`, complete `generateCustomerStatementPdf(customerId, from, to)`: pulls all sales in range, renders `CustomerStatement` PDF with Ethiopian dates, uploads to reports bucket, returns signed URL
    - Wire "Download Statement" button in `src/app/(admin)/customers/[id]/page.tsx`
    - _Requirements: 5.8, 5.10_

  - [ ]* 7.6 Write property tests for credit and debt (Properties 20–24)
    - In `tests/unit/payment.test.ts` (extend file):
    - **Property 20: Customer outstanding balance calculation** — for any set of voided and non-voided sales, outstanding balance = `SUM(balanceDue)` of non-VOIDED sales only
    - **Property 21: Credit limit enforcement** — `outstanding + newBalanceDue > creditLimit` with SALES role → `BusinessRuleError`; with ADMIN + override → success
    - **Property 22: Debt age enforcement** — customer with sale older than `maxDebtDays` and `balanceDue > 0` → SALES credit blocked
    - **Property 23: Debt payment oldest-first allocation** — multiple unpaid sales, payment applied → oldest sale's `balanceDue` reduced first; `PaymentAllocation` rows exist
    - **Property 24: Pending transfer does not reduce balanceDue** — PENDING transfer debt payment → no Sale `balanceDue` changes until verified
    - **Validates: Requirements 5.1–5.7**

  - [ ] 7.7 Checkpoint — verify credit phase
    - Create a credit sale, check balance updates, receive a partial debt payment (verify oldest-first allocation), try to exceed creditLimit as SALES (blocked), override as ADMIN (succeeds), download customer statement PDF. Ask the user if questions arise.

---

- [ ] 8. Phase 8: Profit Reports, Dashboard, Expenses, Audit Log Viewer
  - [ ] 8.1 Implement `lib/health.ts`
    - Export `checkInvariants(): Promise<HealthReport>` running all 4 checks in parallel:
      1. `checkStockQtyInvariant()`: for each item, compare `Item.stockQty` vs `SUM(StockMovement.qty)`
      2. `checkBalanceDueInvariant()`: for each non-voided sale, compare `balanceDue` vs `total − paidAmount`
      3. `checkDuplicateReferenceInvariant()`: query for any `(bankName, reference)` appearing more than once
      4. `checkDuplicateImageHashInvariant()`: query for any `imageHash` appearing more than once
    - Export `HealthReport` type with `healthy: boolean` and per-check results
    - Create `src/app/(admin)/health/page.tsx`: renders `HealthReport` output, requires ADMIN
    - _Requirements: 13.3_

  - [ ] 8.2 Build Admin dashboard
    - Create `src/app/(admin)/dashboard/page.tsx`: RSC fetching today vs yesterday comparison, action cards, chart data
    - Implement dashboard data query in `lib/services/closing.ts` or a dedicated `lib/services/dashboard.ts`: compute today's totals, yesterday's totals, 7-day and 30-day aggregates by payment type
    - Render Recharts `BarChart` / `LineChart` for 7-day trend (cash, transfer, credit breakdown) and 30-day trend
    - Render 4 action cards: (1) pending transfer count → link to `/admin/transfers`, (2) overdue credit customer count → link to `/admin/customers`, (3) low-stock item count → link to `/admin/inventory`, (4) days not closed count → link to reports
    - Dashboard flags dashboard for REJECTED transfers per Requirement 4.11
    - _Requirements: 9.1, 9.2, 9.3, 4.11_

  - [ ] 8.3 Build Expenses CRUD
    - Create `src/app/(admin)/expenses/page.tsx`: expense list filtered by date, "Add Expense" form (category, description, amount, method, date)
    - Create `src/app/(admin)/expenses/actions.ts`: `createExpenseAction` — `requireRole('ADMIN')`, validate, create `Expense` row, check day-not-closed guard
    - _Requirements: 8.2 (expenses feed expectedCash), 9.1_

  - [ ] 8.4 Build Reports page and Excel export
    - Create `src/app/(admin)/reports/page.tsx`: list of all past `DailyClosing` records with download buttons (Admin PDF / Sales PDF), period selector for weekly/monthly reports, Excel export button
    - Implement `generateWeeklyPdf(weekStart)` and `generateMonthlyPdf(month, year)` in `lib/services/report.ts` reusing the same component hierarchy with aggregated data
    - Implement `generateExcelReport(period)` using `exceljs` or `xlsx` library: install `npm install exceljs`, write rows for sales, payments, expenses, profit per item
    - _Requirements: 9.4, 9.5, 9.7, 9.8_

  - [ ] 8.5 Build Sales list with filters and void action
    - Create (or extend) `src/app/(admin)/sales/page.tsx`: data table with filters — date range (Ethiopian calendar picker component), user select, item select, payment type, customer select; each row links to sale detail
    - Create `src/app/(admin)/sales/[id]/page.tsx`: sale detail showing items, payments, audit trail for this sale; "Void Sale" button opens reason dialog
    - Create `src/app/(admin)/sales/[id]/actions.ts`: `voidSaleAction(saleId, reason)` — `requireRole('ADMIN')`, call `voidSale()` in tx
    - _Requirements: 7.1–7.7, 9.9_

  - [ ] 8.6 Build Audit log viewer
    - Create `src/app/(admin)/audit/page.tsx`: filterable list of AuditLog entries (entity type, entity ID, user, date range), read-only table rendering `before`/`after` JSON diff
    - Audit data fetched server-side, never allows DELETE/UPDATE
    - _Requirements: 11.3, 11.4_

  - [ ] 8.7 Build profit-by-item report
    - Create query in dashboard/reports: for a given date range, group `SaleItem` rows (non-voided sales), compute `grossProfit = SUM(qty × (unitPrice − unitCost))` per item with margin %
    - Render as a table on the reports page and in Admin PDFs
    - _Requirements: 9.8, 13.4_

  - [ ] 8.8 Add `/api/cron/route.ts` for nightly unclosed-day check
    - `POST` handler secured with a `CRON_SECRET` env var check: query for any `DailyClosing` with `status = OPEN` and `businessDate < today`, log a warning (or write an AuditLog entry); return JSON summary
    - _Requirements: 8.8_

  - [ ] 8.9 Write integration test for full sale lifecycle
    - Create `tests/integration/sale-lifecycle.test.ts`
    - Set up test DB items and customer, run the full flow:
      1. Create sale with cash + transfer + credit split
      2. Assert: `Sale.total = cash + transfer + credit`, `SaleItem.unitCost = avgCost`, StockMovements created, `Payment.verifyStatus = PENDING`
      3. Verify transfer → `verifyStatus = VERIFIED`, confirmed revenue increases
      4. Create second sale on credit only
      5. Record DEBT payment → `PaymentAllocation` rows, oldest sale `balanceDue` reduced first
      6. Void second sale → `SALE_VOID` movements, `stockQty` restored, credit reversed, AuditLog exists
      7. Close the day → snapshot correct, voided sale excluded from `totalSales` and `grossProfit`
      8. Run `checkInvariants()` → all 4 invariants pass
    - _Requirements: 7.2–7.7, 8.3, 13.3, 13.4, 13.5_

  - [ ] 8.10 Checkpoint — verify reports and dashboard phase
    - Dashboard charts render correctly, action cards show accurate counts, expenses reduce expectedCash, void a sale and confirm it's excluded from profit, audit log shows all actions, health check passes. Ask the user if questions arise.

---

- [ ] 9. Phase 9: PWA Offline Queue and Sync
  - [ ] 9.1 Add PWA manifest and configure `next-pwa`
    - Create `public/manifest.webmanifest`: `name`, `short_name`, `icons` (192px + 512px), `start_url`, `display: standalone`, `theme_color`, `background_color`
    - Install `npm install next-pwa`
    - Configure `next.config.ts` with `withPWA({ dest: 'public', runtimeCaching: [...] })` using the caching strategies from design section 7.1 (CacheFirst for static, StaleWhileRevalidate for page data, NetworkOnly for `/api/`)
    - _Requirements: 10.1_

  - [ ] 9.2 Implement `lib/offline/db.ts` — IndexedDB schema
    - Create `src/lib/offline/db.ts`: define `TommyDB` schema with `sales` store (`keyPath: clientId`, `index: by-status`)
    - Export `queueSale(sale)`, `getPendingSales()`, `markSaleSynced(clientId)`, `incrementSyncAttempts(clientId)`, `getQueueCount(): Promise<number>`
    - _Requirements: 10.2_

  - [ ] 9.3 Implement `lib/offline/sync.ts` sync processor
    - Create `src/lib/offline/sync.ts`: `syncQueue()` — iterate pending sales, POST each to `/api/sync`, mark synced on 200/409, increment attempts on failure
    - Register `window.addEventListener('online', syncQueue)` on mount
    - _Requirements: 10.3, 10.4_

  - [ ] 9.4 Implement `/api/sync/route.ts`
    - `POST` handler: `requireRole('SALES')`, parse `CreateSaleSchema`, idempotency check (`prisma.sale.findUnique({ where: { clientId } })`), if exists return 200 with existing record, else run `createSale()` in tx and return 201
    - _Requirements: 10.3, 10.4_

  - [ ] 9.5 Update New Sale form for offline support
    - In `src/app/(sales)/sales/new/page.tsx`, detect `!navigator.onLine` before submitting; if offline, call `queueSale()` with the form data and show a "Saved offline — will sync when connected" toast
    - If online, proceed with the normal `createSaleAction` server action
    - _Requirements: 10.2, 10.3_

  - [ ] 9.6 Update Today page with offline queue display and `SyncBadge`
    - Finish `src/components/sales/SyncBadge.tsx`: display pending count, listen to `online`/`offline` events
    - In `src/app/(sales)/today/page.tsx`: add a "Pending Sync" section showing queued offline sales with item count and "pending sync" indicator badge
    - Wire `SyncBadge` into `src/app/(sales)/layout.tsx` header
    - _Requirements: 10.5, 10.6_

  - [ ]* 9.7 Write property test for offline sync idempotency
    - In `tests/unit/sync.test.ts` (or extend `sale.test.ts`):
    - **Property 13: Sale idempotency via clientId** (second coverage via `/api/sync`) — same `clientId` submitted to `/api/sync` twice → one Sale row in DB, second call returns 200 with existing sale
    - **Validates: Requirements 3.10, 3.11, 10.4**

  - [ ] 9.8 Checkpoint — verify PWA offline phase
    - Open app in browser, go offline (DevTools network throttling), create a sale, verify it queues in IndexedDB with pending indicator, go back online, verify it syncs and appears in Today view, submit same clientId again and confirm no duplicate. Ask the user if questions arise.

---

- [ ] 10. Phase 10: Hardening — Tests, Error Handling, Deployment Guide
  - [ ] 10.1 Implement `lib/errors.ts` error class hierarchy
    - Create `src/lib/errors.ts`: export `AuthError`, `ValidationError`, `ConflictError`, `BusinessRuleError`, `NotFoundError` classes as defined in design section 13.1
    - Migrate all thrown errors in `lib/services/*` to use these typed classes (replace any raw `new Error(...)` with the appropriate typed class)
    - _Requirements: 14.4_

  - [ ] 10.2 Standardize all server actions to `ActionResult<T>`
    - Refactor every server action in `app/(sales)/**/actions.ts` and `app/(admin)/**/actions.ts` to return `ActionResult<T>` discriminated union as defined in design section 13.2
    - Each action must catch `AuthError`, `ZodError`, `ConflictError`, `BusinessRuleError`, `NotFoundError` and map to `{ ok: false, error, code }` responses
    - _Requirements: 14.4, 14.6_

  - [ ] 10.3 Add Suspense / skeleton loading states to all pages
    - For every RSC page, add a matching `loading.tsx` file that renders a skeleton layout matching the page structure (table skeletons for list pages, card skeletons for detail pages, using shadcn/ui Skeleton component)
    - Wrap data-dependent sections in `<Suspense fallback={<Skeleton />}>`
    - _Requirements: (quality requirement from plan.md section 10)_

  - [ ] 10.4 Add error boundaries to all route groups
    - Create `src/app/(sales)/error.tsx`: catches AuthError → redirect to login, renders a friendly error card for other errors
    - Create `src/app/(admin)/error.tsx`: same pattern
    - Ensure all pages degrade gracefully on network/DB errors
    - _Requirements: (quality requirement from plan.md section 10)_

  - [ ] 10.5 Run ESLint pass and enforce TypeScript strict mode
    - Run `npx eslint src --ext .ts,.tsx` and fix all warnings and errors
    - Verify `tsconfig.json` has `"strict": true` — fix any `any` types in `lib/services/*`
    - _Requirements: (plan.md quality requirements)_

  - [ ] 10.6 Verify mobile viewport and touch targets
    - Open every Sales screen at 360px viewport width (browser DevTools device emulation)
    - Confirm all interactive elements are ≥ 44×44 px, no horizontal scroll, all text readable
    - Fix any layout issues found
    - _Requirements: (plan.md section 10 quality requirements)_

  - [ ] 10.7 Write `DECISIONS.md`
    - Create `DECISIONS.md` documenting: SHA-256 verified server-side vs client-provided, `stockQty` as cache vs recomputed, `SaleItem.unitCost` snapshot rationale, `clientId` idempotency design, RLS deny-all approach, any ambiguous requirement resolved during implementation
    - _Requirements: (plan.md section 11 deliverables)_

  - [ ] 10.8 Write comprehensive README
    - Update `README.md` with: prerequisites, Supabase project creation steps, bucket creation, `.env.example` → `.env.local` setup, `prisma migrate dev`, `prisma db seed`, `npm run dev`, `npm run stock:reconcile`, build and deploy to Vercel instructions, known limitations
    - _Requirements: (plan.md section 11 deliverables)_

  - [ ] 10.9 Run final `npm run build` and resolve all errors
    - Run `npm run build` and fix every TypeScript, import, and Next.js build error until the build completes with zero errors and zero warnings
    - Run `npx vitest --run` and ensure all unit and property tests pass
    - _Requirements: (plan.md quality requirements)_

  - [ ] 10.10 Checkpoint — final handoff
    - Zero build errors, all tests pass, mobile 360px verified, ESLint clean, README and DECISIONS.md written. Ask the user if questions arise before considering the project complete.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP, but are strongly recommended for correctness confidence.
- Each task references specific requirement numbers for traceability.
- Checkpoints ensure each phase is working before the next begins — never skip a checkpoint.
- Property tests use `vitest` + `fast-check` with minimum 100 iterations per property.
- Unit tests cover all concrete examples; property tests cover universal invariants.
- All Prisma transactions must include `writeLog()` calls where required — if `writeLog` throws, the entire parent transaction rolls back.
- Service functions in `lib/services/*` take a `PrismaTransaction` client and must never call `prisma.$transaction` themselves — the server action is responsible for wrapping.
- Never use JavaScript native floating-point for money or kg values — always `new Decimal(...)`.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["1.4", "1.5"] },
    { "id": 4, "tasks": ["1.6"] },
    { "id": 5, "tasks": ["1.7", "1.8", "1.9"] },
    { "id": 6, "tasks": ["1.10", "1.11"] },
    { "id": 7, "tasks": ["1.12"] },
    { "id": 8, "tasks": ["1.13"] },
    { "id": 9, "tasks": ["2.1"] },
    { "id": 10, "tasks": ["2.2", "3.1"] },
    { "id": 11, "tasks": ["2.3", "3.2"] },
    { "id": 12, "tasks": ["2.4", "3.3"] },
    { "id": 13, "tasks": ["3.4"] },
    { "id": 14, "tasks": ["3.5"] },
    { "id": 15, "tasks": ["4.1"] },
    { "id": 16, "tasks": ["4.2", "4.3"] },
    { "id": 17, "tasks": ["4.4"] },
    { "id": 18, "tasks": ["4.5"] },
    { "id": 19, "tasks": ["5.1"] },
    { "id": 20, "tasks": ["5.2", "5.3"] },
    { "id": 21, "tasks": ["5.4"] },
    { "id": 22, "tasks": ["5.5", "5.6"] },
    { "id": 23, "tasks": ["5.7"] },
    { "id": 24, "tasks": ["6.1"] },
    { "id": 25, "tasks": ["6.2"] },
    { "id": 26, "tasks": ["6.3", "6.4"] },
    { "id": 27, "tasks": ["6.5", "6.6"] },
    { "id": 28, "tasks": ["6.7", "6.8"] },
    { "id": 29, "tasks": ["7.1", "7.2"] },
    { "id": 30, "tasks": ["7.3"] },
    { "id": 31, "tasks": ["7.4", "7.5"] },
    { "id": 32, "tasks": ["7.6"] },
    { "id": 33, "tasks": ["8.1", "8.2"] },
    { "id": 34, "tasks": ["8.3", "8.5"] },
    { "id": 35, "tasks": ["8.4", "8.6", "8.7"] },
    { "id": 36, "tasks": ["8.8", "8.9"] },
    { "id": 37, "tasks": ["9.1"] },
    { "id": 38, "tasks": ["9.2"] },
    { "id": 39, "tasks": ["9.3", "9.4"] },
    { "id": 40, "tasks": ["9.5"] },
    { "id": 41, "tasks": ["9.6"] },
    { "id": 42, "tasks": ["9.7"] },
    { "id": 43, "tasks": ["10.1"] },
    { "id": 44, "tasks": ["10.2"] },
    { "id": 45, "tasks": ["10.3", "10.4", "10.5", "10.6"] },
    { "id": 46, "tasks": ["10.7", "10.8"] },
    { "id": 47, "tasks": ["10.9"] }
  ]
}
```
