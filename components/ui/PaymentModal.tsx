import { AppColors, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useMessaging } from '@/context/messaging';
import { useTheme } from '@/context/theme';
import {
  INITIATE_CARD_PAYMENT,
  INITIATE_MPESA_TOPUP,
} from '@/graphql/properties/mutations/subscription';
import {
  PAYMENT_STATUS,
  SUBSCRIPTION_PAYMENT_CONTEXT,
} from '@/graphql/properties/queries/subscription';
import { SUBSCRIPTION_PAYMENT_UPDATES } from '@/graphql/properties/subscriptions/subscription';
import { useLazyQuery, useMutation, useSubscription } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ── Brand colours ────────────────────────────────────────────────────────────
const MPESA_COLOR = '#00A651';
const PAYSTACK_COLOR = '#00C3F7';

type PaymentGateway = 'mpesa' | 'paystack';
type TopupChannel = 'SMS_TOPUP' | 'WHATSAPP_TOPUP';

export interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  /** topup = SMS/WhatsApp credit top-up; subscription = fixed subscription bill */
  mode: 'topup' | 'subscription';
  companyId: string;
  /** Pass balances from the campaign-list query (topup mode) */
  balances?: {
    sms: string | number;
    whatsapp: string | number;
    sms_topup_rate: string | number;
    whatsapp_topup_rate: string | number;
  };
  /** Fixed amount shown in subscription mode (read-only) */
  subscriptionAmount?: string | number;
  subscriptionLabel?: string;
  onSuccess?: () => void;
}

// ── Gateway detection from context ──────────────────────────────────────────
function detectGateways(ctx: any): PaymentGateway[] {
  if (!ctx) return ['mpesa', 'paystack']; // optimistic default while loading

  // Array form: { available_gateways: ['mpesa', 'paystack'] }
  if (Array.isArray(ctx.available_gateways)) {
    const filtered = ctx.available_gateways
      .map((g: string) => String(g).toLowerCase())
      .filter((g: string) => g === 'mpesa' || g === 'paystack') as PaymentGateway[];
    if (filtered.length > 0) return filtered;
  }

  // Boolean-flag form: { mpesa_enabled: true, paystack_enabled: false }
  const gateways: PaymentGateway[] = [];
  if (ctx.mpesa_enabled !== false) gateways.push('mpesa');
  if (ctx.card_enabled === true) gateways.push('paystack');
  return gateways.length > 0 ? gateways : ['mpesa'];
}

