import { ErrorState } from '@/components/ui/ErrorState';
import { InfoRow } from '@/components/ui/InfoRow';
import { LoadingState } from '@/components/ui/LoadingState';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatRow } from '@/components/ui/StatRow';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { VOID_TENANT_CHARGE_MUTATION } from '@/graphql/properties/mutations/building';
import {
  CREATE_MANUAL_RECEIPT,
} from '@/graphql/properties/mutations/payments';
import {
  CANCEL_VACATION_NOTICE_MUTATION,
  CREATE_VACATION_NOTICE_MUTATION,
  DELETE_TENANT,
  GENERATE_TENANT_RENT_SCHEDULE_MUTATION,
  SEND_TENANT_CUSTOM_MESSAGE_MUTATION,
  TRANSFER_OCCUPANCY_MUTATION,
} from '@/graphql/properties/mutations/tenants';
import { CONFIG_PAYMENT_MODES_QUERY } from '@/graphql/properties/queries/payments';
import {
  TENANT_CHARGES_HISTORY_QUERY,
  TENANT_DETAIL_QUERY,
  TENANT_VACATION_NOTICES_QUERY,
  TENANTS_QUERY,
} from '@/graphql/properties/queries/tenants';
import { UNITS_QUERY } from '@/graphql/properties/queries/units';
import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
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

type ActionView = 'transfer' | 'message' | 'schedule' | 'vacation' | 'receipt' | 'charges' | 'notifications';

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
    payload.results,
    payload.items,
    payload.data?.entries,
    payload.data?.history,
    payload.data?.items,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function formatMoney(amount: any): string {
  const value = Number(amount ?? 0);
  return `KES ${Number.isNaN(value) ? '0' : value.toLocaleString()}`;
}

