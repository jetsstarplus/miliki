import React, { useMemo } from 'react';
import { StyleSheet, Text, TextStyle } from 'react-native';
import { AppColors, Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../context/theme';

interface SectionLabelProps {
  children: string;
  style?: TextStyle;
}

export function SectionLabel({ children, style }: SectionLabelProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return <Text style={[styles.label, style]}>{children}</Text>;
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    label: {
      fontSize: 11,
      fontWeight: Typography.fontWeightSemibold,
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: Spacing.sm,
      marginTop: Spacing.md,
    },
  });
}
