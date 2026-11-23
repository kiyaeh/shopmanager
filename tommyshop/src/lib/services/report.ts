import { renderToBuffer } from '@react-pdf/renderer';
import { createElement } from 'react';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin, getSignedUrl } from '@/lib/supabase/admin';
import { formatETB } from '@/lib/money';
import { formatEthiopian } from '@/lib/ethiopian-date';
import { DailyReportAdmin } from '@/components/pdf/DailyReportAdmin';
import { DailyReportSales } from '@/components/pdf/DailyReportSales';
import { CustomerStatement } from '@/components/pdf/CustomerStatement';

const SHOP_NAME = 'Tommy Market';

async function uploadPdf(buffer: Buffer, path: string): Promise<string> {
  const { error } = await supabaseAdmin.storage
    .from('reports')
    .upload(path, buffer, { contentType: 'application/pdf', upsert: true });
  if (error) throw new Error(`PDF upload failed: ${error.message}`);
  return path;
}

export async function generateDailyAdminPdf(closingId: string): Promise<string> {
  const closing = await prisma.dailyClosing.findUniqueOrThrow({
    where: { id: closingId },
    include: { closedBy: { select: { fullName: true } } },
  });

  const sales = await prisma.sale.findMany({
    where: { businessDate: closing.businessDate, status: 'COMPLETED' },
    include: { items: { include: { item: true } } },
    orderBy: { number: 'asc' },
  });

  const pendingTransfers = await prisma.payment.count({
    where: {
      businessDate: closing.businessDate,
      method: 'TRANSFER',
      verifyStatus: 'PENDING',
    },
  });

  const salesRows = sales.map(sale => ({
    number: sale.number,
    items: sale.items
      .map(si => `${si.item.name} ×${new Decimal(si.qty.toString()).toFixed(3)}`)
      .join(', '),
    total: formatETB(sale.total.toString()),
  }));

  const grandTotal = formatETB(
    sales
      .reduce((s, sale) => s.add(sale.total.toString()), new Decimal(0))
      .toFixed(2)
  );

  const summary = [
    {
      label: 'Total Daily Birr',
      value: `ETB ${formatETB(closing.totalSales.toString())}`,
    },
    {
      label: 'Cash',
      value: `ETB ${formatETB(closing.cashReceived.toString())}`,
    },
    {
      label: 'Transfer Verified',
      value: `ETB ${formatETB(closing.transferVerified.toString())}`,
    },
    {
      label: 'Transfer Pending',
      value: `ETB ${formatETB(closing.transferPending.toString())}`,
    },
    {
      label: 'Credit Given',
      value: `ETB ${formatETB(closing.creditGiven.toString())}`,
    },
    {
      label: 'Debt Collected',
      value: `ETB ${formatETB(closing.debtCollected.toString())}`,
    },
    {
      label: 'Gross Profit',
      value: `ETB ${formatETB(closing.grossProfit.toString())}`,
    },
  ];

  const props = {
    shopName: SHOP_NAME,
    ethiopianDate: formatEthiopian(closing.businessDate),
    gregorianDate: closing.businessDate.toDateString(),
    preparedBy: closing.closedBy?.fullName ?? 'System',
    status: closing.status,
    pendingTransfers,
    pdfVersion: closing.pdfVersion,
    reportId: closing.id.slice(0, 8).toUpperCase(),
    generatedAt: new Date().toISOString(),
    summary,
    salesRows,
    grandTotal,
  };

  const buffer = await renderToBuffer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createElement(DailyReportAdmin, props) as any
  );
  const dateStr = closing.businessDate.toISOString().slice(0, 10);
  const path = `admin/${dateStr}-v${closing.pdfVersion}.pdf`;
  await uploadPdf(Buffer.from(buffer), path);

  await prisma.dailyClosing.update({
    where: { id: closingId },
    data: { pdfAdminPath: path },
  });

  return getSignedUrl('reports', path, 3600);
}