function formatDisplayDate(value?: string | null): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function TenantDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isTablet = width >= 768;
  const isSmallTablet = width >= 768 && width < 1100;
  const isWideTablet = width >= 1100;
  const now = new Date();
  const defaultScheduleMonth = String(now.getMonth() + 1);
  const defaultScheduleYear = String(now.getFullYear());
  const [transferForm, setTransferForm] = useState({
    occupancyId: '',
    targetUnitId: '',
    transferDate: '',
    voidPendingCharges: true,
    generateDepositCharge: false,
    scheduleGenerationMode: 'NEXT_MONTH',
  });
  const [messageForm, setMessageForm] = useState({
    subject: '',
    message: '',
    sendEmail: true,
    sendSms: true,
    sendInApp: false,
    sendWhatsapp: false,
  });
  const [scheduleForm, setScheduleForm] = useState({
    month: defaultScheduleMonth,
    year: defaultScheduleYear,
    dueDay: '',
    skipExisting: true,
  });
  const [vacationForm, setVacationForm] = useState({
    occupancyId: '',
    vacationDate: '',
    balanceToPay: '',
    message: '',
    cancelReason: '',
  });
  const [manualReceiptForm, setManualReceiptForm] = useState({
    occupancyId: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethodConfigId: '',
    referenceNumber: '',
    notes: '',
  });
  const [activeAction, setActiveAction] = useState<ActionView | null>(null);
  const [chargesPage, setChargesPage] = useState(1);
  const [toastMessage, setToastMessage] = useState('');

  const { data, loading, error, refetch } = useQuery(TENANT_DETAIL_QUERY, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
    skip: !id,
  });

  const tenant = data?.tenant;

  const { data: chargesData, loading: chargesLoading, refetch: refetchCharges } = useQuery(TENANT_CHARGES_HISTORY_QUERY, {
    variables: { tenantId: id, page: chargesPage },
    fetchPolicy: 'cache-and-network',
    skip: !id,
  });

  const { data: vacationData, refetch: refetchVacationNotices } = useQuery(TENANT_VACATION_NOTICES_QUERY, {
    variables: { tenantId: id, limit: 20 },
    fetchPolicy: 'cache-and-network',
    skip: !id,
  });

  const { data: paymentModesData } = useQuery(CONFIG_PAYMENT_MODES_QUERY, {
    fetchPolicy: 'cache-and-network',
    skip: !id,
  });

  const selectedOccupancy = useMemo(
    () => tenant?.occupancies?.edges?.find(({ node }: any) => node.id === transferForm.occupancyId)?.node,
    [tenant?.occupancies?.edges, transferForm.occupancyId],
  );

  const { data: vacantUnitsData } = useQuery(UNITS_QUERY, {
    variables: {
      first: 80,
      status: 'VACANT',
      isAvailableForRent: true,
      buildingId: selectedOccupancy?.unit?.building?.id || undefined,
    },
    fetchPolicy: 'cache-and-network',
    skip: !id,
  });

  const [deleteTenant, { loading: deleting }] = useMutation(DELETE_TENANT, {
    refetchQueries: [{ query: TENANTS_QUERY, variables: { first: 50 } }],
    onCompleted(d: any) {
      const r = d?.deleteTenant;
      if (r?.success) router.back();
      else Alert.alert('Error', r?.message ?? 'Failed to delete tenant.');
    },
    onError(err: any) { Alert.alert('Error', err.message); },
  });

  const [transferOccupancy, { loading: transferring }] = useMutation(TRANSFER_OCCUPANCY_MUTATION, {
    onCompleted: (res: any) => {
      const r = res?.transferOccupancy;
      Alert.alert(r?.success ? 'Transferred' : 'Failed', r?.message ?? 'Transfer action completed.');
      if (r?.success) refetch();
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const [sendCustomMessage, { loading: sendingMessage }] = useMutation(SEND_TENANT_CUSTOM_MESSAGE_MUTATION, {
    onCompleted: (res: any) => {
      const r = res?.sendTenantCustomMessage;
      Alert.alert(r?.success ? 'Sent' : 'Failed', r?.message ?? 'Message action completed.');
      if (r?.success) refetch();
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const [generateRentSchedule, { loading: generatingSchedule }] = useMutation(
    GENERATE_TENANT_RENT_SCHEDULE_MUTATION,
    {
      onCompleted: (res: any) => {
        const r = res?.generateTenantRentSchedule;
        Alert.alert(r?.success ? 'Queued' : 'Failed', r?.message ?? 'Schedule generation action completed.');
        if (r?.success) {
          refetch();
          refetchCharges();
          refetchVacationNotices();
        }
      },
      onError: (err: any) => Alert.alert('Error', err.message),
    },
  );

  const [createVacationNotice, { loading: creatingVacation }] = useMutation(CREATE_VACATION_NOTICE_MUTATION, {
    onCompleted: (res: any) => {
      const r = res?.createVacationNotice;
      Alert.alert(r?.success ? 'Created' : 'Failed', r?.message ?? 'Vacation notice action completed.');
      if (r?.success) {
        refetchVacationNotices();
      }
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const [cancelVacationNotice, { loading: cancellingVacation }] = useMutation(CANCEL_VACATION_NOTICE_MUTATION, {
    onCompleted: (res: any) => {
      const r = res?.cancelVacationNotice;
      Alert.alert(r?.success ? 'Cancelled' : 'Failed', r?.message ?? 'Cancel vacation action completed.');
      if (r?.success) {
        refetchVacationNotices();
      }
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const [createManualReceipt, { loading: creatingManualReceipt }] = useMutation(CREATE_MANUAL_RECEIPT, {
    onCompleted: (res: any) => {
      const payload = res?.createManualReceipt;
      Alert.alert(payload?.manualReceipt?.id ? 'Created' : 'Failed', payload?.errors?.join('\n') || 'Manual receipt action completed.');
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const [voidTenantCharge, { loading: voidingCharge }] = useMutation(VOID_TENANT_CHARGE_MUTATION, {
    onCompleted: (res: any) => {
      const payload = res?.voidTenantCharge;
      Alert.alert(payload?.success ? 'Voided' : 'Failed', payload?.message ?? 'Void charge action completed.');
      if (payload?.success) {
        refetchCharges();
        refetch();
      }
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  function confirmDelete() {
    Alert.alert(
      'Delete Tenant',
      `Delete ${displayName}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTenant({ variables: { id } }) },
      ]
    );
  }

  function isValidDateInput(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  function runTransferOccupancy() {
    if (!transferForm.occupancyId || !transferForm.targetUnitId || !transferForm.transferDate) {
      Alert.alert('Missing fields', 'Select occupancy and provide target unit id plus transfer date.');
      return;
    }
    if (!isValidDateInput(transferForm.transferDate)) {
      Alert.alert('Invalid date', 'Transfer date must use YYYY-MM-DD format.');
      return;
    }
    transferOccupancy({
      variables: {
        occupancyId: transferForm.occupancyId,
        targetUnitId: transferForm.targetUnitId,
        transferDate: transferForm.transferDate,
        voidPendingCharges: transferForm.voidPendingCharges,
        generateDepositCharge: transferForm.generateDepositCharge,
        scheduleGenerationMode: transferForm.scheduleGenerationMode,
      },
    });
  }

  function runSendMessage() {
    if (!messageForm.message.trim()) {
      Alert.alert('Missing message', 'Provide a message to send.');
      return;
    }
    sendCustomMessage({
      variables: {
        tenantId: id,
        subject: messageForm.subject.trim() || undefined,
        message: messageForm.message.trim(),
        sendEmail: messageForm.sendEmail,
        sendSms: messageForm.sendSms,
        sendInApp: messageForm.sendInApp,
        sendWhatsapp: messageForm.sendWhatsapp,
      },
    });
  }

  function runGenerateSchedule() {
    const month = Number(scheduleForm.month);
    const year = Number(scheduleForm.year);
    const dueDay = scheduleForm.dueDay ? Number(scheduleForm.dueDay) : undefined;
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      Alert.alert('Invalid month', 'Month must be a whole number between 1 and 12.');
      return;
    }
    if (!Number.isInteger(year) || year < 2000 || year > 3000) {
      Alert.alert('Invalid year', 'Year must be a whole number like 2026.');
      return;
    }
    if (dueDay != null && (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31)) {
      Alert.alert('Invalid due day', 'Due day must be between 1 and 31.');
      return;
    }
    generateRentSchedule({
      variables: {
        tenantId: id,
        month,
        year,
        dueDay,
        skipExisting: scheduleForm.skipExisting,
      },
    });
  }

  function runCreateVacationNotice() {
    if (!vacationForm.occupancyId || !vacationForm.vacationDate) {
      Alert.alert('Missing fields', 'Select occupancy and provide vacation date.');
      return;
    }
    if (!isValidDateInput(vacationForm.vacationDate)) {
      Alert.alert('Invalid date', 'Vacation date must use YYYY-MM-DD format.');
      return;
    }
    const balanceToPay = vacationForm.balanceToPay ? Number(vacationForm.balanceToPay) : undefined;
    if (balanceToPay != null && Number.isNaN(balanceToPay)) {
      Alert.alert('Invalid amount', 'Balance to pay must be a valid number.');
      return;
    }
    createVacationNotice({
      variables: {
        occupancyId: vacationForm.occupancyId,
        vacationDate: vacationForm.vacationDate,
        balanceToPay,
        message: vacationForm.message.trim() || undefined,
      },
    });
  }

  function runCancelVacationNotice(noticeId: string) {
    cancelVacationNotice({
      variables: {
        noticeId,
        reason: vacationForm.cancelReason.trim() || undefined,
      },
    });
  }

  function runCreateManualReceipt() {
    const currentOccupancy = tenant?.occupancies?.edges?.find(({ node }: any) => node?.isCurrent)?.node ?? tenant?.occupancies?.edges?.[0]?.node;
    const currentUnit = currentOccupancy?.unit;

    if (!tenant?.id || !currentUnit?.id) {
      Alert.alert('Missing allocation', 'Select a tenant with an active occupancy before creating a manual receipt.');
      return;
    }

    const fullNameParts = (tenant.fullName ?? '').trim().split(/\s+/).filter(Boolean);
    const firstName = (tenant.firstName ?? fullNameParts[0] ?? '').trim();
    const lastName = (tenant.lastName ?? fullNameParts.slice(1).join(' ') ?? '').trim();
    const middleName = (tenant.middleName ?? '').trim();
    const phoneNumber = (tenant.phone ?? '').trim();
    const email = (tenant.email ?? '').trim();

    if (!firstName || !lastName || !phoneNumber) {
      Alert.alert('Missing tenant profile details', 'Tenant first name, last name, and phone number are required.');
      return;
    }

    router.push({
      pathname: '/(tabs)/payments/manual/create',
      params: {
        tenantId: tenant.id,
        tenantDisplay: tenant.fullName || `${firstName} ${lastName}`,
        unitId: currentUnit.id,
        unitDisplay: `${currentUnit.unitNumber}${currentUnit.building?.name ? ` · ${currentUnit.building.name}` : ''}`,
        returnType: 'tenant',
        returnId: tenant.id,
        firstName,
        middleName,
        lastName,
        phoneNumber,
        email,
      },
    } as any);
  }

  function runVoidCharge(chargeId: string) {
    if (!chargeId) {
      Alert.alert('Missing charge id', 'This charge cannot be voided because no charge id is available.');
      return;
    }

    Alert.alert(
      'Void Charge',
      'Void this tenant charge? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Void', style: 'destructive', onPress: () => voidTenantCharge({ variables: { chargeId } }) },
      ],
    );
  }

  function showToast(message: string) {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 1800);
  }

  function closeActionModal() {
    setActiveAction(null);
  }

  function renderActionContent() {
    switch (activeAction) {
      case 'transfer':
        return (
          <>
            <Text style={styles.helperText}>Move an active occupancy to another unit.</Text>
            {tenant?.occupancies?.edges?.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {tenant.occupancies.edges.map(({ node }: any) => {
                  const active = transferForm.occupancyId === node.id;
                  return (
                    <TouchableOpacity
                      key={node.id}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setTransferForm((s) => ({ ...s, occupancyId: node.id }))}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{node.unit?.unitNumber || 'Occupancy'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={styles.emptyText}>No occupancies available for transfer.</Text>
            )}
            <Text style={styles.helperText}>Select target vacant unit.</Text>
            {vacantUnits.length === 0 ? (
              <Text style={styles.emptyText}>No vacant units available for transfer.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {vacantUnits.map((unit: any) => {
                  const active = transferForm.targetUnitId === unit.id;
                  return (
                    <TouchableOpacity
                      key={unit.id}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setTransferForm((s) => ({ ...s, targetUnitId: unit.id }))}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {unit.building?.name ? `${unit.building.name} · ` : ''}{unit.unitNumber}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
            <TextInput
              style={styles.textInput}
              placeholder="Transfer date (YYYY-MM-DD)"
              placeholderTextColor={colors.textMuted}
              value={transferForm.transferDate}
              onChangeText={(v) => setTransferForm((s) => ({ ...s, transferDate: v }))}
            />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Void pending charges</Text>
              <Switch
                value={transferForm.voidPendingCharges}
                onValueChange={(v) => setTransferForm((s) => ({ ...s, voidPendingCharges: v }))}
                thumbColor="#ffffff"
                trackColor={{ true: colors.primary, false: colors.border }}
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Generate deposit charge</Text>
              <Switch
                value={transferForm.generateDepositCharge}
                onValueChange={(v) => setTransferForm((s) => ({ ...s, generateDepositCharge: v }))}
                thumbColor="#ffffff"
                trackColor={{ true: colors.primary, false: colors.border }}
              />
            </View>
            <TouchableOpacity style={[styles.primaryBtn, transferring && { opacity: 0.6 }]} onPress={runTransferOccupancy} disabled={transferring}>
              <Text style={styles.primaryBtnText}>{transferring ? 'Transferring...' : 'Transfer Occupancy'}</Text>
            </TouchableOpacity>
          </>
        );
      case 'message':
        return (
          <>
            <TextInput
              style={styles.textInput}
              placeholder="Subject (optional)"
              placeholderTextColor={colors.textMuted}
              value={messageForm.subject}
              onChangeText={(v) => setMessageForm((s) => ({ ...s, subject: v }))}
            />
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Message"
              placeholderTextColor={colors.textMuted}
              value={messageForm.message}
              onChangeText={(v) => setMessageForm((s) => ({ ...s, message: v }))}
              multiline
            />
            <View style={styles.switchRow}><Text style={styles.switchLabel}>Send SMS</Text><Switch value={messageForm.sendSms} onValueChange={(v) => setMessageForm((s) => ({ ...s, sendSms: v }))} thumbColor="#ffffff" trackColor={{ true: colors.primary, false: colors.border }} /></View>
            <View style={styles.switchRow}><Text style={styles.switchLabel}>Send Email</Text><Switch value={messageForm.sendEmail} onValueChange={(v) => setMessageForm((s) => ({ ...s, sendEmail: v }))} thumbColor="#ffffff" trackColor={{ true: colors.primary, false: colors.border }} /></View>
            <View style={styles.switchRow}><Text style={styles.switchLabel}>Send In-App</Text><Switch value={messageForm.sendInApp} onValueChange={(v) => setMessageForm((s) => ({ ...s, sendInApp: v }))} thumbColor="#ffffff" trackColor={{ true: colors.primary, false: colors.border }} /></View>
            <View style={styles.switchRow}><Text style={styles.switchLabel}>Send WhatsApp</Text><Switch value={messageForm.sendWhatsapp} onValueChange={(v) => setMessageForm((s) => ({ ...s, sendWhatsapp: v }))} thumbColor="#ffffff" trackColor={{ true: colors.primary, false: colors.border }} /></View>
            <TouchableOpacity style={[styles.primaryBtn, sendingMessage && { opacity: 0.6 }]} onPress={runSendMessage} disabled={sendingMessage}>
              <Text style={styles.primaryBtnText}>{sendingMessage ? 'Sending...' : 'Send Message'}</Text>
            </TouchableOpacity>
          </>
        );
      case 'schedule':
        return (
          <>
            <View style={styles.inlineInputs}>
              <TextInput
                style={[styles.textInput, styles.inlineInput]}
                placeholder="Month (1-12)"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                value={scheduleForm.month}
                onChangeText={(v) => setScheduleForm((s) => ({ ...s, month: v }))}
              />
              <TextInput
                style={[styles.textInput, styles.inlineInput]}
                placeholder="Year"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                value={scheduleForm.year}
                onChangeText={(v) => setScheduleForm((s) => ({ ...s, year: v }))}
              />
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="Due day (optional)"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              value={scheduleForm.dueDay}
              onChangeText={(v) => setScheduleForm((s) => ({ ...s, dueDay: v }))}
            />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Skip existing schedules</Text>
              <Switch
                value={scheduleForm.skipExisting}
                onValueChange={(v) => setScheduleForm((s) => ({ ...s, skipExisting: v }))}
                thumbColor="#ffffff"
                trackColor={{ true: colors.primary, false: colors.border }}
              />
            </View>
            <TouchableOpacity style={[styles.primaryBtn, generatingSchedule && { opacity: 0.6 }]} onPress={runGenerateSchedule} disabled={generatingSchedule}>
              <Text style={styles.primaryBtnText}>{generatingSchedule ? 'Queueing...' : 'Generate Schedule'}</Text>
            </TouchableOpacity>
          </>
        );
      case 'vacation':
        return (
          <>
            {tenant?.occupancies?.edges?.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {tenant.occupancies.edges.map(({ node }: any) => {
                  const active = vacationForm.occupancyId === node.id;
                  return (
                    <TouchableOpacity
                      key={`vac-${node.id}`}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setVacationForm((s) => ({ ...s, occupancyId: node.id }))}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{node.unit?.unitNumber || 'Occupancy'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : null}
            <View style={styles.inlineInputs}>
              <TextInput
                style={[styles.textInput, styles.inlineInput]}
                placeholder="Vacation date (YYYY-MM-DD)"
                placeholderTextColor={colors.textMuted}
                value={vacationForm.vacationDate}
                onChangeText={(v) => setVacationForm((s) => ({ ...s, vacationDate: v }))}
              />
              <TextInput
                style={[styles.textInput, styles.inlineInput]}
                placeholder="Balance to pay (optional)"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={vacationForm.balanceToPay}
                onChangeText={(v) => setVacationForm((s) => ({ ...s, balanceToPay: v }))}
              />
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="Notice message (optional)"
              placeholderTextColor={colors.textMuted}
              value={vacationForm.message}
              onChangeText={(v) => setVacationForm((s) => ({ ...s, message: v }))}
            />
            <TextInput
              style={styles.textInput}
              placeholder="Cancel reason (optional)"
              placeholderTextColor={colors.textMuted}
              value={vacationForm.cancelReason}
              onChangeText={(v) => setVacationForm((s) => ({ ...s, cancelReason: v }))}
            />
            <TouchableOpacity
              style={[styles.primaryBtn, creatingVacation && { opacity: 0.6 }]}
              onPress={runCreateVacationNotice}
              disabled={creatingVacation}
            >
              <Text style={styles.primaryBtnText}>{creatingVacation ? 'Creating...' : 'Create Vacation Notice'}</Text>
            </TouchableOpacity>
          </>
        );
      case 'receipt': {
        const paymentModes = paymentModesData?.configPaymentModes?.edges?.map((e: any) => e.node) ?? [];
        const occupancyOptions = tenant?.occupancies?.edges ?? [];
        const selectedOccupancyNode = occupancyOptions.find(({ node }: any) => node.id === manualReceiptForm.occupancyId)?.node;
        const defaultPaymentModeId =
          manualReceiptForm.paymentMethodConfigId ||
          paymentModes.find((mode: any) => mode?.isActive !== false)?.id || '';
        const selectedPaymentMode = paymentModes.find((mode: any) => mode.id === defaultPaymentModeId);
        const paymentModeRequiresReference = Boolean(selectedPaymentMode?.requiresReference);

        return (
          <>
            <Text style={styles.helperText}>Generate manual receipt for this tenant. Payment date defaults to today.</Text>
            <InfoRow icon="person-outline" label="Tenant" value={displayName} />

            {occupancyOptions.length === 0 ? (
              <Text style={styles.emptyText}>No occupancies available for this tenant.</Text>
            ) : (
              <>
                <Text style={styles.helperText}>Select occupancy/unit.</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                  {occupancyOptions.map(({ node }: any) => {
                    const active = manualReceiptForm.occupancyId === node.id;
                    return (
                      <TouchableOpacity
                        key={`mr-${node.id}`}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setManualReceiptForm((s) => ({ ...s, occupancyId: node.id }))}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {node.unit?.building?.name ? `${node.unit.building.name} · ` : ''}{node.unit?.unitNumber || 'Unit'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <InfoRow
                  icon="home-outline"
                  label="Selected unit"
                  value={selectedOccupancyNode?.unit?.unitNumber ? `Unit ${selectedOccupancyNode.unit.unitNumber}` : '-'}
                />
              </>
            )}

            <TextInput
              style={styles.textInput}
              placeholder="Amount"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={manualReceiptForm.amount}
              onChangeText={(v) => setManualReceiptForm((s) => ({ ...s, amount: v }))}
            />
            <TextInput
              style={styles.textInput}
              placeholder="Payment date (YYYY-MM-DD)"
              placeholderTextColor={colors.textMuted}
              value={manualReceiptForm.paymentDate}
              onChangeText={(v) => setManualReceiptForm((s) => ({ ...s, paymentDate: v }))}
            />

            {paymentModes.length > 0 ? (
              <>
                <Text style={styles.helperText}>Select payment mode.</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                  {paymentModes.map((mode: any) => {
                    const active = defaultPaymentModeId === mode.id;
                    return (
                      <TouchableOpacity
                        key={`pm-${mode.id}`}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setManualReceiptForm((s) => ({ ...s, paymentMethodConfigId: mode.id }))}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{mode.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            ) : (
              <Text style={styles.emptyText}>No payment modes available.</Text>
            )}

            {paymentModeRequiresReference ? (
              <TextInput
                style={styles.textInput}
                placeholder="Reference number"
                placeholderTextColor={colors.textMuted}
                value={manualReceiptForm.referenceNumber}
                onChangeText={(v) => setManualReceiptForm((s) => ({ ...s, referenceNumber: v }))}
              />
            ) : null}

            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Notes (optional)"
              placeholderTextColor={colors.textMuted}
              value={manualReceiptForm.notes}
              onChangeText={(v) => setManualReceiptForm((s) => ({ ...s, notes: v }))}
              multiline
            />
            <TouchableOpacity
              style={[styles.primaryBtn, creatingManualReceipt && { opacity: 0.6 }]}
              onPress={runCreateManualReceipt}
              disabled={creatingManualReceipt}
            >
              <Text style={styles.primaryBtnText}>{creatingManualReceipt ? 'Creating...' : 'Create Manual Receipt'}</Text>
            </TouchableOpacity>
          </>
        );
      }
      case 'charges': {
        const entries = extractChargeHistoryEntries(chargesHistory);
        const total = Number(chargesHistory?.count ?? chargesHistory?.total ?? entries.length);
        const currentPage = Number(chargesHistory?.currentPage ?? chargesPage);
        const pageCount = Math.max(Number(chargesHistory?.numPages ?? chargesHistory?.totalPages ?? 1), 1);

        return (
          <>
            <Text style={styles.helperText}>Tenant charges history with paging and void actions.</Text>
            <StatRow
              stats={[
                { label: 'Total', value: formatMoney(chargesHistory?.totalAmount ?? 0) },
                { label: 'Paid', value: formatMoney(chargesHistory?.totalPaid ?? 0), color: Colors.success },
                { label: 'Outstanding', value: formatMoney(chargesHistory?.totalOutstanding ?? 0), color: Colors.error },
              ]}
            />

            <View style={styles.paginationRow}>
              <TouchableOpacity
                style={[styles.ghostBtnSmall, (currentPage <= 1 || chargesLoading) && { opacity: 0.5 }]}
                disabled={currentPage <= 1 || chargesLoading}
                onPress={() => setChargesPage((p) => Math.max(1, p - 1))}
              >
                <Text style={styles.ghostBtnSmallText}>Prev</Text>
              </TouchableOpacity>
              <Text style={styles.paginationText}>Page {currentPage} of {pageCount}</Text>
              <TouchableOpacity
                style={[styles.ghostBtnSmall, (currentPage >= pageCount || chargesLoading) && { opacity: 0.5 }]}
                disabled={currentPage >= pageCount || chargesLoading}
                onPress={() => setChargesPage((p) => Math.min(pageCount, p + 1))}
              >
                <Text style={styles.ghostBtnSmallText}>Next</Text>
              </TouchableOpacity>
            </View>

            {chargesLoading ? <Text style={styles.helperText}>Loading charges...</Text> : null}
            {entries.length === 0 ? (
              <Text style={styles.emptyText}>No charges found on this page.</Text>
            ) : (
              entries.map((entry: any, index: number) => {
                const chargeId = firstDefinedString(
                  entry?.chargeId,
                  entry?.tenantChargeId,
                  entry?.charge?.id,
                  entry?.tenantCharge?.id,
                );
                const statusRaw = firstDefinedString(entry?.status, entry?.state, entry?.chargeStatus, entry?.charge?.status) || 'PENDING';
                const statusUpper = statusRaw.toUpperCase();
                const canVoid = Boolean(chargeId) && statusUpper !== 'VOID' && statusUpper !== 'VOIDED' && statusUpper !== 'PAID';
                const title =
                  firstDefinedString(entry?.description, entry?.chargeName, entry?.serviceTypeName, entry?.charge?.name) ||
                  `Charge ${chargeId || index + 1}`;
                const subtitle = [
                  firstDefinedString(entry?.chargeDate, entry?.date, entry?.createdAt),
                  firstDefinedString(entry?.unitNumber, entry?.unit?.unitNumber),
                ].filter(Boolean).join(' • ');
                const amountValue = entry?.amount ?? entry?.totalAmount ?? entry?.expectedAmount ?? 0;

                return (
                  <View key={`${chargeId || index}`} style={styles.chargeItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txRef}>{title}</Text>
                      <Text style={styles.txMode}>{subtitle || 'Charge entry'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: Spacing.xs }}>
                      <Text style={styles.txAmount}>{formatMoney(amountValue)}</Text>
                      <StatusBadge
                        label={statusRaw}
                        color={statusUpper === 'PAID' ? 'success' : statusUpper === 'VOID' || statusUpper === 'VOIDED' ? 'warning' : 'error'}
                      />
                      <TouchableOpacity
                        style={[styles.ghostBtnSmall, (!canVoid || voidingCharge) && { opacity: 0.5 }]}
                        disabled={!canVoid || voidingCharge}
                        onPress={() => runVoidCharge(chargeId || '')}
                      >
                        <Text style={styles.ghostBtnSmallText}>{voidingCharge ? 'Voiding...' : 'Void'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}

            <Text style={styles.helperText}>Showing {entries.length} of {total} charges.</Text>
          </>
        );
      }
      case 'notifications': {
        const logs = tenant?.notificationLogs?.edges ?? [];

        return (
          <>
            <Text style={styles.helperText}>Notification delivery history for this tenant.</Text>
            {logs.length === 0 ? (
              <Text style={styles.emptyText}>No notification history available.</Text>
            ) : (
              logs.slice(0, 20).map(({ node }: any) => (
                <View key={node.id} style={styles.txRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txRef}>{node.sentAt ? new Date(node.sentAt).toLocaleString() : 'Notification'}</Text>
                    <Text style={styles.txMode} numberOfLines={3}>{node.messageContent || 'No message preview'}</Text>
                  </View>
                  <View style={styles.channelPills}>
                    {node.smsSent ? <Text style={styles.channelPill}>SMS</Text> : null}
                    {node.emailSent ? <Text style={styles.channelPill}>Email</Text> : null}
                    {node.whatsappSent ? <Text style={styles.channelPill}>WA</Text> : null}
                  </View>
                </View>
              ))
            )}
          </>
        );
      }
      default:
        return null;
    }
  }

  function initials(name: string) {
    return name.split(' ').slice(0, 2).map((n: string) => n[0] ?? '').join('').toUpperCase();
  }

  const displayName = tenant
    ? tenant.fullName || `${tenant.firstName} ${tenant.lastName}`
    : 'Tenant Detail';
  const chargesHistory = chargesData?.tenantChargesHistory;
  const vacationNotices = Array.isArray(vacationData?.tenantVacationNotices) ? vacationData.tenantVacationNotices : [];
  const vacantUnits = vacantUnitsData?.units?.edges?.map((e: any) => e.node) ?? [];

  const occupancyEdges = tenant?.occupancies?.edges ?? [];
  const defaultManualOccupancyId = occupancyEdges.find(({ node }: any) => node?.isCurrent)?.node?.id || occupancyEdges[0]?.node?.id || '';
  const effectiveManualOccupancyId = manualReceiptForm.occupancyId || defaultManualOccupancyId;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{displayName}</Text>
        {tenant && (
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push({ pathname: '/tenants/add', params: { id: tenant.id } } as any)}
            hitSlop={8}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
        {!tenant && <View style={{ width: 40 }} />}
      </View>

      {loading && !data && <LoadingState />}

      {error && !data && (
        <ErrorState
          title="Failed to load tenant"
          message={error.message}
          onRetry={() => refetch()}
        />
      )}

      {tenant && (
        <ScrollView contentContainerStyle={[styles.scroll, isTablet && styles.scrollTablet]} showsVerticalScrollIndicator={false}>

          {/* Hero card */}
          <View style={styles.heroCard}>
            <View style={styles.heroRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(displayName)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroName}>{displayName}</Text>
                {tenant.idNumber ? <Text style={styles.heroSub}>ID: {tenant.idNumber}</Text> : null}
              </View>
              <StatusBadge
                label={tenant.isActive ? 'Active' : 'Inactive'}
                color={tenant.isActive ? 'success' : 'error'}
              />
            </View>
            {(tenant.totalArrears ?? 0) > 0 && (
              <View style={styles.arrearsRow}>
                <Ionicons name="warning-outline" size={14} color={Colors.error} />
                <Text style={styles.arrearsText}>
                  Outstanding arrears: KES {Number(tenant.totalArrears).toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          {/* Contact */}
          <SectionCard title="Contact">
            <InfoRow
              icon="call-outline"
              label="Phone"
              value={tenant.phone}
              onPress={tenant.phone ? () => Linking.openURL(`tel:${tenant.phone}`) : undefined}
            />
            <InfoRow
              icon="call-outline"
              label="Alternative phone"
              value={tenant.alternativePhone}
              onPress={tenant.alternativePhone ? () => Linking.openURL(`tel:${tenant.alternativePhone}`) : undefined}
            />
            <InfoRow
              icon="mail-outline"
              label="Email"
              value={tenant.email}
              onPress={tenant.email ? () => Linking.openURL(`mailto:${tenant.email}`) : undefined}
            />
          </SectionCard>

          {/* Personal */}
          <SectionCard title="Personal">
            <InfoRow icon="briefcase-outline" label="Occupation" value={tenant.occupation} />
            <InfoRow icon="business-outline" label="Employer" value={tenant.employer} />
            <InfoRow icon="home-outline" label="Permanent address" value={tenant.permanentAddress} />
            <InfoRow icon="calendar-outline" label="Default due day" value={tenant.defaultDueDay?.toString()} />
            {tenant.notes ? (
              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>Notes</Text>
                <Text style={styles.notesText}>{tenant.notes}</Text>
              </View>
            ) : null}
          </SectionCard>

          {/* Actions */}
          <SectionCard title="Action Shortcuts">
            <Text style={styles.helperText}>Open operational forms from here to keep this page detail-first.</Text>
            <View style={styles.shortcutsGrid}>
              <TouchableOpacity style={styles.shortcutChip} onPress={() => { setActiveAction('transfer'); showToast('Transfer occupancy opened'); }}>
                <Ionicons name="swap-horizontal-outline" size={16} color={colors.primary} />
                <Text style={styles.shortcutChipText}>Transfer Occupancy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shortcutChip} onPress={() => { setChargesPage(1); setActiveAction('charges'); showToast('Charges opened'); }}>
                <Ionicons name="receipt-outline" size={16} color={colors.primary} />
                <Text style={styles.shortcutChipText}>Charges</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.shortcutChip, occupancyEdges.length === 0 && { opacity: 0.45 }]}
                onPress={() => {
                  if (occupancyEdges.length === 0) {
                    Alert.alert('No occupancy', 'Manual receipt requires at least one occupancy/unit.');
                    return;
                  }
                  runCreateManualReceipt();
                  showToast('Opening manual receipt creator');
                }}
              >
                <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                <Text style={styles.shortcutChipText}>Manual Receipt</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shortcutChip} onPress={() => { setActiveAction('message'); showToast('Message composer opened'); }}>
                <Ionicons name="chatbox-ellipses-outline" size={16} color={colors.primary} />
                <Text style={styles.shortcutChipText}>Send Message</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shortcutChip} onPress={() => { setActiveAction('notifications'); showToast('Notification history opened'); }}>
                <Ionicons name="notifications-outline" size={16} color={colors.primary} />
                <Text style={styles.shortcutChipText}>Notifications</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shortcutChip} onPress={() => { setActiveAction('schedule'); showToast('Schedule form opened'); }}>
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <Text style={styles.shortcutChipText}>Generate Schedule</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shortcutChip} onPress={() => { setActiveAction('vacation'); showToast('Vacation form opened'); }}>
                <Ionicons name="paper-plane-outline" size={16} color={colors.primary} />
                <Text style={styles.shortcutChipText}>Vacation Notice</Text>
              </TouchableOpacity>
            </View>
          </SectionCard>

          {/* Emergency contact */}
          {(tenant.emergencyContactName || tenant.emergencyContactPhone) && (
            <SectionCard title="Emergency Contact">
              <InfoRow icon="person-outline" label="Name" value={tenant.emergencyContactName} />
              <InfoRow
                icon="call-outline"
                label="Phone"
                value={tenant.emergencyContactPhone}
                onPress={tenant.emergencyContactPhone
                  ? () => Linking.openURL(`tel:${tenant.emergencyContactPhone}`)
                  : undefined}
              />
              <InfoRow
                icon="people-outline"
                label="Relationship"
                value={tenant.emergencyContactRelationship}
              />
            </SectionCard>
          )}

          {/* Current occupancies */}
          {tenant.occupancies?.edges?.length > 0 && (
            <SectionCard title="Occupancies">
              <View style={[styles.occupancyGrid, isTablet && styles.occupancyGridTablet]}>
                {tenant.occupancies.edges.map(({ node }: any) => (
                  <View key={`${node.unit?.id}-${node.startDate}`} style={[styles.occupancyItem, isTablet && styles.occupancyItemTablet]}>
                    <View style={styles.occupancyHeader}>
                      <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() => node.unit?.id && router.push({ pathname: '/(tabs)/units/[id]', params: { id: node.unit.id } } as any)}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.unitLabel}>
                          {node.unit?.building?.name} — Unit {node.unit?.unitNumber}
                        </Text>
                      </TouchableOpacity>
                      {node.isCurrent && (
                        <StatusBadge label="Current" color="success" />
                      )}
                    </View>
                    <StatRow
                      stats={[
                        { label: 'Rent', value: node.unit?.monthlyRent ? `KES ${Number(node.unit.monthlyRent).toLocaleString()}` : '—' },
                        { label: 'Deposit', value: node.depositPaid ? `KES ${Number(node.depositPaid).toLocaleString()}` : '—' },
                        { label: 'Duration', value: node.durationMonths ? `${Number(node.durationMonths).toFixed(0)} m` : '—' },
                      ]}
                    />
                    <View style={styles.occupancyDates}>
                      <Text style={styles.datesText}>
                        {node.startDate} {node.endDate ? `→ ${node.endDate}` : '(ongoing)'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </SectionCard>
          )}

          {/* Vacation Notices */}
          <SectionCard title="Vacation Notices">
            {vacationNotices.length === 0 ? (
              <Text style={styles.emptyText}>No vacation notices available.</Text>
            ) : (
              vacationNotices.slice(0, 8).map((notice: any, index: number) => (
                <View key={`${notice.id ?? index}`} style={styles.txRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txRef}>{notice.vacationDate || notice.vacationDateOut || 'Vacation date'}</Text>
                    <Text style={styles.txMode}>{notice.message || notice.reason || 'Notice'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: Spacing.xs }}>
                    <StatusBadge label={(notice.status || 'PENDING').toString()} color="warning" />
                    {String(notice.status || '').toUpperCase() === 'PENDING' && notice.id ? (
                      <TouchableOpacity
                        style={[styles.ghostBtnSmall, cancellingVacation && { opacity: 0.6 }]}
                        onPress={() => runCancelVacationNotice(String(notice.id))}
                        disabled={cancellingVacation}
                      >
                        <Text style={styles.ghostBtnSmallText}>Cancel</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              ))
            )}
            <Text style={styles.helperText}>Use Action Shortcuts to create or cancel notices.</Text>
          </SectionCard>

          {/* Rent schedules */}
          {tenant.rentSchedules?.edges?.length > 0 && (
            <SectionCard title="Recent Rent Schedules">
              <View style={[styles.scheduleGrid, isTablet && styles.scheduleGridTablet]}>
                {tenant.rentSchedules.edges.slice(0, 6).map(({ node }: any) => (
                  <View
                    key={node.id}
                    style={[
                      styles.scheduleRow,
                      styles.scheduleItem,
                      isSmallTablet && styles.scheduleItemSmallTablet,
                      isWideTablet && styles.scheduleItemWideTablet,
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.scheduleUnit}>{node.unit?.unitNumber}</Text>
                      <Text style={styles.scheduleDue}>{node.dueDate}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.scheduleAmount,
                        node.status === 'PAID' ? { color: Colors.success } :
                        node.isOverdue ? { color: Colors.error } :
                        { color: Colors.warning }
                      ]}>
                        KES {Number(node.expectedAmount).toLocaleString()}
                      </Text>
                      <StatusBadge
                        label={node.status}
                        color={node.status === 'PAID' ? 'success' : node.isOverdue ? 'error' : 'warning'}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </SectionCard>
          )}

          {/* Transactions */}
          {tenant.transactions?.edges?.length > 0 && (
            <SectionCard title="Recent Transactions">
              <View style={[styles.transactionGrid, isTablet && styles.transactionGridTablet]}>
                {tenant.transactions.edges.slice(0, 6).map(({ node }: any) => (
                  <View
                    key={node.id}
                    style={[
                      styles.txRow,
                      styles.transactionItem,
                      isSmallTablet && styles.transactionItemSmallTablet,
                      isWideTablet && styles.transactionItemWideTablet,
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txRef}>#{node.no || node.reference || node.id}</Text>
                      <Text style={styles.txMode}>{node.paymentMode}</Text>
                      <Text style={styles.txDate}>{formatDisplayDate(node.transactionDate || node.paymentDate || node.createdAt || node.date)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.txAmount, { color: Colors.success }]}>
                        KES {Number(node.amount).toLocaleString()}
                      </Text>
                      <StatusBadge
                        label={node.status}
                        color={node.status === 'CONFIRMED' || node.status === 'COMPLETE' ? 'success' : 'warning'}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </SectionCard>
          )}

          {/* Danger Zone */}
          <SectionCard title="Danger Zone">
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={confirmDelete}
              disabled={deleting}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
              <Text style={styles.deleteBtnText}>{deleting ? 'Deleting…' : 'Delete Tenant'}</Text>
            </TouchableOpacity>
          </SectionCard>

          <View style={{ height: Spacing.xxl }} />

          {activeAction ? (
            <Modal visible transparent animationType="slide" onRequestClose={closeActionModal}>
              <Pressable style={styles.backdrop} onPress={closeActionModal} />
              <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
                <View style={[styles.sheetHeader, { borderBottomColor: colors.borderLight }]}>
                  <TouchableOpacity onPress={closeActionModal}>
                    <Text style={[styles.sheetBtn, { color: colors.textMuted }]}>Close</Text>
                  </TouchableOpacity>
                  <Text style={[styles.sheetTitle, { color: colors.text }]}>
                    {activeAction === 'transfer'
                      ? 'Transfer Occupancy'
                      : activeAction === 'charges'
                        ? 'Charges History'
                      : activeAction === 'notifications'
                        ? 'Notification History'
                      : activeAction === 'receipt'
                        ? 'Manual Receipt'
                      : activeAction === 'message'
                        ? 'Send Custom Message'
                        : activeAction === 'schedule'
                          ? 'Generate Rent Schedule'
                          : 'Vacation Notice'}
                  </Text>
                  <View style={styles.sheetSpacer} />
                </View>
                <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
                  {renderActionContent()}
                </ScrollView>
              </View>
            </Modal>
          ) : null}

          {toastMessage ? (
            <View pointerEvents="none" style={styles.toastWrap}>
              <View style={styles.toast}>
                <Text style={styles.toastText}>{toastMessage}</Text>
              </View>
            </View>
          ) : null}
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
  editBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: Typography.fontSizeLg,
    fontWeight: Typography.fontWeightSemibold,
    color: c.text,
  },
  scroll: { padding: Spacing.md },
  scrollTablet: { width: '100%', maxWidth: 920, alignSelf: 'center' },

  // Hero
  heroCard: {
    backgroundColor: c.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: c.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: Typography.fontSizeXl,
    fontWeight: Typography.fontWeightBold,
    color: c.primary,
  },
  heroName: { fontSize: Typography.fontSizeXl, fontWeight: Typography.fontWeightBold, color: c.text },
  heroSub: { fontSize: Typography.fontSizeSm, color: c.textMuted, marginTop: 2 },
  arrearsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: Radius.sm,
    padding: Spacing.xs,
  },
  arrearsText: { fontSize: Typography.fontSizeSm, color: Colors.error, fontWeight: Typography.fontWeightMedium },

  notesBox: { paddingTop: Spacing.xs },
  notesLabel: { fontSize: Typography.fontSizeXs, color: c.textMuted, marginBottom: 2 },
  notesText: { fontSize: Typography.fontSizeSm, color: c.textSecondary, lineHeight: 20 },

  occupancyItem: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: c.borderLight,
  },
  occupancyGrid: {
    width: '100%',
  },
  occupancyGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.sm,
  },
  occupancyItemTablet: {
    width: '48.5%',
    borderBottomWidth: 0,
    borderWidth: 1,
    borderColor: c.borderLight,
    borderRadius: Radius.md,
    backgroundColor: c.inputBackground,
    paddingHorizontal: Spacing.sm,
  },
  occupancyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  unitLabel: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightSemibold, color: c.text, flex: 1 },
  occupancyDates: { marginTop: Spacing.xs },
  datesText: { fontSize: Typography.fontSizeXs, color: c.textMuted },

  chargeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: c.borderLight,
    paddingVertical: Spacing.sm,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  paginationText: {
    fontSize: Typography.fontSizeSm,
    color: c.textSecondary,
    fontWeight: Typography.fontWeightSemibold,
  },

  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: c.borderLight,
  },
  scheduleGrid: {
    width: '100%',
  },
  scheduleGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.sm,
  },
  scheduleItem: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: c.borderLight,
    backgroundColor: c.inputBackground,
    paddingHorizontal: Spacing.sm,
  },
  scheduleItemSmallTablet: {
    width: '48.5%',
    borderBottomWidth: 1,
  },
  scheduleItemWideTablet: {
    width: '32%',
    borderBottomWidth: 1,
  },
  scheduleUnit: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium, color: c.text },
  scheduleDue: { fontSize: Typography.fontSizeXs, color: c.textMuted },
  scheduleAmount: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightSemibold, marginBottom: 2 },

  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: c.borderLight,
  },
  txRef: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium, color: c.text },
  txMode: { fontSize: Typography.fontSizeXs, color: c.textMuted },
  txDate: { fontSize: Typography.fontSizeXs, color: c.textMuted, marginTop: 2 },
  txAmount: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightSemibold, marginBottom: 2 },
  transactionGrid: {
    width: '100%',
  },
  transactionGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.sm,
  },
  transactionItem: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: c.borderLight,
    backgroundColor: c.inputBackground,
    paddingHorizontal: Spacing.sm,
  },
  transactionItemSmallTablet: {
    width: '48.5%',
    borderBottomWidth: 1,
  },
  transactionItemWideTablet: {
    width: '32%',
    borderBottomWidth: 1,
  },
  receiptActionsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  ghostBtnSmall: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 34,
    borderRadius: Radius.sm,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: Spacing.sm,
  },
  ghostBtnSmallText: {
    fontSize: Typography.fontSizeXs,
    color: c.textSecondary,
    fontWeight: Typography.fontWeightSemibold,
  },
  channelPills: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' },
  channelPill: {
    fontSize: Typography.fontSizeXs,
    color: c.primary,
    backgroundColor: c.overlay,
    borderWidth: 1,
    borderColor: c.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  helperText: {
    fontSize: Typography.fontSizeXs,
    color: c.textMuted,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.fontSizeSm,
    color: c.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  shortcutChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: Radius.full,
    backgroundColor: c.inputBackground,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.sm,
  },
  shortcutChipText: {
    fontSize: Typography.fontSizeXs,
    color: c.text,
    fontWeight: Typography.fontWeightSemibold,
  },
  chip: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: Radius.full,
    backgroundColor: c.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  chipActive: {
    borderColor: c.primary,
    backgroundColor: c.overlay,
  },
  chipText: {
    fontSize: Typography.fontSizeXs,
    color: c.textMuted,
    fontWeight: Typography.fontWeightMedium,
  },
  chipTextActive: {
    color: c.primary,
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
  inlineInputs: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  inlineInput: { flex: 1 },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  switchLabel: {
    flex: 1,
    fontSize: Typography.fontSizeSm,
    color: c.text,
    fontWeight: Typography.fontWeightSemibold,
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
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '82%',
    paddingBottom: Spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  sheetSpacer: { width: 44 },
  sheetTitle: { fontSize: Typography.fontSizeMd, fontWeight: '600' },
  sheetBtn: { fontSize: Typography.fontSizeMd, paddingVertical: 4 },
  sheetContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  toastWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Spacing.xl,
    alignItems: 'center',
  },
  toast: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Shadow.sm,
  },
  toastText: {
    fontSize: Typography.fontSizeSm,
    color: c.text,
    fontWeight: Typography.fontWeightSemibold,
  },
  });
}
