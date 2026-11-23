import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import './fonts';
import { FONT_FAMILY } from './fonts';

const s = StyleSheet.create({
  page: { padding: 32, fontFamily: FONT_FAMILY, fontSize: 10 },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 8 },
  subtitle: { fontSize: 10, color: '#6b7280', marginBottom: 16 },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 3,
  },
  cell: { fontSize: 9, flex: 1, paddingHorizontal: 4, fontFamily: FONT_FAMILY },
  headerCell: {
    fontSize: 8,
    flex: 1,
    paddingHorizontal: 4,
    color: '#6b7280',
    fontFamily: FONT_FAMILY,
  },
  right: { textAlign: 'right' },
});

export interface StatementRow {
  date: string;
  items: string;
  amount: string;
  paid: string;
  balance: string;
}

export interface CustomerStatementProps {
  customerName: string;
  fromDate: string;
  toDate: string;
  rows: StatementRow[];
  totalBalance: string;
}

export function CustomerStatement({
  customerName,
  fromDate,
  toDate,
  rows,
  totalBalance,
}: CustomerStatementProps) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>{customerName}</Text>
        <Text style={s.subtitle}>
          Statement: {fromDate} — {toDate}
        </Text>
        <View style={s.headerRow}>
          <Text style={s.headerCell}>Date</Text>
          <Text style={[s.headerCell, { flex: 2 }]}>Items</Text>
          <Text style={[s.headerCell, s.right]}>Amount</Text>
          <Text style={[s.headerCell, s.right]}>Paid</Text>
          <Text style={[s.headerCell, s.right]}>Balance</Text>
        </View>
        {rows.map((row, i) => (
          <View key={i} style={s.row}>
            <Text style={s.cell}>{row.date}</Text>
            <Text style={[s.cell, { flex: 2 }]}>{row.items}</Text>
            <Text style={[s.cell, s.right]}>{row.amount}</Text>
            <Text style={[s.cell, s.right]}>{row.paid}</Text>
            <Text style={[s.cell, s.right]}>{row.balance}</Text>
          </View>
        ))}
        <View style={[s.row, { borderTopWidth: 1, borderTopColor: '#e5e7eb' }]}>
          <Text style={[s.cell, { flex: 4, fontWeight: 700 }]}>Total Balance</Text>
          <Text style={[s.cell, s.right, { fontWeight: 700 }]}>{totalBalance}</Text>
        </View>
      </Page>
    </Document>
  );
}
