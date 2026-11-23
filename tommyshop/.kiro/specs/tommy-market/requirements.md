# Requirements Document

## Introduction

Tommy Market is a production-ready sales, inventory, credit, and transfer-verification web application for a small Ethiopian food shop that sells meat, fish, and dairy products by kilogram or by piece. It replaces a manual daily-chat reporting process with a structured, role-controlled digital system. The app supports two roles — ADMIN (owner) and SALES (salesperson) — operates on mobile and desktop, works offline via a PWA queue, displays dates in the Ethiopian calendar by default, and handles all financial values with exact decimal arithmetic.

---

## Glossary

- **System**: The Tommy Market web application.
- **ADMIN**: The shop owner role with full system access.
- **SALES**: The salesperson role with restricted access (no cost/profit visibility).
- **Sale**: A transaction recording one or more items sold with associated payments.
- **SaleItem**: A single line within a Sale representing item, quantity, unit price, and unit cost.
- **Item**: A catalog entry for a product (e.g., "Chekin") with sell price, average cost, stock quantity, and unit.
- **PriceHistory**: A record of every price change made to an Item's sellPrice.
- **Customer**: A named account that can receive credit and make debt payments.
- **Payment**: A cash or transfer amount attached to a Sale or a debt repayment.
- **Transfer**: A bank-transfer payment requiring screenshot upload and admin verification.
- **VerifyStatus**: The state of a Transfer — NOT_REQUIRED, PENDING, VERIFIED, or REJECTED.
- **StockMovement**: An immutable row representing a quantity change to an Item's stock.
- **stockQty**: A cached sum of all StockMovement quantities for an Item.
- **avgCost**: The weighted average cost per unit of an Item, recalculated on every purchase.
- **Purchase**: An ADMIN-recorded inbound stock acquisition from a supplier.
- **Waste**: A WASTE-type StockMovement recording spoiled, trimmed, or sampled stock.
- **StockCount**: A physical count session comparing system stock to counted quantities.
- **Expense**: A dated cash or transfer outgoing cost (transport, electricity, salary, etc.).
- **DailyClosing**: A snapshot of a business day's financial totals saved when the day is closed.
- **AuditLog**: An immutable record of a sensitive action with before/after JSON snapshots.
- **clientId**: A UUID generated on the client device used as an idempotency key for offline sales.
- **imageHash**: The SHA-256 hash of a transfer screenshot used for duplicate detection.
- **Ethiopian Calendar**: The Ethiopian Ge'ez calendar used as the default date display format.
- **Gregorian Calendar**: The international calendar used as an alternative display format.
- **PWA**: Progressive Web App — enables offline operation and home-screen installation.
- **IndexedDB**: Browser-side database used to queue offline sales via the `idb` library.
- **requireRole()**: A server-side helper function that enforces role-based access on every action.
- **Decimal**: An exact-precision decimal value computed using `decimal.js`, never JS floating point.
- **balanceDue**: The unpaid credit amount on a Sale: `total − paidAmount`.
- **creditLimit**: The maximum total outstanding balance allowed for a Customer.
- **maxDebtDays**: The maximum number of days a Customer's debt may remain unpaid before new credit is blocked.
- **lowStockLevel**: The threshold below which an Item's stockQty triggers a low-stock alert.
- **DayStatus**: The open/closed state of a business day — OPEN or CLOSED.
- **PayKind**: Whether a Payment was made at time of sale (SALE) or as a later debt repayment (DEBT).

---

## Requirements

### Requirement 1: Authentication and Role Enforcement

**User Story:** As a shop user, I want to log in with a username and have the system enforce my role, so that only authorized actions are available to me.

#### Acceptance Criteria

