import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const openOldDays = await prisma.dailyClosing.findMany({
    where: { status: 'OPEN', businessDate: { lt: today } },
    select: { id: true, businessDate: true },
    orderBy: { businessDate: 'asc' },
  });

  if (openOldDays.length > 0) {
    console.warn(`[cron] ${openOldDays.length} day(s) not closed:`,
      openOldDays.map(d => d.businessDate.toISOString().slice(0, 10)).join(', ')
    );
  }

  return NextResponse.json({
    checked: new Date().toISOString(),
    openDays: openOldDays.length,
    dates: openOldDays.map(d => d.businessDate.toISOString().slice(0, 10)),
  });
}
