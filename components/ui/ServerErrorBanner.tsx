import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Radius, Spacing, Typography } from '../../constants/theme';

export function ServerErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <View style={styles.banner}>
      <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  text: { flex: 1, fontSize: Typography.fontSizeSm, color: '#EF4444' },
});