1. WHEN a user submits a username and password on the login page, THE System SHALL authenticate the user against Supabase Auth by mapping the username to `username@tommy.local`.
2. WHEN a user successfully authenticates with Supabase Auth, THE System SHALL load the user's Profile from the database; IF the Profile record is missing or the load fails for any reason, THEN THE System SHALL deny the session entirely, roll back the authentication, and return an error to the user.
3. IF a user submits invalid credentials, THEN THE System SHALL display an error message and SHALL NOT establish a session.
4. THE `requireRole()` helper SHALL be invoked on every server action and route handler to verify the authenticated user's role before executing any operation.
5. WHILE a user has the SALES role, THE System SHALL exclude cost price, average cost, and profit fields from all server query responses.
6. IF a SALES user attempts to access an ADMIN-only action, THEN THE System SHALL return an authorization error and SHALL NOT execute the action.
7. THE System SHALL enforce Row Level Security deny-all policies on all public-facing Supabase tables so that the anon key cannot read any application data.
8. WHEN an ADMIN creates or deactivates a user, THE System SHALL write an AuditLog entry with the before and after Profile state.

---

### Requirement 2: Item Catalog and Price History

**User Story:** As an ADMIN, I want to manage the item catalog and track price changes over time, so that I have accurate sell prices and a complete price history.

#### Acceptance Criteria

1. THE System SHALL store each Item with the fields: name, nameAm (Amharic label), unit (KG or PIECE), sellPrice, avgCost, stockQty, lowStockLevel, category, and isActive flag.
2. WHEN an ADMIN changes an Item's sellPrice, THE System SHALL create a PriceHistory row recording the previous price, the new price, the effective timestamp, and the acting user.
3. WHEN an ADMIN changes an Item's sellPrice, THE System SHALL update the Item's sellPrice to the new value.
4. THE System SHALL display each Item's nameAm label alongside the English name in the sales interface.
5. WHEN stockQty is less than or equal to lowStockLevel, THE System SHALL mark the Item as low-stock and display a low-stock alert.
6. THE System SHALL seed the catalog with the following items on first deployment:
   - KG items (sellPrice in ETB): Ambaza 700, Feleto 700, Koroso 700, Drum stick 750, Cheese 850, Telapia 900, Nati telapiha 900, Chekin 1300, Prop cheese 1300, Brest 1300, Suwarma 1300.
   - PIECE items: Whole chekin 1200, Butter 350.

---

### Requirement 3: Sales Entry

**User Story:** As a SALES or ADMIN user, I want to record a sale with line items and payments, so that the shop's daily revenue and stock are tracked accurately.

#### Acceptance Criteria

1. WHEN a user creates a new sale, THE System SHALL allow one or more SaleItems, each with a selected Item, a quantity (Decimal), and a unit price that defaults to the Item's current sellPrice and may be edited per sale.
2. WHEN a sale is saved, THE System SHALL copy the Item's current avgCost into SaleItem.unitCost for each line, so that profit remains fixed at sale time.
3. WHEN a sale is saved, THE System SHALL create one SALE-type StockMovement per SaleItem with a signed negative quantity.
4. WHEN a sale is saved, THE System SHALL update Item.stockQty by applying the SALE movements inside a single Prisma transaction.
5. WHEN a sale is saved, THE System SHALL set Sale.total to the sum of all SaleItem.lineTotal values, computed as `qty × unitPrice` using Decimal arithmetic.
6. THE System SHALL accept a payment split of any combination of cash, transfer, and credit, where `balanceDue = total − sum(payments)`.
7. IF balanceDue is greater than zero, THEN THE System SHALL require a customerId to be associated with the sale before saving.
8. IF a SaleItem quantity exceeds the Item's stockQty AND the user has the SALES role AND the allowNegativeStock setting is disabled, THEN THE System SHALL block the sale and display a clear out-of-stock warning.
9. WHERE the allowNegativeStock setting is enabled OR the user is ADMIN, THE System SHALL permit a sale quantity to exceed current stockQty and SHALL display an informational warning indicating that stock will go negative, without blocking the sale.
10. WHEN a sale is saved, THE System SHALL record a clientId (UUID) for the sale to enable idempotent offline sync.
11. IF a sale submission arrives with a clientId that already exists in the database, THEN THE System SHALL return the existing sale record and SHALL NOT create a duplicate sale.
12. WHEN displaying sale dates, THE System SHALL show the Ethiopian calendar date by default, with a toggle to display the Gregorian calendar date.
13. THE System SHALL display all monetary values as Decimal (ETB) values, never using JS floating point arithmetic.
14. WHEN a sale contains a transfer payment, THE System SHALL require the user to supply a bank name, reference number, and screenshot before saving the payment.

