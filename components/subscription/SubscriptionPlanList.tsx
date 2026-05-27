import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

import { AppColors, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';

type BillingCycle = 'MONTHLY' | 'ANNUALLY';

type Plan = {
  id: string;
  name: string;
  planType?: string | null;
  description?: string | null;
  priceMonthly?: number | null;
  priceQuarterly?: number | null;
  priceAnnually?: number | null;
  maxUsers?: number | null;
  maxStorageGb?: number | null;
  maxTransactionsPerMonth?: number | null;
  maxPropertiesPerMonth?: number | null;
  maxUnitsPerMonth?: number | null;
  maxTenants?: number | null;
  isActive?: boolean | null;
};

type SubscriptionPlanListProps = {
  plans: Plan[];
  selectedPlanId: string | null;
  billingCycle: BillingCycle;
  loading?: boolean;
  emptyText?: string;
  onSelect: (planId: string) => void;
};

export function SubscriptionPlanList({
  plans,
  selectedPlanId,
  billingCycle,
  loading = false,
  emptyText = 'No plans available right now.',
  onSelect,
}: SubscriptionPlanListProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(colors, width >= 768), [colors, width]);

  if (loading) {
    return <Text style={styles.helperText}>Loading available plans...</Text>;
  }

  if (plans.length === 0) {
    return <Text style={styles.helperText}>{emptyText}</Text>;
  }

  const sortedPlans = [...plans].sort((left, right) => {
    const leftCustom = isCustomPlan(left);
    const rightCustom = isCustomPlan(right);
    if (leftCustom !== rightCustom) {
      return leftCustom ? 1 : -1;
    }
    const leftOrder = sortOrderForPlan(left);
    const rightOrder = sortOrderForPlan(right);
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return left.name.localeCompare(right.name);
  });

  return (
    <View style={styles.listWrap}>
      {sortedPlans.map((plan) => {
        const selected = selectedPlanId === plan.id;
        const isCustom = isCustomPlan(plan);
        const price = billingCycle === 'MONTHLY' ? plan.priceMonthly : plan.priceAnnually;

        return (
          <TouchableOpacity
            key={plan.id}
            style={[
              styles.planCard,
              selected && styles.planCardSelected,
              isCustom && styles.planCardCustom,
            ]}
            onPress={() => onSelect(plan.id)}
            activeOpacity={0.86}
          >
            <View style={styles.planHeader}>
              <View style={styles.planTitleWrap}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planType}>{plan.planType ?? 'Plan'}</Text>
              </View>
              {selected ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} /> : null}
            </View>

            <Text style={styles.planPrice}>KES {Number(price ?? 0).toLocaleString()}</Text>

            {plan.description ? <Text style={styles.planDescription}>{plan.description}</Text> : null}

            <View style={styles.limitRow}>
              {typeof plan.maxUsers === 'number' ? <LimitChip label={formatLimit(plan.maxUsers, 'users')} /> : null}
              {typeof plan.maxUnitsPerMonth === 'number' ? <LimitChip label={formatLimit(plan.maxUnitsPerMonth, 'units')} /> : null}
              {typeof plan.maxPropertiesPerMonth === 'number' ? <LimitChip label={formatLimit(plan.maxPropertiesPerMonth, 'properties')} /> : null}
              {typeof plan.maxTenants === 'number' ? <LimitChip label={formatLimit(plan.maxTenants, 'tenants')} /> : null}
              {typeof plan.maxTransactionsPerMonth === 'number' ? <LimitChip label={formatLimit(plan.maxTransactionsPerMonth, 'transactions')} /> : null}
            </View>

            {isCustom ? <Text style={styles.customHint}>Custom plan: price is maintained manually on the backend.</Text> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function LimitChip({ label }: { label: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors, true), [colors]);

  return (
    <View style={styles.limitChip}>
      <Text style={styles.limitText}>{label}</Text>
    </View>
  );
}

function isCustomPlan(plan: Plan) {
  return String(plan.planType ?? '').toUpperCase() === 'CUSTOM';
}

function sortOrderForPlan(plan: Plan) {
  return isCustomPlan(plan) ? Number.MAX_SAFE_INTEGER : 0;
}

function formatLimit(value: number, label: string) {
  if (value === -1) return `Unlimited ${label}`;
  return `${value} ${label}`;
}

function makeStyles(c: AppColors, isTablet: boolean) {
  return StyleSheet.create({
    helperText: {
      marginTop: Spacing.sm,
      fontSize: Typography.fontSizeSm,
      color: c.textSecondary,
    },
    listWrap: {
      gap: Spacing.sm,
      marginTop: Spacing.sm,
    },
    planCard: {
      borderWidth: 1,
      borderColor: c.borderLight,
      borderRadius: Radius.md,
      backgroundColor: c.surface,
      padding: isTablet ? Spacing.md : Spacing.sm,
      gap: Spacing.xs,
      minHeight: isTablet ? 152 : 0,
    },
    planCardSelected: {
      borderColor: c.primary,
      backgroundColor: c.overlay,
    },
    planCardCustom: {
      borderColor: c.warning,
      backgroundColor: `${c.warning}18`,
    },
    planHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: Spacing.xs,
    },
    planTitleWrap: {
      flex: 1,
      gap: 2,
    },
    planName: {
      fontSize: Typography.fontSizeMd,
      color: c.text,
      fontWeight: Typography.fontWeightSemibold,
    },
    planType: {
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
      fontWeight: Typography.fontWeightSemibold,
      textTransform: 'uppercase',
    },
    planPrice: {
      fontSize: Typography.fontSizeMd,
      color: c.text,
      fontWeight: Typography.fontWeightBold,
    },
    planDescription: {
      marginTop: 2,
      fontSize: Typography.fontSizeXs,
      color: c.textSecondary,
      lineHeight: 16,
    },
    limitRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 2,
    },
    limitChip: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: Radius.full,
      backgroundColor: c.inputBackground,
    },
    limitText: {
      fontSize: Typography.fontSizeXs,
      color: c.textSecondary,
      fontWeight: Typography.fontWeightSemibold,
    },
    customHint: {
      marginTop: 2,
      fontSize: Typography.fontSizeXs,
      color: c.warning,
      fontWeight: Typography.fontWeightSemibold,
    },
  });
}
