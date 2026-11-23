import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createSale } from '@/lib/services/sale';
import { CreateSaleSchema } from '@/lib/validators/sale';
import { AuthError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  let profile;
  try {
    profile = await requireRole('SALES');
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }

  const body = await req.json();
  const parsed = CreateSaleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // Idempotency check
  const existing = await prisma.sale.findUnique({ where: { clientId: parsed.data.clientId } });
  if (existing) {
    return NextResponse.json({ sale: existing }, { status: 200 });
  }

  try {
    const sale = await prisma.$transaction(tx =>
      createSale(tx, profile.id, profile.role, parsed.data)
    );
    return NextResponse.json({ sale }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