---

### Requirement 4: Transfer Verification

**User Story:** As an ADMIN, I want to verify or reject transfer payment screenshots, so that only confirmed transfers are counted as revenue.

#### Acceptance Criteria

1. WHEN a transfer payment is submitted, THE System SHALL compute the SHA-256 hash of the uploaded screenshot and store it as imageHash.
2. IF a submitted transfer has the same (bankName, reference) pair as an existing payment, THEN THE System SHALL reject the submission and display the name of the user who submitted the original and the date it was submitted.
3. IF a submitted transfer has an imageHash matching an existing payment's imageHash, THEN THE System SHALL reject the submission and display the duplicate information.
4. WHEN a transfer payment is saved without a duplicate conflict, THE System SHALL set verifyStatus to PENDING.
5. THE System SHALL store transfer screenshots in a private Supabase Storage bucket named `transfer-screenshots` and SHALL serve them via short-lived signed URLs.
6. THE System SHALL display a Transfers queue to ADMIN users showing each pending transfer with the screenshot on one side and the entered details (bank, reference, amount) on the other side.
7. WHEN an ADMIN verifies a transfer, THE System SHALL set verifyStatus to VERIFIED and record the verifying admin's ID and the verification timestamp.
8. WHEN an ADMIN rejects a transfer, THE System SHALL require a rejection reason, set verifyStatus to REJECTED, and write an AuditLog entry.
9. THE System SHALL support bulk verification of multiple PENDING transfers by an ADMIN in a single action.
10. WHILE a transfer's verifyStatus is PENDING or REJECTED, THE System SHALL NOT count the transfer amount as confirmed revenue in any report or closing snapshot.
11. WHEN a transfer is REJECTED, THE System SHALL reflect the rejected amount as an unpaid credit balance for the associated customer and display a flag on the admin dashboard; WHEN the customer's unpaid credit balance returns to zero, THE System SHALL automatically clear the dashboard flag without requiring manual admin action.

---

### Requirement 5: Credit and Debt Management

**User Story:** As an ADMIN or SALES user, I want to manage customer credit and debt payments, so that outstanding balances are tracked accurately and risk is controlled.

#### Acceptance Criteria

1. THE System SHALL calculate a Customer's outstanding balance as the sum of balanceDue across all non-voided Sales for that customer; this value SHALL NOT be stored as a column.
2. IF a new sale would cause a Customer's outstanding balance plus the new balanceDue to exceed the Customer's creditLimit, THEN THE System SHALL block the sale unless an ADMIN explicitly overrides the block; the override SHALL apply only to the single sale being created at that moment and SHALL NOT affect any other pending sales for that customer.
3. IF a Customer has any unpaid sale with a businessDate older than the Customer's maxDebtDays, THEN THE System SHALL block new credit sales for that customer unless an ADMIN explicitly overrides the block.
4. WHEN a debt payment is recorded, THE System SHALL allocate the payment amount to the Customer's oldest unpaid sales first by default, creating PaymentAllocation rows and reducing each Sale's balanceDue accordingly.
5. WHEN a user records a debt payment, THE System SHALL allow the user to manually select specific sales for allocation instead of using the oldest-first default.
6. WHILE a transfer debt payment's verifyStatus is PENDING, THE System SHALL NOT reduce any Sale's balanceDue.
7. WHEN a VERIFIED transfer debt payment is confirmed, THE System SHALL apply the allocation and reduce the relevant Sale balanceDue values inside a single Prisma transaction.
8. WHEN an ADMIN writes off a Customer's debt, THE System SHALL require a written reason, record the write-off in an AuditLog entry with before/after JSON, and reduce balanceDue to zero for the written-off sales.
9. THE System SHALL display customer aging buckets grouping outstanding balances into 0–7 days, 8–15 days, 16–30 days, and 30+ days overdue.
10. THE System SHALL generate a customer statement PDF containing the sale date (Ethiopian calendar), items, amount, amount paid, and remaining balance for each transaction.

---

### Requirement 6: Inventory Management

