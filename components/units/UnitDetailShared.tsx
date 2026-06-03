import { AppHeader } from '@/components/AppHeader';
import { DatePickerInput } from '@/components/ui/DatePickerInput';
import { ErrorState } from '@/components/ui/ErrorState';
import { InfoRow } from '@/components/ui/InfoRow';
import { LoadingState } from '@/components/ui/LoadingState';
import { SearchableDropdown } from '@/components/ui/SearchableDropdown';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatRow } from '@/components/ui/StatRow';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AppColors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import {
    POST_TENANT_EXTRA_CHARGE_MUTATION,
    VOID_RENT_SCHEDULE_MUTATION,
    VOID_TENANT_CHARGE_MUTATION,
} from '@/graphql/properties/mutations/building';
import {
    CREATE_MANUAL_RECEIPT,
    CREATE_MANUAL_RECEIPT_PAYMENT,
    VALIDATE_MANUAL_RECEIPT,
} from '@/graphql/properties/mutations/payments';
import {
    CANCEL_VACATION_NOTICE_MUTATION,
    CREATE_OCCUPANCY_MUTATION,
    CREATE_VACATION_NOTICE_MUTATION,
} from '@/graphql/properties/mutations/tenants';
import {
    COPY_UNIT_MUTATION,
    DELETE_UNIT,
    PROCESS_MOVE_OUT_MUTATION,
} from '@/graphql/properties/mutations/units';
import {
    BUILDING_EXTRA_CHARGES_DATA_QUERY,
    UNIT_CHARGES_HISTORY_QUERY,
} from '@/graphql/properties/queries/building';
import {
    CONFIG_PAYMENT_MODES_QUERY,
    MANUAL_RECEIPTS_QUERY,
    PAYMENT_ALLOCATION_BREAKDOWN_QUERY,
    PAYMENT_RECEIPT_PDF_QUERY,
    PREVIEW_PAYMENT_ALLOCATION_QUERY,
} from '@/graphql/properties/queries/payments';
import {
    TENANT_STATEMENT_DATA_QUERY,
    TENANT_VACATION_NOTICES_QUERY,
    TENANTS_DROPDOWN,
} from '@/graphql/properties/queries/tenants';
import { UNIT_DETAIL_QUERY, UNITS_QUERY } from '@/graphql/properties/queries/units';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface UnitDetailSharedProps {
  unitId?: string;
  embedded?: boolean;
  onBack?: () => void;
  onEdit?: (unitId: string) => void;
  onDeleted?: () => void;
}

type ActionView =
  | 'copy'
  | 'assign'
  | 'moveOut'
  | 'vacation'
  | 'charges'
  | 'receipts'
  | 'extraCharge'
  | 'allocation'
  | 'danger';

type TenantStatementSnapshot = {
  openingBalance?: number;
  closingBalance?: number;
  totalDebits?: number;
  totalCredits?: number;
};

function normalizeTenantStatement(raw: any): TenantStatementSnapshot | null {
  if (raw == null) return null;

  let payload: any = raw;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      return null;
    }
  }

  if (!payload || typeof payload !== 'object') return null;

  const candidate =
    payload.summary && typeof payload.summary === 'object'
      ? payload.summary
      : payload.statement && typeof payload.statement === 'object'
        ? payload.statement
        : payload;

  const statement: TenantStatementSnapshot = {
    openingBalance: candidate.openingBalance ?? candidate.opening_balance,
    closingBalance: candidate.closingBalance ?? candidate.closing_balance,
    totalDebits: candidate.totalDebits ?? candidate.total_debits,
    totalCredits: candidate.totalCredits ?? candidate.total_credits,
  };

  if (
    statement.openingBalance == null &&
    statement.closingBalance == null &&
    statement.totalDebits == null &&
    statement.totalCredits == null
  ) {
    return null;
  }

  return statement;
}

function decodeRelayId(relayId?: string): number | undefined {
  if (!relayId) return undefined;
  if (/^\d+$/.test(relayId)) return parseInt(relayId, 10);
  try {
    const globalBuffer = (globalThis as any).Buffer;
    const decoded =
      typeof globalThis.atob === 'function'
        ? globalThis.atob(relayId)
        : globalBuffer
          ? globalBuffer.from(relayId, 'base64').toString('utf8')
          : '';
    if (!decoded) return undefined;
    const pk = decoded.split(':').pop();
    if (!pk) return undefined;
    const num = parseInt(pk, 10);
    return Number.isNaN(num) ? undefined : num;
  } catch {
    return undefined;
  }
}

function isValidDateInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isValidMonthInput(value: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(value)) return false;
  const [, monthRaw] = value.split('-');
  const month = Number(monthRaw);
  return month >= 1 && month <= 12;
}

const ASSIGN_PAYMENT_PERIOD_OPTIONS = [
  { id: 'DAILY', label: 'Daily' },
  { id: 'WEEKLY', label: 'Weekly' },
  { id: 'BI_WEEKLY', label: 'Bi-weekly' },
  { id: 'MONTHLY', label: 'Monthly' },
  { id: 'QUARTERLY', label: 'Quarterly' },
  { id: 'SEMI_ANNUAL', label: 'Semi-annual' },
  { id: 'ANNUAL', label: 'Annual' },
];

const SCHEDULE_GENERATION_MODE_OPTIONS = [
  { id: 'NEXT_MONTH', label: 'Next month' },
  { id: 'CURRENT_MONTH', label: 'Current month' },
  { id: 'NO_GENERATION', label: 'Do not generate now' },
];

