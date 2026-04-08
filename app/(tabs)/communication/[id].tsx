import { ErrorState } from '@/components/ui/ErrorState';
import { InfoRow } from '@/components/ui/InfoRow';
import { LoadingState } from '@/components/ui/LoadingState';
import { SectionCard } from '@/components/ui/SectionCard';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { DELETE_CAMPAIGN, SEND_CAMPAIGN, TOGGLE_CAMPAIGN } from '@/graphql/properties/mutations/communication';
import { CAMPAIGN_LIST_DATA } from '@/graphql/properties/queries/communication';
import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6B7280',
  ACTIVE: Colors.success,
  SCHEDULED: '#8B5CF6',
  SENT: '#3B82F6',
};

function fmt(d: string | null | undefined) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

export default function CampaignDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data, loading, error, refetch } = useQuery(CAMPAIGN_LIST_DATA, {
    variables: { first: 200 },
    fetchPolicy: 'cache-and-network',
    skip: !id,
  });

  const campaigns: any[] = useMemo(() => {
    const edges = data?.notificationCampaignListData?.campaigns?.edges;
    if (!Array.isArray(edges)) return [];
    return edges.map((e: any) => e.node);
  }, [data]);

  const campaign = campaigns.find((c: any) => String(c.id) === id);

  const [sendCampaign, { loading: sending }] = useMutation(SEND_CAMPAIGN, {
    refetchQueries: [{ query: CAMPAIGN_LIST_DATA, variables: { first: 200 } }],
    onCompleted(d: any) {
      const r = d?.sendNotificationCampaignView?.result;
      if (!r?.success) Alert.alert('Error', r?.message ?? 'Failed to send campaign');
    },
    onError(err: any) { Alert.alert('Error', err.message); },
  });

  const [toggleCampaign, { loading: toggling }] = useMutation(TOGGLE_CAMPAIGN, {
    refetchQueries: [{ query: CAMPAIGN_LIST_DATA, variables: { first: 200 } }],
    onCompleted(d: any) {
      const r = d?.toggleNotificationCampaignView?.result;
      if (!r?.success) Alert.alert('Error', r?.message ?? 'Failed to toggle campaign');
    },
    onError(err: any) { Alert.alert('Error', err.message); },
  });

  const [deleteCampaign, { loading: deleting }] = useMutation(DELETE_CAMPAIGN, {
    refetchQueries: [{ query: CAMPAIGN_LIST_DATA, variables: { first: 200 } }],
    onCompleted(d: any) {
      const r = d?.deleteNotificationCampaignView?.result;
      if (r?.success) router.back();
      else Alert.alert('Error', r?.message ?? 'Failed to delete campaign');
    },
    onError(err: any) { Alert.alert('Error', err.message); },
  });

  function confirmSend() {
    Alert.alert('Send Campaign', `Send "${campaign?.name}" now?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send', onPress: () => sendCampaign({ variables: { campaignId: Number(id) } }) },
    ]);
  }

  function confirmToggle() {
    const isActive = campaign?.status === 'ACTIVE';
    Alert.alert(
      isActive ? 'Pause Campaign' : 'Activate Campaign',
      `${isActive ? 'Pause' : 'Activate'} "${campaign?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: isActive ? 'Pause' : 'Activate', onPress: () => toggleCampaign({ variables: { campaignId: Number(id) } }) },
      ],
    );
  }

  function confirmDelete() {
    Alert.alert('Delete Campaign', `Delete "${campaign?.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteCampaign({ variables: { campaignId: Number(id) } }) },
    ]);
  }

  const statusColor = STATUS_COLORS[campaign?.status] ?? colors.textMuted;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {campaign?.name ?? 'Campaign'}
        </Text>
        {campaign ? (
          <TouchableOpacity
            style={styles.backBtn}
            hitSlop={8}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/communication/add',
                params: {
                  campaignId: String(id),
                  name: campaign.name,
                  subject: campaign.subject,
                  message: campaign.message,
                  filterType: campaign.filterType,
                  frequency: campaign.frequency,
                  sendEmail: String(campaign.sendEmail),
                  sendSms: String(campaign.sendSms),
                  sendWhatsapp: String(campaign.sendWhatsapp),
                  scheduledDatetime: campaign.scheduledDatetime ?? '',
                  buildingId: campaign.buildingId ? String(campaign.buildingId) : '',
                  selectedTenants: campaign.filterType === 'CUSTOM' && Array.isArray(campaign.selectedTenants)
                    ? JSON.stringify(campaign.selectedTenants)
                    : '',
                },
              } as any)
            }
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {loading && !campaign && <LoadingState />}

      {error && !campaign && (
        <ErrorState title="Failed to load campaign" message={error.message} onRetry={() => refetch()} />
      )}

      {campaign && (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={styles.heroCard}>
            <View style={styles.heroRow}>
              <View style={styles.heroIconWrap}>
                <Ionicons name="megaphone" size={28} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroName}>{campaign.name}</Text>
                {campaign.subject ? (
                  <Text style={styles.heroSubject} numberOfLines={2}>{campaign.subject}</Text>
                ) : null}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>{campaign.status}</Text>
              </View>
            </View>
          </View>

          {/* Details */}
          <SectionCard title="Details">
            <InfoRow icon="document-text-outline" label="Message" value={campaign.message} />
            <InfoRow icon="funnel-outline" label="Filter Type" value={campaign.filterType?.replace(/_/g, ' ')} />
            <InfoRow icon="repeat-outline" label="Frequency" value={campaign.frequency} />
            <InfoRow icon="calendar-outline" label="Scheduled" value={fmt(campaign.scheduledDatetime)} />
            {campaign.building ? (
              <InfoRow icon="business-outline" label="Building" value={campaign.building.name} />
            ) : null}
            {campaign.recipientCount != null ? (
              <InfoRow icon="people-outline" label="Recipients" value={String(campaign.recipientCount)} />
            ) : null}
          </SectionCard>

          {/* Selected tenants for CUSTOM filter */}
          {campaign.filterType === 'CUSTOM' && Array.isArray(campaign.selectedTenants) && campaign.selectedTenants.length > 0 ? (
            <SectionCard title={`Custom Recipients (${campaign.selectedTenants.length})`}>
              {campaign.selectedTenants.map((t: any) => (
                <InfoRow key={t.id} icon="person-outline" label={t.name} value={t.phone ?? t.email ?? ''} />
              ))}
            </SectionCard>
          ) : null}

          {/* Channels */}
          <SectionCard title="Channels">
            <View style={styles.channelsWrap}>
              {[
                { key: 'sendEmail', label: 'Email', icon: 'mail-outline' },
                { key: 'sendSms', label: 'SMS', icon: 'phone-portrait-outline' },
                { key: 'sendWhatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
              ].map(ch => (
                <View
                  key={ch.key}
                  style={[styles.channelChip, campaign[ch.key] && styles.channelChipActive]}
                >
                  <Ionicons
                    name={ch.icon as any}
                    size={14}
                    color={campaign[ch.key] ? colors.primary : colors.textMuted}
                  />
                  <Text style={[styles.channelChipText, campaign[ch.key] && { color: colors.primary }]}>
                    {ch.label}
                  </Text>
                  <Ionicons
                    name={campaign[ch.key] ? 'checkmark-circle' : 'close-circle-outline'}
                    size={14}
                    color={campaign[ch.key] ? Colors.success : colors.textMuted}
                  />
                </View>
              ))}
            </View>
          </SectionCard>

          {/* Actions */}
          <SectionCard title="Actions">
            {campaign.status !== 'SENT' && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.sendBtn]}
                onPress={confirmSend}
                disabled={sending}
                activeOpacity={0.7}
              >
                <Ionicons name="send-outline" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>{sending ? 'Sending…' : 'Send Now'}</Text>
              </TouchableOpacity>
            )}
            {campaign.status !== 'SENT' && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.toggleBtn]}
                onPress={confirmToggle}
                disabled={toggling}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={campaign.status === 'ACTIVE' ? 'pause-circle-outline' : 'play-circle-outline'}
                  size={18}
                  color={colors.primary}
                />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>
                  {toggling ? 'Updating…' : campaign.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionBtn, styles.deleteBtn]}
              onPress={confirmDelete}
              disabled={deleting}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
              <Text style={[styles.actionBtnText, { color: Colors.error }]}>
                {deleting ? 'Deleting…' : 'Delete Campaign'}
              </Text>
            </TouchableOpacity>
          </SectionCard>

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: Typography.fontSizeLg,
      fontWeight: Typography.fontWeightSemibold,
      color: c.text,
    },
    scroll: { padding: Spacing.md },
    heroCard: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      ...Shadow.sm,
    },
    heroRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    heroIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 12,
      backgroundColor: c.overlay,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroName: { fontSize: Typography.fontSizeXl, fontWeight: Typography.fontWeightBold, color: c.text },
    heroSubject: { fontSize: Typography.fontSizeSm, color: c.textMuted, marginTop: 2 },
    statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full },
    statusText: { fontSize: 11, fontWeight: '600' },
    channelsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    channelChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 6,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    channelChipActive: { borderColor: c.primary, backgroundColor: c.overlay },
    channelChipText: { fontSize: Typography.fontSizeSm, color: c.textMuted },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      height: 48,
      borderRadius: Radius.md,
      marginBottom: Spacing.sm,
    },
    sendBtn: { backgroundColor: c.primary },
    toggleBtn: { borderWidth: 1.5, borderColor: c.primary, backgroundColor: c.overlay },
    deleteBtn: { borderWidth: 1.5, borderColor: Colors.error + '44', backgroundColor: Colors.error + '0A' },
    actionBtnText: {
      fontSize: Typography.fontSizeMd,
      fontWeight: Typography.fontWeightSemibold,
      color: '#fff',
    },
  });
}
