import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ServerErrorBanner } from '@/components/ui/ServerErrorBanner';
import { AppColors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/theme';
import {
    ACCOUNT_TREND_REPORT_DATA,
    ACCOUNTING_DASHBOARD_PAGE_DATA,
    REVENUE_TREND_REPORT_DATA,
} from '@/graphql/properties/queries/accounting';
import { useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type KpiCard = {
  key: string;
  label: string;
  value: string;
  subValue?: string;
};

type ReportDeepLink = {
  report:
    | 'trial-balance'
    | 'balance-sheet'
    | 'income-statement'
    | 'cash-flow'
    | 'retained-earnings'
    | 'comparative-performance'
    | 'revenue-trend'
    | 'account-trend';
  filters?: Record<string, any>;
};

type QuickAction = {
  key: string;
  title: string;
  subtitle: string;
  route?: string;
};

type JournalEntry = {
  id: string;
  entryNumber: string;
  entryDate: string;
  entryType: string;
  status: string;
  description: string;
  reference: string;
  totalDebit: string;
  totalCredit: string;
  isBalanced?: boolean;
};

type TrendSeries = {
  key: string;
  label: string;
  color: string;
  values: number[];
};

type TrendChartData = {
  labels: string[];
  series: TrendSeries[];
  frequency: string;
  periods: number;
};

const PERIOD_OPTIONS = [6, 12, 24, 36];
const FREQUENCY_OPTIONS = ['month', 'quarter', 'year'];

function normalizeGenericScalarPayload(value: any): any {
  if (!value) return {};

  let parsed = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return {};
    }
  }

  for (let i = 0; i < 3; i += 1) {
    if (!(parsed && typeof parsed === 'object' && 'data' in parsed)) break;
    const next = (parsed as any).data;
    if (typeof next === 'string') {
      try {
        parsed = JSON.parse(next);
      } catch {
        break;
      }
    } else if (next && typeof next === 'object') {
      parsed = next;
    } else {
      break;
    }
  }

  return parsed;
}

function toCurrency(value: any): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value ?? '-');
  return `KES ${num.toLocaleString()}`;
}

