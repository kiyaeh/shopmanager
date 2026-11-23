'use server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { closeDay, reopenDay } from '@/lib/services/closing';

export async function closeDayAction(dateStr: string) {
  const admin = await requireRole('ADMIN');
  const businessDate = new Date(dateStr);
  businessDate.setHours(0, 0, 0, 0);
  try {
    await prisma.$transaction(tx => closeDay(tx, admin.id, businessDate));

    // Generate PDFs after close — failure does not block the close
    try {
      const { generateDailyAdminPdf, generateDailySalesPdf } = await import(
        '@/lib/services/report'
      );
      const closing = await prisma.dailyClosing.findUnique({ where: { businessDate } });
      if (closing) {
        await Promise.all([
          generateDailyAdminPdf(closing.id),
          generateDailySalesPdf(closing.id),
        ]);
      }
    } catch (err) {
      console.error('PDF generation failed:', err);
    }

    revalidatePath(`/admin/reports/${dateStr}`);
    revalidatePath('/admin/reports');
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Failed' };
  }
}

export async function reopenDayAction(dateStr: string, reason: string) {
  const admin = await requireRole('ADMIN');
  if (!reason.trim()) return { ok: false as const, error: 'Reason is required' };
  const businessDate = new Date(dateStr);
  businessDate.setHours(0, 0, 0, 0);
  try {
    await prisma.$transaction(tx => reopenDay(tx, admin.id, businessDate, reason));
    revalidatePath(`/admin/reports/${dateStr}`);
    revalidatePath('/admin/reports');
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Failed' };
  }
}
