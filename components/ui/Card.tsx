import React, { useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { AppColors, Radius, Shadow, Spacing } from '../../constants/theme';
import { useTheme } from '../../context/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  padded?: boolean;
}

export function Card({ children, style, elevated = true, padded = true }: CardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    padded: {
      padding: Spacing.lg,
    },
  });
}
