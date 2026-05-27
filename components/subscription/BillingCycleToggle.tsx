import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppColors, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';

type BillingCycle = 'MONTHLY' | 'ANNUALLY';

type BillingCycleToggleProps = {
  value: BillingCycle;
  onChange: (next: BillingCycle) => void;
};

export function BillingCycleToggle({ value, onChange }: BillingCycleToggleProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.billingRow}>
      <TouchableOpacity
        style={[styles.billingChip, value === 'MONTHLY' && styles.billingChipActive]}
        onPress={() => onChange('MONTHLY')}
      >
        <Text style={[styles.billingChipText, value === 'MONTHLY' && styles.billingChipTextActive]}>
          Monthly
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.billingChip, value === 'ANNUALLY' && styles.billingChipActive]}
        onPress={() => onChange('ANNUALLY')}
      >
        <Text style={[styles.billingChipText, value === 'ANNUALLY' && styles.billingChipTextActive]}>
          Annually
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    billingRow: {
      flexDirection: 'row',
      gap: Spacing.xs,
      marginTop: Spacing.xs,
    },
    billingChip: {
      flex: 1,
      height: 36,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface,
    },
    billingChipActive: {
      borderColor: c.primary,
      backgroundColor: c.overlay,
    },
    billingChipText: {
      fontSize: Typography.fontSizeXs,
      color: c.textSecondary,
      fontWeight: Typography.fontWeightSemibold,
    },
    billingChipTextActive: {
      color: c.primary,
    },
  });
}