// ── Component ────────────────────────────────────────────────────────────────
export function PaymentModal({
  visible,
  onClose,
  mode,
  companyId,
  balances,
  subscriptionAmount,
  subscriptionLabel = 'Subscription Payment',
  onSuccess,
}: PaymentModalProps) {
  const { colors } = useTheme();
  const { user, activeCompany } = useAuth();
  const { refetchBalances, refetchSubscription } = useMessaging();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Form state
  const [channel, setChannel] = useState<TopupChannel>('SMS_TOPUP');
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway>('mpesa');
  const [phone, setPhone] = useState(user?.phoneNumber ?? '');
  const [email, setEmail] = useState(activeCompany?.email ?? user?.email ?? '');
  const [amount, setAmount] = useState('');
  const [standingOrder, setStandingOrder] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  let rawCompanyId = ''

  // Validation errors
  const [errors, setErrors] = useState<{ phone?: string; email?: string; amount?: string }>({});

  function validateFields(): boolean {
    const next: typeof errors = {};
    if (selectedGateway === 'mpesa') {
      const digits = phone.replace(/\D/g, '');
      if (!digits) {
        next.phone = 'Phone number is required.';
      } else if (digits.length < 9 || digits.length > 12) {
        next.phone = 'Enter a valid Kenyan number (e.g. 0712 345 678).';
      }
    }
    if (selectedGateway === 'paystack') {
      if (!email.trim()) {
        next.email = 'Email address is required.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        next.email = 'Enter a valid email address.';
      }
    }
    if (mode === 'topup') {
      if (!amount.trim()) {
        next.amount = 'Amount is required.';
      } else {
        const parsed = parseFloat(amount);
        if (isNaN(parsed) || parsed <= 0) {
          next.amount = 'Enter a valid amount greater than 0.';
        } else if (parsed < 10) {
          next.amount = 'Minimum top-up amount is KSh 10.';
        }
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // Payment tracking state
  const [awaitingPayment, setAwaitingPayment] = useState(false);
  const [trackingPaymentId, setTrackingPaymentId] = useState<number | null>(null);
  const [wsError, setWsError] = useState(false);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollDelayRef = useRef<number>(3000);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // GraphQL
  const [fetchContext, { data: ctxData, loading: ctxLoading }] =
    useLazyQuery(SUBSCRIPTION_PAYMENT_CONTEXT);
  const [initiateMpesa, { loading: mpesaLoading }] = useMutation(INITIATE_MPESA_TOPUP);
  const [initiateCard, { loading: cardLoading }] = useMutation(INITIATE_CARD_PAYMENT);
  const [pollPaymentStatus, { data: pollData }] = useLazyQuery(PAYMENT_STATUS, {
    fetchPolicy: 'no-cache',
  });

  const isLoading = ctxLoading || mpesaLoading || cardLoading;

  // ── Tracking helpers ────────────────────────────────────────────────
  const stopTracking = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    pollDelayRef.current = 3000;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setAwaitingPayment(false);
    setTrackingPaymentId(null);
    setWsError(false);
  }, []);

  const handlePaymentStatus = useCallback(
    (status: string, message: string) => {
      const terminalStatuses = ['COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED'];
      if (!terminalStatuses.includes(status)) return;
      if (Platform.OS === 'ios') WebBrowser.dismissAuthSession(); // iOS only — Android closes itself
      stopTracking();
      if (status === 'COMPLETED') {
        Alert.alert('Payment Successful', message || 'Your payment was processed successfully.');
        if (mode === 'topup') {
          refetchBalances();
        } else if (mode === 'subscription') {
          refetchSubscription();
        }
        onClose();
        onSuccess?.();
      } else {
        Alert.alert(
          'Payment Failed',
          message || 'Your payment could not be processed. Please try again.',
        );
        onClose();
      }
    },
    [stopTracking, onClose, onSuccess, mode, refetchBalances, refetchSubscription],
  );

  // WebSocket subscription — active while awaiting any payment (M-Pesa or Paystack)
  // handlePaymentStatus calls WebBrowser.dismissAuthSession() on terminal status,
  // so the Paystack browser closes automatically when the WS fires.
  useSubscription(SUBSCRIPTION_PAYMENT_UPDATES, {
    variables: { rawCompanyId, paymentId: trackingPaymentId },
    skip: !awaitingPayment || !trackingPaymentId,
    onData: ({ data }) => {
      const payment = data.data?.subscriptionPaymentUpdates?.payment;
      if (payment?.status) {
        handlePaymentStatus(payment.status, payment.failureReason || '');
      }
    },
    onError: () => setWsError(true),
  });

  // Polling — exponential backoff alongside WS (3s → 5s → 8s → 13s → 20s → 30s cap)
  const schedulePoll = useCallback(
    (paymentId: number) => {
      pollTimeoutRef.current = setTimeout(() => {
        pollPaymentStatus({ variables: { paymentId } });
        // Increase delay: multiply by 1.6, cap at 30 s
        pollDelayRef.current = Math.min(Math.round(pollDelayRef.current * 1.6), 30_000);
        schedulePoll(paymentId);
      }, pollDelayRef.current);
    },
    [pollPaymentStatus],
  );

  useEffect(() => {
    if (awaitingPayment && trackingPaymentId) {
      pollDelayRef.current = 3000;
      schedulePoll(trackingPaymentId);
    }
    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
  }, [awaitingPayment, trackingPaymentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // React to poll results
  useEffect(() => {
    const payment = pollData?.paymentStatus?.payment;
    if (payment?.status) handlePaymentStatus(payment.status, payment.failure_reason || '');
  }, [pollData]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2-minute overall timeout
  useEffect(() => {
    if (awaitingPayment) {
      timeoutRef.current = setTimeout(() => {
        if (Platform.OS === 'ios') WebBrowser.dismissAuthSession(); // iOS only — Android closes itself
        stopTracking();
        Alert.alert(
          'Confirmation Timeout',
          'Payment confirmation timed out. Please check your account for the payment status.',
        );
        onClose();
      }, 120_000);
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }
  }, [awaitingPayment]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch payment context on open (for gateway detection + subscriptionId)
  useEffect(() => {
    if (visible && companyId && !hasFetched) {
      const payFor = mode === 'subscription' ? 'SUBSCRIPTION' : 'SMS_TOPUP';
      fetchContext({ variables: { companyId, paymentFor: payFor } });
      setHasFetched(true);
      // Populate phone/email from user/company on every open
      setPhone(user?.phoneNumber ?? '');
      setEmail(activeCompany?.email ?? user?.email ?? '');
    }
    if (!visible) {
      stopTracking();
      setPhone(user?.phoneNumber ?? '');
      setEmail(activeCompany?.email ?? user?.email ?? '');
      setAmount('');
      setStandingOrder(false);
      setChannel('SMS_TOPUP');
      setHasFetched(false);
      setErrors({});
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => () => stopTracking(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive available gateways from context
  const availableGateways = useMemo<PaymentGateway[]>(() => {
    const ctx = ctxData?.subscriptionInitiatePaymentData;
    return detectGateways(ctx);
  }, [ctxData]);

  // Keep selectedGateway in sync with availableGateways
  useEffect(() => {
    if (!availableGateways.includes(selectedGateway)) {
      setSelectedGateway(availableGateways[0]);
    }
  }, [availableGateways]); // eslint-disable-line react-hooks/exhaustive-deps

  const paymentFor = mode === 'subscription' ? 'SUBSCRIPTION' : channel;
  const gatewayColor = selectedGateway === 'mpesa' ? MPESA_COLOR : PAYSTACK_COLOR;

  // ── Payment handler ────────────────────────────────────────────────────────
  async function handlePay() {
    if (!validateFields()) return;

    try {
      // Fetch context with the correct paymentFor to get a fresh subscriptionId
      const { data: freshData } = await fetchContext({
        variables: { companyId, paymentFor },
      });
      const ctx = freshData?.subscriptionInitiatePaymentData;
      rawCompanyId = ctx?.companyId ?? companyId; // for WS subscription
      const subscriptionId = ctx?.subscriptionId ?? ctx?.subscription?.id;

      if (!subscriptionId) {
        Alert.alert('Error', 'Could not load subscription info. Please try again.');
        return;
      }
      

      if (selectedGateway === 'mpesa') {
        // ── M-Pesa STK push ────────────────────────────────────────────────
        const result = await initiateMpesa({
          variables: {
            subscriptionId,
            phoneNumber: phone.trim(),
            paymentFor,
            amountOverride:
              amount && mode === 'topup' ? parseFloat(amount) : undefined,
          },
        });
        const res = result.data?.initiateMpesaPayment;
        if (res?.success) {
          // Decode Relay global ID to integer for subscription/polling
          if (res.payment) {
            setTrackingPaymentId(res.payment?.id);
            setAwaitingPayment(true);
          } else {
            // Fallback: show alert and close if we can't track
            Alert.alert('Request Sent', res.message ?? 'Check your phone for the M-Pesa prompt.');
            onClose();
            onSuccess?.();
          }
        } else {
          Alert.alert('Failed', res?.message ?? 'Payment initiation failed. Please try again.');
        }
      } else {
        // ── Paystack card flow ─────────────────────────────────────────────
        const result = await initiateCard({
          variables: {
            subscriptionId,
            customerEmail: email.trim(),
            paymentFor,
            setupStandingOrder:
              mode === 'subscription' ? standingOrder : undefined,
            amountOverride:
              amount && mode === 'topup' ? parseFloat(amount) : undefined,
          },
        });
        const res = result.data?.initiateCardPayment;
        if (!res?.success || !res?.authorizationUrl) {
          Alert.alert('Failed', res?.message ?? 'Could not initiate card payment.');
          return;
        }

        if (!res.payment?.id) {
          Alert.alert('Error', 'Could not track this payment. Please try again.');
          return;
        }

        // Start polling immediately — same as M-Pesa flow.
        // handlePaymentStatus will call WebBrowser.dismissAuthSession() when
        // a terminal status arrives, which auto-closes the browser.
        setTrackingPaymentId(res.payment?.id);
        setAwaitingPayment(true);

        // Open the browser as fire-and-forget. We do NOT await it because
        // polling drives the outcome, not the browser result.
        const redirectUrl = Linking.createURL('payment-callback');
        WebBrowser.openAuthSessionAsync(res.authorizationUrl, redirectUrl).then(
          (browserResult) => {
            // Only handle an explicit user-cancel (back button / close).
            // All other outcomes (success, dismiss) are handled by polling.
            if (browserResult.type === 'cancel') {
              stopTracking();
            }
          },
        );
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong. Please try again.');
    }
  }


  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={awaitingPayment ? undefined : onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {awaitingPayment
                ? 'Awaiting Confirmation'
                : mode === 'subscription'
                  ? subscriptionLabel
                  : 'Top Up Credits'}
            </Text>
            {!awaitingPayment && (
              <TouchableOpacity onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>

          {/* Awaiting payment overlay */}
          {awaitingPayment && (
            <View style={styles.awaitingContainer}>
              <ActivityIndicator size="large" color={MPESA_COLOR} style={{ marginBottom: 16 }} />
              <Text style={styles.awaitingText}>
                {selectedGateway === 'mpesa'
                  ? 'STK Push sent to ' + phone + '.\nEnter your M-Pesa PIN to complete payment.'
                  : 'Complete payment in the browser.\nDo not close this screen.'}
              </Text>
              <Text style={styles.awaitingSubText}>
                {'Checking payment status...'}
              </Text>
              <TouchableOpacity
                style={styles.awaitingCancelBtn}
                onPress={() => {
                  stopTracking();
                  onClose();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.awaitingCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Form content — hidden while awaiting */}
          {!awaitingPayment && (<>

          {/* Subscription fixed amount */}
          {mode === 'subscription' && subscriptionAmount != null && (
            <View style={styles.amountBanner}>
              <Text style={styles.amountLabel}>Amount Due</Text>
              <Text style={[styles.amountValue, { color: gatewayColor }]}>
                KSh{' '}
                {Number(subscriptionAmount).toLocaleString('en-KE', {
                  minimumFractionDigits: 2,
                })}
              </Text>
            </View>
          )}

          {/* Payment method selector — only when multiple gateways available */}
          {availableGateways.length > 1 && (
            <>
              <Text style={styles.label}>Pay With</Text>
              <View style={styles.gatewayRow}>
                {availableGateways.map((gateway) => {
                  const isActive = selectedGateway === gateway;
                  const gColor = gateway === 'mpesa' ? MPESA_COLOR : PAYSTACK_COLOR;
                  return (
                    <TouchableOpacity
                      key={gateway}
                      style={[
                        styles.gatewayTab,
                        isActive && {
                          backgroundColor: gColor,
                          borderColor: gColor,
                        },
                        !isActive && { borderColor: gColor + '55' },
                      ]}
                      onPress={() => setSelectedGateway(gateway)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={
                          gateway === 'mpesa' ? 'phone-portrait-outline' : 'card-outline'
                        }
                        size={18}
                        color={isActive ? '#fff' : gColor}
                      />
                      <Text
                        style={[
                          styles.gatewayTabLabel,
                          { color: isActive ? '#fff' : gColor },
                        ]}
                      >
                        {gateway === 'mpesa' ? 'M-Pesa' : 'Paystack'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Single-gateway hint badge */}
          {availableGateways.length === 1 && (
            <View
              style={[
                styles.singleBadge,
                { borderColor: gatewayColor + '50', backgroundColor: gatewayColor + '14' },
              ]}
            >
              <Ionicons
                name={
                  selectedGateway === 'mpesa' ? 'phone-portrait-outline' : 'card-outline'
                }
                size={14}
                color={gatewayColor}
              />
              <Text style={[styles.singleBadgeText, { color: gatewayColor }]}>
                {selectedGateway === 'mpesa' ? 'Pay via M-Pesa' : 'Pay via Paystack'}
              </Text>
            </View>
          )}

          {/* Channel selector (topup mode — both gateways) */}
          {mode === 'topup' && (
            <>
              <Text style={styles.label}>Channel</Text>
              <View style={styles.segmentRow}>
                <TouchableOpacity
                  style={[
                    styles.segment,
                    channel === 'SMS_TOPUP' && styles.segmentActive,
                  ]}
                  onPress={() => setChannel('SMS_TOPUP')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="phone-portrait-outline"
                    size={16}
                    color={channel === 'SMS_TOPUP' ? '#fff' : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      channel === 'SMS_TOPUP' && styles.segmentTextActive,
                    ]}
                  >
                    SMS
                  </Text>
                  {balances?.sms_topup_rate && (
                    <Text
                      style={[
                        styles.segmentRate,
                        channel === 'SMS_TOPUP' && { color: '#ffffffcc' },
                      ]}
                    >
                      KSh {Number(balances.sms_topup_rate).toFixed(2)}/msg
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segment,
                    channel === 'WHATSAPP_TOPUP' && styles.segmentActive,
                  ]}
                  onPress={() => setChannel('WHATSAPP_TOPUP')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="logo-whatsapp"
                    size={16}
                    color={channel === 'WHATSAPP_TOPUP' ? '#fff' : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      channel === 'WHATSAPP_TOPUP' && styles.segmentTextActive,
                    ]}
                  >
                    WhatsApp
                  </Text>
                  {balances?.whatsapp_topup_rate && (
                    <Text
                      style={[
                        styles.segmentRate,
                        channel === 'WHATSAPP_TOPUP' && { color: '#ffffffcc' },
                      ]}
                    >
                      KSh {Number(balances.whatsapp_topup_rate).toFixed(2)}/msg
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* M-Pesa — phone number */}
          {selectedGateway === 'mpesa' && (
            <>
              <Text style={styles.label}>
                M-Pesa Phone Number <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputRow,
                  errors.phone
                    ? styles.inputRowError
                    : { borderColor: MPESA_COLOR + '55' },
                ]}
              >
                <Ionicons
                  name="call-outline"
                  size={16}
                  color={errors.phone ? '#E53935' : MPESA_COLOR}
                />
                <TextInput
                  style={styles.inputText}
                  placeholder="e.g. 0712 345 678"
                  placeholderTextColor={colors.textMuted}
                  value={phone}
                  onChangeText={(v) => {
                    setPhone(v);
                    if (errors.phone) setErrors((e) => ({ ...e, phone: undefined }));
                  }}
                  keyboardType="phone-pad"
                />
                {phone.length > 0 && !errors.phone && /^\d{9,12}$/.test(phone.replace(/\D/g, '')) && (
                  <Ionicons name="checkmark-circle" size={16} color={MPESA_COLOR} />
                )}
              </View>
              {errors.phone && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={12} color="#E53935" />
                  <Text style={styles.errorText}>{errors.phone}</Text>
                </View>
              )}
            </>
          )}

          {/* Paystack — email */}
          {selectedGateway === 'paystack' && (
            <>
              <Text style={styles.label}>
                Email Address <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputRow,
                  errors.email
                    ? styles.inputRowError
                    : { borderColor: PAYSTACK_COLOR + '55' },
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={16}
                  color={errors.email ? '#E53935' : PAYSTACK_COLOR}
                />
                <TextInput
                  style={styles.inputText}
                  placeholder="your@email.com"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {email.length > 0 && !errors.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && (
                  <Ionicons name="checkmark-circle" size={16} color={PAYSTACK_COLOR} />
                )}
              </View>
              {errors.email && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={12} color="#E53935" />
                  <Text style={styles.errorText}>{errors.email}</Text>
                </View>
              )}
            </>
          )}

          {/* Amount override (topup only) */}
          {mode === 'topup' && (
            <>
              <Text style={styles.label}>Amount (KSh) <Text style={styles.required}>*</Text></Text>
              <View style={[styles.inputRow, errors.amount ? styles.inputRowError : {}]}>
                <Ionicons
                  name="cash-outline"
                  size={16}
                  color={errors.amount ? '#E53935' : colors.textMuted}
                />
                <TextInput
                  style={styles.inputText}
                  placeholder="Amount to recharge"
                  placeholderTextColor={colors.textMuted}
                  value={amount}
                  onChangeText={(v) => {
                    setAmount(v);
                    if (errors.amount) setErrors((e) => ({ ...e, amount: undefined }));
                  }}
                  keyboardType="decimal-pad"
                />
              </View>
              {errors.amount && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={12} color="#E53935" />
                  <Text style={styles.errorText}>{errors.amount}</Text>
                </View>
              )}
            </>
          )}

          {/* Standing order toggle (Paystack + subscription only) */}
          {selectedGateway === 'paystack' && mode === 'subscription' && (
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Automatic renewal</Text>
                <Text style={styles.toggleSub}>
                  Automatically pay future subscription renewals
                </Text>
              </View>
              <Switch
                value={standingOrder}
                onValueChange={setStandingOrder}
                trackColor={{ false: colors.border, true: PAYSTACK_COLOR + '80' }}
                thumbColor={standingOrder ? PAYSTACK_COLOR : colors.textMuted}
              />
            </View>
          )}

          {/* Confirm button */}
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              { backgroundColor: gatewayColor },
              isLoading && styles.confirmBtnDisabled,
            ]}
            onPress={handlePay}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.confirmText}>
                {selectedGateway === 'mpesa'
                  ? 'Send M-Pesa Request'
                  : 'Pay Now'}
              </Text>
            )}
          </TouchableOpacity>
          </>)}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
function makeStyles(c: AppColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: Radius.xl,
      borderTopRightRadius: Radius.xl,
      padding: Spacing.lg,
      paddingBottom: Spacing.xl,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.lg,
    },
    title: { fontSize: Typography.fontSizeLg, fontWeight: '700', color: c.text },

    // Subscription amount banner
    amountBanner: {
      alignItems: 'center',
      paddingVertical: Spacing.md,
      marginBottom: Spacing.xs,
    },
    amountLabel: {
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
      marginBottom: 4,
    },
    amountValue: { fontSize: 30, fontWeight: '800' },

    label: {
      fontSize: Typography.fontSizeXs,
      fontWeight: '600',
      color: c.textMuted,
      marginBottom: 6,
      marginTop: Spacing.sm,
    },

    // Gateway selector
    gatewayRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xs },
    gatewayTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: Spacing.sm + 2,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.inputBackground,
    },
    gatewayTabLabel: {
      fontSize: Typography.fontSizeSm,
      fontWeight: '700',
    },

    singleBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.full,
      borderWidth: 1,
      marginBottom: Spacing.xs,
    },
    singleBadgeText: { fontSize: Typography.fontSizeXs, fontWeight: '600' },

    // Channel segment
    segmentRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xs },
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
    segmentText: {
      fontSize: Typography.fontSizeXs,
      fontWeight: '600',
      color: c.textMuted,
    },
    segmentTextActive: { color: '#fff' },
    segmentRate: { fontSize: 10, color: c.textMuted },

    // Input field
    inputRow: {
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
    inputRowError: {
      borderColor: '#E53935',
      backgroundColor: '#E5393508',
    },
    inputText: {
      flex: 1,
      fontSize: Typography.fontSizeSm,
      color: c.text,
      paddingVertical: 0,
    },
    required: {
      color: '#E53935',
      fontWeight: '700',
    },
    errorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
    },
    errorText: {
      fontSize: 11,
      color: '#E53935',
      flex: 1,
    },

    // Standing order toggle
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingVertical: Spacing.sm,
      marginTop: Spacing.sm,
    },
    toggleLabel: {
      fontSize: Typography.fontSizeSm,
      fontWeight: '600',
      color: c.text,
    },
    toggleSub: {
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
      marginTop: 2,
    },

    // Confirm button
    confirmBtn: {
      marginTop: Spacing.lg,
      borderRadius: Radius.md,
      height: 50,
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmBtnDisabled: { opacity: 0.6 },
    confirmText: {
      fontSize: Typography.fontSizeSm,
      fontWeight: '700',
      color: '#fff',
    },

    // Awaiting payment state
    awaitingContainer: {
      alignItems: 'center',
      paddingVertical: Spacing.xl,
      gap: Spacing.sm,
    },
    awaitingText: {
      fontSize: Typography.fontSizeSm,
      fontWeight: '600',
      color: c.text,
      textAlign: 'center',
      lineHeight: 22,
    },
    awaitingSubText: {
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
      textAlign: 'center',
    },
    awaitingCancelBtn: {
      marginTop: Spacing.lg,
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.border,
    },
    awaitingCancelText: {
      fontSize: Typography.fontSizeSm,
      fontWeight: '600',
      color: c.textMuted,
    },
  });
}