**User Story:** As an ADMIN, I want to record purchases, waste, and stock counts, so that the shop's inventory and average costs are always accurate.

#### Acceptance Criteria

1. THE System SHALL treat StockMovement rows as the single source of truth for stock levels; Item.stockQty SHALL be a cache equal to the sum of all StockMovement.qty values for that item.
2. WHEN an ADMIN records a purchase, THE System SHALL create a Purchase record, one PurchaseItem per line, and one PURCHASE-type StockMovement per item with a positive quantity.
3. WHEN an ADMIN records a purchase, THE System SHALL update Item.avgCost using the weighted average formula: `newAvg = (oldQty × oldAvg + inQty × inCost) / (oldQty + inQty)`; IF oldQty is less than or equal to zero, THEN THE System SHALL set newAvg to inCost.
4. THE System SHALL validate that every PurchaseItem has an inQty greater than zero; IF a purchase line has an inQty of zero or less, THEN THE System SHALL reject the purchase input before saving.
5. WHEN an ADMIN records waste, THE System SHALL require a reason (spoiled, trimmed, sample, or other), create a WASTE-type StockMovement with a negative quantity, and update Item.stockQty.
6. WHEN an ADMIN initiates a stock count, THE System SHALL display the current system quantity alongside an input for the counted quantity for each active Item.
7. WHEN an ADMIN applies a stock count, THE System SHALL create COUNT_ADJUSTMENT-type StockMovement rows for each item where countedQty differs from systemQty, using `difference = countedQty − systemQty`.
8. THE System SHALL provide a stock reconciliation script (`npm run stock:reconcile`) that recomputes Item.stockQty from the sum of all StockMovement rows and reports any discrepancies.
9. WHEN stockQty is less than or equal to lowStockLevel for any active item, THE System SHALL display a low-stock alert in both the SALES stock view and the ADMIN dashboard.
10. THE System SHALL record all purchase, waste, adjustment, and stock count writes inside a single Prisma transaction.
11. WHEN an ADMIN edits a purchase record after a business day has been closed, THE System SHALL write an AuditLog entry recording the before and after state.

---

### Requirement 7: Sale Voiding

**User Story:** As an ADMIN, I want to void a sale when an error is found, so that stock, balances, and reports remain consistent without destroying historical data.

#### Acceptance Criteria

1. WHEN an ADMIN voids a sale, THE System SHALL require a written void reason before accepting the action.
2. WHEN an ADMIN voids a sale, THE System SHALL atomically set Sale.status to VOIDED and record voidedAt, voidedById, and voidReason within a single transaction; IF any part of the void operation fails (including recording voidedAt), THEN THE System SHALL roll back the entire transaction and the sale SHALL remain in its prior non-VOIDED status.
3. WHEN an ADMIN voids a sale, THE System SHALL create one SALE_VOID-type StockMovement per original SaleItem with a positive quantity equal to the original sale quantity, restoring stock.
4. WHEN an ADMIN voids a sale, THE System SHALL update Item.stockQty for each affected item inside the same Prisma transaction.
5. WHEN an ADMIN voids a sale that had credit (balanceDue > 0), THE System SHALL reverse the Customer's outstanding balance by zeroing the Sale's balanceDue within the same transaction.
6. WHEN a sale is voided, THE System SHALL write an AuditLog entry with the sale's before and after state.
7. THE System SHALL never hard-delete Sale, SaleItem, Payment, or StockMovement rows.
8. THE System SHALL exclude VOIDED sales from revenue, gross profit, and closing snapshot calculations.

---

### Requirement 8: Daily Closing

**User Story:** As a SALES user, I want to submit my counted cash at the end of the day, and as an ADMIN, I want to close the day and lock it, so that financial records are finalized and reports are generated.

#### Acceptance Criteria

