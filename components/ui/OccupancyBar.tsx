import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../context/theme';

interface OccupancyBarProps {
  rate: number;
  height?: number;
}

export function OccupancyBar({ rate, height = 4 }: OccupancyBarProps) {
  const { colors } = useTheme();
  const pct = Math.min(100, Math.max(0, rate ?? 0));
  const color = pct >= 80 ? colors.success : pct >= 50 ? colors.warning : colors.error;
  const radius = height / 2;
  return (
    <View style={[styles.track, { height, borderRadius: radius, backgroundColor: colors.borderLight }]}>
      <View
        style={[
          styles.fill,
          { width: `${pct}%` as any, backgroundColor: color, borderRadius: radius },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: 'hidden', marginTop: 6 },
  fill: { height: '100%' },
});
