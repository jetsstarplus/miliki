import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { AppColors, Radius, Shadow, Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../context/theme';

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  style?: ViewStyle;
}

export function SectionCard({ title, children, right, style }: SectionCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {right ?? null}
      </View>
      {children}
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: c.borderLight,
      ...Shadow.sm,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    title: {
      fontSize: 11,
      fontWeight: Typography.fontWeightSemibold,
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
  });
}
