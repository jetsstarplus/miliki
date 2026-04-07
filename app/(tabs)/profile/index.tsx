import { AppHeader } from '@/components/AppHeader';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { ThemeMode, useTheme } from '@/context/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type MenuRowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  destructive?: boolean;
  value?: string;
  showChevron?: boolean;
};

function MenuRow({ icon, label, onPress, destructive, value, showChevron = true }: MenuRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIconWrap, destructive && styles.menuIconDestructive]}>
        <Ionicons name={icon} size={18} color={destructive ? Colors.error : colors.primary} />
      </View>
      <Text style={[styles.menuLabel, destructive && styles.menuLabelDestructive]}>{label}</Text>
      {value ? <Text style={styles.menuValue}>{value}</Text> : null}
      {showChevron && !value && (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function Profile() {
  const { user, activeCompany, signOut } = useAuth();
  const { colors, isDark, mode, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();

  const initials = [user?.firstName?.[0], user?.lastName?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U';

  const fullName = user?.firstName
    ? `${user.firstName} ${user.lastName}`.trim()
    : user?.username ?? 'User';

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  const themeOptions: { mode: ThemeMode; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { mode: 'light', label: 'Light', icon: 'sunny-outline' },
    { mode: 'dark', label: 'Dark', icon: 'moon-outline' },
    { mode: 'system', label: 'System', icon: 'phone-portrait-outline' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />
      <AppHeader title="Profile" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero ─────────────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{fullName}</Text>
            <Text style={styles.heroEmail}>{user?.email ?? ''}</Text>
          </View>
          <View style={[styles.verifiedBadge, user?.verified ? styles.verifiedBadgeGreen : styles.verifiedBadgeAmber]}>
            <Ionicons
              name={user?.verified ? 'checkmark-circle' : 'time-outline'}
              size={12}
              color={user?.verified ? Colors.success : Colors.warning}
            />
            <Text style={[styles.verifiedText, { color: user?.verified ? Colors.success : Colors.warning }]}>
              {user?.verified ? 'Verified' : 'Unverified'}
            </Text>
          </View>
        </View>

        {/* ── Company ──────────────────────────────────────────── */}
        {activeCompany && (
          <>
            <SectionHeader title="Company" />
            <View style={styles.card}>
              <View style={styles.companyRow}>
                <View style={styles.companyIconWrap}>
                  <Ionicons name="business" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.companyName}>{activeCompany.name}</Text>
                  <Text style={styles.companyType}>
                    {activeCompany.companyType === 'LANDLORD' ? 'Landlord' : 'Agent'}
                  </Text>
                </View>
                <View style={[styles.statusDot, activeCompany.status === 'ACTIVE' && styles.statusDotActive]} />
              </View>
              <View style={styles.divider} />
              <MenuRow
                icon="swap-horizontal-outline"
                label="Switch Company"
                onPress={() => router.push('/(tabs)/profile/company-switcher' as any)}
              />
              <View style={styles.divider} />
              <MenuRow
                icon="settings-outline"
                label="Company Settings"
                onPress={() => router.push('/(tabs)/profile/settings' as any)}
              />
            </View>
          </>
        )}

        {/* ── Account ──────────────────────────────────────────── */}
        <SectionHeader title="Account" />
        <View style={styles.card}>
          <MenuRow
            icon="lock-closed-outline"
            label="Change Password"
            onPress={() => router.push('/(tabs)/profile/change-password' as any)}
          />
        </View>

        {/* ── Appearance ───────────────────────────────────────── */}
        <SectionHeader title="Appearance" />
        <View style={styles.card}>
          <View style={styles.themeRow}>
            {themeOptions.map((t) => (
              <TouchableOpacity
                key={t.mode}
                style={[styles.themeChip, mode === t.mode && styles.themeChipActive]}
                onPress={() => setMode(t.mode)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={t.icon}
                  size={16}
                  color={mode === t.mode ? '#fff' : colors.textSecondary}
                />
                <Text style={[styles.themeChipText, mode === t.mode && styles.themeChipTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Danger ───────────────────────────────────────────── */}
        <SectionHeader title="Session" />
        <View style={styles.card}>
          <MenuRow
            icon="log-out-outline"
            label="Sign Out"
            onPress={handleSignOut}
            destructive
            showChevron={false}
          />
        </View>

        <Text style={styles.version}>miliki v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl },

    // Hero
    heroCard: {
      backgroundColor: c.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      ...Shadow.sm,
    },
    avatarCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: { color: '#fff', fontSize: Typography.fontSizeXl, fontWeight: Typography.fontWeightBold },
    heroInfo: { flex: 1 },
    heroName: { fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightSemibold, color: c.text },
    heroEmail: { fontSize: Typography.fontSizeSm, color: c.textSecondary, marginTop: 2 },
    verifiedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: Radius.full,
      alignSelf: 'flex-start',
    },
    verifiedBadgeGreen: { backgroundColor: 'rgba(16,185,129,0.12)' },
    verifiedBadgeAmber: { backgroundColor: 'rgba(245,158,11,0.12)' },
    verifiedText: { fontSize: 10, fontWeight: Typography.fontWeightSemibold },

    // Section header
    sectionHeader: {
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightSemibold,
      color: c.textMuted,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: Spacing.xs,
      marginTop: Spacing.md,
      paddingHorizontal: Spacing.xs,
    },

    // Card
    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.lg,
      overflow: 'hidden',
      marginBottom: Spacing.xs,
      ...Shadow.sm,
    },

    // Company row
    companyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      gap: Spacing.sm,
    },
    companyIconWrap: {
      width: 40,
      height: 40,
      borderRadius: Radius.md,
      backgroundColor: c.overlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    companyName: { fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightSemibold, color: c.text },
    companyType: { fontSize: Typography.fontSizeSm, color: c.textSecondary, marginTop: 1 },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.border },
    statusDotActive: { backgroundColor: Colors.success },

    divider: { height: 1, backgroundColor: c.borderLight, marginHorizontal: Spacing.md },

    // Menu row
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: 14,
      gap: Spacing.sm,
    },
    menuIconWrap: {
      width: 32,
      height: 32,
      borderRadius: Radius.sm,
      backgroundColor: c.overlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    menuIconDestructive: { backgroundColor: 'rgba(239,68,68,0.1)' },
    menuLabel: { flex: 1, fontSize: Typography.fontSizeMd, color: c.text },
    menuLabelDestructive: { color: Colors.error },
    menuValue: { fontSize: Typography.fontSizeSm, color: c.textSecondary, marginRight: Spacing.xs },

    // Theme picker
    themeRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
      padding: Spacing.md,
    },
    themeChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.md,
      backgroundColor: c.borderLight,
      borderWidth: 1,
      borderColor: c.border,
    },
    themeChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    themeChipText: { fontSize: Typography.fontSizeSm, color: c.textSecondary, fontWeight: Typography.fontWeightMedium },
    themeChipTextActive: { color: '#fff' },

    version: { fontSize: Typography.fontSizeXs, color: c.textMuted, textAlign: 'center', marginTop: Spacing.xl },
  });
}

