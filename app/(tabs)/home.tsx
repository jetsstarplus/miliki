import React from 'react';
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/ui/Card';
import { Colors, Radius, Shadow, Spacing, Typography } from '../../constants/theme';
import { useAuth } from '../../context/auth';

const QUICK_ACTIONS = [
  { icon: '🏗️', label: 'Add Property', route: '/properties' },
  { icon: '👤', label: 'Add Tenant', route: '/tenants' },
  { icon: '💳', label: 'Payments', route: '/tenants' },
  { icon: '📊', label: 'Reports', route: '/profile' },
];

const STAT_CARDS = [
  { label: 'Buildings', value: '—', icon: '🏢', color: '#EBF5FF' },
  { label: 'Units', value: '—', icon: '🚪', color: '#F0FFF4' },
  { label: 'Tenants', value: '—', icon: '👥', color: '#FFF7E6' },
  { label: 'Pending', value: '—', icon: '💰', color: '#FFF0F0' },
];

export default function Dashboard() {
  const { user, activeCompany } = useAuth();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Top header */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.greeting}>{greeting} 👋</Text>
            <Text style={styles.username}>
              {user?.firstName ? `${user.firstName} ${user.lastName}` : user?.username ?? 'User'}
            </Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.firstName?.[0] ?? user?.username?.[0] ?? 'U').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Company badge */}
        {activeCompany && (
          <View style={styles.companyBadge}>
            <View style={styles.companyDot} />
            <Text style={styles.companyBadgeText}>
              {activeCompany.name}
              {'  '}
              <Text style={styles.companyType}>
                {activeCompany.companyType === 'LANDLORD' ? '· Landlord' : '· Agent'}
              </Text>
            </Text>
          </View>
        )}

        {/* Stats grid */}
        <Text style={styles.sectionLabel}>Overview</Text>
        <View style={styles.statsGrid}>
          {STAT_CARDS.map(s => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: s.color }]}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick actions */}
        <Text style={styles.sectionLabel}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map(a => (
            <TouchableOpacity key={a.label} style={styles.quickAction} activeOpacity={0.7}>
              <View style={styles.quickIconWrap}>
                <Text style={styles.quickIcon}>{a.icon}</Text>
              </View>
              <Text style={styles.quickLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent activity placeholder */}
        <Text style={styles.sectionLabel}>Recent Activity</Text>
        <Card padded>
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>No recent activity</Text>
            <Text style={styles.emptyText}>
              Your property activities will appear here once you start adding buildings and tenants.
            </Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.xl, paddingBottom: Spacing.xxl },

  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  greeting: { fontSize: Typography.fontSizeSm, color: Colors.textSecondary, marginBottom: 2 },
  username: { fontSize: Typography.fontSizeXl, fontWeight: Typography.fontWeightBold, color: Colors.text },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.sm,
  },
  avatarText: { color: '#fff', fontSize: Typography.fontSizeLg, fontWeight: Typography.fontWeightBold },

  companyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.overlay,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignSelf: 'flex-start',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  companyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success, marginRight: Spacing.sm },
  companyBadgeText: { fontSize: Typography.fontSizeSm, color: Colors.text, fontWeight: Typography.fontWeightMedium },
  companyType: { color: Colors.textSecondary, fontWeight: Typography.fontWeightRegular },

  sectionLabel: {
    fontSize: Typography.fontSizeSm,
    fontWeight: Typography.fontWeightSemibold,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    minWidth: '46%',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statIcon: { fontSize: 22, marginBottom: Spacing.xs },
  statValue: { fontSize: Typography.fontSize2xl, fontWeight: Typography.fontWeightBold, color: Colors.text },
  statLabel: { fontSize: Typography.fontSizeSm, color: Colors.textSecondary, marginTop: 2 },

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  quickAction: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  quickIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  quickIcon: { fontSize: 22 },
  quickLabel: { fontSize: Typography.fontSizeSm, color: Colors.text, fontWeight: Typography.fontWeightMedium, textAlign: 'center' },

  emptyState: { alignItems: 'center', padding: Spacing.lg },
  emptyEmoji: { fontSize: 40, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.fontSizeLg, fontWeight: Typography.fontWeightSemibold, color: Colors.text, marginBottom: Spacing.sm },
  emptyText: { fontSize: Typography.fontSizeSm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