1. WHEN a SALES user submits end-of-day, THE System SHALL record the counted cash amount and display the difference between expected cash and counted cash.
2. THE System SHALL calculate expectedCash as: `cashReceived (sales + debt payments in cash) − cashExpenses`.
3. WHEN an ADMIN performs the final close of a business day, THE System SHALL save a DailyClosing snapshot containing: totalSales, cashReceived, transferVerified, transferPending, creditGiven, debtCollected, cashExpenses, expectedCash, countedCash, cashDifference, and grossProfit.
4. WHEN an ADMIN closes a day, THE System SHALL generate an Admin PDF report and a Sales PDF report, store both in the private `reports` Supabase Storage bucket, and record their paths in DailyClosing.pdfAdminPath and DailyClosing.pdfSalesPath.
5. WHILE a business day's DayStatus is CLOSED, THE System SHALL prevent SALES users from creating or editing any sales, payments, or expenses for that day.
6. WHEN an ADMIN reopens a closed day, THE System SHALL require a written reason before accepting the action; IF no reason is provided, THEN THE System SHALL reject the reopen request and DayStatus SHALL remain CLOSED; WHEN a reason is provided, THE System SHALL write an AuditLog entry with the before and after DailyClosing state, and set DayStatus back to OPEN.
7. WHEN an ADMIN closes a previously reopened day, THE System SHALL increment DailyClosing.pdfVersion, generate new PDF reports, and retain the old PDF files in storage.
8. THE System SHALL display a "days not closed" alert on the ADMIN dashboard for any business date that has an OPEN DayStatus older than the current business date.
9. THE Sales PDF SHALL contain the same information as the Admin PDF but SHALL exclude cost prices, average costs, profit margins, and profit figures.

---

### Requirement 9: Reports and Dashboard

**User Story:** As an ADMIN, I want to view charts, download reports, and see action alerts on a dashboard, so that I can monitor the shop's financial and operational health.

#### Acceptance Criteria

1. THE System SHALL display an ADMIN dashboard showing today's totals versus yesterday's totals for cash, transfer, credit, and gross profit.
2. THE System SHALL render a 7-day and 30-day sales trend chart on the ADMIN dashboard using Recharts, breaking down sales by cash, transfer, and credit.
3. THE System SHALL display the following action cards on the ADMIN dashboard: pending transfer count, overdue credit customer count, low-stock item count, and count of business days not yet closed.
4. THE System SHALL generate daily, weekly, and monthly PDF reports using `@react-pdf/renderer` on the server, with the Noto Sans Ethiopic font embedded for correct Amharic rendering.
5. THE System SHALL generate Excel (xlsx) exports for daily, weekly, and monthly report periods.
6. THE Admin PDF report SHALL include: header (shop name, Ethiopian date, Gregorian date, preparer, status), summary cards, sales table with item subtotals, payment breakdown, transfers list (with statuses), credit summary, cash check, low-stock and waste summary, profit by item and margin, and a footer with report ID, version, generated time, and QR code linking to the day in the app.
7. THE System SHALL store generated PDF reports in the private `reports` Supabase Storage bucket and serve them via short-lived signed URLs.
8. THE System SHALL display a profit-by-item report showing gross profit and margin per item for a selected date range (ADMIN only).
9. THE System SHALL filter the sales list by date range (Ethiopian calendar picker), user, item, payment type, and customer.

---

### Requirement 10: PWA and Offline Queue

**User Story:** As a SALES user operating in an area with unreliable internet, I want to record sales offline and have them sync automatically when connectivity returns, so that no sale data is lost.

#### Acceptance Criteria

1. THE System SHALL be installable as a PWA with a web app manifest and service worker.
2. WHEN a SALES user creates a sale while offline, THE System SHALL save the sale to an IndexedDB queue using the `idb` library with a UUID clientId as the idempotency key.
3. WHEN internet connectivity is restored, THE System SHALL automatically submit all queued offline sales to the `/api/sync` route handler.
4. WHEN the sync route handler receives a sale with a clientId that already exists in the database, THE System SHALL return HTTP 200 with the existing sale record and SHALL NOT create a duplicate, treating the duplicate submission as a successful idempotent no-op.
5. THE System SHALL display a sync status badge on the Today screen indicating the number of unsynced sales in the queue.
6. WHILE sales are queued offline, THE System SHALL display the queued sales in the Today view with a "pending sync" indicator.

---

### Requirement 11: Audit Logging

**User Story:** As an ADMIN, I want every sensitive action to be logged with before/after snapshots, so that I have a complete audit trail for accountability and troubleshooting.

