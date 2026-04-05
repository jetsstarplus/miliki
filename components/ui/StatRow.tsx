import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppColors, Typography } from '../../constants/theme';
import { useTheme } from '../../context/theme';

export interface Stat {
  label: string;
  value: string | number;
  color?: string;
}

export function StatRow({ stats }: { stats: Stat[] }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center' },
    stat: { flex: 1, alignItems: 'center' },
    value: { fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightBold, color: c.text },
    label: { fontSize: 10, color: c.textMuted, marginTop: 2, textAlign: 'center' },
    divider: { width: 1, height: 28, backgroundColor: c.borderLight },
  });
}
