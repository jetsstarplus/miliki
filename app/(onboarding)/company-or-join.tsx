import { useMutation, useQuery } from '@apollo/client';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
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
import { AppColors, Colors, Radius, Spacing, Typography } from '../../constants/theme';
import { useAuth } from '../../context/auth';
import { useTheme } from '../../context/theme';
import { ACCEPT_COMPANY_INVITATION_MUTATION } from '../../graphql/subscriptions/mutations';
import { COMPANY_INVITATIONS_QUERY } from '../../graphql/subscriptions/queries';

interface Invitation {
  id: string;
  invitationToken: string;
  email: string;
  expiresAt: string;
  company: { id: string; name: string };
  role: string;
}

export default function CompanyOrJoin() {
  const router = useRouter();
  const { setActiveCompany, signOut } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const { data, loading: invitationsLoading } = useQuery(COMPANY_INVITATIONS_QUERY, {
    fetchPolicy: 'network-only',
  });

  const [acceptInvitation] = useMutation(ACCEPT_COMPANY_INVITATION_MUTATION);

  const invitations: Invitation[] =
    data?.companyInvitations?.edges?.map((e: any) => e.node) ?? [];

  async function handleAcceptInvitation(invitation: Invitation) {
    setAcceptingId(invitation.id);
    try {
      const { data: result } = await acceptInvitation({
        variables: { invitationToken: invitation.invitationToken },
      });
      const res = result?.acceptCompanyInvitation;
      if (res?.success && res?.membership?.company) {
        await setActiveCompany(res.membership.company);
        router.replace('/(onboarding)/select-plan' as any);
      } else {
        Alert.alert('Failed', res?.message ?? 'Could not join company. Please try again.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong.');
    } finally {
      setAcceptingId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Image
            source={require('../../assets/images/favicons/logo-1.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Set up your workspace</Text>
          <Text style={styles.subtitle}>
            Create a new company or join an existing one
          </Text>
        </View>

        {/* Create a new company */}
        <Card style={styles.optionCard}>
          <View style={styles.optionIcon}>
            <Text style={styles.optionEmoji}>🏢</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>Create a new company</Text>
            <Text style={styles.optionDesc}>
              Set up your property management workspace from scratch
            </Text>
          </View>
          <Button
            title="Create"
            fullWidth={false}
            onPress={() => router.push('/(onboarding)/create-company' as any)}
            style={styles.optionBtn}
          />
        </Card>

        {/* Pending invitations */}
        {invitationsLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Checking for invitations…</Text>
          </View>
        ) : invitations.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>Pending Invitations</Text>
            {invitations.map(inv => (
              <Card key={inv.id} style={styles.inviteCard}>
                <View style={styles.inviteRow}>
                  <View style={styles.inviteBadge}>
                    <Text style={styles.inviteBadgeText}>
                      {inv.role.charAt(0).toUpperCase() + inv.role.slice(1).toLowerCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inviteCompany}>{inv.company.name}</Text>
                    <Text style={styles.inviteExpiry}>
                      Expires {new Date(inv.expiresAt).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>
                <Button
                  title={acceptingId === inv.id ? 'Joining…' : 'Accept & Join'}
                  loading={acceptingId === inv.id}
                  onPress={() => handleAcceptInvitation(inv)}
                  style={{ marginTop: Spacing.sm }}
                />
              </Card>
            ))}
          </>
        ) : null}

        {/* Sign out link */}
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: Spacing.xl,
      paddingBottom: Spacing.xl,
    },
    header: {
      alignItems: 'center',
      paddingTop: Spacing.xl,
      paddingBottom: Spacing.xl,
    },
    logo: { width: 72, height: 72, marginBottom: Spacing.md },
    title: {
      fontSize: Typography.fontSize2xl,
      fontWeight: Typography.fontWeightBold,
      color: c.text,
      textAlign: 'center',
      marginBottom: Spacing.xs,
    },
    subtitle: {
      fontSize: Typography.fontSizeMd,
      color: c.textSecondary,
      textAlign: 'center',
    },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      marginBottom: Spacing.md,
      padding: Spacing.md,
    },
    optionIcon: {
      width: 48,
      height: 48,
      borderRadius: Radius.md,
      backgroundColor: c.overlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    optionEmoji: { fontSize: 24 },
    optionTitle: {
      fontSize: Typography.fontSizeMd,
      fontWeight: Typography.fontWeightSemibold,
      color: c.text,
      marginBottom: 2,
    },
    optionDesc: {
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
      lineHeight: 16,
    },
    optionBtn: { minWidth: 80 },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      justifyContent: 'center',
      paddingVertical: Spacing.lg,
    },
    loadingText: {
      fontSize: Typography.fontSizeSm,
      color: c.textMuted,
    },
    sectionLabel: {
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: Spacing.sm,
      marginTop: Spacing.sm,
    },
    inviteCard: { marginBottom: Spacing.sm },
    inviteRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
    },
    inviteBadge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderRadius: Radius.sm,
      backgroundColor: c.primary + '18',
    },
    inviteBadgeText: {
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightSemibold,
      color: c.primary,
    },
    inviteCompany: {
      fontSize: Typography.fontSizeMd,
      fontWeight: Typography.fontWeightSemibold,
      color: c.text,
    },
    inviteExpiry: {
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
      marginTop: 2,
    },
    signOutBtn: {
      alignItems: 'center',
      marginTop: Spacing.xl,
    },
    signOutText: {
      fontSize: Typography.fontSizeMd,
      color: Colors.error,
    },
  });
}
