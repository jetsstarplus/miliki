import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppColors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';

type Metrics = {
  unitsCount?: number | null;
  propertiesCount?: number | null;
  tenantsCount?: number | null;
  activeUsersCount?: number | null;
} | null | undefined;

type CurrentSubscriptionCardProps = {
  planName?: string | null;
  planType?: string | null;
  status?: string | null;
  billingCycle?: string | null;
  nextPaymentDate?: string | null;
  baseAmount?: number | string | null;
  finalAmount?: number | string | null;
  discountAmount?: number | string | null;
  discountName?: string | null;
  metrics?: Metrics;
  loading?: boolean;
};

export function CurrentSubscriptionCard({
  planName,
  planType,
  status,
  billingCycle,
  nextPaymentDate,
  baseAmount,
  finalAmount,
  discountAmount,
  discountName,
  metrics,
  loading = false,
}: CurrentSubscriptionCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoTitle}>Current Subscription</Text>

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Plan</Text>
          <Text style={styles.summaryValue}>{planName ?? (loading ? 'Loading...' : 'None selected')}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Type</Text>
          <Text style={styles.summaryValue}>{planType ?? 'Not set'}</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Status</Text>
          <Text style={styles.summaryValue}>{status ?? (loading ? 'Loading...' : 'Unknown')}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Billing</Text>
          <Text style={styles.summaryValue}>{billingCycle ?? 'Not set'}</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Next payment</Text>
          <Text style={styles.summaryValue}>{formatDate(nextPaymentDate) ?? 'Not scheduled'}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Discount</Text>
          <Text style={styles.summaryValue}>{formatMoney(discountAmount) ?? discountName ?? 'None'}</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Base amount</Text>
          <Text style={styles.summaryValue}>{formatMoney(baseAmount)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Final amount</Text>
          <Text style={styles.summaryValue}>{formatMoney(finalAmount)}</Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <MetricPill label="Units" value={metrics?.unitsCount} />
        <MetricPill label="Properties" value={metrics?.propertiesCount} />
        <MetricPill label="Tenants" value={metrics?.tenantsCount} />
        <MetricPill label="Users" value={metrics?.activeUsersCount} />
      </View>
    </View>
  );
}

function MetricPill({ label, value }: { label: string; value?: number | null }) {
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#00000008' }}>
      <Text style={{ fontSize: Typography.fontSizeXs, fontWeight: Typography.fontWeightSemibold, color: '#666' }}>
        {label}: {typeof value === 'number' ? value : '—'}
      </Text>
    </View>
  );
}

function formatMoney(value: number | string | null | undefined) {
  if (value === null || typeof value === 'undefined' || value === '') return null;
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return String(value);
  return `KES ${numeric.toLocaleString('en-KE')}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    infoCard: {
      borderWidth: 1,
      borderColor: c.borderLight,
      borderRadius: Radius.md,
      backgroundColor: c.surface,
      padding: Spacing.sm,
      gap: Spacing.xs,
      ...Shadow.sm,
    },
    infoTitle: {
      fontSize: Typography.fontSizeSm,
      color: c.text,
      fontWeight: Typography.fontWeightSemibold,
      marginBottom: 2,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: Spacing.xs,
    },
    summaryItem: {
      flex: 1,
      borderRadius: Radius.sm,
      backgroundColor: c.inputBackground,
      padding: Spacing.xs,
    },
    summaryLabel: {
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
      marginBottom: 2,
      fontWeight: Typography.fontWeightSemibold,
    },
    summaryValue: {
      fontSize: Typography.fontSizeSm,
      color: c.text,
      fontWeight: Typography.fontWeightSemibold,
    },
    metricsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 2,
    },
  });
}
