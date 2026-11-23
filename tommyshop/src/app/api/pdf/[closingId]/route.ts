import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSignedUrl } from '@/lib/supabase/admin';
import { generateDailyAdminPdf, generateDailySalesPdf } from '@/lib/services/report';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ closingId: string }> }
) {
  let profile;
  try {
    profile = await requireRole('SALES');
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { closingId } = await params;
  const role = profile.role;

  const closing = await prisma.dailyClosing.findUnique({ where: { id: closingId } });
  if (!closing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    let signedUrl: string;

    if (role === 'ADMIN') {
      // Generate if path not set, otherwise refresh signature
      if (!closing.pdfAdminPath) {
        signedUrl = await generateDailyAdminPdf(closingId);
      } else {
        signedUrl = await getSignedUrl('reports', closing.pdfAdminPath, 300);
      }
    } else {
      // SALES role gets the sales PDF (omits gross profit)
      if (!closing.pdfSalesPath) {
        signedUrl = await generateDailySalesPdf(closingId);
      } else {
        signedUrl = await getSignedUrl('reports', closing.pdfSalesPath, 300);
      }
    }

    return NextResponse.redirect(signedUrl);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    );
  }
}