function compactAmount(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${Math.round(value)}`;
}

function toLabel(value: any, fallback: string): string {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function numeric(value: any): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.abs(parsed) < 0.0001 ? 0 : parsed;
}

function routeFromEndpoint(endpoint?: string): string | undefined {
  const key = String(endpoint ?? '').trim();
  if (!key) return undefined;

  const map: Record<string, string> = {
    accountingDashboardPageData: '/(tabs)/accounting/dashboard',
    chartOfAccountsPageData: '/(tabs)/accounting/chart-of-accounts',
    accountFormPageData: '/(tabs)/accounting/chart-of-accounts',
    accountDetailPageData: '/(tabs)/accounting/chart-of-accounts',
    journalEntriesPageData: '/(tabs)/accounting/journal-entries',
    journalEntryFormPageData: '/(tabs)/accounting/journal-entries',
    journalEntryDetailPageData: '/(tabs)/accounting/journal-entries',
    tenantRefundsPageData: '/(tabs)/accounting/tenant-refunds',
    tenantRefundFormPageData: '/(tabs)/accounting/tenant-refunds',
    tenantRefundDetailPageData: '/(tabs)/accounting/tenant-refunds',
    manualTransferFormData: '/(tabs)/accounting/manual-transfer',
    accountingSettingsPageData: '/(tabs)/accounting/account-settings',
  };

  return map[key];
}

function extractKpis(payload: any): KpiCard[] {
  const summary = payload?.summary ?? payload?.data?.summary ?? {};

  const summaryCards: KpiCard[] = [
    {
      key: 'totalCash',
      label: 'Total Cash',
      value: toCurrency(summary?.totalCash),
    },
    {
      key: 'totalCredits',
      label: 'Total Credits',
      value: toCurrency(summary?.totalCredits),
      subValue: `Count: ${Number(summary?.creditsCount ?? 0)}`,
    },
    {
      key: 'pendingRefundsAmount',
      label: 'Pending Refunds',
      value: toCurrency(summary?.pendingRefundsAmount),
      subValue: `Count: ${Number(summary?.pendingRefundsCount ?? 0)}`,
    },
    {
      key: 'draftEntriesCount',
      label: 'Draft Entries',
      value: String(Number(summary?.draftEntriesCount ?? 0)),
    },
  ].filter((card) => card.value !== '-');

  if (summaryCards.length) return summaryCards;

  const candidates = [
    payload?.summaryCards,
    payload?.cards,
    payload?.kpis,
    payload?.metrics,
    payload?.data?.summaryCards,
    payload?.data?.cards,
    payload?.data?.kpis,
  ].find(Array.isArray);

  if (!Array.isArray(candidates)) return [];

  return candidates.slice(0, 6).map((item: any, idx: number) => ({
    key: String(item?.key ?? item?.id ?? `kpi-${idx}`),
    label: toLabel(item?.label ?? item?.title ?? item?.name, 'Metric'),
    value: toLabel(item?.valueText ?? item?.formattedValue ?? item?.value, '-'),
    subValue: String(item?.subValue ?? item?.change ?? item?.caption ?? '').trim() || undefined,
  }));
}

function extractRecentJournalEntries(payload: any): JournalEntry[] {
  const items = [
    payload?.recentJournalEntries,
    payload?.journalEntries,
    payload?.data?.recentJournalEntries,
  ].find(Array.isArray);

  if (!Array.isArray(items)) return [];

  return items.slice(0, 8).map((item: any, idx: number) => ({
    id: String(item?.id ?? item?.rawId ?? `je-${idx}`),
    entryNumber: String(item?.entryNumber ?? '-'),
    entryDate: String(item?.entryDate ?? item?.date ?? '-'),
    entryType: String(item?.entryType ?? '-'),
    status: String(item?.status ?? '-'),
    description: String(item?.description ?? '-'),
    reference: String(item?.reference ?? ''),
    totalDebit: String(item?.totalDebit ?? item?.debit ?? '-'),
    totalCredit: String(item?.totalCredit ?? item?.credit ?? '-'),
    isBalanced: Boolean(item?.isBalanced),
  }));
}

function extractQuickActions(payload: any): QuickAction[] {
  const fromMap = payload?.quickActions ?? payload?.data?.quickActions;
  if (fromMap && typeof fromMap === 'object' && !Array.isArray(fromMap)) {
    const mapEntries = Object.entries(fromMap as Record<string, any>);
    return mapEntries.map(([key, value]) => {
      const endpoint = String(value ?? '').trim();
      let route: string | undefined;
      if (key === 'createJournalEntry') route = '/(tabs)/accounting/journal-entries';
      if (key === 'manualTransfer') route = '/(tabs)/accounting/manual-transfer';
      if (key === 'createTenantRefund') route = '/(tabs)/accounting/tenant-refunds';
      if (!route) route = routeFromEndpoint(endpoint);
      return {
        key,
        title: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
        subtitle: endpoint || 'Open workflow',
        route,
      };
    });
  }

  const candidates = [payload?.actions, payload?.quickActions, payload?.menu, payload?.data?.actions].find(Array.isArray);
  if (Array.isArray(candidates)) {
    return candidates
      .map((item: any, idx: number) => ({
        key: String(item?.key ?? item?.id ?? `quick-${idx}`),
        title: toLabel(item?.label ?? item?.title ?? item?.name, 'Action'),
        subtitle: toLabel(item?.description ?? item?.caption ?? item?.query, 'Open workflow'),
        route:
          (typeof item?.route === 'string' ? item.route : undefined) ||
          routeFromEndpoint(String(item?.query ?? item?.endpoint ?? '')),
      }))
      .filter((item: QuickAction) => Boolean(item.title));
  }

  return [
    {
      key: 'journals',
      title: 'Create Journal Entry',
      subtitle: 'createJournalEntry',
      route: '/(tabs)/accounting/journal-entries',
    },
    {
      key: 'manual-transfer',
      title: 'Manual Transfer',
      subtitle: 'createManualTransfer',
      route: '/(tabs)/accounting/manual-transfer',
    },
    {
      key: 'tenant-refund',
      title: 'Create Tenant Refund',
      subtitle: 'createTenantRefund',
      route: '/(tabs)/accounting/tenant-refunds',
    },
  ];
}

function extractTrendChartData(payload: any, mode: 'revenue' | 'account'): TrendChartData {
  const report = payload?.report ?? payload?.data?.report ?? {};
  const labels = Array.isArray(report?.labels) ? report.labels.map((v: any) => String(v)) : [];

  const base: TrendSeries[] = [];
  if (Array.isArray(report?.values)) {
    base.push({
      key: 'values',
      label: mode === 'revenue' ? 'Revenue' : 'Net',
      color: '#2563EB',
      values: report.values.map((v: any) => numeric(v)),
    });
  }
  if (mode === 'revenue' && Array.isArray(report?.expense_values)) {
    base.push({
      key: 'expense_values',
      label: 'Expenses',
      color: '#DC2626',
      values: report.expense_values.map((v: any) => numeric(v)),
    });
  }
  if (mode === 'account' && Array.isArray(report?.debit_values)) {
    base.push({
      key: 'debit_values',
      label: 'Debit',
      color: '#059669',
      values: report.debit_values.map((v: any) => numeric(v)),
    });
  }
  if (mode === 'account' && Array.isArray(report?.credit_values)) {
    base.push({
      key: 'credit_values',
      label: 'Credit',
      color: '#EA580C',
      values: report.credit_values.map((v: any) => numeric(v)),
    });
  }

  return {
    labels,
    series: base,
    frequency: String(report?.frequency ?? 'month'),
    periods: Number(report?.periods ?? (labels.length || 12)),
  };
}

function formatTinyLabel(label: string): string {
  if (label.length <= 7) return label;
  return label.slice(0, 3);
}

function deepLinkFromKpi(card: KpiCard): ReportDeepLink {
  const label = `${card.key} ${card.label}`.toLowerCase();

  if (label.includes('cash')) {
    return { report: 'cash-flow', filters: { focus: 'cash' } };
  }
  if (label.includes('receivable') || label.includes('debtor')) {
    return { report: 'trial-balance', filters: { focus: 'receivables' } };
  }
  if (label.includes('payable') || label.includes('creditor') || label.includes('refund')) {
    return { report: 'trial-balance', filters: { focus: 'payables' } };
  }
  if (label.includes('revenue') || label.includes('income') || label.includes('profit')) {
    return { report: 'income-statement', filters: { focus: 'revenue' } };
  }
  if (label.includes('draft')) {
    return { report: 'account-trend', filters: { focus: 'draft' } };
  }

  return { report: 'trial-balance', filters: { focus: card.key || card.label } };
}

export default function AccountingDashboardScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { isAuthenticated, activeCompany } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [frequency, setFrequency] = useState('month');
  const [periods, setPeriods] = useState(12);
  const [showRevenueSeries, setShowRevenueSeries] = useState<Record<string, boolean>>({ values: true, expense_values: true });
  const [showAccountSeries, setShowAccountSeries] = useState<Record<string, boolean>>({ values: true, debit_values: true, credit_values: true });
  const [selectedRevenueIndex, setSelectedRevenueIndex] = useState<number | null>(null);
  const [selectedAccountIndex, setSelectedAccountIndex] = useState<number | null>(null);

  const trendFilters = useMemo(() => ({ frequency, periods }), [frequency, periods]);

  const dashboardQuery = useQuery(ACCOUNTING_DASHBOARD_PAGE_DATA, {
    variables: { companyId: activeCompany?.id },
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !activeCompany?.id,
  });

  const revenueTrendQuery = useQuery(REVENUE_TREND_REPORT_DATA, {
    variables: { companyId: activeCompany?.id, filters: trendFilters },
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !activeCompany?.id,
  });

  const accountTrendQuery = useQuery(ACCOUNT_TREND_REPORT_DATA, {
    variables: { companyId: activeCompany?.id, filters: trendFilters },
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !activeCompany?.id,
  });

  const dashboardPayload = normalizeGenericScalarPayload((dashboardQuery.data as any)?.accountingDashboardPageData ?? {});
  const revenuePayload = normalizeGenericScalarPayload((revenueTrendQuery.data as any)?.revenueTrendReportData ?? {});
  const accountPayload = normalizeGenericScalarPayload((accountTrendQuery.data as any)?.accountTrendReportData ?? {});

  const kpis = useMemo(() => extractKpis(dashboardPayload), [dashboardPayload]);
  const quickActions = useMemo(() => extractQuickActions(dashboardPayload), [dashboardPayload]);
  const recentJournalEntries = useMemo(() => extractRecentJournalEntries(dashboardPayload), [dashboardPayload]);
  const revenueChart = useMemo(() => extractTrendChartData(revenuePayload, 'revenue'), [revenuePayload]);
  const accountChart = useMemo(() => extractTrendChartData(accountPayload, 'account'), [accountPayload]);

  function visibleSeries(chart: TrendChartData, showMap: Record<string, boolean>): TrendSeries[] {
    return chart.series.filter((series) => showMap[series.key] !== false);
  }

  function chartMax(chart: TrendChartData, showMap: Record<string, boolean>) {
    const series = visibleSeries(chart, showMap);
    const values = series.flatMap((s) => s.values.map((v) => Math.abs(v)));
    const max = Math.max(...values, 0);
    return max || 1;
  }

  async function onRefresh() {
    await Promise.all([dashboardQuery.refetch(), revenueTrendQuery.refetch(), accountTrendQuery.refetch()]);
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Accounting Dashboard" showBack />
        <ErrorState title="Session expired" message="Please sign in again to continue." onRetry={() => router.replace('/(auth)/login' as any)} />
      </SafeAreaView>
    );
  }

  if (!activeCompany?.id) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Accounting Dashboard" showBack />
        <ErrorState title="Company required" message="Select a company to continue." onRetry={() => router.push('/(tabs)/profile/company-switcher' as any)} />
      </SafeAreaView>
    );
  }

  if (dashboardQuery.loading && !dashboardQuery.data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Accounting Dashboard" showBack />
        <LoadingState />
      </SafeAreaView>
    );
  }

  const visibleRevenueSeries = visibleSeries(revenueChart, showRevenueSeries);
  const visibleAccountSeries = visibleSeries(accountChart, showAccountSeries);
  const revenueMax = chartMax(revenueChart, showRevenueSeries);
  const accountMax = chartMax(accountChart, showAccountSeries);
  const selectedRevenuePoint = selectedRevenueIndex == null
    ? Math.max(0, revenueChart.labels.length - 1)
    : Math.min(selectedRevenueIndex, Math.max(0, revenueChart.labels.length - 1));
  const selectedAccountPoint = selectedAccountIndex == null
    ? Math.max(0, accountChart.labels.length - 1)
    : Math.min(selectedAccountIndex, Math.max(0, accountChart.labels.length - 1));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Accounting Dashboard" showBack />

      <ScrollView
        contentContainerStyle={styles.page}
        refreshControl={<RefreshControl refreshing={dashboardQuery.loading} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {dashboardQuery.error ? <ServerErrorBanner message={dashboardQuery.error.message} /> : null}
        {revenueTrendQuery.error ? <ServerErrorBanner message={revenueTrendQuery.error.message} /> : null}
        {accountTrendQuery.error ? <ServerErrorBanner message={accountTrendQuery.error.message} /> : null}

        <Text style={styles.heading}>Financial Snapshot</Text>
        <Text style={styles.subHeading}>Your accounting dashboard summary, journal activity, and trend reports.</Text>

        {kpis.length > 0 ? (
          <View style={[styles.kpiGrid, isTablet && styles.kpiGridTablet]}>
            {kpis.map((card) => (
              <TouchableOpacity
                key={card.key}
                style={[styles.kpiCard, isTablet && styles.kpiCardTablet]}
                activeOpacity={0.85}
                onPress={() => {
                  const deepLink = deepLinkFromKpi(card);
                  router.push({
                    pathname: '/(tabs)/accounting/dashboard/reports',
                    params: {
                      report: deepLink.report,
                      filters: deepLink.filters ? JSON.stringify(deepLink.filters) : undefined,
                    },
                  } as any);
                }}
              >
                <Text style={styles.kpiLabel}>{card.label}</Text>
                <Text style={styles.kpiValue}>{card.value}</Text>
                {card.subValue ? <Text style={styles.kpiSubValue}>{card.subValue}</Text> : null}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <ErrorState title="No dashboard metrics" message="No summary metrics are available for this company yet." />
        )}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Trend Filters</Text>
          </View>
          <Text style={styles.filterLabel}>Frequency</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {FREQUENCY_OPTIONS.map((item) => {
              const active = frequency === item;
              return (
                <TouchableOpacity key={item} style={[styles.chip, active && styles.chipActive]} onPress={() => setFrequency(item)}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.filterLabel}>Periods</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {PERIOD_OPTIONS.map((item) => {
              const active = periods === item;
              return (
                <TouchableOpacity key={String(item)} style={[styles.chip, active && styles.chipActive]} onPress={() => setPeriods(item)}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Revenue Trend</Text>
            <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/accounting/dashboard/reports', params: { report: 'revenue-trend', filters: JSON.stringify(trendFilters) } } as any)}>
              <Text style={styles.sectionAction}>View Full</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.legendWrap}>
            {revenueChart.series.map((series) => {
              const active = showRevenueSeries[series.key] !== false;
              return (
                <TouchableOpacity
                  key={series.key}
                  style={[styles.legendChip, active && styles.legendChipActive]}
                  onPress={() => setShowRevenueSeries((prev) => ({ ...prev, [series.key]: !active }))}
                >
                  <View style={[styles.legendDot, { backgroundColor: series.color, opacity: active ? 1 : 0.35 }]} />
                  <Text style={[styles.legendText, active ? undefined : styles.legendTextMuted]}>{series.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.chartAreaRow}>
            <View style={styles.yAxisWrap}>
              <Text style={styles.yAxisText}>{compactAmount(revenueMax)}</Text>
              <Text style={styles.yAxisText}>{compactAmount(revenueMax / 2)}</Text>
              <Text style={styles.yAxisText}>0</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
              {revenueChart.labels.map((label, idx) => (
                <TouchableOpacity key={`${label}-${idx}`} style={styles.chartPointCol} activeOpacity={0.85} onPress={() => setSelectedRevenueIndex(idx)}>
                  <View style={[styles.chartBarsWrap, idx === selectedRevenuePoint && styles.chartBarsWrapSelected]}>
                    {visibleRevenueSeries.map((series) => {
                      const value = series.values[idx] ?? 0;
                      const height = Math.max(3, (Math.abs(value) / revenueMax) * 90);
                      return <View key={`${series.key}-${idx}`} style={[styles.chartBar, { height, backgroundColor: series.color, opacity: value < 0 ? 0.5 : 1 }]} />;
                    })}
                  </View>
                  <Text style={styles.chartLabel}>{formatTinyLabel(label)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {revenueChart.labels.length ? (
            <View style={styles.tooltipCard}>
              <Text style={styles.tooltipTitle}>{revenueChart.labels[selectedRevenuePoint]}</Text>
              {visibleRevenueSeries.map((series) => {
                const val = series.values[selectedRevenuePoint] ?? 0;
                return (
                  <View key={`${series.key}-tip`} style={styles.tooltipRow}>
                    <View style={[styles.legendDot, { backgroundColor: series.color }]} />
                    <Text style={styles.tooltipLabel}>{series.label}</Text>
                    <Text style={styles.tooltipValue}>{toCurrency(val)}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Account Trend</Text>
            <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/accounting/dashboard/reports', params: { report: 'account-trend', filters: JSON.stringify(trendFilters) } } as any)}>
              <Text style={styles.sectionAction}>View Full</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.legendWrap}>
            {accountChart.series.map((series) => {
              const active = showAccountSeries[series.key] !== false;
              return (
                <TouchableOpacity
                  key={series.key}
                  style={[styles.legendChip, active && styles.legendChipActive]}
                  onPress={() => setShowAccountSeries((prev) => ({ ...prev, [series.key]: !active }))}
                >
                  <View style={[styles.legendDot, { backgroundColor: series.color, opacity: active ? 1 : 0.35 }]} />
                  <Text style={[styles.legendText, active ? undefined : styles.legendTextMuted]}>{series.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.chartAreaRow}>
            <View style={styles.yAxisWrap}>
              <Text style={styles.yAxisText}>{compactAmount(accountMax)}</Text>
              <Text style={styles.yAxisText}>{compactAmount(accountMax / 2)}</Text>
              <Text style={styles.yAxisText}>0</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
              {accountChart.labels.map((label, idx) => (
                <TouchableOpacity key={`${label}-${idx}`} style={styles.chartPointCol} activeOpacity={0.85} onPress={() => setSelectedAccountIndex(idx)}>
                  <View style={[styles.chartBarsWrap, idx === selectedAccountPoint && styles.chartBarsWrapSelected]}>
                    {visibleAccountSeries.map((series) => {
                      const value = series.values[idx] ?? 0;
                      const height = Math.max(3, (Math.abs(value) / accountMax) * 90);
                      return <View key={`${series.key}-${idx}`} style={[styles.chartBar, { height, backgroundColor: series.color, opacity: value < 0 ? 0.5 : 1 }]} />;
                    })}
                  </View>
                  <Text style={styles.chartLabel}>{formatTinyLabel(label)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {accountChart.labels.length ? (
            <View style={styles.tooltipCard}>
              <Text style={styles.tooltipTitle}>{accountChart.labels[selectedAccountPoint]}</Text>
              {visibleAccountSeries.map((series) => {
                const val = series.values[selectedAccountPoint] ?? 0;
                return (
                  <View key={`${series.key}-tip`} style={styles.tooltipRow}>
                    <View style={[styles.legendDot, { backgroundColor: series.color }]} />
                    <Text style={styles.tooltipLabel}>{series.label}</Text>
                    <Text style={styles.tooltipValue}>{toCurrency(val)}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Recent Journal Entries</Text>
          {recentJournalEntries.length ? (
            recentJournalEntries.map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={styles.entryCard}
                activeOpacity={0.85}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/accounting/journal-entries/lines',
                    params: {
                      journalEntryId: entry.id,
                      entryNumber: entry.entryNumber,
                      status: entry.status,
                      entryType: entry.entryType,
                      description: entry.description,
                      reference: entry.reference,
                      entryDate: entry.entryDate,
                    },
                  } as any)
                }
              >
                <View style={styles.entryHeaderRow}>
                  <Text style={styles.entryTitle}>{entry.entryNumber}</Text>
                  <Text style={styles.entryStatus}>{entry.status}</Text>
                </View>
                <Text style={styles.entryMeta}>{entry.entryDate} | {entry.entryType}</Text>
                <Text style={styles.entryDesc}>{entry.description}</Text>
                <Text style={styles.entryMeta}>Debit: {entry.totalDebit} | Credit: {entry.totalCredit}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No journal entries available.</Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionList}>
            {quickActions.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={styles.actionCard}
                activeOpacity={0.85}
                onPress={() => {
                  if (item.route) router.push(item.route as any);
                }}
              >
                <View style={styles.actionTextWrap}>
                  <Text style={styles.actionTitle}>{item.title}</Text>
                  <Text style={styles.actionSubtitle}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    page: { padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.sm },
    heading: {
      color: c.text,
      fontSize: Typography.fontSizeLg,
      fontWeight: Typography.fontWeightSemibold,
      marginBottom: 2,
    },
    subHeading: {
      color: c.textSecondary,
      fontSize: Typography.fontSizeSm,
      marginBottom: Spacing.sm,
    },
    kpiGrid: { gap: Spacing.sm },
    kpiGridTablet: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    kpiCard: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: Spacing.md,
      ...Shadow.sm,
    },
    kpiCardTablet: { width: '48.5%' },
    kpiLabel: {
      color: c.textSecondary,
      fontSize: Typography.fontSizeXs,
      marginBottom: 6,
    },
    kpiValue: {
      color: c.text,
      fontSize: Typography.fontSizeLg,
      fontWeight: Typography.fontWeightSemibold,
    },
    kpiSubValue: {
      color: c.textMuted,
      fontSize: Typography.fontSizeXs,
      marginTop: 4,
    },
    sectionCard: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: Spacing.md,
      ...Shadow.sm,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.sm,
    },
    sectionTitle: {
      color: c.text,
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
    },
    sectionAction: {
      color: c.primary,
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightSemibold,
    },
    filterLabel: {
      color: c.text,
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightSemibold,
      marginTop: 2,
      marginBottom: 6,
    },
    chipRow: {
      gap: Spacing.xs,
      paddingBottom: Spacing.xs,
      marginBottom: Spacing.xs,
    },
    chip: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.inputBackground,
      paddingHorizontal: Spacing.md,
      paddingVertical: 8,
      borderRadius: Radius.full,
    },
    chipActive: {
      borderColor: c.primary,
      backgroundColor: `${c.primary}22`,
    },
    chipText: {
      color: c.textSecondary,
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightSemibold,
    },
    chipTextActive: {
      color: c.primary,
    },
    legendWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
      marginBottom: Spacing.sm,
    },
    legendChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 5,
      backgroundColor: c.inputBackground,
    },
    legendChipActive: {
      borderColor: c.primary,
      backgroundColor: `${c.primary}16`,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      color: c.text,
      fontSize: Typography.fontSizeXs,
    },
    legendTextMuted: {
      color: c.textMuted,
    },
    chartScroll: {
      gap: 2,
      paddingBottom: Spacing.xs,
    },
    chartAreaRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: Spacing.xs,
    },
    yAxisWrap: {
      minHeight: 96,
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      paddingBottom: 14,
      width: 44,
    },
    yAxisText: {
      color: c.textMuted,
      fontSize: 10,
    },
    chartPointCol: {
      width: 34,
      alignItems: 'center',
    },
    chartBarsWrap: {
      minHeight: 96,
      justifyContent: 'flex-end',
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 2,
    },
    chartBarsWrapSelected: {
      backgroundColor: `${c.primary}12`,
      borderRadius: Radius.sm,
      paddingHorizontal: 2,
    },
    chartBar: {
      width: 7,
      borderRadius: 3,
    },
    chartLabel: {
      color: c.textMuted,
      fontSize: 10,
      marginTop: 4,
    },
    tooltipCard: {
      marginTop: Spacing.xs,
      borderWidth: 1,
      borderColor: c.borderLight,
      borderRadius: Radius.sm,
      backgroundColor: c.inputBackground,
      padding: Spacing.sm,
    },
    tooltipTitle: {
      color: c.text,
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightSemibold,
      marginBottom: 4,
    },
    tooltipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 2,
    },
    tooltipLabel: {
      color: c.textSecondary,
      fontSize: Typography.fontSizeXs,
      flex: 1,
    },
    tooltipValue: {
      color: c.text,
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightSemibold,
    },
    entryCard: {
      borderWidth: 1,
      borderColor: c.borderLight,
      borderRadius: Radius.sm,
      backgroundColor: c.inputBackground,
      padding: Spacing.sm,
      marginBottom: Spacing.xs,
    },
    entryHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 2,
    },
    entryTitle: {
      color: c.text,
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
    },
    entryStatus: {
      color: c.primary,
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightSemibold,
    },
    entryMeta: {
      color: c.textSecondary,
      fontSize: Typography.fontSizeXs,
      marginBottom: 2,
    },
    entryDesc: {
      color: c.text,
      fontSize: Typography.fontSizeXs,
      marginBottom: 4,
    },
    emptyText: {
      color: c.textMuted,
      fontSize: Typography.fontSizeXs,
    },
    actionList: { gap: Spacing.xs },
    actionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderColor: c.borderLight,
      backgroundColor: c.inputBackground,
      padding: Spacing.sm,
    },
    actionTextWrap: { flex: 1, marginRight: Spacing.sm },
    actionTitle: {
      color: c.text,
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
      marginBottom: 2,
    },
    actionSubtitle: {
      color: c.textSecondary,
      fontSize: Typography.fontSizeXs,
    },
  });
}
