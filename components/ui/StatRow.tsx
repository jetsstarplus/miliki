import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Typography } from '../../constants/theme';

export interface Stat {
  label: string;
  value: string | number;
  color?: string;
}

export function StatRow({ stats }: { stats: Stat[] }) {
  return (
    <View style={styles.row}>
      {stats.map((s, i) => (
        <React.Fragment key={s.label}>
          {i > 0 && <View style={styles.divider} />}
          <View style={styles.stat}>
            <Text style={[styles.value, s.color ? { color: s.color } : {}]}>
              {s.value ?? '—'}
            </Text>
            <Text style={styles.label}>{s.label}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center' },
  value: { fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightBold, color: Colors.text },
  label: { fontSize: 10, color: Colors.textMuted, marginTop: 2, textAlign: 'center' },
  divider: { width: 1, height: 28, backgroundColor: Colors.borderLight },
});
