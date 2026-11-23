-- ============================================================
-- Migration: Enable Row Level Security — deny-all for anon role
--
-- Purpose: Prevents Supabase's public API key (anon role) from
-- reading or writing any application table directly.
-- All database access goes through Prisma with the service role
-- connection string, which bypasses RLS entirely.
-- Authorization is enforced server-side via requireRole().
--
-- This migration is idempotent:
--   - Each ALTER TABLE is safe to re-run (enabling RLS twice is a no-op)
--   - Each policy drops the old one first (DROP POLICY IF EXISTS)
-- ============================================================

-- Profile
ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon" ON "Profile";
CREATE POLICY "deny_anon" ON "Profile" FOR ALL TO anon USING (false);

-- Item
ALTER TABLE "Item" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon" ON "Item";
CREATE POLICY "deny_anon" ON "Item" FOR ALL TO anon USING (false);

-- PriceHistory
ALTER TABLE "PriceHistory" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon" ON "PriceHistory";
CREATE POLICY "deny_anon" ON "PriceHistory" FOR ALL TO anon USING (false);

-- Sale
ALTER TABLE "Sale" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon" ON "Sale";
CREATE POLICY "deny_anon" ON "Sale" FOR ALL TO anon USING (false);

-- SaleItem
ALTER TABLE "SaleItem" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon" ON "SaleItem";
CREATE POLICY "deny_anon" ON "SaleItem" FOR ALL TO anon USING (false);

-- Payment
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon" ON "Payment";
CREATE POLICY "deny_anon" ON "Payment" FOR ALL TO anon USING (false);

-- PaymentAllocation
ALTER TABLE "PaymentAllocation" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon" ON "PaymentAllocation";
CREATE POLICY "deny_anon" ON "PaymentAllocation" FOR ALL TO anon USING (false);

-- StockMovement
ALTER TABLE "StockMovement" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon" ON "StockMovement";
CREATE POLICY "deny_anon" ON "StockMovement" FOR ALL TO anon USING (false);

-- StockCount
ALTER TABLE "StockCount" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon" ON "StockCount";
CREATE POLICY "deny_anon" ON "StockCount" FOR ALL TO anon USING (false);

-- StockCountItem
ALTER TABLE "StockCountItem" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon" ON "StockCountItem";
CREATE POLICY "deny_anon" ON "StockCountItem" FOR ALL TO anon USING (false);

-- Purchase
ALTER TABLE "Purchase" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon" ON "Purchase";
CREATE POLICY "deny_anon" ON "Purchase" FOR ALL TO anon USING (false);

-- PurchaseItem
ALTER TABLE "PurchaseItem" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon" ON "PurchaseItem";
CREATE POLICY "deny_anon" ON "PurchaseItem" FOR ALL TO anon USING (false);

-- Supplier
ALTER TABLE "Supplier" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon" ON "Supplier";
CREATE POLICY "deny_anon" ON "Supplier" FOR ALL TO anon USING (false);

-- Expense
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon" ON "Expense";
CREATE POLICY "deny_anon" ON "Expense" FOR ALL TO anon USING (false);

-- DailyClosing
ALTER TABLE "DailyClosing" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon" ON "DailyClosing";
CREATE POLICY "deny_anon" ON "DailyClosing" FOR ALL TO anon USING (false);

-- AuditLog
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon" ON "AuditLog";
CREATE POLICY "deny_anon" ON "AuditLog" FOR ALL TO anon USING (false);

-- Customer
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon" ON "Customer";
CREATE POLICY "deny_anon" ON "Customer" FOR ALL TO anon USING (false);
