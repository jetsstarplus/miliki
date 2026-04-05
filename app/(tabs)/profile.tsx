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
import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { AppColors, Radius, Shadow, Spacing, Typography } from '../../constants/theme';
import { useAuth } from '../../context/auth';
import { ThemeMode, useTheme } from '../../context/theme';

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: InfoRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function Profile() {
  const { user, activeCompany, signOut } = useAuth();
  const { colors, isDark, mode, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  function handleSignOut() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />
      <AppHeader title="Profile" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.firstName?.[0] ?? user?.username?.[0] ?? 'U').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.fullName}>
            {user?.firstName
              ? `${user.firstName} ${user.lastName}`
              : user?.username ?? 'User'}
          </Text>
          <Text style={styles.email}>{user?.email ?? ''}</Text>
          <View style={[styles.badge, user?.verified ? styles.badgeVerified : styles.badgePending]}>
            <Text style={styles.badgeText}>
              {user?.verified ? '✓ Verified' : '⏳ Pending Verification'}
            </Text>
          </View>
        </View>

        {/* Account info */}
        <Text style={styles.sectionLabel}>Account</Text>
        <Card style={styles.card} padded>
          <InfoRow label="Username" value={user?.username ?? '—'} />
          <InfoRow label="Email" value={user?.email ?? '—'} />
          <InfoRow
            label="Full Name"
            value={user?.firstName ? `${user.firstName} ${user.lastName}` : '—'}
          />
        </Card>

        {/* Company info */}
        {activeCompany && (
          <>
            <Text style={styles.sectionLabel}>Company</Text>
            <Card style={styles.card} padded>
              <InfoRow label="Name" value={activeCompany.name} />
              <InfoRow
                label="Type"
                value={activeCompany.companyType === 'LANDLORD' ? 'Landlord' : 'Agent'}
              />
              <InfoRow label="Status" value={activeCompany.status ?? '—'} />
              {activeCompany.email && <InfoRow label="Email" value={activeCompany.email} />}
            </Card>
          </>
        )}

        {/* Appearance */}
        <Text style={styles.sectionLabel}>Appearance</Text>
        <Card style={styles.card} padded={false}>
          {(['system', 'light', 'dark'] as ThemeMode[]).map((m, idx, arr) => (
            <React.Fragment key={m}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setMode(m)}
                activeOpacity={0.7}
              >
                <Text style={styles.menuItemIcon}>
                  {m === 'system' ? '⚙️' : m === 'light' ? '☀️' : '🌙'}
                </Text>
                <Text style={styles.menuItemText}>
                  {m === 'system' ? 'Follow System' : m === 'light' ? 'Light' : 'Dark'}
                </Text>
                {mode === m && (
                  <Text style={[styles.menuItemChevron, { color: colors.primary, fontSize: 18 }]}>✓</Text>
                )}
              </TouchableOpacity>
              {idx < arr.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </Card>

        {/* Actions */}
        <Text style={styles.sectionLabel}>Actions</Text>
        <Card style={styles.card} padded={false}>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemIcon}>🏢</Text>
            <Text style={styles.menuItemText}>Company Settings</Text>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemIcon}>🔔</Text>
            <Text style={styles.menuItemText}>Notifications</Text>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemIcon}>🔒</Text>
            <Text style={styles.menuItemText}>Change Password</Text>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>
        </Card>

        <Button
          title="Sign Out"
          variant="outline"
          onPress={handleSignOut}
          style={styles.signOutBtn}
        />

        <Text style={styles.version}>miliki v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: { padding: Spacing.xl, paddingBottom: Spacing.xxl },

    avatarSection: { alignItems: 'center', marginBottom: Spacing.xl },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: c.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.md,
      ...Shadow.md,
    },
    avatarText: { color: '#fff', fontSize: 32, fontWeight: Typography.fontWeightBold },
    fullName: { fontSize: Typography.fontSizeXl, fontWeight: Typography.fontWeightBold, color: c.text, marginBottom: 4 },
    email: { fontSize: Typography.fontSizeMd, color: c.textSecondary, marginBottom: Spacing.sm },
    badge: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.full,
    },
    badgeVerified: { backgroundColor: '#D1FAE5' },
    badgePending: { backgroundColor: '#FEF3C7' },
    badgeText: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium, color: c.text },

    sectionLabel: {
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
      color: c.textSecondary,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: Spacing.sm,
      marginTop: Spacing.sm,
    },
    card: { marginBottom: Spacing.lg },

    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
    },
    infoLabel: { fontSize: Typography.fontSizeSm, color: c.textSecondary },
    infoValue: { fontSize: Typography.fontSizeSm, color: c.text, fontWeight: Typography.fontWeightMedium, flex: 1, textAlign: 'right' },

    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    menuItemIcon: { fontSize: 20, marginRight: Spacing.md },
    menuItemText: { flex: 1, fontSize: Typography.fontSizeMd, color: c.text },
    menuItemChevron: { fontSize: Typography.fontSizeLg, color: c.textMuted },
    divider: { height: 1, backgroundColor: c.borderLight, marginHorizontal: Spacing.lg },

    signOutBtn: { marginTop: Spacing.sm },
    version: { fontSize: Typography.fontSizeXs, color: c.textMuted, textAlign: 'center', marginTop: Spacing.xl },
  });
}
