import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { FONT_FAMILY } from '../fonts';

const s = StyleSheet.create({
  table: { marginBottom: 12 },
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
  cell: { fontSize: 9, fontFamily: FONT_FAMILY, flex: 1, paddingHorizontal: 4 },
  headerCell: {
    fontSize: 8,
    fontFamily: FONT_FAMILY,
    flex: 1,
    paddingHorizontal: 4,
    color: '#6b7280',
  },
  amountCell: { textAlign: 'right' },
  total: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
});

interface SaleRow {
  number: number;
  items: string;
  total: string;
}

export function SalesTable({
  rows,
  grandTotal,
}: {
  rows: SaleRow[];
  grandTotal: string;
}) {
  return (
    <View style={s.table}>
      <View style={s.headerRow}>
        <Text style={s.headerCell}>Sale #</Text>
        <Text style={[s.headerCell, { flex: 3 }]}>Items</Text>
        <Text style={[s.headerCell, s.amountCell]}>Amount (ETB)</Text>
      </View>
      {rows.map(row => (
        <View key={row.number} style={s.row}>
          <Text style={s.cell}>#{row.number}</Text>
          <Text style={[s.cell, { flex: 3 }]}>{row.items}</Text>
          <Text style={[s.cell, s.amountCell]}>{row.total}</Text>
        </View>
      ))}
      <View style={s.total}>
        <Text style={[s.cell, { flex: 4, fontWeight: 700 }]}>Total</Text>
        <Text style={[s.cell, s.amountCell, { fontWeight: 700 }]}>{grandTotal}</Text>
      </View>
    </View>
  );
}
