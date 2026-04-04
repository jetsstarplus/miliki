import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../../constants/theme';

interface OccupancyBarProps {
  rate: number;
  height?: number;
}

export function OccupancyBar({ rate, height = 4 }: OccupancyBarProps) {
  const pct = Math.min(100, Math.max(0, rate ?? 0));
  const color = pct >= 80 ? Colors.success : pct >= 50 ? Colors.warning : Colors.error;
  const radius = height / 2;
  return (
    <View style={[styles.track, { height, borderRadius: radius }]}>
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
  track: { backgroundColor: Colors.borderLight, overflow: 'hidden', marginTop: 6 },
  fill: { height: '100%' },
});
