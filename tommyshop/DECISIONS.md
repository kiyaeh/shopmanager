# DECISIONS.md — Tommy Market

Decisions made during implementation where the spec was ambiguous or required a choice.

## 1. SHA-256 hash — client-computed vs server-recomputed
**Decision:** Compute SHA-256 on the client (via `crypto.subtle.digest`) and send as `imageHash`. The server recomputes the hash from the uploaded file buffer and compares. If they differ, the upload is rejected.
**Reason:** Provides integrity verification without trusting the client-supplied hash alone.

## 2. `Item.stockQty` — cache vs recomputed at read time
**Decision:** `stockQty` is a cached Decimal column, updated on every stock movement in the same Prisma transaction. `npm run stock:reconcile` can verify the cache against `SUM(StockMovement.qty)` and report differences.
**Reason:** Avoids a full aggregate query on every item list render. The reconcile script provides a safety net.

## 3. `SaleItem.unitCost` snapshot
**Decision:** Copy `Item.avgCost` into `SaleItem.unitCost` at the moment of sale creation, inside the same transaction.
**Reason:** Gross profit must remain fixed even if future purchases change `avgCost`. This is explicitly required in the spec.

## 4. `clientId` idempotency
**Decision:** The client generates a UUID before submission. The server checks `sale.findUnique({ where: { clientId } })` at the top of `createSale`; if found, it returns the existing record immediately without re-executing any business logic.
**Reason:** Offline sync may submit the same sale multiple times. The early-return pattern ensures the response is always correct without duplicate side effects.

## 5. RLS deny-all approach
**Decision:** All tables have `ENABLE ROW LEVEL SECURITY` and a single `DENY ALL` policy for the `anon` role. The service role key (used server-side) bypasses RLS entirely.
**Reason:** Prisma connects directly with the service role key, so application-level auth in `requireRole()` is the enforcement layer. RLS is a defence-in-depth measure against direct DB access via the anon key.

## 6. Prisma 7 adapter requirement
**Decision:** Use `@prisma/adapter-pg` with `PrismaPg({ connectionString })` for all Prisma client instances, including the seed script.
**Reason:** Prisma 7 removed the built-in `DATABASE_URL` env-var handling from the generated client. The adapter pattern is now required.

## 7. Migrations use `DIRECT_URL` (port 5432)
**Decision:** `prisma.config.ts` sets `datasource.url` to `DIRECT_URL` (session-mode pooler, port 5432). `DATABASE_URL` (transaction-mode pooler, port 6543) is used only at runtime by the Next.js application.
**Reason:** Prisma Migrate requires advisory locks which are not supported by PgBouncer transaction-mode pooling.

## 8. Customer balance — always calculated, never stored
**Decision:** Outstanding balance is `SUM(sale.balanceDue)` for non-voided sales, computed on demand. No `outstandingBalance` column exists on Customer.
**Reason:** Explicitly required by the spec (Requirement 5.1). Avoids consistency bugs where the cache could drift.

## 9. SALES role cannot see cost/profit
**Decision:** Server queries for SALES users use a select that excludes `unitCost`, `avgCost`, and profit fields. `getSaleForRole()` strips `unitCost` from SaleItem before returning.
**Reason:** The spec requires server-side enforcement, not just UI hiding (Requirement 1.5).

## 10. PDF generation on day close
**Decision:** PDF generation runs after the close transaction succeeds, via dynamic import. PDF failure is caught and logged but does not roll back the close.
**Reason:** PDF generation depends on external services (Supabase Storage) and should not block the financial close operation.