export async function generateDailySalesPdf(closingId: string): Promise<string> {
  const closing = await prisma.dailyClosing.findUniqueOrThrow({
    where: { id: closingId },
    include: { closedBy: { select: { fullName: true } } },
  });

  const sales = await prisma.sale.findMany({
    where: { businessDate: closing.businessDate, status: 'COMPLETED' },
    include: { items: { include: { item: true } } },
    orderBy: { number: 'asc' },
  });

  const pendingTransfers = await prisma.payment.count({
    where: {
      businessDate: closing.businessDate,
      method: 'TRANSFER',
      verifyStatus: 'PENDING',
    },
  });

  const salesRows = sales.map(sale => ({
    number: sale.number,
    items: sale.items
      .map(si => `${si.item.name} ×${new Decimal(si.qty.toString()).toFixed(3)}`)
      .join(', '),
    total: formatETB(sale.total.toString()),
  }));

  const grandTotal = formatETB(
    sales
      .reduce((s, sale) => s.add(sale.total.toString()), new Decimal(0))
      .toFixed(2)
  );

  // Sales PDF excludes gross profit (Requirement 8.9)
  const summary = [
    {
      label: 'Total Daily Birr',
      value: `ETB ${formatETB(closing.totalSales.toString())}`,
    },
    {
      label: 'Cash',
      value: `ETB ${formatETB(closing.cashReceived.toString())}`,
    },
    {
      label: 'Transfer Verified',
      value: `ETB ${formatETB(closing.transferVerified.toString())}`,
    },
    {
      label: 'Transfer Pending',
      value: `ETB ${formatETB(closing.transferPending.toString())}`,
    },
    {
      label: 'Credit Given',
      value: `ETB ${formatETB(closing.creditGiven.toString())}`,
    },
    {
      label: 'Debt Collected',
      value: `ETB ${formatETB(closing.debtCollected.toString())}`,
    },
  ];

  const props = {
    shopName: SHOP_NAME,
    ethiopianDate: formatEthiopian(closing.businessDate),
    gregorianDate: closing.businessDate.toDateString(),
    preparedBy: closing.closedBy?.fullName ?? 'System',
    status: closing.status,
    pendingTransfers,
    pdfVersion: closing.pdfVersion,
    reportId: closing.id.slice(0, 8).toUpperCase(),
    generatedAt: new Date().toISOString(),
    summary,
    salesRows,
    grandTotal,
  };

  const buffer = await renderToBuffer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createElement(DailyReportSales, props) as any
  );
  const dateStr = closing.businessDate.toISOString().slice(0, 10);
  const path = `sales/${dateStr}-v${closing.pdfVersion}.pdf`;
  await uploadPdf(Buffer.from(buffer), path);

  await prisma.dailyClosing.update({
    where: { id: closingId },
    data: { pdfSalesPath: path },
  });

  return getSignedUrl('reports', path, 3600);
}

export async function generateCustomerStatementPdf(
  customerId: string,
  from: Date,
  to: Date
): Promise<string> {
  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: customerId },
  });

  const sales = await prisma.sale.findMany({
    where: {
      customerId,
      status: 'COMPLETED',
      businessDate: { gte: from, lte: to },
    },
    include: { items: { include: { item: true } } },
    orderBy: { businessDate: 'asc' },
  });

  const rows = sales.map(sale => ({
    date: formatEthiopian(sale.businessDate),
    items: sale.items.map(si => si.item.name).join(', '),
    amount: formatETB(sale.total.toString()),
    paid: formatETB(sale.paidAmount.toString()),
    balance: formatETB(sale.balanceDue.toString()),
  }));

  const totalBalance = formatETB(
    sales
      .reduce((s, sale) => s.add(sale.balanceDue.toString()), new Decimal(0))
      .toFixed(2)
  );

  const props = {
    customerName: customer.name,
    fromDate: formatEthiopian(from),
    toDate: formatEthiopian(to),
    rows,
    totalBalance,
  };

  const buffer = await renderToBuffer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createElement(CustomerStatement, props) as any
  );
  const path = `statements/${customerId}-${Date.now()}.pdf`;
  await uploadPdf(Buffer.from(buffer), path);

  return getSignedUrl('reports', path, 3600);
}
