import { createClient } from '@supabase/supabase-js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Unit, MovementType } from '@prisma/client';
import Decimal from 'decimal.js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// ─── Supabase admin client (service role) ────────────────────────────────────
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Use DIRECT_URL for seeding (bypasses PgBouncer which blocks some operations)
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error('DIRECT_URL or DATABASE_URL must be set in .env.local');

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ─── Seed data ────────────────────────────────────────────────────────────────

const USERS = [
  { username: 'admin',  password: 'TommyAdmin2024!',  fullName: 'Tommy Admin',  role: 'ADMIN' as const },
  { username: 'sales1', password: 'TommySales2024!', fullName: 'Sales Staff',   role: 'SALES' as const },
];

const ITEMS = [
  { name: 'Ambaza',        nameAm: 'አምባዛ',     unit: Unit.KG,    category: 'Meat',    sellPrice: 700,  lowStockLevel: 2 },
  { name: 'Feleto',        nameAm: 'ፌሌቶ',      unit: Unit.KG,    category: 'Meat',    sellPrice: 700,  lowStockLevel: 2 },
  { name: 'Koroso',        nameAm: 'ቆሮሶ',      unit: Unit.KG,    category: 'Meat',    sellPrice: 700,  lowStockLevel: 2 },
  { name: 'Drum stick',    nameAm: 'ድረም ስቲክ',  unit: Unit.KG,    category: 'Chicken', sellPrice: 750,  lowStockLevel: 2 },
  { name: 'Cheese',        nameAm: 'ጥብስ',      unit: Unit.KG,    category: 'Dairy',   sellPrice: 850,  lowStockLevel: 1 },
  { name: 'Telapia',       nameAm: 'ቴላፒያ',     unit: Unit.KG,    category: 'Fish',    sellPrice: 900,  lowStockLevel: 2 },
  { name: 'Nati telapiha', nameAm: 'ናቲ ቴላፒሃ', unit: Unit.KG,    category: 'Fish',    sellPrice: 900,  lowStockLevel: 2 },
  { name: 'Chekin',        nameAm: 'ቺኪን',      unit: Unit.KG,    category: 'Chicken', sellPrice: 1300, lowStockLevel: 2 },
  { name: 'Prop cheese',   nameAm: 'ፕሮፕ ቺዝ',  unit: Unit.KG,    category: 'Dairy',   sellPrice: 1300, lowStockLevel: 1 },
  { name: 'Brest',         nameAm: 'ብሬስት',     unit: Unit.KG,    category: 'Chicken', sellPrice: 1300, lowStockLevel: 2 },
  { name: 'Suwarma',       nameAm: 'ሱዋርማ',     unit: Unit.KG,    category: 'Meat',    sellPrice: 1300, lowStockLevel: 2 },
  { name: 'Whole chekin',  nameAm: 'ሙሉ ቺኪን',  unit: Unit.PIECE, category: 'Chicken', sellPrice: 1200, lowStockLevel: 5 },
  { name: 'Butter',        nameAm: 'ቅቤ',       unit: Unit.PIECE, category: 'Dairy',   sellPrice: 350,  lowStockLevel: 10 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function upsertAuthUser(email: string, password: string): Promise<string> {
  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (created?.user) return created.user.id;

  const msg = createErr?.message?.toLowerCase() ?? '';
  const isAlreadyExists =
    msg.includes('already registered') ||
    msg.includes('already exists') ||
    (createErr as unknown as { code?: string })?.code === 'email_exists';

  if (isAlreadyExists) {
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const existing = list?.users?.find((u) => u.email === email);
    if (existing) return existing.id;
  }

  throw new Error(`Failed to create/find auth user ${email}: ${createErr?.message}`);
}

function calcNewAvg(oldQty: Decimal, oldAvg: Decimal, inQty: Decimal, inCost: Decimal): Decimal {
  if (oldQty.lte(0)) return inCost;
  return oldQty.mul(oldAvg).plus(inQty.mul(inCost)).div(oldQty.plus(inQty));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('▶ Seeding Tommy Market…\n');

  // 1. Auth users + Profiles
  const profileIds: Record<string, string> = {};
  for (const u of USERS) {
    const email = `${u.username}@tommy.local`;
    const authId = await upsertAuthUser(email, u.password);
    await prisma.profile.upsert({
      where:  { id: authId },
      update: { fullName: u.fullName, username: u.username, role: u.role, isActive: true },
      create: { id: authId, fullName: u.fullName, username: u.username, role: u.role, isActive: true },
    });
    profileIds[u.username] = authId;
    console.log(`  ✓ User "${u.username}" (${email})`);
  }

  const adminId = profileIds['admin'];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 2. Items + initial PriceHistory
  const itemIds: Record<string, string> = {};
  for (const item of ITEMS) {
    const upserted = await prisma.item.upsert({
      where:  { name: item.name },
      update: { nameAm: item.nameAm, unit: item.unit, category: item.category, sellPrice: new Decimal(item.sellPrice), lowStockLevel: new Decimal(item.lowStockLevel) },
      create: { name: item.name, nameAm: item.nameAm, unit: item.unit, category: item.category, sellPrice: new Decimal(item.sellPrice), avgCost: new Decimal(0), stockQty: new Decimal(0), lowStockLevel: new Decimal(item.lowStockLevel) },
    });
    itemIds[item.name] = upserted.id;
    const existing = await prisma.priceHistory.findFirst({ where: { itemId: upserted.id } });
    if (!existing) {
      await prisma.priceHistory.create({ data: { itemId: upserted.id, sellPrice: new Decimal(item.sellPrice), setById: adminId } });
    }
  }
  console.log(`\n  ✓ ${ITEMS.length} items upserted`);

  // 3. Opening stock (ADJUSTMENT movements)
  for (const item of ITEMS) {
    const id = itemIds[item.name];
    const qty = item.unit === Unit.KG ? new Decimal(10) : new Decimal(20);
    const existingAdj = await prisma.stockMovement.findFirst({ where: { itemId: id, type: MovementType.ADJUSTMENT, reason: 'Opening stock' } });
    if (!existingAdj) {
      await prisma.stockMovement.create({ data: { itemId: id, type: MovementType.ADJUSTMENT, qty, reason: 'Opening stock', businessDate: today, createdById: adminId } });
    }
    const agg = await prisma.stockMovement.aggregate({ where: { itemId: id }, _sum: { qty: true } });
    await prisma.item.update({ where: { id }, data: { stockQty: agg._sum.qty ?? new Decimal(0) } });
  }
  console.log('  ✓ Opening stock set');

  // 4. Sample purchases
  const purchaseDefs = [
    { date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7), note: 'Opening purchase 1',
      items: [{ name: 'Ambaza', qty: 15, unitCost: 450 }, { name: 'Feleto', qty: 12, unitCost: 420 }, { name: 'Chekin', qty: 20, unitCost: 850 }] },
    { date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 4), note: 'Opening purchase 2',
      items: [{ name: 'Telapia', qty: 10, unitCost: 600 }, { name: 'Drum stick', qty: 15, unitCost: 500 }, { name: 'Butter', qty: 30, unitCost: 200 }] },
    { date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1), note: 'Opening purchase 3',
      items: [{ name: 'Cheese', qty: 8, unitCost: 550 }, { name: 'Brest', qty: 12, unitCost: 850 }, { name: 'Whole chekin', qty: 10, unitCost: 750 }] },
  ];

  for (const def of purchaseDefs) {
    const existingP = await prisma.purchase.findFirst({ where: { note: def.note, purchaseDate: def.date } });
    if (existingP) continue;
    const totalCost = def.items.reduce((s, i) => s.plus(new Decimal(i.qty).mul(i.unitCost)), new Decimal(0));
    const purchase = await prisma.purchase.create({
      data: {
        purchaseDate: def.date, totalCost, amountPaid: totalCost, note: def.note, createdById: adminId,
        items: { create: def.items.map((i) => ({ itemId: itemIds[i.name], qty: new Decimal(i.qty), unitCost: new Decimal(i.unitCost), lineTotal: new Decimal(i.qty).mul(i.unitCost) })) },
      },
    });
    for (const pi of def.items) {
      const id = itemIds[pi.name];
      const inQty = new Decimal(pi.qty);
      const inCost = new Decimal(pi.unitCost);
      await prisma.stockMovement.create({ data: { itemId: id, type: MovementType.PURCHASE, qty: inQty, unitCost: inCost, refType: 'Purchase', refId: purchase.id, businessDate: def.date, createdById: adminId } });
      const current = await prisma.item.findUniqueOrThrow({ where: { id } });
      const newAvg = calcNewAvg(new Decimal(current.stockQty.toString()), new Decimal(current.avgCost.toString()), inQty, inCost);
      const agg = await prisma.stockMovement.aggregate({ where: { itemId: id }, _sum: { qty: true } });
      await prisma.item.update({ where: { id }, data: { avgCost: newAvg, stockQty: agg._sum.qty ?? new Decimal(0) } });
    }
    console.log(`  ✓ Purchase "${def.note}" created`);
  }

  console.log('\n✓ Seed complete\n');
  console.log('Admin user:  admin / TommyAdmin2024!');
  console.log('Sales user:  sales1 / TommySales2024!');
}

main()
  .catch((err) => { console.error('Seed failed:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
