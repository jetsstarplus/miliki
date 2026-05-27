import { ChargesSection } from '@/components/building/ChargesSection';
import { NotificationsSection } from '@/components/building/NotificationsSection';
import { PenaltiesSection } from '@/components/building/PenaltiesSection';
import { ErrorState } from '@/components/ui/ErrorState';
import { InfoRow } from '@/components/ui/InfoRow';
import { LoadingState } from '@/components/ui/LoadingState';
import { OccupancyBar } from '@/components/ui/OccupancyBar';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatRow } from '@/components/ui/StatRow';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { UnitDetailShared } from '@/components/units/UnitDetailShared';
import { UnitListShared } from '@/components/units/UnitListShared';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import {
  APPLY_BUILDING_EXTRA_CHARGES_MUTATION,
  BULK_GENERATE_UNITS_MUTATION,
  COPY_BUILDING_MUTATION,
  CREATE_EXTRA_CHARGE_DEFINITION_MUTATION,
  CREATE_UPDATE_PENALTY_RULE_MUTATION,
  DELETE_BUILDING,
  DELETE_BUILDING_DOCUMENT_MUTATION,
  DELETE_BUILDING_IMAGE_MUTATION,
  DELETE_EXTRA_CHARGE_DEFINITION_MUTATION,
  DELETE_PENALTY_RULE_MUTATION,
  MAKE_PRIMARY_BUILDING_IMAGE_MUTATION,
  POST_TENANT_EXTRA_CHARGE_MUTATION,
  TEST_PENALTY_CALCULATION_MUTATION,
  TOGGLE_PENALTY_RULE_MUTATION,
  UPDATE_BUILDING_NOTIFICATION_PREFERENCES_MUTATION,
  UPDATE_EXTRA_CHARGE_DEFINITION_MUTATION,
  UPDATE_EXTRA_CHARGE_ENTRY_MUTATION,
  UPLOAD_BUILDING_DOCUMENT_MUTATION,
  UPLOAD_BUILDING_IMAGE_MUTATION,
  VOID_RENT_SCHEDULE_MUTATION,
  VOID_TENANT_CHARGE_MUTATION,
} from '@/graphql/properties/mutations/building';
import {
  DELETE_CAMPAIGN,
  PREVIEW_CAMPAIGN_RECIPIENTS,
  SEND_CAMPAIGN,
  TOGGLE_CAMPAIGN,
} from '@/graphql/properties/mutations/communication';
import {
  APPLIED_PENALTIES_QUERY,
  BUILDING_CHARGES_REPORT_QUERY,
  BUILDING_DETAIL,
  BUILDING_DOCUMENTS_QUERY,
  BUILDING_EXTRA_CHARGES_DATA_QUERY,
  BUILDING_IMAGES_QUERY,
  BUILDING_LIST,
  PENALTY_RULES_QUERY,
} from '@/graphql/properties/queries/building';
import { CAMPAIGN_LIST_DATA } from '@/graphql/properties/queries/communication';
import { UNIT_TYPES_QUERY, UNITS_DROPDOWN } from '@/graphql/properties/queries/units';
import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type DetailTab = 'overview' | 'units' | 'notifications' | 'penalties' | 'charges';
type CalcType = 'FIXED' | 'PERCENTAGE' | 'DAILY_RATE';
type ChargeType = 'FIXED' | 'USAGE_BASED';
type ChargeRowInput = { occupancyId: string; amount: string; unitsUsed: string };
type ActionOption = { id: string; label: string };

type ChannelPrefs = {
  enabled: boolean;
  sms: boolean;
  email: boolean;
  whatsapp: boolean;
};

type NotificationPrefsForm = {
  daysBeforeDue: number;
  due: ChannelPrefs;
  arrears: ChannelPrefs;
  charges: ChannelPrefs;
};

