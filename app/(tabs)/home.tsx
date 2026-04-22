import { useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useDrawer } from '@/context/drawer';
import { useTheme } from '@/context/theme';
import { DASHBOARD } from '@/graphql/properties/queries/building';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function MetricCard({
  label,
  value,
  icon,
  iconColor,
  iconBg,
  sub,
  onPress,
}: {
  label: string;
  value: string | number;
  icon: IoniconName;
  iconColor: string;
  iconBg: string;
  sub?: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const inner = (
    <>
      <View style={[styles.metricIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.metricValue}>{value ?? '—'}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {sub ? <Text style={styles.metricSub}>{sub}</Text> : null}
    </>
  );
  if (onPress) {
    return (
      <TouchableOpacity style={styles.metricCard} onPress={onPress} activeOpacity={0.7}>
        {inner}
      </TouchableOpacity>
    );
  }
  return <View style={styles.metricCard}>{inner}</View>;
}

function AlertBadge({ count, label, icon, color }: { count: number; label: string; icon: IoniconName; color: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (!count) return null;
  return (
    <View style={[styles.alertBadge, { borderLeftColor: color }]}>
      <View style={[styles.alertIconWrap, { backgroundColor: color + '1A' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.alertCount, { color }]}>{count}</Text>
        <Text style={styles.alertLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
    </View>
  );
}

function QuickAction({
  icon,
  label,
  tint,
  onPress,
}: {
  icon: IoniconName;
  label: string;
  tint: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickIconWrap, { backgroundColor: tint + '18' }]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function Dashboard() {
  const { user, activeCompany } = useAuth();
  const { toggle } = useDrawer();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [refreshing, setRefreshing] = React.useState(false);

  const { data, refetch } = useQuery(DASHBOARD, {
    fetchPolicy: 'cache-and-network',
  });

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const stats = data?.dashboard?.stats;
  const admin = data?.dashboard?.adminSection;
  const accountant = data?.dashboard?.accountantSection;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const firstName = user?.firstName ?? user?.username ?? 'there';

  // Occupancy bar segments
  const totalUnits = stats?.totalUnits ?? 0;
  const occupiedPct = totalUnits > 0 ? Math.round((stats.occupiedUnits / totalUnits) * 100) : 0;
  const reservedPct = totalUnits > 0 ? Math.round((stats.reservedUnits / totalUnits) * 100) : 0;
  const vacantPct = 100 - occupiedPct - reservedPct;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* ── Header ── */}
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={toggle} style={styles.menuBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="menu" size={26} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.companyName}>{activeCompany ? activeCompany.name : ''}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.firstName?.[0] ?? user?.username?.[0] ?? 'U').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* ── Company row ── */}
        {activeCompany && (
          <View style={styles.companyRow}>
            {/* <View style={styles.companyDot} />
            <Text style={styles.companyName}>{activeCompany.name}</Text>
            <Text style={styles.companySep}>·</Text>
            <Text style={styles.companyRole}>
              {activeCompany.companyType === 'LANDLORD' ? 'Landlord' : 'Agent'}
            </Text> */}
          </View>
        )}

        {/* ── Key Metrics ── */}
        <View style={styles.metricsRow}>
          <MetricCard
            label="Buildings"
            value={stats?.totalBuildings ?? '—'}
            icon="business-outline"
            iconColor={colors.primary}
            iconBg={colors.overlay}
            onPress={() => router.push('/(tabs)/building' as any)}
          />
          <View style={styles.metricSep} />
          <MetricCard
            label="Total Units"
            value={stats?.totalUnits ?? '—'}
            icon="grid-outline"
            iconColor={Colors.info}
            iconBg="rgba(59,130,246,0.1)"
            onPress={() => router.push('/(tabs)/units' as any)}
          />
          <View style={styles.metricSep} />
          <MetricCard
            label="Tenants"
            value={stats?.activeTenants ?? '—'}
            icon="people-outline"
            iconColor={Colors.success}
            iconBg="rgba(16,185,129,0.1)"
            onPress={() => router.push('/(tabs)/tenants' as any)}
          />
        </View>

        {/* ── Occupancy ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Occupancy</Text>
            <Text style={styles.occupancyPct}>{occupiedPct}%</Text>
          </View>

          {/* Segmented bar */}
          <View style={styles.segBar}>
            {occupiedPct > 0 && (
              <View style={[styles.segFill, { flex: occupiedPct, backgroundColor: Colors.success }]} />
            )}
            {reservedPct > 0 && (
              <View style={[styles.segFill, { flex: reservedPct, backgroundColor: Colors.warning }]} />
            )}
            {vacantPct > 0 && (
              <View style={[styles.segFill, { flex: Math.max(vacantPct, 1), backgroundColor: colors.borderLight }]} />
            )}
          </View>

          <View style={styles.segLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.legendText}>Occupied</Text>
              <Text style={styles.legendVal}>{stats?.occupiedUnits ?? '—'}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.warning }]} />
              <Text style={styles.legendText}>Reserved</Text>
              <Text style={styles.legendVal}>{stats?.reservedUnits ?? '—'}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.border }]} />
              <Text style={styles.legendText}>Vacant</Text>
              <Text style={styles.legendVal}>{stats?.vacantUnits ?? '—'}</Text>
            </View>
          </View>
        </View>

        {/* ── Arrears ── */}
        {(stats?.totalArrears != null) && (
          <TouchableOpacity
            style={[styles.card, styles.arrearsCard]}
            onPress={() => router.push('/(tabs)/arrears' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.arrearsInner}>
              <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
                <Ionicons name="warning-outline" size={18} color={Colors.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.arrearsAmount}>
                  {stats.totalArrears > 0
                    ? `KES ${Number(stats.totalArrears).toLocaleString()}`
                    : 'No arrears'}
                </Text>
                <Text style={styles.arrearsLabel}>Outstanding arrears</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>
        )}

        {/* ── Revenue (admin) ── */}
        {admin?.totalRevenue != null && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Revenue this month</Text>
            <Text style={styles.revenueAmount}>
              KES {Number(admin.totalRevenue).toLocaleString()}
            </Text>
          </View>
        )}

        {/* ── Collections (accountant) ── */}
        {accountant && (
          <View style={styles.collectionsRow}>
            <View style={[styles.collectionCard, { borderLeftColor: Colors.success }]}>
              <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
                <Ionicons name="cash-outline" size={18} color={Colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.collectionAmount}>
                  {accountant.totalCollected != null
                    ? `KES ${Number(accountant.totalCollected).toLocaleString()}`
                    : '—'}
                </Text>
                <Text style={styles.collectionLabel}>Total collected</Text>
              </View>
            </View>
            <View style={[styles.collectionCard, { borderLeftColor: Colors.warning }]}>
              <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
                <Ionicons name="time-outline" size={18} color={Colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.collectionAmount, { color: Colors.warning }]}>
                  {accountant.pendingReconciliation != null
                    ? `KES ${Number(accountant.pendingReconciliation).toLocaleString()}`
                    : '—'}
                </Text>
                <Text style={styles.collectionLabel}>Pending reconciliation</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Admin alerts ── */}
        {admin && (admin.unmatchedPaymentsCount > 0 || admin.pendingValidations > 0) && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Needs attention</Text>
            <AlertBadge
              count={admin.unmatchedPaymentsCount}
              label="Unmatched payments"
              icon="alert-circle-outline"
              color={Colors.warning}
            />
            <AlertBadge
              count={admin.pendingValidations}
              label="Pending validations"
              icon="hourglass-outline"
              color={Colors.info}
            />
          </View>
        )}

        {/* ── Team overview (admin) ── */}
        {admin && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Team</Text>
            <View style={styles.teamRow}>
              <MetricCard
                label="Agents"
                value={admin.agentsCount ?? '—'}
                icon="briefcase-outline"
                iconColor={Colors.info}
                iconBg="rgba(59,130,246,0.1)"
              />
              <View style={styles.metricSep} />
              <MetricCard
                label="Landlords"
                value={admin.landlordsCount ?? '—'}
                icon="home-outline"
                iconColor={colors.primary}
                iconBg={colors.overlay}
              />
              <View style={styles.metricSep} />
              <MetricCard
                label="Accountants"
                value={admin.accountantsCount ?? '—'}
                icon="calculator-outline"
                iconColor={Colors.success}
                iconBg="rgba(16,185,129,0.1)"
              />
            </View>
          </View>
        )}

        {/* ── Quick Actions ── */}
        <Text style={[styles.sectionLabel, { marginTop: Spacing.sm }]}>Quick actions</Text>
        <View style={styles.quickGrid}>
          <QuickAction
            icon="card-outline"
            label="Payments"
            tint={Colors.info}
            onPress={() => router.push('/(tabs)/payments' as any)}
          />
          <QuickAction
            icon="document-text-outline"
            label="Leases"
            tint={Colors.warning}
            onPress={() => router.push('/(tabs)/leases' as any)}
          />
          <QuickAction
            icon="bar-chart-outline"
            label="Arrears"
            tint={Colors.error}
            onPress={() => router.push('/(tabs)/arrears' as any)}
          />
          <QuickAction
            icon="people-circle-outline"
            label="Portfolio"
            tint={colors.primary}
            onPress={() => router.push('/(tabs)/portfolio' as any)}
          />
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl },

    // Header
    topHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingBottom: Spacing.sm,
    },
    menuBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    greeting: { fontSize: Typography.fontSizeXs, color: c.textMuted, lineHeight: 16 },
    username: { fontSize: Typography.fontSizeXl, fontWeight: Typography.fontWeightBold, color: c.text, lineHeight: 26 },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: c.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: { color: '#fff', fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightBold },

    // Company row
    companyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    companyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
    companyName: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightSemibold, color: c.text },
    companySep: { fontSize: Typography.fontSizeSm, color: c.textMuted },
    companyRole: { fontSize: Typography.fontSizeSm, color: c.textSecondary },

    // Section label
    sectionLabel: {
      fontSize: 11,
      fontWeight: Typography.fontWeightSemibold,
      color: c.textMuted,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: Spacing.xs,
    },

    // Generic card
    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: c.borderLight,
      ...Shadow.sm,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    cardTitle: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightSemibold, color: c.text },

    // Key metrics row
    metricsRow: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.borderLight,
      paddingVertical: Spacing.md,
      marginBottom: Spacing.sm,
      ...Shadow.sm,
    },
    metricCard: { flex: 1, alignItems: 'center', gap: 3 },
    metricIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
    metricValue: { fontSize: Typography.fontSizeXl, fontWeight: Typography.fontWeightBold, color: c.text },
    metricLabel: { fontSize: 11, color: c.textMuted, textAlign: 'center' },
    metricSub: { fontSize: 10, color: c.textMuted },
    metricSep: { width: 1, backgroundColor: c.borderLight, alignSelf: 'stretch', marginVertical: 4 },

    // Occupancy
    occupancyPct: { fontSize: Typography.fontSizeLg, fontWeight: Typography.fontWeightBold, color: Colors.success },
    segBar: {
      flexDirection: 'row',
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
      backgroundColor: c.borderLight,
      marginBottom: Spacing.sm,
    },
    segFill: { height: '100%' },
    segLegend: { flexDirection: 'row', justifyContent: 'space-between' },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 11, color: c.textSecondary },
    legendVal: { fontSize: 11, fontWeight: Typography.fontWeightSemibold, color: c.text },

    // Arrears
    arrearsCard: { borderLeftWidth: 3, borderLeftColor: Colors.error },
    arrearsInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    arrearsAmount: { fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightBold, color: Colors.error },
    arrearsLabel: { fontSize: 11, color: c.textSecondary, marginTop: 1 },

    // Revenue
    revenueAmount: { fontSize: Typography.fontSize2xl, fontWeight: Typography.fontWeightBold, color: c.text, marginTop: 2 },

    // Alert badge
    alertBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.sm,
      paddingLeft: Spacing.sm,
      borderLeftWidth: 3,
      marginBottom: Spacing.xs,
      borderRadius: Radius.sm,
      backgroundColor: c.surfaceAlt,
    },
    alertIconWrap: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    alertCount: { fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightBold },
    alertLabel: { fontSize: 11, color: c.textSecondary },

    // Team
    teamRow: { flexDirection: 'row', marginTop: Spacing.xs },

    // Collections
    collectionsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
    collectionCard: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      padding: Spacing.sm,
      borderWidth: 1,
      borderColor: c.borderLight,
      borderLeftWidth: 3,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      ...Shadow.sm,
    },
    collectionAmount: { fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightBold, color: c.text },
    collectionLabel: { fontSize: 10, color: c.textSecondary, marginTop: 1 },

    // Quick actions
    quickGrid: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    quickAction: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      paddingVertical: Spacing.md,
      paddingHorizontal: 4,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.borderLight,
      ...Shadow.sm,
    },
    quickIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.xs,
    },
    quickLabel: { fontSize: 11, color: c.text, fontWeight: Typography.fontWeightMedium, textAlign: 'center' },
  });
}
