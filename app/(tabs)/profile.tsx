import React from 'react';
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
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Colors, Radius, Shadow, Spacing, Typography } from '../../constants/theme';
import { useAuth } from '../../context/auth';

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function Profile() {
  const { user, activeCompany, signOut } = useAuth();

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
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
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

        <Text style={styles.version}>Monerom v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.xl, paddingBottom: Spacing.xxl },

  avatarSection: { alignItems: 'center', marginBottom: Spacing.xl },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: Typography.fontWeightBold },
  fullName: { fontSize: Typography.fontSizeXl, fontWeight: Typography.fontWeightBold, color: Colors.text, marginBottom: 4 },
  email: { fontSize: Typography.fontSizeMd, color: Colors.textSecondary, marginBottom: Spacing.sm },
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  badgeVerified: { backgroundColor: '#D1FAE5' },
  badgePending: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium, color: Colors.text },

  sectionLabel: {
    fontSize: Typography.fontSizeSm,
    fontWeight: Typography.fontWeightSemibold,
    color: Colors.textSecondary,
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
    borderBottomColor: Colors.borderLight,
  },
  infoLabel: { fontSize: Typography.fontSizeSm, color: Colors.textSecondary },
  infoValue: { fontSize: Typography.fontSizeSm, color: Colors.text, fontWeight: Typography.fontWeightMedium, flex: 1, textAlign: 'right' },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  menuItemIcon: { fontSize: 20, marginRight: Spacing.md },
  menuItemText: { flex: 1, fontSize: Typography.fontSizeMd, color: Colors.text },
  menuItemChevron: { fontSize: Typography.fontSizeLg, color: Colors.textMuted },
  divider: { height: 1, backgroundColor: Colors.borderLight, marginHorizontal: Spacing.lg },

  signOutBtn: { marginTop: Spacing.sm },
  version: { fontSize: Typography.fontSizeXs, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xl },
});