function decodeRelayId(relayId?: string): number | undefined {
  if (!relayId) return undefined;
  if (/^\d+$/.test(relayId)) return parseInt(relayId, 10);
  try {
    const decoded = atob(relayId);
    const pk = decoded.split(':').pop();
    if (!pk) return undefined;
    const num = parseInt(pk, 10);
    return Number.isNaN(num) ? undefined : num;
  } catch {
    return undefined;
  }
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

function n(v: any): number | undefined {
  if (v == null || v === '') return undefined;
  const parsed = Number(v);
  return Number.isNaN(parsed) ? undefined : parsed;
}

const defaultChannelPrefs: ChannelPrefs = {
  enabled: false,
  sms: false,
  email: false,
  whatsapp: false,
};

function normalizeChannelPrefs(raw: any): ChannelPrefs {
  if (!raw || typeof raw !== 'object') return { ...defaultChannelPrefs };
  return {
    enabled: !!raw.enabled,
    sms: !!raw.sms,
    email: !!raw.email,
    whatsapp: !!raw.whatsapp,
  };
}

function prefsFromRaw(raw: any): NotificationPrefsForm {
  return {
    daysBeforeDue: Number(raw?.daysBeforeDue ?? raw?.dueReminderDays ?? 3) || 3,
    due: normalizeChannelPrefs(raw?.rentDueReminder ?? raw?.dueReminder),
    arrears: normalizeChannelPrefs(raw?.arrearsReminder ?? raw?.arrearsNotice),
    charges: normalizeChannelPrefs(raw?.newChargePosted ?? raw?.chargePostedAlert),
  };
}

function prefsToPayload(form: NotificationPrefsForm) {
  return {
    daysBeforeDue: form.daysBeforeDue,
    rentDueReminder: form.due,
    arrearsReminder: form.arrears,
    newChargePosted: form.charges,
  };
}

function extractChargeDefinitions(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  const candidates = [
    payload.definitions,
    payload.chargeDefinitions,
    payload.extraChargeDefinitions,
    payload.data?.definitions,
    payload.data?.chargeDefinitions,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  return [];
}

function isValidDateInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isValidMonthInput(value: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(value)) return false;
  const [, monthRaw] = value.split('-');
  const month = Number(monthRaw);
  return month >= 1 && month <= 12;
}

function firstDefinedString(...values: any[]): string | undefined {
  for (const value of values) {
    if (value == null) continue;
    const asString = String(value).trim();
    if (asString) return asString;
  }
  return undefined;
}

function extractChargeHistoryEntries(payload: any): any[] {
  if (!payload || typeof payload !== 'object') return [];
  const candidates = [
    payload.entries,
    payload.history,
    payload.chargeHistory,
    payload.chargeEntries,
    payload.data?.entries,
    payload.data?.history,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

export default function BuildingDetail() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string | string[] }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const isSmallTablet = width >= 768 && width < 1100;
  const isWideTablet = width >= 1100;
  const buildingIdInt = useMemo(() => decodeRelayId(id), [id]);

  const initialTab = useMemo<DetailTab>(() => {
    const value = Array.isArray(tab) ? tab[0] : tab;
    return value === 'units' ? 'units' : 'overview';
  }, [tab]);

  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const [blockAllNotifications, setBlockAllNotifications] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefsForm>(() => prefsFromRaw({}));

  const [penaltyForm, setPenaltyForm] = useState({
    id: '',
    name: '',
    calculationType: 'FIXED' as CalcType,
    fixedAmount: '',
    percentage: '',
    dailyRate: '',
    gracePeriodDays: '3',
    isActive: true,
  });

  const [chargeForm, setChargeForm] = useState({
    id: '',
    name: '',
    chargeType: 'FIXED' as ChargeType,
    serviceTypeId: '',
    fixedAmount: '',
    ratePerUnit: '',
    unitLabel: '',
    description: '',
    isActive: true,
  });

  const [copyForm, setCopyForm] = useState({
    name: '',
    code: '',
    copyUnits: true,
  });
  const [bulkModalVisible, setBulkModalVisible] = useState(false);

  const [bulkForm, setBulkForm] = useState({
    unitTypeId: '',
    monthlyRent: '',
    depositAmount: '',
    floorSequence: 'Ground,1,2',
    unitsPerFloor: '4',
    startingNumber: '101',
    numberingPattern: '{floor}{index}',
  });

  const [penaltyTestForm, setPenaltyTestForm] = useState({
    ruleId: '',
    rentAmount: '',
    daysOverdue: '1',
  });

  const [campaignPreviewVisible, setCampaignPreviewVisible] = useState(false);
  const [campaignPreviewTitle, setCampaignPreviewTitle] = useState('Recipients Preview');
  const [campaignPreviewItems, setCampaignPreviewItems] = useState<string[]>([]);

  const [chargeActionForm, setChargeActionForm] = useState({
    definitionId: '',
    billingMonth: '',
    chargeDate: '',
    dueDate: '',
    notes: '',
    occupancyId: '',
    amount: '',
    unitsUsed: '',
    entryId: '',
    chargeId: '',
    scheduleId: '',
  });

  const [chargeRows, setChargeRows] = useState<ChargeRowInput[]>([
    { occupancyId: '', amount: '', unitsUsed: '' },
  ]);

  const { data, loading, error, refetch } = useQuery(BUILDING_DETAIL, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
    skip: !id,
  });

  const building = data?.oneBuilding;

  useEffect(() => {
    if (!building) return;
    setBlockAllNotifications(!!building.blockAutomaticNotifications);
    setPrefs(prefsFromRaw(building.notificationPreferences ?? {}));
  }, [building]);

  const {
    data: penaltyRulesData,
    loading: rulesLoading,
    refetch: refetchPenaltyRules,
  } = useQuery(PENALTY_RULES_QUERY, {
    variables: { buildingId: buildingIdInt, isActive: undefined },
    fetchPolicy: 'cache-and-network',
    skip: !buildingIdInt || activeTab !== 'penalties',
  });

  const {
    data: appliedPenaltiesData,
    loading: appliedLoading,
    refetch: refetchAppliedPenalties,
  } = useQuery(APPLIED_PENALTIES_QUERY, {
    variables: { buildingId: buildingIdInt, limit: 20 },
    fetchPolicy: 'cache-and-network',
    skip: !buildingIdInt || activeTab !== 'penalties',
  });

  const { data: chargesReportData, loading: chargesLoading } = useQuery(BUILDING_CHARGES_REPORT_QUERY, {
    variables: { buildingId: buildingIdInt, page: 1 },
    fetchPolicy: 'cache-and-network',
    skip: !buildingIdInt || activeTab !== 'charges',
  });

  const {
    data: extraChargesData,
    loading: extraChargesLoading,
    refetch: refetchExtraCharges,
  } = useQuery(BUILDING_EXTRA_CHARGES_DATA_QUERY, {
    variables: { buildingId: buildingIdInt, page: 1 },
    fetchPolicy: 'cache-and-network',
    skip: !buildingIdInt || activeTab !== 'charges',
  });

  const { data: unitTypesData } = useQuery(UNIT_TYPES_QUERY, {
    fetchPolicy: 'cache-and-network',
    skip: activeTab !== 'units',
  });

  const { data: unitsDropdownData } = useQuery(UNITS_DROPDOWN, {
    variables: { first: 120, buildingId: id },
    fetchPolicy: 'cache-and-network',
    skip: !id || activeTab !== 'charges',
  });

  const { data: imagesData, refetch: refetchImages } = useQuery(BUILDING_IMAGES_QUERY, {
    variables: { buildingId: buildingIdInt },
    fetchPolicy: 'cache-and-network',
    skip: !buildingIdInt || activeTab !== 'overview',
  });

  const { data: documentsData, refetch: refetchDocuments } = useQuery(BUILDING_DOCUMENTS_QUERY, {
    variables: { buildingId: buildingIdInt },
    fetchPolicy: 'cache-and-network',
    skip: !buildingIdInt || activeTab !== 'overview',
  });

  const { data: campaignsData, refetch: refetchCampaigns } = useQuery(CAMPAIGN_LIST_DATA, {
    variables: { buildingId: id, first: 30 },
    fetchPolicy: 'cache-and-network',
    skip: activeTab !== 'notifications',
  });

  const unitTypes: any[] = useMemo(
    () => unitTypesData?.unitTypes?.edges?.map((e: any) => e.node).filter((t: any) => t.isActive !== false) ?? [],
    [unitTypesData],
  );

  const occupancyOptions: { id: string; label: string }[] = useMemo(() => {
    const edges = unitsDropdownData?.units?.edges ?? [];
    const options: { id: string; label: string }[] = [];
    for (const edge of edges) {
      const unit = edge?.node;
      const occ = unit?.occupancies?.edges?.[0]?.node;
      if (!occ?.id) continue;
      const tenantName = occ?.tenant?.fullName ? ` - ${occ.tenant.fullName}` : '';
      options.push({
        id: occ.id,
        label: `${unit?.unitNumber ?? 'Unit'}${tenantName}`,
      });
    }
    return options;
  }, [unitsDropdownData]);

  const penaltyRules: any[] = penaltyRulesData?.penaltyRules ?? [];
  const appliedPenalties: any[] = appliedPenaltiesData?.appliedPenalties ?? [];
  const chargesReport = chargesReportData?.buildingChargesReport;
  const extraCharges = extraChargesData?.buildingExtraChargesData;
  const chargeDefinitions = useMemo(() => extractChargeDefinitions(extraCharges), [extraCharges]);
  const chargeHistoryEntries = useMemo(() => extractChargeHistoryEntries(extraCharges), [extraCharges]);

  const entryOptions: ActionOption[] = useMemo(() => {
    const seen = new Set<string>();
    const options: ActionOption[] = [];
    for (const entry of chargeHistoryEntries) {
      const entryId = firstDefinedString(entry?.id, entry?.entryId);
      if (!entryId || seen.has(entryId)) continue;
      seen.add(entryId);
      const unit = firstDefinedString(entry?.unitNumber, entry?.unit?.unitNumber);
      const tenant = firstDefinedString(entry?.tenantName, entry?.tenant?.fullName, entry?.occupancy?.tenant?.fullName);
      const amount = firstDefinedString(entry?.amount);
      const bits = [unit, tenant, amount ? `KES ${Number(amount).toLocaleString()}` : undefined].filter(Boolean);
      options.push({ id: entryId, label: bits.length ? bits.join(' • ') : `Entry ${entryId}` });
    }
    return options;
  }, [chargeHistoryEntries]);

  const chargeOptions: ActionOption[] = useMemo(() => {
    const seen = new Set<string>();
    const options: ActionOption[] = [];
    for (const entry of chargeHistoryEntries) {
      const chargeId = firstDefinedString(
        entry?.chargeId,
        entry?.tenantChargeId,
        entry?.charge?.id,
        entry?.tenantCharge?.id,
      );
      if (!chargeId || seen.has(chargeId)) continue;
      seen.add(chargeId);
      const unit = firstDefinedString(entry?.unitNumber, entry?.unit?.unitNumber);
      const tenant = firstDefinedString(entry?.tenantName, entry?.tenant?.fullName, entry?.occupancy?.tenant?.fullName);
      options.push({ id: chargeId, label: [unit, tenant].filter(Boolean).join(' • ') || `Charge ${chargeId}` });
    }
    return options;
  }, [chargeHistoryEntries]);

  const scheduleOptions: ActionOption[] = useMemo(() => {
    const seen = new Set<string>();
    const options: ActionOption[] = [];
    for (const entry of chargeHistoryEntries) {
      const scheduleId = firstDefinedString(
        entry?.scheduleId,
        entry?.rentScheduleId,
        entry?.schedule?.id,
        entry?.rentSchedule?.id,
      );
      if (!scheduleId || seen.has(scheduleId)) continue;
      seen.add(scheduleId);
      const unit = firstDefinedString(entry?.unitNumber, entry?.unit?.unitNumber);
      const tenant = firstDefinedString(entry?.tenantName, entry?.tenant?.fullName, entry?.occupancy?.tenant?.fullName);
      options.push({ id: scheduleId, label: [unit, tenant].filter(Boolean).join(' • ') || `Schedule ${scheduleId}` });
    }
    return options;
  }, [chargeHistoryEntries]);

  const entryLookupMap = useMemo(() => {
    const map = new Map<string, { chargeId?: string; scheduleId?: string }>();
    for (const entry of chargeHistoryEntries) {
      const entryId = firstDefinedString(entry?.id, entry?.entryId);
      if (!entryId) continue;
      map.set(entryId, {
        chargeId: firstDefinedString(entry?.chargeId, entry?.tenantChargeId, entry?.charge?.id, entry?.tenantCharge?.id),
        scheduleId: firstDefinedString(entry?.scheduleId, entry?.rentScheduleId, entry?.schedule?.id, entry?.rentSchedule?.id),
      });
    }
    return map;
  }, [chargeHistoryEntries]);
  const buildingImages: any[] = imagesData?.buildingImages ?? [];
  const buildingDocuments: any[] = documentsData?.buildingDocuments ?? [];
  const buildingCampaigns: any[] = campaignsData?.notificationCampaignListData?.campaigns?.edges?.map((e: any) => e.node) ?? [];

  const [deleteBuilding, { loading: deleting }] = useMutation(DELETE_BUILDING, {
    refetchQueries: [{ query: BUILDING_LIST, variables: { first: 50 } }],
    onCompleted: () => router.replace('/(tabs)/building' as any),
    onError: (err) => Alert.alert('Error', err.message),
  });

  const [copyBuilding, { loading: copyingBuilding }] = useMutation(COPY_BUILDING_MUTATION, {
    refetchQueries: [{ query: BUILDING_LIST, variables: { first: 50 } }],
    onCompleted: (res) => {
      const payload = res?.copyBuilding;
      if (payload?.success) {
        Alert.alert('Copied', payload?.message ?? 'Building copied successfully.');
        if (payload?.newBuildingId) {
          router.push({ pathname: '/(tabs)/building/[id]', params: { id: payload.newBuildingId } } as any);
        }
      } else {
        Alert.alert('Copy failed', payload?.message ?? 'Unable to copy building.');
      }
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const [bulkGenerateUnits, { loading: generatingUnits }] = useMutation(BULK_GENERATE_UNITS_MUTATION, {
    onCompleted: (res) => {
      const payload = res?.bulkGenerateUnits;
      if (payload?.success) {
        Alert.alert('Units generated', payload?.message ?? `Created ${payload?.createdCount ?? 0} units.`);
        setBulkForm((prev) => ({ ...prev, startingNumber: '' }));
        setBulkModalVisible(false);
      } else {
        Alert.alert('Bulk generation failed', payload?.message ?? 'Unable to generate units.');
      }
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const [testPenaltyCalculation, { loading: testingPenalty }] = useMutation(TEST_PENALTY_CALCULATION_MUTATION, {
    onCompleted: (res) => {
      const payload = res?.testPenaltyCalculation;
      if (payload?.success) {
        Alert.alert(
          'Penalty test result',
          `Penalty amount: KES ${Number(payload?.penaltyAmount ?? 0).toLocaleString()}`,
        );
      } else {
        Alert.alert('Test failed', payload?.message ?? 'Could not test penalty calculation.');
      }
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const [updateNotificationPrefs, { loading: savingPrefs }] = useMutation(
    UPDATE_BUILDING_NOTIFICATION_PREFERENCES_MUTATION,
    {
      onCompleted: (res) => {
        const payload = res?.updateBuildingNotificationPreferences;
        Alert.alert('Saved', payload?.message ?? 'Notification preferences updated.');
        refetch();
      },
      onError: (err) => Alert.alert('Error', err.message),
    },
  );

  const [upsertPenalty, { loading: savingPenalty }] = useMutation(CREATE_UPDATE_PENALTY_RULE_MUTATION, {
    onCompleted: (res) => {
      Alert.alert('Saved', res?.createUpdatePenaltyRule?.message ?? 'Penalty rule saved.');
      setPenaltyForm({
        id: '',
        name: '',
        calculationType: 'FIXED',
        fixedAmount: '',
        percentage: '',
        dailyRate: '',
        gracePeriodDays: '3',
        isActive: true,
      });
      refetchPenaltyRules();
      refetchAppliedPenalties();
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const [togglePenaltyRule] = useMutation(TOGGLE_PENALTY_RULE_MUTATION, {
    onCompleted: () => refetchPenaltyRules(),
    onError: (err) => Alert.alert('Error', err.message),
  });

  const [deletePenaltyRule] = useMutation(DELETE_PENALTY_RULE_MUTATION, {
    onCompleted: () => {
      refetchPenaltyRules();
      refetchAppliedPenalties();
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const [createChargeDefinition, { loading: creatingChargeDef }] = useMutation(CREATE_EXTRA_CHARGE_DEFINITION_MUTATION, {
    onCompleted: (res) => {
      Alert.alert('Saved', res?.createExtraChargeDefinition?.message ?? 'Charge definition created.');
      setChargeForm({
        id: '',
        name: '',
        chargeType: 'FIXED',
        serviceTypeId: '',
        fixedAmount: '',
        ratePerUnit: '',
        unitLabel: '',
        description: '',
        isActive: true,
      });
      refetchExtraCharges();
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const [updateChargeDefinition, { loading: updatingChargeDef }] = useMutation(UPDATE_EXTRA_CHARGE_DEFINITION_MUTATION, {
    onCompleted: (res) => {
      Alert.alert('Saved', res?.updateExtraChargeDefinition?.message ?? 'Charge definition updated.');
      setChargeForm({
        id: '',
        name: '',
        chargeType: 'FIXED',
        serviceTypeId: '',
        fixedAmount: '',
        ratePerUnit: '',
        unitLabel: '',
        description: '',
        isActive: true,
      });
      refetchExtraCharges();
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const [deleteChargeDefinition] = useMutation(DELETE_EXTRA_CHARGE_DEFINITION_MUTATION, {
    onCompleted: () => refetchExtraCharges(),
    onError: (err) => Alert.alert('Error', err.message),
  });

  const [deleteBuildingImage] = useMutation(DELETE_BUILDING_IMAGE_MUTATION, {
    onCompleted: () => refetchImages(),
    onError: (err) => Alert.alert('Error', err.message),
  });

  const [makePrimaryImage] = useMutation(MAKE_PRIMARY_BUILDING_IMAGE_MUTATION, {
    onCompleted: () => refetchImages(),
    onError: (err) => Alert.alert('Error', err.message),
  });

  const [deleteBuildingDocument] = useMutation(DELETE_BUILDING_DOCUMENT_MUTATION, {
    onCompleted: () => refetchDocuments(),
    onError: (err) => Alert.alert('Error', err.message),
  });

  const [uploadBuildingImage, { loading: uploadingImage }] = useMutation(UPLOAD_BUILDING_IMAGE_MUTATION, {
    onCompleted: (res) => {
      const payload = res?.uploadBuildingImage;
      Alert.alert(payload?.success ? 'Uploaded' : 'Failed', payload?.message ?? 'Image upload completed.');
      if (payload?.success) refetchImages();
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const [uploadBuildingDocument, { loading: uploadingDocument }] = useMutation(UPLOAD_BUILDING_DOCUMENT_MUTATION, {
    onCompleted: (res) => {
      const payload = res?.uploadBuildingDocument;
      Alert.alert(payload?.success ? 'Uploaded' : 'Failed', payload?.message ?? 'Document upload completed.');
      if (payload?.success) refetchDocuments();
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const [sendCampaign] = useMutation(SEND_CAMPAIGN, {
    onCompleted: (res) => {
      const r = res?.sendNotificationCampaignView?.result;
      Alert.alert(r?.success ? 'Sent' : 'Failed', r?.message ?? 'Campaign action completed.');
      refetchCampaigns();
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const [toggleCampaign] = useMutation(TOGGLE_CAMPAIGN, {
    onCompleted: (res) => {
      const r = res?.toggleNotificationCampaignView?.result;
      Alert.alert(r?.success ? 'Updated' : 'Failed', r?.message ?? 'Campaign status updated.');
      refetchCampaigns();
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const [deleteCampaign] = useMutation(DELETE_CAMPAIGN, {
    onCompleted: (res) => {
      const r = res?.deleteNotificationCampaignView?.result;
      Alert.alert(r?.success ? 'Deleted' : 'Failed', r?.message ?? 'Campaign deleted.');
      refetchCampaigns();
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const [previewCampaign] = useMutation(PREVIEW_CAMPAIGN_RECIPIENTS, {
    onCompleted: (res) => {
      const r = res?.previewCampaignRecipientsView?.result;
      if (!r?.success) {
        Alert.alert('Failed', r?.message ?? 'Unable to preview recipients.');
        return;
      }
      const payload = r?.payload;
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.recipients)
          ? payload.recipients
          : Array.isArray(payload?.items)
            ? payload.items
            : [];
      const items = list
        .map((item: any) => {
          if (typeof item === 'string') return item;
          if (!item || typeof item !== 'object') return null;
          return item.fullName || item.name || item.phone || item.email || JSON.stringify(item);
        })
        .filter(Boolean) as string[];
      const count = items.length || (Array.isArray(payload) ? payload.length : payload?.count ?? payload?.total ?? 0);
      setCampaignPreviewTitle(`Recipients Preview (${count})`);
      setCampaignPreviewItems(items);
      setCampaignPreviewVisible(true);
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const [applyBuildingExtraCharges, { loading: applyingCharges }] = useMutation(APPLY_BUILDING_EXTRA_CHARGES_MUTATION, {
    onCompleted: (res) => {
      const r = res?.applyBuildingExtraCharges;
      Alert.alert(r?.success ? 'Applied' : 'Failed', r?.message ?? 'Apply operation completed.');
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const [postTenantExtraCharge, { loading: postingTenantCharge }] = useMutation(POST_TENANT_EXTRA_CHARGE_MUTATION, {
    onCompleted: (res) => {
      const r = res?.postTenantExtraCharge;
      Alert.alert(r?.success ? 'Posted' : 'Failed', r?.message ?? 'Post operation completed.');
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const [updateExtraChargeEntry, { loading: updatingChargeEntry }] = useMutation(UPDATE_EXTRA_CHARGE_ENTRY_MUTATION, {
    onCompleted: (res) => {
      const r = res?.updateExtraChargeEntry;
      Alert.alert(r?.success ? 'Updated' : 'Failed', r?.message ?? 'Update operation completed.');
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const [voidTenantCharge, { loading: voidingTenantCharge }] = useMutation(VOID_TENANT_CHARGE_MUTATION, {
    onCompleted: (res) => {
      const r = res?.voidTenantCharge;
      Alert.alert(r?.success ? 'Voided' : 'Failed', r?.message ?? 'Void operation completed.');
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const [voidRentSchedule, { loading: voidingRentSchedule }] = useMutation(VOID_RENT_SCHEDULE_MUTATION, {
    onCompleted: (res) => {
      const r = res?.voidRentSchedule;
      Alert.alert(r?.success ? 'Voided' : 'Failed', r?.message ?? 'Void operation completed.');
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  function confirmDelete() {
    Alert.alert(
      'Delete Building',
      `Delete "${building?.name ?? 'this building'}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteBuilding({ variables: { id } }) },
      ],
    );
  }

  function runCopyBuilding() {
    if (!copyForm.name.trim() || !copyForm.code.trim()) {
      Alert.alert('Missing fields', 'Provide new building name and code.');
      return;
    }
    copyBuilding({
      variables: {
        buildingId: id,
        newName: copyForm.name.trim(),
        newCode: copyForm.code.trim(),
        copyUnits: copyForm.copyUnits,
      },
    });
  }

  function runBulkGenerateUnits() {
    if (!bulkForm.unitTypeId || !bulkForm.monthlyRent || !bulkForm.depositAmount || !bulkForm.unitsPerFloor || !bulkForm.startingNumber) {
      Alert.alert('Missing fields', 'Complete unit type, rent, deposit, units per floor and starting number.');
      return;
    }
    const floors = bulkForm.floorSequence
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);

    if (floors.length === 0) {
      Alert.alert('Missing floors', 'Provide at least one floor in floor sequence.');
      return;
    }

    const monthlyRent = Number(bulkForm.monthlyRent);
    const depositAmount = Number(bulkForm.depositAmount);
    const unitsPerFloor = Number(bulkForm.unitsPerFloor);

    if (Number.isNaN(monthlyRent) || monthlyRent < 0) {
      Alert.alert('Invalid monthly rent', 'Monthly rent must be a valid number.');
      return;
    }
    if (Number.isNaN(depositAmount) || depositAmount < 0) {
      Alert.alert('Invalid deposit', 'Deposit must be a valid number.');
      return;
    }
    if (!Number.isInteger(unitsPerFloor) || unitsPerFloor <= 0) {
      Alert.alert('Invalid units per floor', 'Units per floor must be a positive whole number.');
      return;
    }

    bulkGenerateUnits({
      variables: {
        buildingId: id,
        unitTypeId: bulkForm.unitTypeId,
        monthlyRent,
        depositAmount,
        floorSequence: floors,
        unitsPerFloor,
        startingNumber: bulkForm.startingNumber.trim(),
        numberingPattern: bulkForm.numberingPattern.trim() || undefined,
      },
    });
  }

  function runPenaltyTest() {
    if (!penaltyTestForm.ruleId || !penaltyTestForm.rentAmount || !penaltyTestForm.daysOverdue) {
      Alert.alert('Missing fields', 'Pick a rule and provide rent amount plus overdue days.');
      return;
    }
    testPenaltyCalculation({
      variables: {
        ruleId: penaltyTestForm.ruleId,
        rentAmount: Number(penaltyTestForm.rentAmount),
        daysOverdue: Number(penaltyTestForm.daysOverdue),
      },
    });
  }

  async function pickAndUploadImage() {
    if (!id) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow media library access to upload images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    uploadBuildingImage({
      variables: {
        buildingId: id,
        image: {
          uri: asset.uri,
          name: asset.fileName || `building-${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        },
      },
    });
  }

  async function pickAndUploadDocument() {
    if (!id) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.length) return;

    const file = result.assets[0];
    uploadBuildingDocument({
      variables: {
        buildingId: id,
        file: {
          uri: file.uri,
          name: file.name || `document-${Date.now()}`,
          type: file.mimeType || 'application/octet-stream',
        },
        name: file.name,
      },
    });
  }

  function confirmDeleteImage(imageId: string) {
    Alert.alert('Delete Image', 'Delete this building image?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteBuildingImage({ variables: { imageId } }) },
    ]);
  }

  function confirmDeleteDocument(documentId: string) {
    Alert.alert('Delete Document', 'Delete this document?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteBuildingDocument({ variables: { documentId } }) },
    ]);
  }

  function runCampaignAction(action: 'send' | 'toggle' | 'delete' | 'preview', campaignId: string) {
    const idInt = decodeRelayId(campaignId);
    if (!idInt) {
      Alert.alert('Invalid campaign', 'Unable to resolve campaign id.');
      return;
    }
    if (action === 'send') sendCampaign({ variables: { campaignId: idInt } });
    if (action === 'toggle') toggleCampaign({ variables: { campaignId: idInt } });
    if (action === 'delete') deleteCampaign({ variables: { campaignId: idInt } });
    if (action === 'preview') previewCampaign({ variables: { campaignId: idInt } });
  }

  function runApplyCharges() {
    if (!chargeActionForm.definitionId || !chargeActionForm.billingMonth || !chargeActionForm.chargeDate || !chargeActionForm.dueDate) {
      Alert.alert('Missing fields', 'Provide definition id, billing month, charge date and due date.');
      return;
    }
    if (!isValidMonthInput(chargeActionForm.billingMonth)) {
      Alert.alert('Invalid billing month', 'Use YYYY-MM format for billing month.');
      return;
    }
    if (!isValidDateInput(chargeActionForm.chargeDate) || !isValidDateInput(chargeActionForm.dueDate)) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD format for charge and due dates.');
      return;
    }
    const rows = chargeRows
      .map((row) => ({
        occupancyId: row.occupancyId,
        amount: row.amount ? Number(row.amount) : undefined,
        unitsUsed: row.unitsUsed ? Number(row.unitsUsed) : undefined,
      }))
      .filter((row) => row.occupancyId && row.amount != null);
    if (!Array.isArray(rows) || rows.length === 0) {
      Alert.alert('Missing rows', 'Provide at least one row with occupancy and amount.');
      return;
    }
    applyBuildingExtraCharges({
      variables: {
        definitionId: chargeActionForm.definitionId,
        billingMonth: chargeActionForm.billingMonth,
        chargeDate: chargeActionForm.chargeDate,
        dueDate: chargeActionForm.dueDate,
        rows,
        notes: chargeActionForm.notes || undefined,
      },
    });
  }

  function addChargeRow() {
    setChargeRows((rows) => [...rows, { occupancyId: '', amount: '', unitsUsed: '' }]);
  }

  function removeChargeRow(index: number) {
    setChargeRows((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)));
  }

  function updateChargeRow(index: number, patch: Partial<ChargeRowInput>) {
    setChargeRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function runPostTenantCharge() {
    if (!chargeActionForm.definitionId || !chargeActionForm.occupancyId || !chargeActionForm.billingMonth || !chargeActionForm.chargeDate || !chargeActionForm.dueDate) {
      Alert.alert('Missing fields', 'Provide definition, occupancy, billing month, charge date and due date.');
      return;
    }
    if (!isValidMonthInput(chargeActionForm.billingMonth)) {
      Alert.alert('Invalid billing month', 'Use YYYY-MM format for billing month.');
      return;
    }
    if (!isValidDateInput(chargeActionForm.chargeDate) || !isValidDateInput(chargeActionForm.dueDate)) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD format for charge and due dates.');
      return;
    }
    postTenantExtraCharge({
      variables: {
        definitionId: chargeActionForm.definitionId,
        occupancyId: chargeActionForm.occupancyId,
        billingMonth: chargeActionForm.billingMonth,
        chargeDate: chargeActionForm.chargeDate,
        dueDate: chargeActionForm.dueDate,
        amount: chargeActionForm.amount ? Number(chargeActionForm.amount) : undefined,
        unitsUsed: chargeActionForm.unitsUsed ? Number(chargeActionForm.unitsUsed) : undefined,
        notes: chargeActionForm.notes || undefined,
      },
    });
  }

  function runUpdateChargeEntry() {
    if (!chargeActionForm.entryId) {
      Alert.alert('Missing entry', 'Provide entry id to update.');
      return;
    }
    if (chargeActionForm.chargeDate && !isValidDateInput(chargeActionForm.chargeDate)) {
      Alert.alert('Invalid charge date', 'Use YYYY-MM-DD format for charge date.');
      return;
    }
    if (chargeActionForm.dueDate && !isValidDateInput(chargeActionForm.dueDate)) {
      Alert.alert('Invalid due date', 'Use YYYY-MM-DD format for due date.');
      return;
    }
    updateExtraChargeEntry({
      variables: {
        entryId: chargeActionForm.entryId,
        amount: chargeActionForm.amount ? Number(chargeActionForm.amount) : undefined,
        unitsUsed: chargeActionForm.unitsUsed ? Number(chargeActionForm.unitsUsed) : undefined,
        chargeDate: chargeActionForm.chargeDate || undefined,
        dueDate: chargeActionForm.dueDate || undefined,
        notes: chargeActionForm.notes || undefined,
      },
    });
  }

  function runVoidCharge() {
    if (!chargeActionForm.chargeId) {
      Alert.alert('Missing charge', 'Provide charge id to void.');
      return;
    }
    voidTenantCharge({ variables: { chargeId: chargeActionForm.chargeId } });
  }

  function runVoidSchedule() {
    if (!chargeActionForm.scheduleId) {
      Alert.alert('Missing schedule', 'Provide rent schedule id to void.');
      return;
    }
    voidRentSchedule({ variables: { scheduleId: chargeActionForm.scheduleId } });
  }

  function selectEntryForActions(entryId: string) {
    const linked = entryLookupMap.get(entryId);
    setChargeActionForm((prev) => ({
      ...prev,
      entryId,
      chargeId: linked?.chargeId || prev.chargeId,
      scheduleId: linked?.scheduleId || prev.scheduleId,
    }));
  }

  function selectChargeForVoid(chargeId: string) {
    setChargeActionForm((prev) => ({ ...prev, chargeId }));
  }

  function selectScheduleForVoid(scheduleId: string) {
    setChargeActionForm((prev) => ({ ...prev, scheduleId }));
  }


  function saveNotifications() {
    if (!id) return;
    updateNotificationPrefs({
      variables: {
        buildingId: id,
        blockAll: blockAllNotifications,
        notificationPreferences: prefsToPayload(prefs),
      },
    });
  }

  function setChannel(section: 'due' | 'arrears' | 'charges', field: keyof ChannelPrefs, value: boolean) {
    setPrefs((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  }

  function savePenaltyRule() {
    if (!id) return;
    if (!penaltyForm.name.trim()) {
      Alert.alert('Missing name', 'Penalty rule name is required.');
      return;
    }

    upsertPenalty({
      variables: {
        id: penaltyForm.id || undefined,
        buildingId: id,
        name: penaltyForm.name.trim(),
        calculationType: penaltyForm.calculationType,
        fixedAmount: n(penaltyForm.fixedAmount),
        percentage: n(penaltyForm.percentage),
        dailyRate: n(penaltyForm.dailyRate),
        gracePeriodDays: n(penaltyForm.gracePeriodDays),
        isActive: penaltyForm.isActive,
      },
    });
  }

  function startEditPenalty(rule: any) {
    setPenaltyForm({
      id: rule.id,
      name: rule.name ?? '',
      calculationType: (rule.calculationType ?? 'FIXED') as CalcType,
      fixedAmount: rule.fixedAmount != null ? String(rule.fixedAmount) : '',
      percentage: rule.percentage != null ? String(rule.percentage) : '',
      dailyRate: rule.dailyRate != null ? String(rule.dailyRate) : '',
      gracePeriodDays: rule.gracePeriodDays != null ? String(rule.gracePeriodDays) : '3',
      isActive: rule.isActive !== false,
    });
  }

  function confirmDeletePenalty(ruleId: string) {
    Alert.alert('Delete Rule', 'Delete this penalty rule?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePenaltyRule({ variables: { ruleId } }) },
    ]);
  }

  function saveChargeDef() {
    if (!id) return;
    if (!chargeForm.name.trim()) {
      Alert.alert('Missing name', 'Charge definition name is required.');
      return;
    }
    const serviceTypeId = n(chargeForm.serviceTypeId);
    if (!serviceTypeId) {
      Alert.alert('Missing service type', 'Service Type ID is required.');
      return;
    }

    const vars = {
      name: chargeForm.name.trim(),
      chargeType: chargeForm.chargeType,
      serviceTypeId,
      description: chargeForm.description.trim() || undefined,
      fixedAmount: n(chargeForm.fixedAmount),
      ratePerUnit: n(chargeForm.ratePerUnit),
      unitLabel: chargeForm.unitLabel.trim() || undefined,
      isActive: chargeForm.isActive,
    };

    if (chargeForm.id) {
      updateChargeDefinition({
        variables: {
          definitionId: chargeForm.id,
          ...vars,
          serviceTypeId: String(serviceTypeId),
        },
      });
      return;
    }

    createChargeDefinition({
      variables: {
        buildingId: id,
        ...vars,
      },
    });
  }

  function startEditCharge(def: any) {
    setChargeForm({
      id: def.id,
      name: def.name ?? '',
      chargeType: (def.chargeType ?? 'FIXED') as ChargeType,
      serviceTypeId: def.serviceType?.id ? String(def.serviceType.id) : '',
      fixedAmount: def.fixedAmount != null ? String(def.fixedAmount) : '',
      ratePerUnit: def.ratePerUnit != null ? String(def.ratePerUnit) : '',
      unitLabel: def.unitLabel ?? '',
      description: def.description ?? '',
      isActive: def.isActive !== false,
    });
  }

  function confirmDeleteCharge(definitionId: string) {
    Alert.alert('Delete Definition', 'Delete this charge definition?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteChargeDefinition({ variables: { definitionId } }) },
    ]);
  }

  const typeLabel = building?.buildingType ? building.buildingType.replace(/_/g, ' ') : null;

  const tabs: { key: DetailTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'units', label: 'Units' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'penalties', label: 'Penalties' },
    { key: 'charges', label: 'Charges' },
  ];

  const savingChargeDef = creatingChargeDef || updatingChargeDef;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {building?.name ?? 'Building Detail'}
        </Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push({ pathname: '/(tabs)/building/add', params: { buildingId: id } } as any)}
          hitSlop={8}
        >
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading && !data && <LoadingState />}

      {error && !data && (
        <ErrorState
          title="Failed to load building"
          message={error.message}
          onRetry={() => refetch()}
        />
      )}

      {building && (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <View style={styles.heroRow}>
              <View style={styles.heroIconWrap}>
                <Ionicons name="business" size={28} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroName}>{building.name}</Text>
                {building.code ? <Text style={styles.heroCode}>{building.code}</Text> : null}
              </View>
              {building.isActive !== undefined && (
                <StatusBadge
                  label={building.isActive ? 'Active' : 'Inactive'}
                  color={building.isActive ? 'success' : 'error'}
                />
              )}
            </View>
            {typeLabel && (
              <View style={styles.typeBadge}>
                <Ionicons name="layers-outline" size={12} color={colors.primary} />
                <Text style={styles.typeText}>{typeLabel}</Text>
              </View>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabChip, active && styles.tabChipActive]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabChipText, active && styles.tabChipTextActive]}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {activeTab === 'overview' && (
            <>
              <SectionCard title="Occupancy">
                <StatRow
                  stats={[
                    { label: 'Total Units', value: building.totalUnits ?? '-' },
                    { label: 'Occupied', value: building.occupiedUnitsCount ?? '-', color: Colors.success },
                    { label: 'Vacant', value: building.vacantUnitsCount ?? '-', color: Colors.warning },
                    { label: 'Floors', value: building.numberOfFloors ?? '-' },
                  ]}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: Spacing.sm }}>
                  <Text style={{ fontSize: Typography.fontSizeXs, color: colors.textMuted }}>
                    {(building.occupancyRate ?? 0).toFixed(0)}% occupancy
                  </Text>
                </View>
                <OccupancyBar rate={building.occupancyRate ?? 0} height={6} />
              </SectionCard>

              <View style={styles.overviewGrid}>
                <View
                  style={[
                    styles.overviewItemWrap,
                    isSmallTablet && styles.overviewItemWrapSmallTablet,
                    isWideTablet && styles.overviewItemWrapWideTablet,
                  ]}
                >
                  <SectionCard title="Location">
                    <InfoRow icon="location-outline" label="Address" value={building.address} />
                    <InfoRow icon="map-outline" label="City" value={building.city} />
                    <InfoRow icon="globe-outline" label="County" value={building.county} />
                    {building.latitude && building.longitude && (
                      <InfoRow
                        icon="navigate-outline"
                        label="Coordinates"
                        value={`${building.latitude}, ${building.longitude}`}
                        onPress={() => Linking.openURL(`https://maps.google.com/?q=${building.latitude},${building.longitude}`)}
                      />
                    )}
                  </SectionCard>
                </View>

                <View
                  style={[
                    styles.overviewItemWrap,
                    isSmallTablet && styles.overviewItemWrapSmallTablet,
                    isWideTablet && styles.overviewItemWrapWideTablet,
                  ]}
                >
                  <SectionCard title="Overview">
                    <InfoRow icon="calendar-outline" label="Year Built" value={building.yearBuilt?.toString()} />
                    <InfoRow icon="pricetag-outline" label="Building Type" value={typeLabel} />
                    {building.totalMonthlyRent != null && (
                      <InfoRow
                        icon="cash-outline"
                        label="Total Monthly Rent"
                        value={`KES ${Number(building.totalMonthlyRent).toLocaleString()}`}
                      />
                    )}
                    {building.createdBy?.searchName && (
                      <InfoRow icon="person-outline" label="Created By" value={building.createdBy.searchName} />
                    )}
                  </SectionCard>
                </View>

                {(building.managerName || building.managerPhone || building.managerEmail) && (
                  <View
                    style={[
                      styles.overviewItemWrap,
                      isSmallTablet && styles.overviewItemWrapSmallTablet,
                      isWideTablet && styles.overviewItemWrapWideTablet,
                    ]}
                  >
                    <SectionCard title="Property Manager">
                      <InfoRow icon="person-circle-outline" label="Name" value={building.managerName} />
                      <InfoRow
                        icon="call-outline"
                        label="Phone"
                        value={building.managerPhone}
                        onPress={building.managerPhone ? () => Linking.openURL(`tel:${building.managerPhone}`) : undefined}
                      />
                      <InfoRow
                        icon="mail-outline"
                        label="Email"
                        value={building.managerEmail}
                        onPress={building.managerEmail ? () => Linking.openURL(`mailto:${building.managerEmail}`) : undefined}
                      />
                    </SectionCard>
                  </View>
                )}

                <View
                  style={[
                    styles.overviewItemWrap,
                    isSmallTablet && styles.overviewItemWrapSmallTablet,
                    isWideTablet && styles.overviewItemWrapWideTablet,
                  ]}
                >
                  <SectionCard title="Building Actions">
                    <Text style={styles.helperText}>Copy building with optional unit cloning.</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="New building name"
                      placeholderTextColor={colors.textMuted}
                      value={copyForm.name}
                      onChangeText={(v) => setCopyForm((s) => ({ ...s, name: v }))}
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder="New building code"
                      placeholderTextColor={colors.textMuted}
                      value={copyForm.code}
                      onChangeText={(v) => setCopyForm((s) => ({ ...s, code: v }))}
                    />
                    <View style={styles.prefRow}>
                      <Text style={styles.prefTitle}>Copy units to new building</Text>
                      <Switch
                        value={copyForm.copyUnits}
                        onValueChange={(v) => setCopyForm((s) => ({ ...s, copyUnits: v }))}
                        thumbColor="#ffffff"
                        trackColor={{ true: colors.primary, false: colors.border }}
                      />
                    </View>
                    <TouchableOpacity
                      style={[styles.primaryBtn, copyingBuilding && { opacity: 0.6 }]}
                      onPress={runCopyBuilding}
                      disabled={copyingBuilding}
                    >
                      <Text style={styles.primaryBtnText}>{copyingBuilding ? 'Copying...' : 'Copy Building'}</Text>
                    </TouchableOpacity>
                  </SectionCard>
                </View>
              </View>

              {building.description ? (
                <SectionCard title="Description">
                  <Text style={styles.description}>{building.description}</Text>
                </SectionCard>
              ) : null}

              <SectionCard title="Media Manager">
                <Text style={styles.helperText}>Manage building images and documents.</Text>
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { flex: 1 }, uploadingImage && { opacity: 0.6 }]}
                    onPress={pickAndUploadImage}
                    disabled={uploadingImage}
                  >
                    <Text style={styles.primaryBtnText}>{uploadingImage ? 'Uploading...' : 'Upload Image'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.ghostBtn, { flex: 1 }, uploadingDocument && { opacity: 0.6 }]}
                    onPress={pickAndUploadDocument}
                    disabled={uploadingDocument}
                  >
                    <Text style={styles.ghostBtnText}>{uploadingDocument ? 'Uploading...' : 'Upload Document'}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.prefGroupTitle}>Images ({buildingImages.length})</Text>
                {buildingImages.length === 0 ? (
                  <Text style={styles.emptyText}>No images uploaded for this building.</Text>
                ) : (
                  <View style={styles.imagesGrid}>
                    {buildingImages.map((img: any) => {
                      const thumbUrl = firstDefinedString(img.thumbnailUrl, img.imageUrl);
                      const imageUrl = firstDefinedString(img.imageUrl, img.thumbnailUrl);

                      return (
                        <View
                          key={img.id}
                          style={[
                            styles.imageGridItem,
                            (isSmallTablet || isWideTablet) && styles.imageGridItemTablet,
                          ]}
                        >
                          <TouchableOpacity
                            activeOpacity={0.85}
                            disabled={!imageUrl}
                            onPress={imageUrl ? () => Linking.openURL(imageUrl) : undefined}
                          >
                            {thumbUrl ? (
                              <Image source={{ uri: thumbUrl }} style={styles.imageThumb} resizeMode="cover" />
                            ) : (
                              <View style={styles.imageThumbFallback}>
                                <Ionicons name="image-outline" size={22} color={colors.textMuted} />
                              </View>
                            )}
                          </TouchableOpacity>

                          <View style={styles.imageCardActions}>
                            {!img.isPrimary && (
                              <TouchableOpacity onPress={() => makePrimaryImage({ variables: { imageId: img.id } })} hitSlop={8}>
                                <Ionicons name="star-outline" size={16} color={Colors.warning} />
                              </TouchableOpacity>
                            )}
                            {imageUrl && (
                              <TouchableOpacity onPress={() => Linking.openURL(imageUrl)} hitSlop={8}>
                                <Ionicons name="open-outline" size={16} color={colors.primary} />
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={() => confirmDeleteImage(img.id)} hitSlop={8}>
                              <Ionicons name="trash-outline" size={16} color={Colors.error} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                <Text style={[styles.prefGroupTitle, { marginTop: Spacing.sm }]}>Documents ({buildingDocuments.length})</Text>
                {buildingDocuments.length === 0 ? (
                  <Text style={styles.emptyText}>No documents uploaded for this building.</Text>
                ) : (
                  buildingDocuments.map((doc: any) => (
                    <View key={doc.id} style={styles.listRowTall}>
                      <TouchableOpacity style={{ flex: 1 }} onPress={() => Linking.openURL(doc.fileUrl)} activeOpacity={0.7}>
                        <Text style={styles.listTitle}>{doc.name || doc.fileUrl?.split('/').pop() || 'Document'}</Text>
                        <Text style={styles.listSub} numberOfLines={1}>{doc.fileUrl}</Text>
                      </TouchableOpacity>
                      <View style={styles.iconActions}>
                        <TouchableOpacity onPress={() => Linking.openURL(doc.fileUrl)} hitSlop={8}>
                          <Ionicons name="open-outline" size={18} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => confirmDeleteDocument(doc.id)} hitSlop={8}>
                          <Ionicons name="trash-outline" size={18} color={Colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </SectionCard>

              <SectionCard title="Danger Zone">
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={confirmDelete}
                  disabled={deleting}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                  <Text style={styles.deleteBtnText}>{deleting ? 'Deleting...' : 'Delete Building'}</Text>
                </TouchableOpacity>
              </SectionCard>
            </>
          )}

          {activeTab === 'units' && (
            <SectionCard
              title="Units"
              style={styles.unitsSectionCard}
              right={
                !selectedUnitId ? (
                  <TouchableOpacity
                    style={styles.addUnitBtn}
                    onPress={() =>
                      router.push({
                        pathname: '/(tabs)/units/add',
                        params: {
                          buildingId: id,
                          returnTo: 'building',
                          returnBuildingId: id,
                        },
                      } as any)
                    }
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={14} color={colors.primary} />
                    <Text style={styles.addUnitBtnText}>Add Unit</Text>
                  </TouchableOpacity>
                ) : null
              }
            >
              {selectedUnitId ? (
                <UnitDetailShared
                  unitId={selectedUnitId}
                  embedded
                  onBack={() => setSelectedUnitId(null)}
                  onDeleted={() => setSelectedUnitId(null)}
                />
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.ghostBtn, { marginBottom: Spacing.sm }]}
                    onPress={() => setBulkModalVisible(true)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.ghostBtnText}>Bulk Generate Units</Text>
                  </TouchableOpacity>

                  <UnitListShared
                    scope="building"
                    buildingId={id}
                    embedded
                    onSelectUnit={(targetId) => setSelectedUnitId(targetId)}
                  />
                </>
              )}
            </SectionCard>
          )}

          {activeTab === 'notifications' && (
            <NotificationsSection
              styles={styles}
              colors={colors}
              blockAllNotifications={blockAllNotifications}
              setBlockAllNotifications={setBlockAllNotifications}
              prefs={prefs}
              setPrefs={setPrefs}
              setChannel={setChannel}
              savingPrefs={savingPrefs}
              saveNotifications={saveNotifications}
              onCreateCampaign={() => router.push({ pathname: '/(tabs)/communication/add', params: { buildingId: id } } as any)}
              buildingCampaigns={buildingCampaigns}
              onCampaignAction={runCampaignAction}
            />
          )}

          {activeTab === 'penalties' && (
            <PenaltiesSection
              styles={styles}
              colors={colors}
              penaltyForm={penaltyForm}
              setPenaltyForm={setPenaltyForm}
              onResetPenaltyForm={() =>
                setPenaltyForm({
                  id: '',
                  name: '',
                  calculationType: 'FIXED',
                  fixedAmount: '',
                  percentage: '',
                  dailyRate: '',
                  gracePeriodDays: '3',
                  isActive: true,
                })
              }
              savingPenalty={savingPenalty}
              savePenaltyRule={savePenaltyRule}
              penaltyRules={penaltyRules}
              rulesLoading={rulesLoading}
              startEditPenalty={startEditPenalty}
              onTogglePenaltyRule={(ruleId: string) => togglePenaltyRule({ variables: { ruleId } })}
              onDeletePenaltyRule={confirmDeletePenalty}
              appliedPenalties={appliedPenalties}
              appliedLoading={appliedLoading}
              formatDate={formatDate}
              penaltyTestForm={penaltyTestForm}
              setPenaltyTestForm={setPenaltyTestForm}
              testingPenalty={testingPenalty}
              runPenaltyTest={runPenaltyTest}
            />
          )}

          {activeTab === 'charges' && (
            <ChargesSection
              styles={styles}
              colors={colors}
              chargeForm={chargeForm}
              setChargeForm={setChargeForm}
              onResetChargeForm={() =>
                setChargeForm({
                  id: '',
                  name: '',
                  chargeType: 'FIXED',
                  serviceTypeId: '',
                  fixedAmount: '',
                  ratePerUnit: '',
                  unitLabel: '',
                  description: '',
                  isActive: true,
                })
              }
              savingChargeDef={savingChargeDef}
              saveChargeDef={saveChargeDef}
              chargeDefinitions={chargeDefinitions}
              extraChargesLoading={extraChargesLoading}
              startEditCharge={startEditCharge}
              onDeleteChargeDefinition={confirmDeleteCharge}
              chargeActionForm={chargeActionForm}
              setChargeActionForm={setChargeActionForm}
              occupancyOptions={occupancyOptions}
              chargeRows={chargeRows}
              updateChargeRow={updateChargeRow}
              removeChargeRow={removeChargeRow}
              addChargeRow={addChargeRow}
              entryOptions={entryOptions}
              chargeOptions={chargeOptions}
              scheduleOptions={scheduleOptions}
              selectEntryForActions={selectEntryForActions}
              selectChargeForVoid={selectChargeForVoid}
              selectScheduleForVoid={selectScheduleForVoid}
              runApplyCharges={runApplyCharges}
              applyingCharges={applyingCharges}
              runPostTenantCharge={runPostTenantCharge}
              postingTenantCharge={postingTenantCharge}
              runUpdateChargeEntry={runUpdateChargeEntry}
              updatingChargeEntry={updatingChargeEntry}
              runVoidCharge={runVoidCharge}
              voidingTenantCharge={voidingTenantCharge}
              runVoidSchedule={runVoidSchedule}
              voidingRentSchedule={voidingRentSchedule}
              chargesLoading={chargesLoading}
              chargesReport={chargesReport}
            />
          )}

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      )}

      <Modal
        visible={bulkModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setBulkModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bulk Generate Units</Text>
              <TouchableOpacity onPress={() => setBulkModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.helperText}>Create many units using floor pattern rules.</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unitStatusRow}>
                {unitTypes.map((t: any) => {
                  const active = bulkForm.unitTypeId === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.statusChip, active && styles.statusChipActive]}
                      onPress={() => setBulkForm((s) => ({ ...s, unitTypeId: t.id }))}
                    >
                      <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>{t.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <View style={styles.inlineInputs}>
                <TextInput
                  style={[styles.textInput, styles.inlineInput]}
                  placeholder="Monthly rent"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  value={bulkForm.monthlyRent}
                  onChangeText={(v) => setBulkForm((s) => ({ ...s, monthlyRent: v }))}
                />
                <TextInput
                  style={[styles.textInput, styles.inlineInput]}
                  placeholder="Deposit"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  value={bulkForm.depositAmount}
                  onChangeText={(v) => setBulkForm((s) => ({ ...s, depositAmount: v }))}
                />
              </View>
              <View style={styles.inlineInputs}>
                <TextInput
                  style={[styles.textInput, styles.inlineInput]}
                  placeholder="Floors (comma separated)"
                  placeholderTextColor={colors.textMuted}
                  value={bulkForm.floorSequence}
                  onChangeText={(v) => setBulkForm((s) => ({ ...s, floorSequence: v }))}
                />
                <TextInput
                  style={[styles.textInput, styles.inlineInput]}
                  placeholder="Units / floor"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  value={bulkForm.unitsPerFloor}
                  onChangeText={(v) => setBulkForm((s) => ({ ...s, unitsPerFloor: v }))}
                />
              </View>
              <View style={styles.inlineInputs}>
                <TextInput
                  style={[styles.textInput, styles.inlineInput]}
                  placeholder="Starting number"
                  placeholderTextColor={colors.textMuted}
                  value={bulkForm.startingNumber}
                  onChangeText={(v) => setBulkForm((s) => ({ ...s, startingNumber: v }))}
                />
                <TextInput
                  style={[styles.textInput, styles.inlineInput]}
                  placeholder="Pattern e.g. {floor}{index}"
                  placeholderTextColor={colors.textMuted}
                  value={bulkForm.numberingPattern}
                  onChangeText={(v) => setBulkForm((s) => ({ ...s, numberingPattern: v }))}
                />
              </View>
              <TouchableOpacity
                style={[styles.primaryBtn, generatingUnits && { opacity: 0.6 }]}
                onPress={runBulkGenerateUnits}
                disabled={generatingUnits}
              >
                <Text style={styles.primaryBtnText}>{generatingUnits ? 'Generating...' : 'Generate Units'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={campaignPreviewVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setCampaignPreviewVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{campaignPreviewTitle}</Text>
              <TouchableOpacity onPress={() => setCampaignPreviewVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {campaignPreviewItems.length === 0 ? (
              <Text style={styles.emptyText}>No recipient details were returned, but preview completed.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 340 }}>
                {campaignPreviewItems.map((item, idx) => (
                  <Text key={`${item}-${idx}`} style={styles.previewLine}>• {item}</Text>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
    backBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
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
    heroCode: { fontSize: Typography.fontSizeSm, color: c.textMuted, marginTop: 2 },
    typeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      backgroundColor: c.borderLight,
      borderRadius: Radius.sm,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginTop: Spacing.sm,
    },
    typeText: {
      fontSize: 11,
      color: c.textSecondary,
      fontWeight: Typography.fontWeightMedium,
      textTransform: 'capitalize',
    },

    tabsRow: {
      gap: Spacing.xs,
      marginBottom: Spacing.sm,
      paddingRight: Spacing.sm,
    },
    tabChip: {
      borderRadius: Radius.full,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surface,
      paddingHorizontal: Spacing.sm + 2,
      paddingVertical: Spacing.xs,
    },
    tabChipActive: {
      borderColor: c.primary,
      backgroundColor: c.overlay,
    },
    tabChipText: {
      fontSize: Typography.fontSizeXs,
      color: c.textSecondary,
      fontWeight: Typography.fontWeightMedium,
    },
    tabChipTextActive: { color: c.primary, fontWeight: Typography.fontWeightSemibold },

    overviewGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    overviewItemWrap: {
      width: '100%',
    },
    overviewItemWrapSmallTablet: {
      width: '48.5%',
    },
    overviewItemWrapWideTablet: {
      width: '32%',
    },

    unitsSectionCard: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.sm,
    },
    addUnitBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: c.primary,
      backgroundColor: c.overlay,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
    },
    addUnitBtnText: {
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightSemibold,
      color: c.primary,
    },
    helperText: {
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
      marginBottom: Spacing.sm,
    },

    filtersWrap: {
      gap: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: Radius.md,
      backgroundColor: c.inputBackground,
      paddingHorizontal: Spacing.sm,
      height: 40,
      gap: 6,
    },
    searchInput: {
      flex: 1,
      fontSize: Typography.fontSizeSm,
      color: c.text,
      paddingVertical: 0,
    },

    unitStatusRow: {
      gap: Spacing.xs,
      paddingVertical: Spacing.xs,
    },
    statusChip: {
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 5,
    },
    statusChipActive: {
      borderColor: c.primary,
      backgroundColor: c.overlay,
    },
    statusChipText: {
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
      fontWeight: Typography.fontWeightMedium,
    },
    statusChipTextActive: {
      color: c.primary,
    },

    unitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      borderWidth: 1,
      borderColor: c.borderLight,
      borderRadius: Radius.sm,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.sm,
    },
    unitRowTitle: {
      fontSize: Typography.fontSizeSm,
      color: c.text,
      fontWeight: Typography.fontWeightSemibold,
    },
    unitRowSub: {
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
      marginTop: 1,
    },

    textInput: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: Radius.md,
      backgroundColor: c.inputBackground,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.sm,
      fontSize: Typography.fontSizeSm,
      color: c.text,
      marginBottom: Spacing.sm,
      minHeight: 42,
    },
    textInputMultiline: {
      minHeight: 82,
      textAlignVertical: 'top',
    },
    inlineInputs: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    inlineInput: {
      flex: 1,
    },

    prefGroup: {
      borderWidth: 1,
      borderColor: c.borderLight,
      borderRadius: Radius.md,
      padding: Spacing.sm,
      marginBottom: Spacing.sm,
      backgroundColor: c.surfaceAlt,
    },
    prefGroupTitle: {
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
      fontWeight: Typography.fontWeightSemibold,
      marginBottom: Spacing.xs,
      textTransform: 'uppercase',
    },
    prefRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      justifyContent: 'space-between',
      marginBottom: Spacing.sm,
    },
    prefTitle: {
      fontSize: Typography.fontSizeSm,
      color: c.text,
      fontWeight: Typography.fontWeightSemibold,
      flex: 1,
    },
    prefSub: {
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
      marginTop: 2,
      flex: 1,
    },

    channelRow: {
      flexDirection: 'row',
      gap: Spacing.xs,
    },
    channelChip: {
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      backgroundColor: c.surface,
    },
    channelChipActive: {
      borderColor: c.primary,
      backgroundColor: c.overlay,
    },
    channelChipText: {
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
      fontWeight: Typography.fontWeightSemibold,
    },
    channelChipTextActive: {
      color: c.primary,
    },

    actionRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.xs,
    },
    primaryBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      height: 42,
      borderRadius: Radius.md,
      backgroundColor: c.primary,
      paddingHorizontal: Spacing.md,
    },
    primaryBtnText: {
      fontSize: Typography.fontSizeSm,
      color: '#fff',
      fontWeight: Typography.fontWeightSemibold,
    },
    ghostBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      height: 42,
      borderRadius: Radius.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: Spacing.md,
    },
    ghostBtnText: {
      fontSize: Typography.fontSizeSm,
      color: c.textSecondary,
      fontWeight: Typography.fontWeightSemibold,
    },

    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
      paddingVertical: Spacing.sm,
    },
    listRowTall: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
      paddingVertical: Spacing.sm,
      minHeight: 54,
    },
    listTitle: {
      fontSize: Typography.fontSizeSm,
      color: c.text,
      fontWeight: Typography.fontWeightSemibold,
    },
    listSub: {
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
      marginTop: 2,
    },
    amountText: {
      fontSize: Typography.fontSizeSm,
      color: c.text,
      fontWeight: Typography.fontWeightSemibold,
    },
    iconActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },

    rowBox: {
      borderWidth: 1,
      borderColor: c.borderLight,
      borderRadius: Radius.md,
      padding: Spacing.sm,
      marginBottom: Spacing.sm,
      backgroundColor: c.surfaceAlt,
    },

    emptyText: {
      fontSize: Typography.fontSizeSm,
      color: c.textMuted,
      textAlign: 'center',
      paddingVertical: Spacing.sm,
    },
    previewLine: {
      fontSize: Typography.fontSizeSm,
      color: c.textSecondary,
      marginBottom: 6,
      lineHeight: 20,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'center',
      padding: Spacing.md,
    },
    modalCard: {
      backgroundColor: c.surface,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      ...Shadow.md,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.sm,
    },
    modalTitle: {
      fontSize: Typography.fontSizeMd,
      fontWeight: Typography.fontWeightSemibold,
      color: c.text,
    },

    description: { fontSize: Typography.fontSizeSm, color: c.textSecondary, lineHeight: 20 },
    docRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
    },
    docText: { flex: 1, fontSize: Typography.fontSizeSm, color: c.primary },
    imagesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    imageGridItem: {
      width: '48.5%',
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.borderLight,
      borderRadius: Radius.md,
      overflow: 'hidden',
      marginBottom: Spacing.sm,
    },
    imageGridItemTablet: {
      width: '19.2%',
    },
    imageThumb: {
      width: '100%',
      height: 84,
      backgroundColor: c.overlay,
    },
    imageThumbFallback: {
      width: '100%',
      height: 84,
      backgroundColor: c.overlay,
      alignItems: 'center',
      justifyContent: 'center',
    },
    imageCardActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.xs,
      paddingVertical: Spacing.xs,
    },
    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      height: 48,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: Colors.error + '44',
      backgroundColor: Colors.error + '0A',
    },
    deleteBtnText: {
      fontSize: Typography.fontSizeMd,
      fontWeight: Typography.fontWeightSemibold,
      color: Colors.error,
    },
  });
}
