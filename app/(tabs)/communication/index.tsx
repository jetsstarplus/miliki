import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/theme';
import { INITIATE_MPESA_TOPUP } from '@/graphql/properties/mutations/communication';
import { CAMPAIGN_LIST_DATA, NOTIFICATION_LOGS, SUBSCRIPTION_PAYMENT_CONTEXT } from '@/graphql/properties/queries/communication';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  message: string;
  status: string;
  filterType: string;
  sendEmail: boolean;
  sendSms: boolean;
  sendWhatsapp: boolean;
  frequency: string;
  scheduledDatetime: string | null;
  logsCount: number;
  isActive: boolean;
  buildingId: string | null;
  buildingName: string | null;
  createdAt: string;
  selectedTenants: { id: string; name: string; email: string; phone: string }[];
}

interface NotificationLog {
  id: string;
  title: string;
  scenario: string;
  message: string;
  charged_cost: string;
  created_at: string;
}

type StatusFilter = 'all' | 'DRAFT' | 'SCHEDULED' | 'SENT' | 'ACTIVE';
type ActiveTab = 'campaigns' | 'logs';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'SENT', label: 'Sent' },
];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6B7280',
  ACTIVE: Colors.success,
  SCHEDULED: '#8B5CF6',
  SENT: '#3B82F6',
};

function formatDate(d: string | null | undefined) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

function formatDateTime(d: string | null | undefined) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return d;
  }
}