#### Acceptance Criteria

1. THE System SHALL write an AuditLog entry for each of the following actions: sale void, item price change, any edit made after a day is closed, transfer verify, transfer reject, debt write-off, stock adjustment, purchase edit, user role change, day close, and day reopen; IF writing the AuditLog entry fails for any reason, THEN THE System SHALL block and roll back the triggering action entirely.
2. WHEN writing an AuditLog entry, THE System SHALL record: the acting user's ID, the action type, the entity name, the entity ID, a JSON snapshot of the state before the action, and a JSON snapshot of the state after the action.
3. THE System SHALL provide an ADMIN audit log viewer that filters entries by entity type, entity ID, acting user, and date range.
4. THE System SHALL never allow AuditLog rows to be deleted or modified through the application.

---

### Requirement 12: Ethiopian Date Display

**User Story:** As a shop user, I want dates displayed in the Ethiopian calendar format by default, so that the app matches the date conventions I use every day.

#### Acceptance Criteria

1. THE System SHALL implement an Ethiopian calendar conversion utility in `lib/ethiopian-date.ts` that converts between Gregorian `Date` objects and Ethiopian calendar dates (year, month, day).
2. THE System SHALL display all business dates throughout the UI in Ethiopian calendar format by default.
3. THE System SHALL provide a toggle control on date-displaying screens to switch the display between Ethiopian and Gregorian calendar formats.
4. THE System SHALL store all dates in the database as standard PostgreSQL `Date` or `DateTime` values in the Gregorian calendar.
5. THE Ethiopian_Date_Converter SHALL produce correct Ethiopian dates for all Gregorian input dates including leap year boundaries.
6. FOR ALL valid Ethiopian calendar dates, converting to Gregorian and then back to Ethiopian SHALL produce the original Ethiopian date (round-trip property).

---

### Requirement 13: Decimal Arithmetic and Data Integrity

**User Story:** As a business owner, I want all money and quantity calculations to use exact decimal arithmetic, so that rounding errors never cause financial discrepancies.

#### Acceptance Criteria

1. THE System SHALL use the `decimal.js` library (via Prisma's Decimal type) for all monetary and quantity calculations; JavaScript native floating-point arithmetic SHALL NOT be used for any money or kg value.
2. THE System SHALL wrap all writes that touch stock quantity, sale totals, payment amounts, and closing snapshots in a single `prisma.$transaction` call.
3. THE System SHALL expose a health-check page (ADMIN only) that verifies the following invariants across all data:
   - FOR ALL items: `Item.stockQty` equals the sum of all `StockMovement.qty` for that item.
   - FOR ALL non-voided sales: `Sale.balanceDue` equals `Sale.total − Sale.paidAmount` and is not negative.
   - FOR ALL payments: no two payment rows share the same `(bankName, reference)` pair.
   - FOR ALL payments: no two payment rows share the same `imageHash` value.
4. THE System SHALL calculate Sale gross profit as the sum of `qty × (unitPrice − unitCost)` across all non-voided SaleItems for the sale.
5. THE System SHALL calculate net profit for a period as gross profit minus total cash expenses for that period; THE System SHALL enforce that only non-voided sales contribute to any profit or revenue calculation, treating inclusion of voided sales as an invalid state.

---

### Requirement 14: Security and File Handling

**User Story:** As a shop owner, I want the system to enforce security best practices, so that customer data, financial data, and uploaded files are protected.

#### Acceptance Criteria

1. THE System SHALL validate that every uploaded file is an image (JPEG, PNG, or WebP) and does not exceed 5 MB after client-side compression before accepting it.
2. THE System SHALL store all uploaded screenshots and reports in private Supabase Storage buckets and SHALL serve them only via short-lived signed URLs.
3. THE System SHALL apply rate limiting to the login endpoint to prevent brute-force attacks.
4. THE System SHALL validate all form inputs on the server using shared Zod schemas, independent of client-side validation.
5. THE System SHALL not expose any secret keys, database credentials, or storage credentials in client-side code or API responses.
6. THE System SHALL implement server-side role checks via `requireRole()` on every server action and route handler; role enforcement SHALL NOT rely solely on UI-level hiding.
