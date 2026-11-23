-- Tommy Market – Initial Migration
-- Generated from prisma/schema.prisma
-- Apply via: npx prisma migrate deploy

-- ─────────────────────────── Enums ───────────────────────────

CREATE TYPE "Role" AS ENUM ('ADMIN', 'SALES');

CREATE TYPE "Unit" AS ENUM ('KG', 'PIECE');

CREATE TYPE "MovementType" AS ENUM (
  'PURCHASE',
  'SALE',
  'SALE_VOID',
  'WASTE',
  'ADJUSTMENT',
  'COUNT_ADJUSTMENT'
);

CREATE TYPE "SaleStatus" AS ENUM ('COMPLETED', 'VOIDED');

CREATE TYPE "PayMethod" AS ENUM ('CASH', 'TRANSFER');

CREATE TYPE "PayKind" AS ENUM ('SALE', 'DEBT');

CREATE TYPE "VerifyStatus" AS ENUM (
  'NOT_REQUIRED',
  'PENDING',
  'VERIFIED',
  'REJECTED'
);

CREATE TYPE "DayStatus" AS ENUM ('OPEN', 'CLOSED');

-- ─────────────────────────── Profile ───────────────────────────

CREATE TABLE "Profile" (
  "id"        UUID         NOT NULL,
  "fullName"  TEXT         NOT NULL,
  "phone"     TEXT,
  "username"  TEXT         NOT NULL,
  "role"      "Role"       NOT NULL DEFAULT 'SALES',
  "isActive"  BOOLEAN      NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Profile_phone_key"    ON "Profile"("phone");
CREATE UNIQUE INDEX "Profile_username_key" ON "Profile"("username");

-- ─────────────────────────── Item ───────────────────────────

CREATE TABLE "Item" (
  "id"            UUID           NOT NULL DEFAULT gen_random_uuid(),
  "name"          TEXT           NOT NULL,
  "nameAm"        TEXT,
  "unit"          "Unit"         NOT NULL DEFAULT 'KG',
  "category"      TEXT,
  "sellPrice"     DECIMAL(12,2)  NOT NULL,
  "avgCost"       DECIMAL(12,2)  NOT NULL DEFAULT 0,
  "stockQty"      DECIMAL(12,3)  NOT NULL DEFAULT 0,
  "lowStockLevel" DECIMAL(12,3)  NOT NULL DEFAULT 0,
  "isActive"      BOOLEAN        NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Item_name_key" ON "Item"("name");

-- ─────────────────────────── PriceHistory ───────────────────────────

CREATE TABLE "PriceHistory" (
  "id"            UUID           NOT NULL DEFAULT gen_random_uuid(),
  "itemId"        UUID           NOT NULL,
  "sellPrice"     DECIMAL(12,2)  NOT NULL,
  "effectiveFrom" TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "setById"       UUID,

  CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PriceHistory_itemId_effectiveFrom_idx" ON "PriceHistory"("itemId", "effectiveFrom");

-- ─────────────────────────── Supplier ───────────────────────────

CREATE TABLE "Supplier" (
  "id"       UUID    NOT NULL DEFAULT gen_random_uuid(),
  "name"     TEXT    NOT NULL,
  "phone"    TEXT,
  "note"     TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- ─────────────────────────── Purchase ───────────────────────────

CREATE TABLE "Purchase" (
  "id"           UUID           NOT NULL DEFAULT gen_random_uuid(),
  "supplierId"   UUID,
  "purchaseDate" DATE           NOT NULL,
  "totalCost"    DECIMAL(14,2)  NOT NULL,
  "amountPaid"   DECIMAL(14,2)  NOT NULL DEFAULT 0,
  "note"         TEXT,
  "createdById"  UUID           NOT NULL,
  "createdAt"    TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Purchase_purchaseDate_idx" ON "Purchase"("purchaseDate");

-- ─────────────────────────── PurchaseItem ───────────────────────────

CREATE TABLE "PurchaseItem" (
  "id"         UUID          NOT NULL DEFAULT gen_random_uuid(),
  "purchaseId" UUID          NOT NULL,
  "itemId"     UUID          NOT NULL,
  "qty"        DECIMAL(12,3) NOT NULL,
  "unitCost"   DECIMAL(12,2) NOT NULL,
  "lineTotal"  DECIMAL(14,2) NOT NULL,

  CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id")
);

-- ─────────────────────────── Customer ───────────────────────────

CREATE TABLE "Customer" (
  "id"          UUID          NOT NULL DEFAULT gen_random_uuid(),
  "name"        TEXT          NOT NULL,
  "phone"       TEXT,
  "address"     TEXT,
  "creditLimit" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "maxDebtDays" INTEGER,
  "isActive"    BOOLEAN       NOT NULL DEFAULT true,
  "note"        TEXT,
  "createdAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- ─────────────────────────── Sale ───────────────────────────

CREATE TABLE "Sale" (
  "id"           UUID           NOT NULL DEFAULT gen_random_uuid(),
  "number"       SERIAL         NOT NULL,
  "clientId"     TEXT,
  "businessDate" DATE           NOT NULL,
  "customerId"   UUID,
  "createdById"  UUID           NOT NULL,
  "status"       "SaleStatus"   NOT NULL DEFAULT 'COMPLETED',
  "total"        DECIMAL(14,2)  NOT NULL,
  "paidAmount"   DECIMAL(14,2)  NOT NULL DEFAULT 0,
  "balanceDue"   DECIMAL(14,2)  NOT NULL DEFAULT 0,
  "note"         TEXT,
  "createdAt"    TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "voidedAt"     TIMESTAMP(3),
  "voidedById"   UUID,
  "voidReason"   TEXT,

  CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Sale_number_key"   ON "Sale"("number");
CREATE UNIQUE INDEX "Sale_clientId_key" ON "Sale"("clientId");
CREATE INDEX "Sale_businessDate_idx"               ON "Sale"("businessDate");
CREATE INDEX "Sale_customerId_balanceDue_idx"       ON "Sale"("customerId", "balanceDue");

-- ─────────────────────────── SaleItem ───────────────────────────

CREATE TABLE "SaleItem" (
  "id"        UUID          NOT NULL DEFAULT gen_random_uuid(),
  "saleId"    UUID          NOT NULL,
  "itemId"    UUID          NOT NULL,
  "qty"       DECIMAL(12,3) NOT NULL,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "unitCost"  DECIMAL(12,2) NOT NULL,
  "lineTotal" DECIMAL(14,2) NOT NULL,

  CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SaleItem_itemId_idx" ON "SaleItem"("itemId");

-- ─────────────────────────── Payment ───────────────────────────

CREATE TABLE "Payment" (
  "id"             UUID           NOT NULL DEFAULT gen_random_uuid(),
  "kind"           "PayKind"      NOT NULL,
  "method"         "PayMethod"    NOT NULL,
  "amount"         DECIMAL(14,2)  NOT NULL,
  "businessDate"   DATE           NOT NULL,
  "saleId"         UUID,
  "customerId"     UUID,
  "receivedById"   UUID           NOT NULL,
  "bankName"       TEXT,
  "reference"      TEXT,
  "screenshotPath" TEXT,
  "imageHash"      TEXT,
  "verifyStatus"   "VerifyStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  "verifiedById"   UUID,
  "verifiedAt"     TIMESTAMP(3),
  "rejectReason"   TEXT,
  "createdAt"      TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Payment_imageHash_key"          ON "Payment"("imageHash");
CREATE UNIQUE INDEX "Payment_bankName_reference_key" ON "Payment"("bankName", "reference");
CREATE INDEX "Payment_businessDate_method_verifyStatus_idx"
  ON "Payment"("businessDate", "method", "verifyStatus");

-- ─────────────────────────── PaymentAllocation ───────────────────────────

CREATE TABLE "PaymentAllocation" (
  "id"        UUID          NOT NULL DEFAULT gen_random_uuid(),
  "paymentId" UUID          NOT NULL,
  "saleId"    UUID          NOT NULL,
  "amount"    DECIMAL(14,2) NOT NULL,

  CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentAllocation_saleId_idx" ON "PaymentAllocation"("saleId");

-- ─────────────────────────── StockMovement ───────────────────────────

CREATE TABLE "StockMovement" (
  "id"           UUID           NOT NULL DEFAULT gen_random_uuid(),
  "itemId"       UUID           NOT NULL,
  "type"         "MovementType" NOT NULL,
  "qty"          DECIMAL(12,3)  NOT NULL,
  "unitCost"     DECIMAL(12,2),
  "reason"       TEXT,
  "refType"      TEXT,
  "refId"        UUID,
  "businessDate" DATE           NOT NULL,
  "createdById"  UUID           NOT NULL,
  "createdAt"    TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StockMovement_itemId_businessDate_idx" ON "StockMovement"("itemId", "businessDate");
CREATE INDEX "StockMovement_refType_refId_idx"       ON "StockMovement"("refType", "refId");

-- ─────────────────────────── StockCount ───────────────────────────

CREATE TABLE "StockCount" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "countDate"   DATE         NOT NULL,
  "createdById" UUID         NOT NULL,
  "applied"     BOOLEAN      NOT NULL DEFAULT false,
  "note"        TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StockCount_pkey" PRIMARY KEY ("id")
);

-- ─────────────────────────── StockCountItem ───────────────────────────

CREATE TABLE "StockCountItem" (
  "id"           UUID          NOT NULL DEFAULT gen_random_uuid(),
  "stockCountId" UUID          NOT NULL,
  "itemId"       UUID          NOT NULL,
  "systemQty"    DECIMAL(12,3) NOT NULL,
  "countedQty"   DECIMAL(12,3) NOT NULL,
  "difference"   DECIMAL(12,3) NOT NULL,

  CONSTRAINT "StockCountItem_pkey" PRIMARY KEY ("id")
);

-- ─────────────────────────── Expense ───────────────────────────

CREATE TABLE "Expense" (
  "id"           UUID          NOT NULL DEFAULT gen_random_uuid(),
  "businessDate" DATE          NOT NULL,
  "category"     TEXT          NOT NULL,
  "description"  TEXT,
  "amount"       DECIMAL(14,2) NOT NULL,
  "method"       "PayMethod"   NOT NULL DEFAULT 'CASH',
  "createdById"  UUID          NOT NULL,
  "createdAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Expense_businessDate_idx" ON "Expense"("businessDate");

-- ─────────────────────────── DailyClosing ───────────────────────────

CREATE TABLE "DailyClosing" (
  "id"               UUID          NOT NULL DEFAULT gen_random_uuid(),
  "businessDate"     DATE          NOT NULL,
  "status"           "DayStatus"   NOT NULL DEFAULT 'OPEN',
  "totalSales"       DECIMAL(14,2) NOT NULL DEFAULT 0,
  "cashReceived"     DECIMAL(14,2) NOT NULL DEFAULT 0,
  "transferVerified" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "transferPending"  DECIMAL(14,2) NOT NULL DEFAULT 0,
  "creditGiven"      DECIMAL(14,2) NOT NULL DEFAULT 0,
  "debtCollected"    DECIMAL(14,2) NOT NULL DEFAULT 0,
  "cashExpenses"     DECIMAL(14,2) NOT NULL DEFAULT 0,
  "expectedCash"     DECIMAL(14,2) NOT NULL DEFAULT 0,
  "countedCash"      DECIMAL(14,2),
  "cashDifference"   DECIMAL(14,2),
  "grossProfit"      DECIMAL(14,2) NOT NULL DEFAULT 0,
  "pdfVersion"       INTEGER       NOT NULL DEFAULT 0,
  "pdfAdminPath"     TEXT,
  "pdfSalesPath"     TEXT,
  "closedById"       UUID,
  "closedAt"         TIMESTAMP(3),

  CONSTRAINT "DailyClosing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyClosing_businessDate_key" ON "DailyClosing"("businessDate");

-- ─────────────────────────── AuditLog ───────────────────────────

CREATE TABLE "AuditLog" (
  "id"        UUID         NOT NULL DEFAULT gen_random_uuid(),
  "userId"    UUID,
  "action"    TEXT         NOT NULL,
  "entity"    TEXT         NOT NULL,
  "entityId"  TEXT,
  "before"    JSONB,
  "after"     JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
CREATE INDEX "AuditLog_createdAt_idx"        ON "AuditLog"("createdAt");

-- ─────────────────────────── Foreign Keys ───────────────────────────

-- PriceHistory
ALTER TABLE "PriceHistory"
  ADD CONSTRAINT "PriceHistory_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "Item"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Purchase
ALTER TABLE "Purchase"
  ADD CONSTRAINT "Purchase_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Purchase"
  ADD CONSTRAINT "Purchase_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "Profile"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- PurchaseItem
ALTER TABLE "PurchaseItem"
  ADD CONSTRAINT "PurchaseItem_purchaseId_fkey"
  FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PurchaseItem"
  ADD CONSTRAINT "PurchaseItem_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "Item"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sale
ALTER TABLE "Sale"
  ADD CONSTRAINT "Sale_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Sale"
  ADD CONSTRAINT "Sale_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "Profile"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- SaleItem
ALTER TABLE "SaleItem"
  ADD CONSTRAINT "SaleItem_saleId_fkey"
  FOREIGN KEY ("saleId") REFERENCES "Sale"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SaleItem"
  ADD CONSTRAINT "SaleItem_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "Item"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Payment
ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_saleId_fkey"
  FOREIGN KEY ("saleId") REFERENCES "Sale"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_receivedById_fkey"
  FOREIGN KEY ("receivedById") REFERENCES "Profile"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_verifiedById_fkey"
  FOREIGN KEY ("verifiedById") REFERENCES "Profile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- PaymentAllocation
ALTER TABLE "PaymentAllocation"
  ADD CONSTRAINT "PaymentAllocation_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentAllocation"
  ADD CONSTRAINT "PaymentAllocation_saleId_fkey"
  FOREIGN KEY ("saleId") REFERENCES "Sale"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- StockMovement
ALTER TABLE "StockMovement"
  ADD CONSTRAINT "StockMovement_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "Item"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockMovement"
  ADD CONSTRAINT "StockMovement_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "Profile"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- StockCount
ALTER TABLE "StockCount"
  ADD CONSTRAINT "StockCount_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "Profile"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- StockCountItem
ALTER TABLE "StockCountItem"
  ADD CONSTRAINT "StockCountItem_stockCountId_fkey"
  FOREIGN KEY ("stockCountId") REFERENCES "StockCount"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StockCountItem"
  ADD CONSTRAINT "StockCountItem_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "Item"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Expense
ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "Profile"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- DailyClosing
ALTER TABLE "DailyClosing"
  ADD CONSTRAINT "DailyClosing_closedById_fkey"
  FOREIGN KEY ("closedById") REFERENCES "Profile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AuditLog
ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "Profile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