function CampaignCard({ item, onPress }: { item: Campaign; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const statusColor = STATUS_COLORS[item.status] ?? colors.textMuted;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconWrap}>
          <Ionicons name="megaphone-outline" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardSubject} numberOfLines={1}>{item.subject}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.channelRow}>
        {item.sendEmail && (
          <View style={styles.channelChip}>
            <Ionicons name="mail-outline" size={12} color={colors.primary} />
            <Text style={styles.channelText}>Email</Text>
          </View>
        )}
        {item.sendSms && (
          <View style={styles.channelChip}>
            <Ionicons name="phone-portrait-outline" size={12} color={colors.primary} />
            <Text style={styles.channelText}>SMS</Text>
          </View>
        )}
        {item.sendWhatsapp && (
          <View style={styles.channelChip}>
            <Ionicons name="logo-whatsapp" size={12} color={Colors.success} />
            <Text style={[styles.channelText, { color: Colors.success }]}>WhatsApp</Text>
          </View>
        )}
        {item.frequency && item.frequency !== 'ONCE' && (
          <View style={[styles.channelChip, { backgroundColor: colors.primaryLight + '30' }]}>
            <Ionicons name="repeat-outline" size={12} color={colors.primary} />
            <Text style={styles.channelText}>{item.frequency}</Text>
          </View>
        )}
      </View>

      {(item.scheduledDatetime || item.logsCount > 0) && (
        <View style={styles.metaRow}>
          {item.scheduledDatetime && (
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>{formatDate(item.scheduledDatetime)}</Text>
            </View>
          )}
          {item.logsCount > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="send-outline" size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>{item.logsCount} sent</Text>
            </View>
          )}
          {item.buildingName && (
            <View style={styles.metaItem}>
              <Ionicons name="business-outline" size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>{item.buildingName}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

function LogCard({ item }: { item: NotificationLog }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
          <Ionicons name="phone-portrait-outline" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.cardSubject} numberOfLines={1}>{item.scenario}</Text>
        </View>
        <Text style={styles.metaText}>{formatDateTime(item.created_at)}</Text>
      </View>

      <Text style={styles.logMessage} numberOfLines={3}>{item.message}</Text>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="cash-outline" size={12} color={colors.textMuted} />
          <Text style={styles.metaText}>KSh {item.charged_cost}</Text>
        </View>
      </View>
    </View>
  );
}

export default function Communication() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { activeCompany } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('campaigns');

  // — Campaign tab state —
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(text.trim()), 400);
  }, []);

  const { data, loading, error, refetch, networkStatus } = useQuery(CAMPAIGN_LIST_DATA, {
    variables: {
      search: debouncedSearch || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      first: 50,
    },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  const campaigns: Campaign[] = useMemo(() => {
    const edges = data?.notificationCampaignListData?.campaigns?.edges;
    if (!Array.isArray(edges)) return [];
    return edges.map((e: any) => e.node);
  }, [data]);

  const balances = data?.notificationCampaignListData?.balances;
  const refreshing = networkStatus === 4;

  // — SMS Logs tab state —
  const [logSearch, setLogSearch] = useState('');
  const [debouncedLogSearch, setDebouncedLogSearch] = useState('');
  const logDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogSearch = useCallback((text: string) => {
    setLogSearch(text);
    if (logDebounceTimer.current) clearTimeout(logDebounceTimer.current);
    logDebounceTimer.current = setTimeout(() => setDebouncedLogSearch(text.trim()), 400);
  }, []);

  const { data: logsData, loading: logsLoading, error: logsError, refetch: logsRefetch, networkStatus: logsNetworkStatus } = useQuery(NOTIFICATION_LOGS, {
    variables: { search: debouncedLogSearch || undefined, first: 30 },
    skip: activeTab !== 'logs',
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  const logs: NotificationLog[] = useMemo(() => {
    const edges = logsData?.notificationLogsListData?.logs?.edges;
    if (!Array.isArray(edges)) return [];
    return edges.map((e: any) => e.node);
  }, [logsData]);

  const logsSummary = logsData?.notificationLogsListData?.summary;

  const logsRefreshing = logsNetworkStatus === 4;

  // — Topup modal state —
  const [topupVisible, setTopupVisible] = useState(false);
  const [topupFor, setTopupFor] = useState<'SMS_TOPUP' | 'WHATSAPP_TOPUP'>('SMS_TOPUP');
  const [topupPhone, setTopupPhone] = useState('');
  const [topupAmount, setTopupAmount] = useState('');

  const [fetchPaymentContext, { loading: contextLoading }] = useLazyQuery(SUBSCRIPTION_PAYMENT_CONTEXT);
  const [initiateMpesaTopup, { loading: topupLoading }] = useMutation(INITIATE_MPESA_TOPUP);

  async function handleTopup() {
    if (!topupPhone.trim()) {
      Alert.alert('Required', 'Please enter an M-Pesa phone number.');
      return;
    }
    if (!activeCompany?.id) {
      Alert.alert('Error', 'No active company found.');
      return;
    }
    try {
      // Fetch payment context to get subscriptionId
      const { data: ctxData } = await fetchPaymentContext({
        variables: { companyId: activeCompany.id, paymentFor: topupFor },
      });
      const ctx = ctxData?.subscriptionInitiatePaymentData;
      const rawSubId = ctx?.subscription_id ?? ctx?.subscriptionId ?? ctx?.subscription?.id;
      if (!rawSubId) {
        Alert.alert('Error', 'Could not load subscription info. Please try again.');
        return;
      }
      const subscriptionId = typeof rawSubId === 'number' ? rawSubId : parseInt(String(rawSubId), 10);
      if (isNaN(subscriptionId)) {
        Alert.alert('Error', 'Invalid subscription data.');
        return;
      }
      const result = await initiateMpesaTopup({
        variables: {
          subscriptionId,
          phoneNumber: topupPhone.trim(),
          paymentFor: topupFor,
          amountOverride: topupAmount ? parseFloat(topupAmount) : undefined,
        },
      });
      const res = result.data?.initiateMpesaPayment;
      if (res?.success) {
        Alert.alert('Success', res.message ?? 'Payment request sent. Check your phone for M-Pesa prompt.');
        setTopupVisible(false);
        setTopupPhone('');
        setTopupAmount('');
      } else {
        Alert.alert('Failed', res?.message ?? 'Payment initiation failed. Please try again.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong.');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Communication" />

      {/* Balance Banner */}
      {balances && (
        <View style={styles.balanceBanner}>
          <View style={styles.balanceItems}>
            <View style={styles.balanceItem}>
              <Ionicons name="phone-portrait-outline" size={14} color={colors.primary} />
              <Text style={styles.balanceLabel}>SMS</Text>
              <Text style={styles.balanceValue}>KSh {Number(balances.sms ?? 0).toFixed(2)}</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceItem}>
              <Ionicons name="logo-whatsapp" size={14} color={Colors.success} />
              <Text style={styles.balanceLabel}>WhatsApp</Text>
              <Text style={styles.balanceValue}>KSh {Number(balances.whatsapp ?? 0).toFixed(2)}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.topupBtn}
            onPress={() => setTopupVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={14} color="#fff" />
            <Text style={styles.topupBtnText}>Top Up</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'campaigns' && styles.tabItemActive]}
          onPress={() => setActiveTab('campaigns')}
          activeOpacity={0.7}
        >
          <Ionicons name="megaphone-outline" size={16} color={activeTab === 'campaigns' ? colors.primary : colors.textMuted} />
          <Text style={[styles.tabLabel, activeTab === 'campaigns' && styles.tabLabelActive]}>Campaigns</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'logs' && styles.tabItemActive]}
          onPress={() => setActiveTab('logs')}
          activeOpacity={0.7}
        >
          <Ionicons name="list-outline" size={16} color={activeTab === 'logs' ? colors.primary : colors.textMuted} />
          <Text style={[styles.tabLabel, activeTab === 'logs' && styles.tabLabelActive]}>SMS Logs</Text>
        </TouchableOpacity>
      </View>

      {/* ── Campaigns Tab ── */}
      {activeTab === 'campaigns' && (
        <>
          {/* Search */}
          <View style={styles.searchWrap}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={16} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search campaigns…"
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={handleSearch}
                returnKeyType="search"
                clearButtonMode="while-editing"
                autoCapitalize="none"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => { setSearch(''); setDebouncedSearch(''); }} hitSlop={6}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Status filters */}
          <View style={styles.filtersWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersRow}
            >
              {STATUS_FILTERS.map(f => {
                const active = statusFilter === f.value;
                return (
                  <TouchableOpacity
                    key={f.value}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setStatusFilter(f.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {loading && campaigns.length === 0 && <LoadingState />}

          {error && campaigns.length === 0 && (
            <ErrorState
              title="Failed to load campaigns"
              message={error.message}
              onRetry={() => refetch()}
            />
          )}

          {!error && (
            <FlatList
              data={campaigns}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => (
                <CampaignCard
                  item={item}
                  onPress={() => router.push({ pathname: '/communication/[id]', params: { id: String(item.id) } } as any)}
                />
              )}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => refetch()} tintColor={colors.primary} />
              }
              ListFooterComponent={loading && campaigns.length > 0 ? <ActivityIndicator color={colors.primary} style={styles.footer} /> : null}
              ListEmptyComponent={
                !loading ? (
                  <EmptyState
                    icon="megaphone-outline"
                    title={debouncedSearch || statusFilter !== 'all' ? 'No campaigns found' : 'No campaigns yet'}
                    description={
                      debouncedSearch || statusFilter !== 'all'
                        ? 'Try adjusting your search or filters.'
                        : 'Create notification campaigns to communicate with tenants.'
                    }
                  />
                ) : null
              }
            />
          )}

          {/* FAB */}
          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push('/communication/add' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </>
      )}

      {/* ── SMS Logs Tab ── */}
      {activeTab === 'logs' && (
        <>
          {/* Log Search */}
          <View style={styles.searchWrap}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={16} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by tenant name or phone…"
                placeholderTextColor={colors.textMuted}
                value={logSearch}
                onChangeText={handleLogSearch}
                returnKeyType="search"
                clearButtonMode="while-editing"
                autoCapitalize="none"
              />
              {logSearch.length > 0 && (
                <TouchableOpacity onPress={() => { setLogSearch(''); setDebouncedLogSearch(''); }} hitSlop={6}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Summary bar */}
          {logsSummary && (
            <View style={styles.summaryBar}>
              <View style={styles.metaItem}>
                <Ionicons name="chatbubble-outline" size={13} color={colors.textMuted} />
                <Text style={styles.metaText}>{logsSummary.total_sms_count} messages sent</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="cash-outline" size={13} color={colors.textMuted} />
                <Text style={styles.metaText}>KSh {logsSummary.total_sms_cost} total cost</Text>
              </View>
            </View>
          )}

          {logsLoading && logs.length === 0 && <LoadingState />}

          {logsError && logs.length === 0 && (
            <ErrorState
              title="Failed to load logs"
              message={logsError.message}
              onRetry={() => logsRefetch()}
            />
          )}

          {!logsError && (
            <FlatList
              data={logs}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => <LogCard item={item} />}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={logsRefreshing} onRefresh={() => logsRefetch()} tintColor={colors.primary} />
              }
              ListFooterComponent={logsLoading && logs.length > 0 ? <ActivityIndicator color={colors.primary} style={styles.footer} /> : null}
              ListEmptyComponent={
                !logsLoading ? (
                  <EmptyState
                    icon="list-outline"
                    title={debouncedLogSearch ? 'No logs found' : 'No SMS logs yet'}
                    description={
                      debouncedLogSearch
                        ? 'Try a different search.'
                        : 'Sent SMS messages will appear here.'
                    }
                  />
                ) : null
              }
            />
          )}
        </>
      )}

      {/* ── Topup Modal ── */}
      <Modal
        visible={topupVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTopupVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Top Up Credits</Text>
              <TouchableOpacity onPress={() => setTopupVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Channel selector */}
            <Text style={styles.fieldLabel}>Channel</Text>
            <View style={styles.segmentRow}>
              <TouchableOpacity
                style={[styles.segment, topupFor === 'SMS_TOPUP' && styles.segmentActive]}
                onPress={() => setTopupFor('SMS_TOPUP')}
                activeOpacity={0.7}
              >
                <Ionicons name="phone-portrait-outline" size={16} color={topupFor === 'SMS_TOPUP' ? '#fff' : colors.textMuted} />
                <Text style={[styles.segmentText, topupFor === 'SMS_TOPUP' && styles.segmentTextActive]}>SMS</Text>
                {balances?.sms_topup_rate && (
                  <Text style={[styles.segmentRate, topupFor === 'SMS_TOPUP' && { color: '#ffffffcc' }]}>
                    KSh {Number(balances.sms_topup_rate).toFixed(2)}/msg
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segment, topupFor === 'WHATSAPP_TOPUP' && styles.segmentActive]}
                onPress={() => setTopupFor('WHATSAPP_TOPUP')}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-whatsapp" size={16} color={topupFor === 'WHATSAPP_TOPUP' ? '#fff' : colors.textMuted} />
                <Text style={[styles.segmentText, topupFor === 'WHATSAPP_TOPUP' && styles.segmentTextActive]}>WhatsApp</Text>
                {balances?.whatsapp_topup_rate && (
                  <Text style={[styles.segmentRate, topupFor === 'WHATSAPP_TOPUP' && { color: '#ffffffcc' }]}>
                    KSh {Number(balances.whatsapp_topup_rate).toFixed(2)}/msg
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Phone number */}
            <Text style={styles.fieldLabel}>M-Pesa Phone Number</Text>
            <View style={styles.fieldInput}>
              <Ionicons name="call-outline" size={16} color={colors.textMuted} />
              <TextInput
                style={styles.fieldInputText}
                placeholder="e.g. 0712345678"
                placeholderTextColor={colors.textMuted}
                value={topupPhone}
                onChangeText={setTopupPhone}
                keyboardType="phone-pad"
              />
            </View>

            {/* Amount (optional) */}
            <Text style={styles.fieldLabel}>Amount (KSh) — optional</Text>
            <View style={styles.fieldInput}>
              <Ionicons name="cash-outline" size={16} color={colors.textMuted} />
              <TextInput
                style={styles.fieldInputText}
                placeholder="Leave blank to use default"
                placeholderTextColor={colors.textMuted}
                value={topupAmount}
                onChangeText={setTopupAmount}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Confirm button */}
            <TouchableOpacity
              style={[styles.topupConfirmBtn, (topupLoading || contextLoading) && { opacity: 0.6 }]}
              onPress={handleTopup}
              disabled={topupLoading || contextLoading}
              activeOpacity={0.8}
            >
              {(topupLoading || contextLoading) ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.topupConfirmText}>Send M-Pesa Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    list: { padding: Spacing.md, paddingBottom: 100 },
    footer: { paddingVertical: Spacing.md },

    // Balance banner
    balanceBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.surface,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    balanceItems: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    balanceItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    balanceDivider: { width: 1, height: 20, backgroundColor: c.border },
    balanceLabel: { fontSize: Typography.fontSizeXs, color: c.textMuted },
    balanceValue: { fontSize: Typography.fontSizeXs, fontWeight: '600', color: c.text },
    topupBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.primary,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 6,
      borderRadius: Radius.full,
    },
    topupBtnText: { fontSize: Typography.fontSizeXs, fontWeight: '600', color: '#fff' },

    // Tab bar
    tabBar: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    tabItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: Spacing.sm,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabItemActive: { borderBottomColor: c.primary },
    tabLabel: { fontSize: Typography.fontSizeSm, fontWeight: '500', color: c.textMuted },
    tabLabelActive: { color: c.primary },

    searchWrap: {
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.xs,
      backgroundColor: c.surface,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      backgroundColor: c.inputBackground,
      borderRadius: Radius.full,
      borderWidth: 1.5,
      borderColor: c.border,
      paddingHorizontal: Spacing.md,
      height: 42,
    },
    searchInput: { flex: 1, fontSize: Typography.fontSizeSm, color: c.text, paddingVertical: 0 },

    summaryBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },

    logMessage: {
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
      lineHeight: 18,
      marginBottom: Spacing.xs,
    },

    filtersWrap: {
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    filtersRow: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.xs },
    chip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: 6,
      borderRadius: Radius.full,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { fontSize: Typography.fontSizeXs, fontWeight: '500', color: c.textMuted },
    chipTextActive: { color: '#fff' },

    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      ...Shadow.sm,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: Radius.md,
      backgroundColor: c.primary + '18',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: { fontSize: Typography.fontSizeSm, fontWeight: '600', color: c.text },
    cardSubject: { fontSize: Typography.fontSizeXs, color: c.textMuted, marginTop: 1 },
    statusBadge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderRadius: Radius.full,
    },
    statusText: { fontSize: 10, fontWeight: '600' },

    channelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.xs },
    channelChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderRadius: Radius.full,
      backgroundColor: c.primary + '15',
    },
    channelText: { fontSize: 10, fontWeight: '500', color: c.primary },

    metaRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xs },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: Typography.fontSizeXs, color: c.textMuted },

    fab: {
      position: 'absolute',
      right: Spacing.lg,
      bottom: Spacing.xl,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...Shadow.md,
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: Radius.xl,
      borderTopRightRadius: Radius.xl,
      padding: Spacing.lg,
      paddingBottom: Spacing.xl,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.lg,
    },
    modalTitle: { fontSize: Typography.fontSizeLg, fontWeight: '700', color: c.text },
    fieldLabel: { fontSize: Typography.fontSizeXs, fontWeight: '600', color: c.textMuted, marginBottom: 6, marginTop: Spacing.sm },
    fieldInput: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      backgroundColor: c.inputBackground,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: c.border,
      paddingHorizontal: Spacing.md,
      height: 48,
    },
    fieldInputText: { flex: 1, fontSize: Typography.fontSizeSm, color: c.text, paddingVertical: 0 },

    segmentRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
    segment: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.inputBackground,
    },
    segmentActive: { backgroundColor: c.primary, borderColor: c.primary },
    segmentText: { fontSize: Typography.fontSizeXs, fontWeight: '600', color: c.textMuted },
    segmentTextActive: { color: '#fff' },
    segmentRate: { fontSize: 10, color: c.textMuted },

    topupConfirmBtn: {
      marginTop: Spacing.lg,
      backgroundColor: c.primary,
      borderRadius: Radius.md,
      height: 50,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topupConfirmText: { fontSize: Typography.fontSizeSm, fontWeight: '700', color: '#fff' },
  });
}
