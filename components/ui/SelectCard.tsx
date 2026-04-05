import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { AppColors, Radius, Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../context/theme';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectCardProps {
  options: SelectOption[];
  value: string;
  onChange: (val: string) => void;
  label?: string;
  error?: string;
  style?: ViewStyle;
}

export function SelectCard({ options, value, onChange, label, error, style }: SelectCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.row}>
        {options.map(opt => {
          const selected = value === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => onChange(opt.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.optionText, selected && styles.optionTextSelected]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    container: {
      marginBottom: Spacing.md,
    },
    label: {
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightMedium,
      color: c.text,
      marginBottom: Spacing.xs,
    },
    row: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    option: {
      flex: 1,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.inputBackground,
      alignItems: 'center',
    },
    optionSelected: {
      borderColor: c.primary,
      backgroundColor: c.overlay,
    },
    optionText: {
      fontSize: Typography.fontSizeMd,
      fontWeight: Typography.fontWeightMedium,
      color: c.textSecondary,
    },
    optionTextSelected: {
      color: c.primary,
      fontWeight: Typography.fontWeightSemibold,
    },
    error: {
      fontSize: Typography.fontSizeXs,
      color: c.error,
      marginTop: Spacing.xs,
    },
  });
}
