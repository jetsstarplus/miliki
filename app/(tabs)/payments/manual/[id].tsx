import { ErrorState } from '@/components/ui/ErrorState';
import { InfoRow } from '@/components/ui/InfoRow';
import { LoadingState } from '@/components/ui/LoadingState';
import { SectionCard } from '@/components/ui/SectionCard';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import {
  CREATE_MANUAL_RECEIPT_PAYMENT,
  DELETE_MANUAL_RECEIPT,
  REJECT_MANUAL_RECEIPT,
  VALIDATE_MANUAL_RECEIPT,
} from '@/graphql/properties/mutations/payments';
import {
  MANUAL_RECEIPT_DETAIL,
  MANUAL_RECEIPTS_QUERY,
} from '@/graphql/properties/queries/payments';
import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const STATE_COLORS: Record<string, string> = {
  PENDING: Colors.warning,
  VALIDATED: '#3B82F6',
  PAID: Colors.success,
  REJECTED: Colors.error,
};

function formatDate(d: string | null | undefined) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

function formatAmount(v: number | null | undefined) {
  if (v == null) return null;
  return `KES ${Number(v).toLocaleString()}`;
}

export default function ManualReceiptDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const { data, loading, error, refetch } = useQuery(MANUAL_RECEIPT_DETAIL, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
    skip: !id,
  });

  const receipt = data?.manualReceipt;

  const refetchQueries = [
    { query: MANUAL_RECEIPT_DETAIL, variables: { id } },
    { query: MANUAL_RECEIPTS_QUERY, variables: { first: 20 } },
  ];

  const [validateReceipt, { loading: validating }] = useMutation(VALIDATE_MANUAL_RECEIPT, {
    refetchQueries,
    onCompleted(d: any) {
      const r = d?.validateManualReceipt;
      const msg = r?.message ?? 'Receipt validated and payment created.';
      Alert.alert('Validated', msg);
    },
    onError(err: any) {
      Alert.alert('Error', err.message);
    },
  });

  const [rejectReceiptMutation, { loading: rejecting }] = useMutation(REJECT_MANUAL_RECEIPT, {
    refetchQueries,
    onCompleted(d: any) {
      const r = d?.rejectManualReceipt;
      setShowRejectInput(false);
      setRejectReason('');
      Alert.alert('Rejected', r?.message ?? 'Receipt rejected.');
    },
    onError(err: any) {
      Alert.alert('Error', err.message);
    },
  });

  const [deleteReceipt, { loading: deleting }] = useMutation(DELETE_MANUAL_RECEIPT, {
    refetchQueries: [{ query: MANUAL_RECEIPTS_QUERY, variables: { first: 20 } }],
    onCompleted(d: any) {
      const r = d?.deleteManualReceipt;
      if (r?.success) {
        router.back();
      } else {
        Alert.alert('Error', r?.message ?? 'Delete failed.');
      }
    },
    onError(err: any) {
      Alert.alert('Error', err.message);
    },
  });

  const [createPayment, { loading: creatingPayment }] = useMutation(CREATE_MANUAL_RECEIPT_PAYMENT, {
    refetchQueries,
    onCompleted(d: any) {
      const r = d?.createManualReceiptPayment;
      Alert.alert('Payment Created', r?.message ?? 'Payment transaction created.');
    },
    onError(err: any) {
      Alert.alert('Error', err.message);
    },
  });

  function confirmValidate() {
    Alert.alert(
      'Validate Receipt',
      `Validate receipt ${receipt?.receiptNumber}? This will create a payment transaction.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Validate',
          onPress: () => validateReceipt({ variables: { receiptId: id } }),
        },
      ]
    );
  }

  function submitReject() {
    const reason = rejectReason.trim();
    if (!reason) {
      Alert.alert('Required', 'Please enter a rejection reason.');
      return;
    }
    rejectReceiptMutation({ variables: { receiptId: id, reason } });
  }

  function confirmDelete() {
    Alert.alert(
      'Delete Receipt',
      'Delete this receipt? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteReceipt({ variables: { receiptId: id } }),
        },
      ]
    );
  }

  function confirmRecoverPayment() {
    Alert.alert(
      'Recover Payment',
      'Create a payment transaction for this validated receipt?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: () => createPayment({ variables: { receiptId: id } }),
        },
      ]
    );
  }

  if (loading && !data) return <LoadingState />;
  if (error && !data)
    return <ErrorState title="Failed to load receipt" message={error.message} onRetry={refetch} />;

  const stateColor = STATE_COLORS[receipt?.state] ?? colors.textMuted;
  const unit = receipt?.unit;
  const tenant = receipt?.tenant;
  const lines = receipt?.paymentTransactionLines ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {receipt?.receiptNumber ?? 'Receipt Detail'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {receipt ? (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={styles.heroCard}>
            <View style={styles.heroRow}>
              <View style={styles.heroIconWrap}>
                <Ionicons name="receipt" size={26} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <Text style={styles.heroNumber}>{receipt.receiptNumber ?? `Receipt #${id}`}</Text>
                <Text style={styles.heroSub}>{receipt.payerName ?? '—'}</Text>
              </View>
              <View style={[styles.stateBadge, { backgroundColor: stateColor + '22' }]}>
                <Text style={[styles.stateText, { color: stateColor }]}>
                  {receipt.stateLabel ?? receipt.state}
                </Text>
              </View>
            </View>
            <Text style={styles.heroAmount}>{formatAmount(receipt.amount)}</Text>
          </View>

          {/* Payer Info */}
          <SectionCard title="Payer Info">
            <InfoRow icon="person-outline" label="First Name" value={receipt.firstName} />
            {receipt.middleName ? (
              <InfoRow icon="person-outline" label="Middle Name" value={receipt.middleName} />
            ) : null}
            <InfoRow icon="person-outline" label="Last Name" value={receipt.lastName} />
            <InfoRow icon="call-outline" label="Phone" value={receipt.phoneNumber} />
            {receipt.email ? (
              <InfoRow icon="mail-outline" label="Email" value={receipt.email} />
            ) : null}
          </SectionCard>

          {/* Payment Details */}
          <SectionCard title="Payment Details">
            <InfoRow icon="calendar-outline" label="Payment Date" value={formatDate(receipt.paymentDate)} />
            <InfoRow icon="card-outline" label="Payment Method" value={receipt.paymentMethodConfig?.name ?? receipt.paymentMethod} />
            {receipt.referenceNumber ? (
              <InfoRow icon="barcode-outline" label="Reference No." value={receipt.referenceNumber} />
            ) : null}
            {receipt.notes ? (
              <InfoRow icon="document-outline" label="Notes" value={receipt.notes} />
            ) : null}
          </SectionCard>

          {/* Allocation */}
          {(tenant || unit) && (
            <SectionCard title="Allocation">
              {tenant ? (
                <InfoRow icon="people-outline" label="Tenant" value={tenant.fullName} />
              ) : null}
              {unit ? (
                <InfoRow
                  icon="home-outline"
                  label="Unit"
                  value={`Unit ${unit.unitNumber}${unit.building?.name ? ` · ${unit.building.name}` : ''}`}
                />
              ) : null}
            </SectionCard>
          )}

          {/* Linked Payment Transaction */}
          {receipt.paymentTransaction ? (
            <SectionCard title="Payment Transaction">
              <InfoRow icon="receipt-outline" label="Transaction No." value={receipt.paymentTransaction.no} />
              <InfoRow icon="cash-outline" label="Amount" value={formatAmount(receipt.paymentTransaction.amount)} />
              <InfoRow icon="flag-outline" label="Status" value={receipt.paymentTransaction.status} />
              <InfoRow icon="calendar-outline" label="Date" value={formatDate(receipt.paymentTransaction.transactionDate)} />
              {lines.length > 0 ? (
                <View style={styles.linesSection}>
                  <Text style={styles.linesTitle}>Allocation Lines</Text>
                  {lines.map((line: { description: string; amount: number }, idx: number) => (
                    <View key={idx} style={styles.lineRow}>
                      <Text style={styles.lineDesc} numberOfLines={2}>{line.description ?? '—'}</Text>
                      <Text style={styles.lineAmount}>{formatAmount(line.amount)}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </SectionCard>
          ) : null}

          {/* Workflow */}
          {(receipt.validatedBy || receipt.validatedAt || receipt.rejectionReason) ? (
            <SectionCard title="Workflow">
              {receipt.validatedAt ? (
                <InfoRow
                  icon="checkmark-circle-outline"
                  label="Validated At"
                  value={formatDate(receipt.validatedAt)}
                />
              ) : null}
              {receipt.validatedBy ? (
                <InfoRow
                  icon="person-circle-outline"
                  label="Validated By"
                  value={`${receipt.validatedBy.firstName ?? ''} ${receipt.validatedBy.lastName ?? ''}`.trim()}
                />
              ) : null}
              {receipt.rejectionReason ? (
                <InfoRow icon="close-circle-outline" label="Rejection Reason" value={receipt.rejectionReason} />
              ) : null}
            </SectionCard>
          ) : null}

          {/* Actions */}
          {(receipt.canValidate || receipt.canReject || receipt.canDelete || receipt.canCreatePayment) && (
            <SectionCard title="Actions">
              {receipt.canValidate && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.validateBtn]}
                  onPress={confirmValidate}
                  disabled={validating}
                  activeOpacity={0.75}
                >
                  {validating
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />}
                  <Text style={styles.actionBtnText}>
                    {validating ? 'Validating…' : 'Validate Receipt'}
                  </Text>
                </TouchableOpacity>
              )}

              {receipt.canCreatePayment && !receipt.paymentTransaction && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.recoverBtn]}
                  onPress={confirmRecoverPayment}
                  disabled={creatingPayment}
                  activeOpacity={0.75}
                >
                  {creatingPayment
                    ? <ActivityIndicator size="small" color={colors.primary} />
                    : <Ionicons name="refresh-circle-outline" size={18} color={colors.primary} />}
                  <Text style={[styles.actionBtnText, { color: colors.primary }]}>
                    {creatingPayment ? 'Creating…' : 'Recover Payment'}
                  </Text>
                </TouchableOpacity>
              )}

              {receipt.canReject && (
                showRejectInput ? (
                  <View style={styles.rejectInputWrap}>
                    <TextInput
                      style={styles.rejectInput}
                      value={rejectReason}
                      onChangeText={setRejectReason}
                      placeholder="Enter rejection reason…"
                      placeholderTextColor={colors.textMuted}
                      multiline
                      numberOfLines={3}
                      autoFocus
                    />
                    <View style={styles.rejectBtnRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { flex: 1, marginRight: Spacing.xs }]}
                        onPress={() => { setShowRejectInput(false); setRejectReason(''); }}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.actionBtnText, { color: colors.textMuted }]}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.rejectBtn, { flex: 1 }]}
                        onPress={submitReject}
                        disabled={rejecting}
                        activeOpacity={0.75}
                      >
                        {rejecting && <ActivityIndicator size="small" color={Colors.error} />}
                        <Text style={styles.actionBtnText}>
                          {rejecting ? 'Rejecting…' : 'Confirm Reject'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => setShowRejectInput(true)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="close-circle-outline" size={18} color={Colors.error} />
                    <Text style={[styles.actionBtnText, { color: Colors.error }]}>Reject Receipt</Text>
                  </TouchableOpacity>
                )
              )}

              {receipt.canDelete && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteBtn]}
                  onPress={confirmDelete}
                  disabled={deleting}
                  activeOpacity={0.75}
                >
                  {deleting
                    ? <ActivityIndicator size="small" color={Colors.error} />
                    : <Ionicons name="trash-outline" size={18} color={Colors.error} />}
                  <Text style={[styles.actionBtnText, { color: Colors.error }]}>
                    {deleting ? 'Deleting…' : 'Delete Receipt'}
                  </Text>
                </TouchableOpacity>
              )}
            </SectionCard>
          )}

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      ) : null}
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
    scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl },
    heroCard: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      ...Shadow.sm,
    },
    heroRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    heroIconWrap: {
      width: 44,
      height: 44,
      borderRadius: Radius.md,
      backgroundColor: c.overlay,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroNumber: {
      fontSize: Typography.fontSizeMd,
      fontWeight: Typography.fontWeightSemibold,
      color: c.text,
    },
    heroSub: { fontSize: Typography.fontSizeXs, color: c.textMuted, marginTop: 1 },
    heroAmount: {
      fontSize: Typography.fontSize2xl,
      fontWeight: Typography.fontWeightBold,
      color: c.text,
      marginTop: Spacing.sm,
    },
    stateBadge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderRadius: Radius.sm,
    },
    stateText: { fontSize: Typography.fontSizeXs, fontWeight: Typography.fontWeightBold },
    linesSection: { marginTop: Spacing.sm, borderTopWidth: 1, borderTopColor: c.borderLight, paddingTop: Spacing.sm },
    linesTitle: {
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightMedium,
      color: c.textMuted,
      marginBottom: Spacing.xs,
    },
    lineRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingVertical: 3,
    },
    lineDesc: {
      flex: 1,
      fontSize: Typography.fontSizeXs,
      color: c.text,
      marginRight: Spacing.sm,
    },
    lineAmount: {
      fontSize: Typography.fontSizeXs,
      color: c.text,
      fontWeight: Typography.fontWeightSemibold,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.md,
      marginBottom: Spacing.sm,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.inputBackground,
    },
    actionBtnText: {
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
      color: c.text,
    },
    validateBtn: { backgroundColor: c.primary, borderColor: c.primary },
    recoverBtn: { borderColor: c.primary, backgroundColor: c.overlay },
    rejectBtn: { borderColor: Colors.error + '60', backgroundColor: Colors.error + '08' },
    deleteBtn: { borderColor: Colors.error + '60', backgroundColor: Colors.error + '08' },
    rejectInputWrap: {
      borderWidth: 1,
      borderColor: c.borderLight,
      borderRadius: Radius.md,
      padding: Spacing.sm,
      backgroundColor: c.inputBackground,
      marginBottom: Spacing.sm,
    },
    rejectInput: {
      fontSize: Typography.fontSizeSm,
      color: c.text,
      minHeight: 72,
      textAlignVertical: 'top',
    },
    rejectBtnRow: { flexDirection: 'row', marginTop: Spacing.sm },
  });
}
