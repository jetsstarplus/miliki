import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ServerErrorBanner } from '@/components/ui/ServerErrorBanner';
import { AppColors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/theme';
import { ACCOUNTING_MENU_DATA, ACCOUNTING_TEMPLATE_WORKFLOWS } from '@/graphql/properties/queries/accounting';
import { useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type MenuCard = {
  key: string;
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  route?: string;
  endpoint?: string;
};

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
    trialBalanceReportData: '/(tabs)/accounting/dashboard/reports',
    balanceSheetReportData: '/(tabs)/accounting/dashboard/reports',
    incomeStatementReportData: '/(tabs)/accounting/dashboard/reports',
    cashFlowReportData: '/(tabs)/accounting/dashboard/reports',
    retainedEarningsReportData: '/(tabs)/accounting/dashboard/reports',
    comparativePerformanceReportData: '/(tabs)/accounting/dashboard/reports',
    revenueTrendReportData: '/(tabs)/accounting/dashboard/reports',
    accountTrendReportData: '/(tabs)/accounting/dashboard/reports',
  };

  return map[key];
}

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

const FALLBACK_MENU: MenuCard[] = [
  {
    key: 'dashboard',
    title: 'Accounting Dashboard',
    subtitle: 'Trends, balances, and quick financial insights.',
    icon: 'analytics-outline',
    route: '/(tabs)/accounting/dashboard',
    endpoint: 'accountingDashboardPageData',
  },
  {
    key: 'accounts',
    title: 'Chart of Accounts',
    subtitle: 'Browse and manage account structure.',
    icon: 'list-outline',
    route: '/(tabs)/accounting/chart-of-accounts',
    endpoint: 'chartOfAccountsPageData',
  },
  {
    key: 'journals',
    title: 'Journal Entries',
    subtitle: 'Track, post, void, and delete journal entries.',
    icon: 'book-outline',
    route: '/(tabs)/accounting/journal-entries',
    endpoint: 'journalEntriesPageData',
  },
  {
    key: 'credits',
    title: 'Tenant Credits',
    subtitle: 'Review and issue tenant credit notes.',
    icon: 'wallet-outline',
    endpoint: 'tenantCreditsPageData',
  },
  {
    key: 'refunds',
    title: 'Tenant Refunds',
    subtitle: 'Approve, complete, and cancel refunds.',
    icon: 'swap-horizontal-outline',
    route: '/(tabs)/accounting/tenant-refunds',
    endpoint: 'tenantRefundsPageData',
  },
  {
    key: 'manual-transfer',
    title: 'Manual Transfer',
    subtitle: 'Move funds between accounts with audit trail.',
    icon: 'shuffle-outline',
    route: '/(tabs)/accounting/manual-transfer',
    endpoint: 'manualTransferFormData',
  },
  {
    key: 'settings',
    title: 'Accounting Settings',
    subtitle: 'Configure method, fiscal start, and periods.',
    icon: 'settings-outline',
    route: '/(tabs)/accounting/account-settings',
    endpoint: 'accountingSettingsPageData',
  },
];

export default function Accounting() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { isAuthenticated, activeCompany } = useAuth();
  const router = useRouter();

  const menuQuery = useQuery(ACCOUNTING_MENU_DATA, {
    variables: { companyId: activeCompany?.id },
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !activeCompany?.id,
  });

  const workflowsQuery = useQuery(ACCOUNTING_TEMPLATE_WORKFLOWS, {
    variables: { companyId: activeCompany?.id },
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !activeCompany?.id,
  });

  const menuPayload = normalizeGenericScalarPayload((menuQuery.data as any)?.accountingMenuData ?? {});

  const menuItems = Array.isArray(menuPayload?.items)
    ? menuPayload.items
        .map((item: any, idx: number) => ({
          key: String(item?.key ?? item?.id ?? `menu-${idx}`),
          title: String(item?.label ?? item?.title ?? item?.name ?? 'Accounting Item'),
          subtitle: String(item?.description ?? item?.template ?? 'Accounting workflow'),
          icon: 'chevron-forward-circle-outline' as const,
          endpoint: String(item?.query ?? item?.endpoint ?? ''),
          route:
            (typeof item?.route === 'string' ? item.route : undefined) ||
            routeFromEndpoint(String(item?.query ?? item?.endpoint ?? '')),
        }))
        .filter((item: MenuCard) => Boolean(item.title))
    : [];

  const cards = menuItems.length ? menuItems : FALLBACK_MENU;

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Accounting" />
        <ErrorState title="Session expired" message="Please sign in again to continue." onRetry={() => router.replace('/(auth)/login' as any)} />
      </SafeAreaView>
    );
  }

  if (!activeCompany?.id) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Accounting" />
        <ErrorState title="Company required" message="Select a company to load accounting workflows." onRetry={() => router.push('/(tabs)/profile/company-switcher' as any)} />
      </SafeAreaView>
    );
  }

  if ((menuQuery.loading && !menuQuery.data) || (workflowsQuery.loading && !workflowsQuery.data)) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Accounting" />
        <LoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Accounting" />

      <ScrollView contentContainerStyle={styles.body}>
        {menuQuery.error ? <ServerErrorBanner message={menuQuery.error.message} /> : null}
        {workflowsQuery.error ? <ServerErrorBanner message={workflowsQuery.error.message} /> : null}

        <Text style={styles.heading}>Manage Your Accounts</Text>
        <Text style={styles.subHeading}>Define and see the list of your accounting workflows.</Text>

        <View style={styles.cardList}>
          {cards.map((item: MenuCard) => (
            <TouchableOpacity
              key={item.key}
              style={styles.card}
              activeOpacity={0.78}
              onPress={() => {
                if (item.route) {
                  router.push(item.route as any);
                  return;
                }
              }}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={item.icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                {/* {item.endpoint ? <Text style={styles.endpointText}>Query: {item.endpoint}</Text> : null} */}
              </View>
              {item.route ? (
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              ) : (
                <Text style={styles.comingSoonText}>Soon</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    body: { padding: Spacing.md, paddingBottom: Spacing.xxl },
    heading: {
      color: c.text,
      fontSize: Typography.fontSizeLg,
      fontWeight: Typography.fontWeightSemibold,
      marginBottom: 4,
    },
    subHeading: {
      color: c.textSecondary,
      fontSize: Typography.fontSizeSm,
      marginBottom: Spacing.md,
    },
    cardList: {
      gap: Spacing.sm,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderLight,
      borderRadius: Radius.md,
      padding: Spacing.md,
      ...Shadow.sm,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: Radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primary + '14',
    },
    cardContent: {
      flex: 1,
    },
    cardTitle: {
      color: c.text,
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
      marginBottom: 2,
    },
    cardSubtitle: {
      color: c.textSecondary,
      fontSize: Typography.fontSizeXs,
      marginBottom: 2,
    },
    endpointText: {
      color: c.textMuted,
      fontSize: Typography.fontSizeXs,
    },
    comingSoonText: {
      color: c.textMuted,
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightMedium,
    },
    workflowInfo: {
      marginTop: Spacing.md,
      padding: Spacing.sm,
      borderRadius: Radius.sm,
      backgroundColor: c.inputBackground,
    },
    workflowTitle: {
      color: c.text,
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
      marginBottom: 2,
    },
    workflowCaption: {
      color: c.textMuted,
      fontSize: Typography.fontSizeXs,
    },
  });
}
