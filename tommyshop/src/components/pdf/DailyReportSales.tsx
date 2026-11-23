import { Document, Page, StyleSheet } from '@react-pdf/renderer';
import './fonts';
import { ReportHeader } from './shared/ReportHeader';
import { SummaryCards } from './shared/SummaryCards';
import { SalesTable } from './shared/SalesTable';
import { ReportFooter } from './shared/ReportFooter';
import { FONT_FAMILY } from './fonts';
import type { DailyReportAdminProps } from './DailyReportAdmin';

const s = StyleSheet.create({
  page: { padding: 32, fontFamily: FONT_FAMILY, fontSize: 10 },
});

// Sales PDF uses the same shape but excludes gross profit from summary
export type DailyReportSalesProps = DailyReportAdminProps;

export function DailyReportSales(props: DailyReportSalesProps) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <ReportHeader
          shopName={props.shopName}
          ethiopianDate={props.ethiopianDate}
          gregorianDate={props.gregorianDate}
          preparedBy={props.preparedBy}
          status={props.status}
          pendingTransfers={props.pendingTransfers}
        />
        <SummaryCards cards={props.summary} />
        <SalesTable rows={props.salesRows} grandTotal={props.grandTotal} />
        <ReportFooter
          reportId={props.reportId}
          version={props.pdfVersion}
          generatedAt={props.generatedAt}
        />
      </Page>
    </Document>
  );
}