export function UnitDetailShared({ unitId, embedded = false, onBack, onEdit, onDeleted }: UnitDetailSharedProps) {
  const router = useRouter();
  const pathname = usePathname();
  const routeParams = useLocalSearchParams<{ id?: string | string[] }>();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isTablet = width >= 768;

  const [copyForm, setCopyForm] = useState({
    copyCount: '1',
    startingUnitNumber: '',
    numberingPattern: '',
    incrementFloor: false,
  });
  const [assignForm, setAssignForm] = useState({
    tenantId: '',
    startDate: '',
    paymentPeriod: 'MONTHLY',
    scheduleGenerationMode: 'NEXT_MONTH',
    skipDepositCharge: false,
  });
  const [moveOutForm, setMoveOutForm] = useState({
    endDate: '',
    moveOutReason: '',
    damageAmount: '',
    damageNotes: '',
  });
  const [vacationForm, setVacationForm] = useState({
    vacationDate: '',
    balanceToPay: '',
    message: '',
    cancelReason: '',
  });
  const [manualReceiptForm, setManualReceiptForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethodConfigId: '',
    referenceNumber: '',
    notes: '',
  });
  const [receiptPaymentMap, setReceiptPaymentMap] = useState<Record<string, number>>({});
  const [extraChargeForm, setExtraChargeForm] = useState({
    definitionId: '',
    billingMonth: '',
    chargeDate: '',
    dueDate: '',
    amount: '',
    unitsUsed: '',
    notes: '',
  });
  const [allocationForm, setAllocationForm] = useState({
    amount: '',
    chargeId: '',
    scheduleId: '',
  });
  const [activeAction, setActiveAction] = useState<ActionView | null>(null);

  const { data, loading, error, refetch } = useQuery(UNIT_DETAIL_QUERY, {
    variables: { id: unitId },
    fetchPolicy: 'cache-and-network',
    skip: !unitId,
  });

  const unit = data?.unit;
  const displayName = unit ? `Unit ${unit.unitNumber}` : 'Unit Detail';
  const isOccupied = unit?.occupancies?.edges?.some((e: any) => e.node.isCurrent) ?? false;

  const currentOccupancy = useMemo(
    () => unit?.occupancies?.edges?.find((e: any) => e.node?.isCurrent)?.node,
    [unit?.occupancies?.edges],
  );
  const currentTenant = currentOccupancy?.tenant;
  const unitIdInt = useMemo(() => decodeRelayId(unit?.id ?? unitId), [unit?.id, unitId]);
  const occupancyIdInt = useMemo(() => decodeRelayId(currentOccupancy?.id), [currentOccupancy?.id]);
  const buildingIdInt = useMemo(() => decodeRelayId(unit?.building?.id), [unit?.building?.id]);

  const { data: unitChargesData, refetch: refetchUnitCharges } = useQuery(UNIT_CHARGES_HISTORY_QUERY, {
    variables: { unitId: unitIdInt, page: 1 },
    fetchPolicy: 'cache-and-network',
    skip: !unitIdInt,
  });

  const { data: tenantsDropdownData } = useQuery(TENANTS_DROPDOWN, {
    variables: { first: 80, search: '' },
    fetchPolicy: 'cache-and-network',
    skip: !unitId,
  });

  const { data: statementData } = useQuery(TENANT_STATEMENT_DATA_QUERY, {
    variables: { tenantId: currentTenant?.id, page: 1, pageSize: 20 },
    fetchPolicy: 'cache-and-network',
    skip: !currentTenant?.id,
  });

  const { data: vacationData, refetch: refetchVacation } = useQuery(TENANT_VACATION_NOTICES_QUERY, {
    variables: { tenantId: currentTenant?.id, limit: 20 },
    fetchPolicy: 'cache-and-network',
    skip: !currentTenant?.id,
  });

  const { data: paymentModesData } = useQuery(CONFIG_PAYMENT_MODES_QUERY, {
    fetchPolicy: 'cache-and-network',
    skip: !unitId,
  });

  const { data: manualReceiptsData, refetch: refetchManualReceipts } = useQuery(MANUAL_RECEIPTS_QUERY, {
    variables: {
      first: 20,
      unit: unit?.id,
      tenant: currentTenant?.id,
    },
    fetchPolicy: 'cache-and-network',
    skip: !unit?.id,
  });

  const { data: buildingExtraChargesData } = useQuery(BUILDING_EXTRA_CHARGES_DATA_QUERY, {
    variables: { buildingId: buildingIdInt, page: 1 },
    fetchPolicy: 'cache-and-network',
    skip: !buildingIdInt,
  });

  const { data: allocationBreakdownData, refetch: refetchAllocationBreakdown } = useQuery(
    PAYMENT_ALLOCATION_BREAKDOWN_QUERY,
    {
      variables: { unitId: unitId },
      fetchPolicy: 'cache-and-network',
      skip: !unitIdInt,
    },
  );

  const [previewAllocation, { data: previewAllocationData, loading: previewingAllocation }] = useLazyQuery(
    PREVIEW_PAYMENT_ALLOCATION_QUERY,
    { fetchPolicy: 'no-cache' },
  );

  const [deleteUnit, { loading: deleting }] = useMutation(DELETE_UNIT, {
    refetchQueries: [{ query: UNITS_QUERY }],
    onCompleted(d: any) {
      const r = d?.deleteUnit;
      if (r?.success) {
        onDeleted?.();
      } else {
        Alert.alert('Error', r?.message ?? 'Failed to delete unit.');
      }
    },
    onError(err: any) {
      Alert.alert('Error', err.message);
    },
  });

  const [copyUnit, { loading: copying }] = useMutation(COPY_UNIT_MUTATION, {
    onCompleted: (res: any) => {
      const r = res?.copyUnit;
      Alert.alert(r?.success ? 'Copied' : 'Failed', r?.message ?? 'Copy action completed.');
      if (r?.success) refetch();
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const [createOccupancy, { loading: assigning }] = useMutation(CREATE_OCCUPANCY_MUTATION, {
    onCompleted: (res: any) => {
      const r = res?.createOccupancy;
      Alert.alert(r?.success ? 'Assigned' : 'Failed', r?.message ?? 'Assign tenant action completed.');
      if (r?.success) refetch();
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const [processMoveOut, { loading: movingOut }] = useMutation(PROCESS_MOVE_OUT_MUTATION, {
    onCompleted: (res: any) => {
      const r = res?.processMoveOut;
      Alert.alert(r?.success ? 'Processed' : 'Failed', r?.message ?? 'Move-out action completed.');
      if (r?.success) refetch();
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const [createVacationNotice, { loading: creatingVacation }] = useMutation(CREATE_VACATION_NOTICE_MUTATION, {
    onCompleted: (res: any) => {
      const r = res?.createVacationNotice;
      Alert.alert(r?.success ? 'Created' : 'Failed', r?.message ?? 'Vacation notice action completed.');
      if (r?.success) refetchVacation();
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const [cancelVacationNotice, { loading: cancellingVacation }] = useMutation(CANCEL_VACATION_NOTICE_MUTATION, {
    onCompleted: (res: any) => {
      const r = res?.cancelVacationNotice;
      Alert.alert(r?.success ? 'Cancelled' : 'Failed', r?.message ?? 'Cancel vacation action completed.');
      if (r?.success) refetchVacation();
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const [createManualReceipt, { loading: creatingManualReceipt }] = useMutation(CREATE_MANUAL_RECEIPT, {
    onCompleted: (res: any) => {
      const r = res?.createManualReceipt;
      const receiptId = r?.manualReceipt?.id;
      if (!receiptId) {
        Alert.alert('Failed', r?.errors?.join('\n') || 'Manual receipt action completed.');
        return;
      }

      closeActionModal();
      router.push({
        pathname: '/(tabs)/payments/manual/[id]',
        params: {
          id: receiptId,
          returnType: 'unit',
          returnId: unit?.id,
        },
      } as any);
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const [validateManualReceipt, { loading: validatingReceipt }] = useMutation(VALIDATE_MANUAL_RECEIPT, {
    onCompleted: (res: any) => {
      const payload = res?.validateManualReceipt;
      if (payload?.paymentId && payload?.manualReceipt?.id) {
        setReceiptPaymentMap((prev) => ({
          ...prev,
          [payload.manualReceipt.id]: Number(payload.paymentId),
        }));
      }
      Alert.alert('Receipt', payload?.message ?? 'Receipt validated.');
      refetchManualReceipts();
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const [createManualReceiptPayment, { loading: creatingReceiptPayment }] = useMutation(CREATE_MANUAL_RECEIPT_PAYMENT, {
    onCompleted: (res: any) => {
      const payload = res?.createManualReceiptPayment;
      if (payload?.paymentId && payload?.manualReceipt?.id) {
        setReceiptPaymentMap((prev) => ({
          ...prev,
          [payload.manualReceipt.id]: Number(payload.paymentId),
        }));
      }
      Alert.alert('Receipt Payment', payload?.message ?? 'Payment transaction created.');
      refetchManualReceipts();
      refetchAllocationBreakdown();
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const [
    fetchPaymentReceiptPdf,
    { data: paymentReceiptPdfData, error: paymentReceiptPdfError, loading: loadingReceiptPdf },
  ] = useLazyQuery(PAYMENT_RECEIPT_PDF_QUERY, {
    fetchPolicy: 'no-cache',
  });

  useEffect(() => {
    const payload = paymentReceiptPdfData?.paymentReceiptPdf;
    if (!payload) return;
    if (!payload.success) {
      Alert.alert('Failed', payload.message ?? 'Unable to generate receipt PDF.');
      return;
    }
    Alert.alert('Receipt PDF Ready', payload.filename ?? 'Receipt generated successfully.');
  }, [paymentReceiptPdfData]);

  useEffect(() => {
    if (!paymentReceiptPdfError) return;
    Alert.alert('Error', paymentReceiptPdfError.message);
  }, [paymentReceiptPdfError]);

  const [postTenantExtraCharge, { loading: postingExtraCharge }] = useMutation(POST_TENANT_EXTRA_CHARGE_MUTATION, {
    onCompleted: (res: any) => {
      const r = res?.postTenantExtraCharge;
      Alert.alert(r?.success ? 'Posted' : 'Failed', r?.message ?? 'Extra charge action completed.');
      if (r?.success) {
        refetchUnitCharges();
        refetchAllocationBreakdown();
      }
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const [voidTenantCharge, { loading: voidingCharge }] = useMutation(VOID_TENANT_CHARGE_MUTATION, {
    onCompleted: (res: any) => {
      const r = res?.voidTenantCharge;
      Alert.alert(r?.success ? 'Voided' : 'Failed', r?.message ?? 'Void charge action completed.');
      refetchUnitCharges();
      refetchAllocationBreakdown();
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const [voidRentSchedule, { loading: voidingSchedule }] = useMutation(VOID_RENT_SCHEDULE_MUTATION, {
    onCompleted: (res: any) => {
      const r = res?.voidRentSchedule;
      Alert.alert(r?.success ? 'Voided' : 'Failed', r?.message ?? 'Void schedule action completed.');
      refetch();
      refetchUnitCharges();
      refetchAllocationBreakdown();
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  function confirmDelete() {
    Alert.alert('Delete Unit', `Delete Unit ${unit?.unitNumber}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteUnit({ variables: { id: unitId } }) },
    ]);
  }

  function handleEdit(targetId: string) {
    if (onEdit) {
      onEdit(targetId);
      return;
    }

    const routeId = Array.isArray(routeParams.id) ? routeParams.id[0] : routeParams.id;

    if (pathname.includes('/building/')) {
      router.push({
        pathname: '/(tabs)/units/add',
        params: {
          unitId: targetId,
          returnTo: 'building',
          returnBuildingId: routeId,
        },
      } as any);
      return;
    }

    if (pathname.includes('/units/')) {
      router.push({
        pathname: '/(tabs)/units/add',
        params: {
          unitId: targetId,
          returnTo: 'unit-detail',
        },
      } as any);
      return;
    }

    router.push({ pathname: '/(tabs)/units/add', params: { unitId: targetId } } as any);
  }

  function runCopyUnit() {
    const copyCount = Number(copyForm.copyCount);
    if (!Number.isInteger(copyCount) || copyCount <= 0) {
      Alert.alert('Invalid count', 'Copy count must be a positive whole number.');
      return;
    }
    if (!copyForm.startingUnitNumber.trim()) {
      Alert.alert('Missing unit number', 'Provide starting unit number.');
      return;
    }
    copyUnit({
      variables: {
        unitId,
        copyCount,
        startingUnitNumber: copyForm.startingUnitNumber.trim(),
        numberingPattern: copyForm.numberingPattern.trim() || undefined,
        incrementFloor: copyForm.incrementFloor,
      },
    });
  }

  function runAssignTenant() {
    if (!assignForm.tenantId || !assignForm.startDate) {
      Alert.alert('Missing fields', 'Select tenant and provide start date.');
      return;
    }
    if (!isValidDateInput(assignForm.startDate)) {
      Alert.alert('Invalid date', 'Start date must be in YYYY-MM-DD format.');
      return;
    }
    createOccupancy({
      variables: {
        tenantId: assignForm.tenantId,
        unitId,
        startDate: assignForm.startDate,
        paymentPeriod: assignForm.paymentPeriod,
        scheduleGenerationMode: assignForm.scheduleGenerationMode,
        skipDepositCharge: assignForm.skipDepositCharge,
      },
    });
  }

  function runMoveOut() {
    if (!occupancyIdInt) {
      Alert.alert('No occupancy', 'There is no current occupancy to move out.');
      return;
    }
    if (!moveOutForm.endDate || !isValidDateInput(moveOutForm.endDate)) {
      Alert.alert('Invalid date', 'End date must be in YYYY-MM-DD format.');
      return;
    }
    const damageAmount = moveOutForm.damageAmount ? Number(moveOutForm.damageAmount) : undefined;
    if (damageAmount != null && Number.isNaN(damageAmount)) {
      Alert.alert('Invalid amount', 'Damage amount must be a valid number.');
      return;
    }
    processMoveOut({
      variables: {
        occupancyId: occupancyIdInt,
        endDate: moveOutForm.endDate,
        moveOutReason: moveOutForm.moveOutReason.trim() || undefined,
        damageAmount,
        damageNotes: moveOutForm.damageNotes.trim() || undefined,
      },
    });
  }

  function runCreateVacationNotice() {
    if (!currentOccupancy?.id || !vacationForm.vacationDate) {
      Alert.alert('Missing fields', 'Current occupancy and vacation date are required.');
      return;
    }
    if (!isValidDateInput(vacationForm.vacationDate)) {
      Alert.alert('Invalid date', 'Vacation date must be in YYYY-MM-DD format.');
      return;
    }
    const balanceToPay = vacationForm.balanceToPay ? Number(vacationForm.balanceToPay) : undefined;
    if (balanceToPay != null && Number.isNaN(balanceToPay)) {
      Alert.alert('Invalid amount', 'Balance to pay must be a valid number.');
      return;
    }
    createVacationNotice({
      variables: {
        occupancyId: currentOccupancy.id,
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
    if (!currentTenant?.id || !unit?.id) {
      Alert.alert('Missing allocation', 'Current tenant and unit are required to create manual receipt from unit flow.');
      return;
    }

    const paymentMethodConfigId =
      manualReceiptForm.paymentMethodConfigId || paymentModes.find((mode: any) => mode?.isActive !== false)?.id || '';
    const selectedPaymentMode = paymentModes.find((mode: any) => mode.id === paymentMethodConfigId);
    const requiresReference = Boolean(selectedPaymentMode?.requiresReference);
    const amount = Number(manualReceiptForm.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid receipt amount greater than zero.');
      return;
    }
    if (!isValidDateInput(manualReceiptForm.paymentDate)) {
      Alert.alert('Invalid date', 'Payment date must use YYYY-MM-DD format.');
      return;
    }
    if (!paymentMethodConfigId) {
      Alert.alert('Missing payment mode', 'Select a payment mode before creating a receipt.');
      return;
    }
    if (requiresReference && !manualReceiptForm.referenceNumber.trim()) {
      Alert.alert('Missing reference', 'This payment mode requires a reference number.');
      return;
    }

    const fullNameParts = (currentTenant.fullName ?? '').trim().split(/\s+/).filter(Boolean);
    const firstName = (currentTenant.firstName ?? fullNameParts[0] ?? '').trim();
    const lastName = (currentTenant.lastName ?? fullNameParts.slice(1).join(' ') ?? '').trim();
    const middleName = (currentTenant.middleName ?? '').trim();
    const phoneNumber = (currentTenant.phone ?? '').trim();
    const email = (currentTenant.email ?? '').trim();

    if (!firstName || !lastName || !phoneNumber) {
      Alert.alert('Missing tenant profile details', 'Tenant first name, last name, and phone number are required.');
      return;
    }

    createManualReceipt({
      variables: {
        input: {
          tenantId: currentTenant.id,
          unitId: unit.id,
          paymentMethodConfigId,
          firstName,
          middleName: middleName || undefined,
          lastName,
          phoneNumber,
          email: email || undefined,
          amount,
          paymentDate: manualReceiptForm.paymentDate,
          referenceNumber: manualReceiptForm.referenceNumber.trim() || undefined,
          notes: manualReceiptForm.notes.trim() || undefined,
        },
      },
    });
  }

  function runValidateReceipt(receiptId: string) {
    validateManualReceipt({ variables: { receiptId } });
  }

  function runCreateReceiptPayment(receiptId: string) {
    createManualReceiptPayment({ variables: { receiptId } });
  }

  function runFetchReceiptPdf(receipt: any) {
    const mappedPaymentId = receiptPaymentMap[receipt.id];
    const paymentId = mappedPaymentId ?? decodeRelayId(receipt?.paymentTransaction?.id);
    if (!paymentId) {
      Alert.alert('Payment not available', 'Create payment for this receipt first before generating PDF.');
      return;
    }
    fetchPaymentReceiptPdf({ variables: { paymentId } });
  }

  function runPostExtraCharge() {
    if (!currentOccupancy?.id) {
      Alert.alert('No occupancy', 'Current occupancy is required to post tenant extra charge.');
      return;
    }
    if (!extraChargeForm.definitionId || !extraChargeForm.billingMonth || !extraChargeForm.chargeDate || !extraChargeForm.dueDate) {
      Alert.alert('Missing fields', 'Definition, billing month, charge date and due date are required.');
      return;
    }
    if (!isValidMonthInput(extraChargeForm.billingMonth)) {
      Alert.alert('Invalid month', 'Billing month must be in YYYY-MM format.');
      return;
    }
    if (!isValidDateInput(extraChargeForm.chargeDate) || !isValidDateInput(extraChargeForm.dueDate)) {
      Alert.alert('Invalid date', 'Charge date and due date must be in YYYY-MM-DD format.');
      return;
    }
    const amount = extraChargeForm.amount ? Number(extraChargeForm.amount) : undefined;
    const unitsUsed = extraChargeForm.unitsUsed ? Number(extraChargeForm.unitsUsed) : undefined;
    if (amount != null && Number.isNaN(amount)) {
      Alert.alert('Invalid amount', 'Amount must be a valid number.');
      return;
    }
    if (unitsUsed != null && Number.isNaN(unitsUsed)) {
      Alert.alert('Invalid units used', 'Units used must be a valid number.');
      return;
    }

    postTenantExtraCharge({
      variables: {
        occupancyId: currentOccupancy.id,
        definitionId: extraChargeForm.definitionId,
        billingMonth: extraChargeForm.billingMonth,
        chargeDate: extraChargeForm.chargeDate,
        dueDate: extraChargeForm.dueDate,
        amount,
        unitsUsed,
        notes: extraChargeForm.notes.trim() || undefined,
      },
    });
  }

  function runPreviewAllocation() {
    if (!unitIdInt) return;
    const amount = Number(allocationForm.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Preview amount must be a positive number.');
      return;
    }
    previewAllocation({ variables: { unitId: unitIdInt, amount } });
  }

  function runVoidCharge() {
    if (!allocationForm.chargeId) {
      Alert.alert('Missing charge id', 'Provide a charge id to void.');
      return;
    }
    voidTenantCharge({ variables: { chargeId: allocationForm.chargeId } });
  }

  function runVoidSchedule() {
    if (!allocationForm.scheduleId) {
      Alert.alert('Missing schedule id', 'Provide a schedule id to void.');
      return;
    }
    voidRentSchedule({ variables: { scheduleId: allocationForm.scheduleId } });
  }

  function confirmVoidRentSchedule(scheduleId: string, periodLabel: string) {
    if (!scheduleId) {
      Alert.alert('Missing schedule id', 'Rent schedule id is required to void this schedule.');
      return;
    }

    Alert.alert(
      'Void Rent Schedule',
      `Void rent schedule for ${periodLabel}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Void',
          style: 'destructive',
          onPress: () => voidRentSchedule({ variables: { scheduleId } }),
        },
      ],
    );
  }

  if (!unitId) return null;
  if (loading && !data) return <LoadingState />;
  if (error && !data) {
    return <ErrorState title="Failed to load unit" message={error.message} onRetry={() => refetch()} />;
  }

  if (!unit) return null;

  const hasCurrentOccupancy = Boolean(currentOccupancy);
  const shouldUseTabletGrid = !embedded && isTablet;
  const tenants = tenantsDropdownData?.tenants?.edges?.map((e: any) => e.node) ?? [];
  const unitCharges = unitChargesData?.unitChargesHistory;
  const vacationNotices = Array.isArray(vacationData?.tenantVacationNotices) ? vacationData.tenantVacationNotices : [];
  const statement = normalizeTenantStatement(statementData?.tenantStatementData);
  const manualReceipts = manualReceiptsData?.manualReceipts?.edges?.map((e: any) => e.node) ?? [];
  const paymentModes = paymentModesData?.configPaymentModes?.edges?.map((e: any) => e.node) ?? [];
  const defaultReceiptPaymentModeId =
    manualReceiptForm.paymentMethodConfigId || paymentModes.find((mode: any) => mode?.isActive !== false)?.id || '';
  const selectedReceiptPaymentMode = paymentModes.find((mode: any) => mode.id === defaultReceiptPaymentModeId);
  const paymentModeRequiresReference = Boolean(selectedReceiptPaymentMode?.requiresReference);
  const occupanciesEdges = Array.isArray(unit?.occupancies?.edges) ? unit.occupancies.edges : [];
  const rentScheduleEdges = Array.isArray(unit?.rentSchedules?.edges) ? unit.rentSchedules.edges : [];
  const extraChargeDefinitions =
    buildingExtraChargesData?.buildingExtraChargesData?.definitions ||
    buildingExtraChargesData?.buildingExtraChargesData?.chargeDefinitions ||
    [];

  type ActionItem = {
    key: ActionView;
    label: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    disabled?: boolean;
    visible?: boolean;
  };

  const actionItemsRaw: ActionItem[] = [
    { key: 'copy', label: 'Copy Unit', icon: 'copy-outline' },
    { key: 'assign', label: 'Assign Tenant', icon: 'person-add-outline', visible: !hasCurrentOccupancy },
    { key: 'moveOut', label: 'Move-Out', icon: 'exit-outline', visible: hasCurrentOccupancy },
    { key: 'vacation', label: 'Vacating Notice', icon: 'notifications-outline', visible: hasCurrentOccupancy },
    { key: 'charges', label: 'Charges', icon: 'receipt-outline', visible: hasCurrentOccupancy },
    { key: 'receipts', label: 'Receipts', icon: 'document-text-outline', visible: hasCurrentOccupancy },
    { key: 'extraCharge', label: 'Extra Charge', icon: 'add-circle-outline', visible: hasCurrentOccupancy },
    { key: 'allocation', label: 'Allocation', icon: 'git-compare-outline', visible: hasCurrentOccupancy },
    { key: 'danger', label: 'Danger Zone', icon: 'warning-outline', disabled: isOccupied },
  ];
  const actionItems = actionItemsRaw.filter((item) => item.visible !== false);

  function closeActionModal() {
    setActiveAction(null);
  }

  function renderActionContent() {
    switch (activeAction) {
      case 'copy':
        return (
          <>
            <Text style={styles.helperText}>Create multiple new units from this unit as a template.</Text>
            <View style={styles.inlineInputs}>
              <TextInput
                style={[styles.textInput, styles.inlineInput]}
                placeholder="Copy count"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                value={copyForm.copyCount}
                onChangeText={(v) => setCopyForm((s) => ({ ...s, copyCount: v }))}
              />
              <TextInput
                style={[styles.textInput, styles.inlineInput]}
                placeholder="Starting unit number"
                placeholderTextColor={colors.textMuted}
                value={copyForm.startingUnitNumber}
                onChangeText={(v) => setCopyForm((s) => ({ ...s, startingUnitNumber: v }))}
              />
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="Numbering pattern (optional)"
              placeholderTextColor={colors.textMuted}
              value={copyForm.numberingPattern}
              onChangeText={(v) => setCopyForm((s) => ({ ...s, numberingPattern: v }))}
            />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Increment floor while copying</Text>
              <Switch
                value={copyForm.incrementFloor}
                onValueChange={(v) => setCopyForm((s) => ({ ...s, incrementFloor: v }))}
                thumbColor="#ffffff"
                trackColor={{ true: colors.primary, false: colors.border }}
              />
            </View>
            <TouchableOpacity style={[styles.primaryBtn, copying && { opacity: 0.6 }]} onPress={runCopyUnit} disabled={copying}>
              <Text style={styles.primaryBtnText}>{copying ? 'Copying...' : 'Copy Unit'}</Text>
            </TouchableOpacity>
          </>
        );
      case 'assign':
        return (
          <>
            <Text style={styles.helperText}>Assign a tenant to this unit using occupancy creation.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {tenants.map((tenant: any) => {
                const active = assignForm.tenantId === tenant.id;
                return (
                  <TouchableOpacity
                    key={tenant.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setAssignForm((s) => ({ ...s, tenantId: tenant.id }))}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{tenant.fullName}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <DatePickerInput
              value={assignForm.startDate}
              onChange={(v) => setAssignForm((s) => ({ ...s, startDate: v }))}
              label="Occupancy start date"
              placeholder="Select start date"
            />
            <SearchableDropdown
              label="Payment period"
              value={assignForm.paymentPeriod}
              displayValue={ASSIGN_PAYMENT_PERIOD_OPTIONS.find((o) => o.id === assignForm.paymentPeriod)?.label}
              options={ASSIGN_PAYMENT_PERIOD_OPTIONS}
              onSelect={(opt) => setAssignForm((s) => ({ ...s, paymentPeriod: opt.id }))}
              searchable={false}
              clearable={false}
            />
            <SearchableDropdown
              label="Schedule generation mode"
              value={assignForm.scheduleGenerationMode}
              displayValue={SCHEDULE_GENERATION_MODE_OPTIONS.find((o) => o.id === assignForm.scheduleGenerationMode)?.label}
              options={SCHEDULE_GENERATION_MODE_OPTIONS}
              onSelect={(opt) => setAssignForm((s) => ({ ...s, scheduleGenerationMode: opt.id }))}
              searchable={false}
              clearable={false}
            />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Skip deposit charge</Text>
              <Switch
                value={assignForm.skipDepositCharge}
                onValueChange={(v) => setAssignForm((s) => ({ ...s, skipDepositCharge: v }))}
                thumbColor="#ffffff"
                trackColor={{ true: colors.primary, false: colors.border }}
              />
            </View>
            <TouchableOpacity style={[styles.primaryBtn, assigning && { opacity: 0.6 }]} onPress={runAssignTenant} disabled={assigning}>
              <Text style={styles.primaryBtnText}>{assigning ? 'Assigning...' : 'Assign Tenant'}</Text>
            </TouchableOpacity>
          </>
        );
      case 'moveOut':
        return currentOccupancy ? (
          <>
            <Text style={styles.helperText}>Current occupancy: {currentTenant?.fullName || '-'}.</Text>
            <DatePickerInput
              value={moveOutForm.endDate}
              onChange={(v) => setMoveOutForm((s) => ({ ...s, endDate: v }))}
              label="End date"
              placeholder="Select end date"
            />
            <TextInput
              style={styles.textInput}
              placeholder="Move-out reason (optional)"
              placeholderTextColor={colors.textMuted}
              value={moveOutForm.moveOutReason}
              onChangeText={(v) => setMoveOutForm((s) => ({ ...s, moveOutReason: v }))}
            />
            <TextInput
              style={styles.textInput}
              placeholder="Damage amount (optional)"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={moveOutForm.damageAmount}
              onChangeText={(v) => setMoveOutForm((s) => ({ ...s, damageAmount: v }))}
            />
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Damage notes (optional)"
              placeholderTextColor={colors.textMuted}
              value={moveOutForm.damageNotes}
              onChangeText={(v) => setMoveOutForm((s) => ({ ...s, damageNotes: v }))}
              multiline
            />
            <TouchableOpacity style={[styles.primaryBtn, movingOut && { opacity: 0.6 }]} onPress={runMoveOut} disabled={movingOut}>
              <Text style={styles.primaryBtnText}>{movingOut ? 'Processing...' : 'Process Move-Out'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.emptyText}>No active occupancy available for move-out.</Text>
        );
      case 'vacation':
        return (
          <>
            {vacationNotices.length === 0 ? (
              <Text style={styles.emptyText}>No vacation notices available for current tenant.</Text>
            ) : (
              vacationNotices.slice(0, 8).map((notice: any, index: number) => (
                <View key={`${notice.id ?? index}`} style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{notice.vacationDate || notice.vacationDateOut || 'Vacation date'}</Text>
                    <Text style={styles.rowSub}>{notice.message || notice.reason || 'Notice'}</Text>
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
            <Text style={styles.helperText}>Create vacation notice from current occupancy.</Text>
            <DatePickerInput
              value={vacationForm.vacationDate}
              onChange={(v) => setVacationForm((s) => ({ ...s, vacationDate: v }))}
              label="Vacation date"
              placeholder="Select vacation date"
            />
            <TextInput
              style={styles.textInput}
              placeholder="Balance to pay (optional)"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={vacationForm.balanceToPay}
              onChangeText={(v) => setVacationForm((s) => ({ ...s, balanceToPay: v }))}
            />
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
      case 'charges':
        return unitCharges ? (
          <>
            <StatRow
              stats={[
                { label: 'Total', value: `KES ${Number(unitCharges.totalAmount ?? 0).toLocaleString()}` },
                { label: 'Paid', value: `KES ${Number(unitCharges.totalPaid ?? 0).toLocaleString()}`, color: colors.success },
                { label: 'Outstanding', value: `KES ${Number(unitCharges.totalOutstanding ?? 0).toLocaleString()}`, color: colors.error },
              ]}
            />
            <Text style={styles.helperText}>Page {unitCharges.currentPage ?? 1} of {unitCharges.numPages ?? 1}</Text>
          </>
        ) : (
          <Text style={styles.emptyText}>No unit charges history available.</Text>
        );
      case 'receipts':
        return (
          <>
            <Text style={styles.helperText}>Tenant and unit are preselected from this view. Date defaults to today.</Text>
            <InfoRow icon="person-outline" label="Tenant" value={currentTenant?.fullName} />
            <InfoRow icon="home-outline" label="Unit" value={unit?.unitNumber ? `Unit ${unit.unitNumber}` : '-'} />

            <TextInput
              style={styles.textInput}
              placeholder="Amount"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={manualReceiptForm.amount}
              onChangeText={(v) => setManualReceiptForm((s) => ({ ...s, amount: v }))}
            />
            <DatePickerInput
              value={manualReceiptForm.paymentDate}
              onChange={(v) => setManualReceiptForm((s) => ({ ...s, paymentDate: v }))}
              label="Payment date"
              placeholder="Select payment date"
            />
            <SearchableDropdown
              label="Payment mode"
              value={defaultReceiptPaymentModeId}
              displayValue={paymentModes.find((mode: any) => mode.id === defaultReceiptPaymentModeId)?.name}
              options={paymentModes.map((mode: any) => ({
                id: mode.id,
                label: mode.name,
                sublabel: mode.isActive === false ? 'Inactive' : undefined,
              }))}
              onSelect={(opt) => setManualReceiptForm((s) => ({ ...s, paymentMethodConfigId: opt.id }))}
              searchable={false}
              clearable={false}
            />

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

            {manualReceipts.slice(0, 8).map((receipt: any) => (
              <View key={receipt.id} style={styles.receiptWrap}>
                <View style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{receipt.receiptNumber || receipt.id}</Text>
                    <Text style={styles.rowSub}>{receipt.paymentDate || '-'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.rowAmount}>KES {Number(receipt.amount ?? 0).toLocaleString()}</Text>
                    <StatusBadge label={receipt.stateLabel || receipt.state || '—'} color="warning" />
                  </View>
                </View>
                <View style={styles.actionChipsRow}>
                  <TouchableOpacity
                    style={[styles.ghostBtnSmall, validatingReceipt && { opacity: 0.6 }]}
                    onPress={() => runValidateReceipt(receipt.id)}
                    disabled={validatingReceipt || !receipt.canValidate}
                  >
                    <Text style={styles.ghostBtnSmallText}>Validate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.ghostBtnSmall, creatingReceiptPayment && { opacity: 0.6 }]}
                    onPress={() => runCreateReceiptPayment(receipt.id)}
                    disabled={creatingReceiptPayment || !receipt.canCreatePayment}
                  >
                    <Text style={styles.ghostBtnSmallText}>Create Payment</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.ghostBtnSmall, loadingReceiptPdf && { opacity: 0.6 }]}
                    onPress={() => runFetchReceiptPdf(receipt)}
                    disabled={loadingReceiptPdf}
                  >
                    <Text style={styles.ghostBtnSmallText}>Get PDF</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        );
      case 'extraCharge':
        return (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {extraChargeDefinitions.map((def: any) => {
                const active = extraChargeForm.definitionId === def.id;
                return (
                  <TouchableOpacity
                    key={def.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setExtraChargeForm((s) => ({ ...s, definitionId: def.id }))}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{def.name ?? 'Definition'}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.inlineInputs}>
              <DatePickerInput
                containerStyle={styles.inlineInput}
                value={extraChargeForm.billingMonth ? `${extraChargeForm.billingMonth}-01` : ''}
                onChange={(v) => setExtraChargeForm((s) => ({ ...s, billingMonth: v.slice(0, 7) }))}
                label="Billing month"
                placeholder="Select billing month"
              />
              <TextInput
                style={[styles.textInput, styles.inlineInput]}
                placeholder="Amount (optional)"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={extraChargeForm.amount}
                onChangeText={(v) => setExtraChargeForm((s) => ({ ...s, amount: v }))}
              />
            </View>
            <View style={styles.inlineInputs}>
              <DatePickerInput
                containerStyle={styles.inlineInput}
                value={extraChargeForm.chargeDate}
                onChange={(v) => setExtraChargeForm((s) => ({ ...s, chargeDate: v }))}
                label="Charge date"
                placeholder="Select charge date"
              />
              <DatePickerInput
                containerStyle={styles.inlineInput}
                value={extraChargeForm.dueDate}
                onChange={(v) => setExtraChargeForm((s) => ({ ...s, dueDate: v }))}
                label="Due date"
                placeholder="Select due date"
              />
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="Units used (optional)"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={extraChargeForm.unitsUsed}
              onChangeText={(v) => setExtraChargeForm((s) => ({ ...s, unitsUsed: v }))}
            />
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Notes (optional)"
              placeholderTextColor={colors.textMuted}
              value={extraChargeForm.notes}
              onChangeText={(v) => setExtraChargeForm((s) => ({ ...s, notes: v }))}
              multiline
            />
            <TouchableOpacity
              style={[styles.primaryBtn, postingExtraCharge && { opacity: 0.6 }]}
              onPress={runPostExtraCharge}
              disabled={postingExtraCharge}
            >
              <Text style={styles.primaryBtnText}>{postingExtraCharge ? 'Posting...' : 'Post Tenant Extra Charge'}</Text>
            </TouchableOpacity>
          </>
        );
      case 'allocation':
        return (
          <>
            <TextInput
              style={styles.textInput}
              placeholder="Preview amount"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={allocationForm.amount}
              onChangeText={(v) => setAllocationForm((s) => ({ ...s, amount: v }))}
            />
            <TouchableOpacity
              style={[styles.primaryBtn, previewingAllocation && { opacity: 0.6 }]}
              onPress={runPreviewAllocation}
              disabled={previewingAllocation}
            >
              <Text style={styles.primaryBtnText}>{previewingAllocation ? 'Previewing...' : 'Preview Allocation'}</Text>
            </TouchableOpacity>

            <Text style={styles.payloadText}>
              Breakdown: {allocationBreakdownData?.paymentAllocationBreakdown ? JSON.stringify(allocationBreakdownData.paymentAllocationBreakdown) : '-'}
            </Text>
            <Text style={styles.payloadText}>
              Preview: {previewAllocationData?.previewPaymentAllocation ? JSON.stringify(previewAllocationData.previewPaymentAllocation) : '-'}
            </Text>

            <View style={styles.inlineInputs}>
              <TextInput
                style={[styles.textInput, styles.inlineInput]}
                placeholder="Charge ID to void"
                placeholderTextColor={colors.textMuted}
                value={allocationForm.chargeId}
                onChangeText={(v) => setAllocationForm((s) => ({ ...s, chargeId: v }))}
              />
              <TextInput
                style={[styles.textInput, styles.inlineInput]}
                placeholder="Schedule ID to void"
                placeholderTextColor={colors.textMuted}
                value={allocationForm.scheduleId}
                onChangeText={(v) => setAllocationForm((s) => ({ ...s, scheduleId: v }))}
              />
            </View>

            <View style={styles.inlineInputs}>
              <TouchableOpacity
                style={[styles.ghostBtn, styles.inlineInput, voidingCharge && { opacity: 0.6 }]}
                onPress={runVoidCharge}
                disabled={voidingCharge}
              >
                <Text style={styles.ghostBtnText}>{voidingCharge ? 'Voiding...' : 'Void Tenant Charge'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ghostBtn, styles.inlineInput, voidingSchedule && { opacity: 0.6 }]}
                onPress={runVoidSchedule}
                disabled={voidingSchedule}
              >
                <Text style={styles.ghostBtnText}>{voidingSchedule ? 'Voiding...' : 'Void Rent Schedule'}</Text>
              </TouchableOpacity>
            </View>
          </>
        );
      case 'danger':
        return !isOccupied ? (
          <>
            <Text style={styles.helperText}>Delete this unit only when you are sure it is no longer needed.</Text>
            <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete} disabled={deleting} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text style={styles.deleteBtnText}>{deleting ? 'Deleting...' : 'Delete Unit'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.emptyText}>Move the tenant out before deleting this unit.</Text>
        );
      default:
        return null;
    }
  }

  const content = (
    <ScrollView
      style={!embedded ? styles.screenScroll : undefined}
      contentContainerStyle={[styles.scroll, !embedded && isTablet && styles.scrollTablet, embedded && styles.scrollEmbedded]}
      showsVerticalScrollIndicator={false}
    >
      {embedded ? (
        <View style={styles.embeddedHeader}>
          <TouchableOpacity onPress={onBack} style={styles.embeddedBackBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.embeddedTitle}>{displayName}</Text>
          <TouchableOpacity onPress={() => handleEdit(unit.id)} style={styles.embeddedBackBtn} hitSlop={8}>
            <Ionicons name="create-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.heroBadge}>
            <Ionicons name="home-outline" size={26} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroName}>{displayName}</Text>
            {unit.building?.name ? <Text style={styles.heroSub}>{unit.building.name}</Text> : null}
          </View>
          <StatusBadge label={unit.status || 'Occupied'} color={unit.isAvailableForRent ? 'success' : 'error'} />
        </View>
        {(unit.arrears ?? 0) > 0 && (
          <View style={styles.arrearsRow}>
            <Ionicons name="warning-outline" size={14} color={colors.error} />
            <Text style={styles.arrearsText}>Outstanding arrears: KES {Number(unit.arrears).toLocaleString()}</Text>
          </View>
        )}
      </View>

      <View style={[styles.cardsGrid, shouldUseTabletGrid && styles.cardsGridTablet]}>
      <SectionCard title="Tenant Snapshot" style={shouldUseTabletGrid ? styles.sectionCardTablet : undefined}>
        {currentTenant ? (
          <>
            <InfoRow icon="person-outline" label="Tenant" value={currentTenant.fullName} />
            <InfoRow icon="call-outline" label="Phone" value={currentTenant.phone} />
            <InfoRow icon="mail-outline" label="Email" value={currentTenant.email} />
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push({ pathname: '/(tabs)/tenants/[id]', params: { id: currentTenant.id } } as any)}
            >
              <Text style={styles.primaryBtnText}>Open Tenant Detail</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.emptyText}>No current tenant on this unit.</Text>
        )}
      </SectionCard>

      <SectionCard title="Unit info" style={shouldUseTabletGrid ? styles.sectionCardTablet : undefined}>
        <InfoRow icon="key-outline" label="Unit number" value={unit.unitNumber} />
        <InfoRow icon="document-text-outline" label="Account number" value={unit.accountNumber} />
        <InfoRow icon="barcode-outline" label="Unique account no." value={unit.uniqueAccountNumber} />
        <InfoRow icon="layers-outline" label="Floor" value={unit.floor} />
        <InfoRow icon="grid-outline" label="Unit type" value={unit.unitTypeLegacy} />
        <InfoRow icon="bed-outline" label="Bedrooms" value={unit.bedrooms != null ? String(unit.bedrooms) : null} />
        <InfoRow icon="water-outline" label="Bathrooms" value={unit.bathrooms != null ? String(unit.bathrooms) : null} />
        <InfoRow icon="resize-outline" label="Square feet" value={unit.squareFeet ? `${unit.squareFeet} sqft` : null} />
      </SectionCard>

      <SectionCard title="Financial" style={shouldUseTabletGrid ? styles.sectionCardTablet : undefined}>
        <StatRow
          stats={[
            { label: 'Monthly Rent', value: `KES ${Number(unit.monthlyRent ?? 0).toLocaleString()}` },
            { label: 'Deposit', value: `KES ${Number(unit.depositAmount ?? 0).toLocaleString()}` },
          ]}
        />
        {(unit.serviceCharge ?? 0) > 0 || unit.purchasePrice ? (
          <View style={{ marginTop: Spacing.sm }}>
            <StatRow
              stats={[
                ...(unit.serviceCharge > 0
                  ? [{ label: 'Service Charge', value: `KES ${Number(unit.serviceCharge).toLocaleString()}` }]
                  : []),
                ...(unit.purchasePrice
                  ? [{ label: 'Purchase Price', value: `KES ${Number(unit.purchasePrice).toLocaleString()}` }]
                  : []),
              ]}
            />
          </View>
        ) : null}
        {(unit.currentBalance ?? 0) !== 0 ? (
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Current balance</Text>
            <Text style={[styles.balanceValue, { color: (unit.currentBalance ?? 0) >= 0 ? colors.success : colors.error }]}>KES {Number(unit.currentBalance).toLocaleString()}</Text>
          </View>
        ) : null}
        <InfoRow icon="refresh-outline" label="Payment period" value={unit.paymentPeriod} />
      </SectionCard>

      <SectionCard title="Availability" style={shouldUseTabletGrid ? styles.sectionCardTablet : undefined}>
        <InfoRow icon="checkmark-circle-outline" label="Available for rent" value={unit.isAvailableForRent ? 'Yes' : 'No'} />
        <InfoRow icon="cart-outline" label="Available for purchase" value={unit.isAvailableForPurchase ? 'Yes' : 'No'} />
      </SectionCard>

      <SectionCard title="Action Shortcuts" style={shouldUseTabletGrid ? styles.sectionCardTablet : undefined}>
        <Text style={styles.helperText}>Open a focused workflow only when you need it. The default view stays detail-first.</Text>
        <View style={styles.shortcutsGrid}>
          {actionItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.shortcutChip, item.disabled && styles.shortcutChipDisabled]}
              activeOpacity={0.8}
              disabled={item.disabled}
              onPress={() => setActiveAction(item.key)}
            >
              <Ionicons name={item.icon} size={16} color={item.disabled ? colors.textMuted : colors.primary} />
              <Text style={[styles.shortcutChipText, item.disabled && styles.shortcutChipTextDisabled]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Tenant Statement Snapshot" style={shouldUseTabletGrid ? styles.sectionCardTablet : undefined}>
        {!statement ? (
          <Text style={styles.emptyText}>No statement data available.</Text>
        ) : (
          <>
          <InfoRow label="Opening Balance" icon="wallet-outline" value={statement.openingBalance != null ? `KES ${Number(statement.openingBalance).toLocaleString()}` : '-'} />
          <InfoRow label="Closing Balance" icon="wallet-outline" value={statement.closingBalance != null ? `KES ${Number(statement.closingBalance).toLocaleString()}` : '-'} />
          <InfoRow label="Total Debits" icon="trending-up-outline" value={statement.totalDebits != null ? `KES ${Number(statement.totalDebits).toLocaleString()}` : '-'} />
          <InfoRow label="Total Credits" icon="trending-down-outline" value={statement.totalCredits != null ? `KES ${Number(statement.totalCredits).toLocaleString()}` : '-'} />
          </>
        )}
      </SectionCard>

      {occupanciesEdges.length > 0 && (
        <SectionCard title="Occupancies" style={shouldUseTabletGrid ? styles.sectionCardTablet : undefined}>
          {occupanciesEdges.slice(0, 5).map((edge: any, i: number) => {
            const occ = edge?.node;
            if (!occ) return null;
            return (
            <View key={i} style={styles.occupancyItem}>
              <View style={styles.occupancyRow}>
                <Text style={styles.tenantName}>{occ.tenant?.fullName ?? '-'}</Text>
                {occ.isCurrent ? <StatusBadge label="Current" color="success" /> : null}
              </View>
              {occ.tenant?.phone ? <Text style={styles.subText}>{occ.tenant.phone}</Text> : null}
              <StatRow
                stats={[
                  { label: 'Deposit Paid', value: `KES ${Number(occ.depositPaid ?? 0).toLocaleString()}` },
                  { label: 'Duration', value: occ.durationMonths != null ? `${Math.round(Number(occ.durationMonths))}mo` : '-' },
                ]}
              />
              <Text style={styles.dateRange}>{occ.startDate ?? '-'} {'->'} {occ.endDate ?? 'Present'}</Text>
            </View>
            );
          })}
        </SectionCard>
      )}

      {rentScheduleEdges.length > 0 && (
        <SectionCard title="Rent Schedules" style={shouldUseTabletGrid ? styles.sectionCardTablet : undefined}>
          {rentScheduleEdges.slice(0, 6).map((edge: any, i: number) => {
            const rs = edge?.node;
            if (!rs) return null;
            const statusUpper = String(rs.status ?? '').toUpperCase();
            const scheduleId = String(rs.id ?? '');
            const canVoid = Boolean(scheduleId) && statusUpper !== 'PAID' && statusUpper !== 'VOID' && statusUpper !== 'VOIDED';
            const periodLabel = `${rs.periodStart ?? '-'} - ${rs.periodEnd ?? '-'}`;
            return (
            <View key={i} style={styles.scheduleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.scheduleDate}>{periodLabel}</Text>
                <Text style={styles.subText}>Due: {rs.dueDate}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={[styles.scheduleAmount, rs.isOverdue && { color: colors.error }]}>KES {Number(rs.rentAmount ?? 0).toLocaleString()}</Text>
                <View style={styles.scheduleStatusActions}>
                  <StatusBadge label={rs.status ?? 'PENDING'} color={rs.status === 'PAID' ? 'success' : rs.isOverdue ? 'error' : 'warning'} />
                  <TouchableOpacity
                    style={[styles.ghostBtnSmall, (!canVoid || voidingSchedule) && { opacity: 0.5 }]}
                    onPress={() => confirmVoidRentSchedule(scheduleId, periodLabel)}
                    disabled={!canVoid || voidingSchedule}
                  >
                    <Text style={styles.ghostBtnSmallText}>{voidingSchedule ? 'Voiding...' : 'Void'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            );
          })}
        </SectionCard>
      )}
      </View>

      {activeAction ? (
        <Modal visible transparent animationType="slide" onRequestClose={closeActionModal}>
          <Pressable style={styles.backdrop} onPress={closeActionModal} />
          <View style={[styles.sheet, styles.actionSheet, { backgroundColor: colors.surface }]}> 
            <View style={[styles.sheetHeader, { borderBottomColor: colors.borderLight }]}>
              <TouchableOpacity onPress={closeActionModal}>
                <Text style={[styles.sheetBtn, { color: colors.textMuted }]}>Close</Text>
              </TouchableOpacity>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                {actionItems.find((item) => item.key === activeAction)?.label ?? 'Action'}
              </Text>
              <View style={styles.sheetSpacer} />
            </View>
            <ScrollView contentContainerStyle={styles.actionSheetContent} showsVerticalScrollIndicator={false}>
              {renderActionContent()}
            </ScrollView>
          </View>
        </Modal>
      ) : null}

      <View style={{ height: Spacing.xl }} />
    </ScrollView>
  );

  if (embedded) {
    return content;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title={displayName}
        showBack
        rightElement={
          <TouchableOpacity onPress={() => handleEdit(unit.id)} style={styles.embeddedBackBtn} hitSlop={8}>
            <Ionicons name="create-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        }
      />
      <View style={styles.screenContent}>{content}</View>
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    screenContent: { flex: 1, backgroundColor: c.background },
    screenScroll: { flex: 1, backgroundColor: c.background },
    scroll: { padding: Spacing.md, paddingBottom: 80 },
    scrollTablet: { width: '100%', maxWidth: 860, alignSelf: 'center' },
    cardsGrid: { width: '100%' },
    cardsGridTablet: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      alignItems: 'flex-start',
    },
    sectionCardTablet: {
      width: '48.5%',
      marginBottom: 0,
    },
    scrollEmbedded: { paddingHorizontal: Spacing.xs, paddingTop: 0, paddingBottom: Spacing.lg },
    embeddedHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.sm,
      paddingHorizontal: Spacing.xs,
    },
    embeddedBackBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    embeddedTitle: {
      flex: 1,
      fontSize: Typography.fontSizeMd,
      fontWeight: Typography.fontWeightSemibold,
      color: c.text,
      textAlign: 'center',
    },
    heroCard: {
      backgroundColor: c.surface,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.md,
      ...Shadow.sm,
    },
    heroRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    heroBadge: {
      width: 52,
      height: 52,
      borderRadius: Radius.md,
      backgroundColor: c.overlay,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroName: { fontSize: Typography.fontSizeLg, fontWeight: Typography.fontWeightBold, color: c.text },
    heroSub: { fontSize: Typography.fontSizeSm, color: c.textMuted, marginTop: 2 },
    arrearsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(239,68,68,0.08)',
      padding: Spacing.sm,
      borderRadius: Radius.sm,
      marginTop: Spacing.sm,
    },
    arrearsText: {
      fontSize: Typography.fontSizeSm,
      color: c.error,
      fontWeight: Typography.fontWeightMedium,
      flex: 1,
    },
    balanceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: Spacing.xs,
      marginTop: Spacing.sm,
    },
    balanceLabel: { fontSize: Typography.fontSizeSm, color: c.textMuted },
    balanceValue: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightBold },
    occupancyItem: {
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
      marginBottom: Spacing.xs,
    },
    occupancyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.xs,
    },
    tenantName: {
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
      color: c.text,
      flex: 1,
    },
    subText: { fontSize: Typography.fontSizeXs, color: c.textMuted, marginBottom: Spacing.xs },
    dateRange: { fontSize: Typography.fontSizeXs, color: c.textMuted, marginTop: Spacing.xs },
    scheduleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
      gap: Spacing.sm,
    },
    scheduleDate: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium, color: c.text },
    scheduleAmount: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightBold, color: c.text },
    helperText: {
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
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
      paddingHorizontal: Spacing.sm + 2,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.inputBackground,
    },
    shortcutChipDisabled: {
      opacity: 0.55,
      backgroundColor: c.surfaceAlt,
    },
    shortcutChipText: {
      fontSize: Typography.fontSizeXs,
      color: c.text,
      fontWeight: Typography.fontWeightSemibold,
    },
    shortcutChipTextDisabled: {
      color: c.textMuted,
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
      minHeight: 82,
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
      marginTop: Spacing.xs,
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
      marginTop: Spacing.xs,
    },
    ghostBtnText: {
      fontSize: Typography.fontSizeSm,
      color: c.textSecondary,
      fontWeight: Typography.fontWeightSemibold,
    },
    payloadText: {
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
      marginTop: Spacing.xs,
      lineHeight: 18,
    },
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
      paddingVertical: Spacing.sm,
    },
    rowTitle: {
      fontSize: Typography.fontSizeSm,
      color: c.text,
      fontWeight: Typography.fontWeightSemibold,
    },
    rowSub: {
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
      marginTop: 2,
    },
    rowAmount: {
      fontSize: Typography.fontSizeSm,
      color: c.text,
      fontWeight: Typography.fontWeightSemibold,
    },
    receiptWrap: { marginTop: Spacing.sm },
    actionChipsRow: {
      flexDirection: 'row',
      gap: Spacing.xs,
      marginTop: Spacing.xs,
    },
    scheduleStatusActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
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
    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      height: 48,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: c.error + '44',
      backgroundColor: c.error + '0A',
    },
    deleteBtnText: {
      fontSize: Typography.fontSizeMd,
      fontWeight: Typography.fontWeightSemibold,
      color: c.error,
    },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
    sheet: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: Spacing.xl,
    },
    actionSheet: {
      maxHeight: '82%',
    },
    actionSheetContent: {
      padding: Spacing.md,
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
    sheetSpacer: {
      width: 44,
    },
    sheetTitle: { fontSize: Typography.fontSizeMd, fontWeight: '600' },
    sheetBtn: { fontSize: Typography.fontSizeMd, paddingVertical: 4 },
  });
}
