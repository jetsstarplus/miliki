import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Colors, Radius, Typography } from '../../constants/theme';

export type StatusColor = 'success' | 'error' | 'warning' | 'info';

const colorMap: Record<StatusColor, { bg: string; fg: string }> = {
  success: { bg: 'rgba(16,185,129,0.1)', fg: Colors.success },
  error: { bg: 'rgba(239,68,68,0.1)', fg: Colors.error },
  warning: { bg: 'rgba(245,158,11,0.1)', fg: Colors.warning },
  info: { bg: 'rgba(59,130,246,0.1)', fg: Colors.info },
};

interface StatusBadgeProps {
  label: string;
  color?: StatusColor;
  style?: ViewStyle;
}

export function StatusBadge({ label, color = 'success', style }: StatusBadgeProps) {
  const c = colorMap[color];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, style]}>
      <Text style={[styles.text, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  text: { fontSize: 11, fontWeight: Typography.fontWeightSemibold },
});
