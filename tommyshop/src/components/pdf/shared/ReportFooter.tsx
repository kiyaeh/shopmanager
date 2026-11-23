import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { FONT_FAMILY } from '../fonts';

const s = StyleSheet.create({
  footer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  text: { fontSize: 8, color: '#9ca3af', fontFamily: FONT_FAMILY },
});

interface Props {
  reportId: string;
  version: number;
  generatedAt: string;
}

export function ReportFooter({ reportId, version, generatedAt }: Props) {
  return (
    <View style={s.footer}>
      <Text style={s.text}>Report ID: {reportId}</Text>
      <Text style={s.text}>Version: {version}</Text>
      <Text style={s.text}>Generated: {generatedAt}</Text>
    </View>
  );
}
