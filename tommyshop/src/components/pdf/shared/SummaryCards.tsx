import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { FONT_FAMILY } from '../fonts';

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  card: { width: '33%', padding: 6, marginBottom: 6 },
  cardBorder: {
    border: '1pt solid #e5e7eb',
    borderRadius: 4,
    padding: 6,
  },
  label: {
    fontSize: 8,
    color: '#6b7280',
    fontFamily: FONT_FAMILY,
    marginBottom: 2,
  },
  value: { fontSize: 11, fontWeight: 700, fontFamily: FONT_FAMILY },
});

interface Card {
  label: string;
  value: string;
}

export function SummaryCards({ cards }: { cards: Card[] }) {
  return (
    <View style={s.grid}>
      {cards.map(card => (
        <View key={card.label} style={s.card}>
          <View style={s.cardBorder}>
            <Text style={s.label}>{card.label}</Text>
            <Text style={s.value}>{card.value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
