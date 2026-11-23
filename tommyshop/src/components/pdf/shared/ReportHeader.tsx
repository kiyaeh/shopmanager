import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { FONT_FAMILY } from '../fonts';

const s = StyleSheet.create({
  header: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 12,
  },
  shopName: { fontSize: 18, fontWeight: 700, fontFamily: FONT_FAMILY },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  label: { fontSize: 9, color: '#6b7280', fontFamily: FONT_FAMILY },
  value: { fontSize: 10, fontFamily: FONT_FAMILY },
  status: { fontSize: 11, fontWeight: 700, color: '#16a34a', fontFamily: FONT_FAMILY },
  pending: { fontSize: 9, color: '#d97706', fontFamily: FONT_FAMILY },
});

interface Props {
  shopName: string;
  ethiopianDate: string;
  gregorianDate: string;
  preparedBy: string;
  status: string;
  pendingTransfers?: number;
}

export function ReportHeader({
  shopName,
  ethiopianDate,
  gregorianDate,
  preparedBy,
  status,
  pendingTransfers,
}: Props) {
  return (
    <View style={s.header}>
      <Text style={s.shopName}>{shopName}</Text>
      <View style={s.row}>
        <Text style={s.value}>{ethiopianDate}</Text>
        <Text style={s.label}>{gregorianDate}</Text>
      </View>
      <View style={s.row}>
        <Text style={s.label}>Prepared by: {preparedBy}</Text>
        <Text style={s.status}>{status}</Text>
      </View>
      {pendingTransfers != null && pendingTransfers > 0 && (
        <Text style={s.pending}>
          ⚠ {pendingTransfers} transfer(s) pending verification
        </Text>
      )}
    </View>
  );
}
