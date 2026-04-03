import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Colors, Radius, Shadow, Spacing } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  padded?: boolean;
}

export function Card({ children, style, elevated = true, padded = true }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        elevated && Shadow.md,
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  padded: {
    padding: Spacing.lg,
  },
});
