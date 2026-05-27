import { Button } from '@/components/ui/Button';
import { CopyableUrlList } from '@/components/ui/CopyableUrlList';
import { FormLayout } from '@/components/ui/FormLayout';
import { Input } from '@/components/ui/Input';
import { OperationResponseModal } from '@/components/ui/OperationResponseModal';
import { DropdownOption, SearchableDropdown } from '@/components/ui/SearchableDropdown';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ServerErrorBanner } from '@/components/ui/ServerErrorBanner';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import {
    CREATE_GATEWAY_CREDENTIAL,
    ROTATE_GATEWAY_WEBHOOK_CREDENTIALS,
    UPDATE_GATEWAY_CREDENTIAL,
} from '@/graphql/properties/mutations/gateway-credentials';
import { GATEWAY_CREDENTIAL_FORM_DATA } from '@/graphql/properties/queries/gateway-credentials';
import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

type FormState = {
  gatewayCode: string;
  name: string;
  paymentModeId: string;
  environment: string;
  merchantCode: string;
  apiKey: string;
  consumerSecret: string;
  authBaseUrl: string;
  isActive: boolean;
  equityCountryCode: string;
  equitySourceName: string;
  equitySourceAccountNumber: string;
  equitySourceCountryCode: string;
  equityDestinationName: string;
  equityDestinationAccountNumber: string;
  equityDestinationCountryCode: string;
  equityDestinationType: string;
  equityTransferType: string;
  equityAccountId: string;
  equityCurrencyCode: string;
  equityBicCode: string;
  equityIban: string;
  ncbaInstitutionCode: string;
  cooperativeBranchCode: string;
};

const EMPTY_FORM: FormState = {
  gatewayCode: '',
  name: '',
  paymentModeId: '',
  environment: '',
  merchantCode: '',
  apiKey: '',
  consumerSecret: '',
  authBaseUrl: '',
  isActive: true,
  equityCountryCode: '',
  equitySourceName: '',
  equitySourceAccountNumber: '',
  equitySourceCountryCode: '',
  equityDestinationName: '',
  equityDestinationAccountNumber: '',
  equityDestinationCountryCode: '',
  equityDestinationType: '',
  equityTransferType: '',
  equityAccountId: '',
  equityCurrencyCode: '',
  equityBicCode: '',
  equityIban: '',
  ncbaInstitutionCode: '',
  cooperativeBranchCode: '',
};

function normalizeGenericScalarPayload(value: any): any {
  if (!value) return {};

  let parsed = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return {};
    }
  }

  for (let i = 0; i < 3; i += 1) {
    if (!(parsed && typeof parsed === 'object' && 'data' in parsed)) break;
    const next = (parsed as any).data;
    if (typeof next === 'string') {
      try {
        parsed = JSON.parse(next);
      } catch {
        break;
      }
    } else if (next && typeof next === 'object') {
      parsed = next;
    } else {
      break;
    }
  }

  return parsed;
}

function toOptions(value: any): DropdownOption[] {
  if (Array.isArray(value)) {
    return value
      .map((item: any) => {
        if (typeof item === 'string') return { id: item, label: item };
        const id = String(item?.id ?? item?.value ?? item?.key ?? item?.code ?? item?.name ?? '');
        const label = String(item?.label ?? item?.name ?? item?.title ?? item?.value ?? item?.code ?? id);
        return id ? { id, label } : null;
      })
      .filter(Boolean) as DropdownOption[];
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).map(([k, v]) => ({ id: String(k), label: String(v) }));
  }

  return [];
}

function firstObject(candidates: any[]): Record<string, any> {
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate) && Object.keys(candidate).length > 0) {
      return candidate;
    }
  }
  return {};
}

export default function GatewayCredentialFormScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [bootstrapped, setBootstrapped] = useState(false);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [publicKeyExpanded, setPublicKeyExpanded] = useState(false);
  const [credentialExpanded, setCredentialExpanded] = useState(false);
  const [responseOpen, setResponseOpen] = useState(false);
  const [responseTitle, setResponseTitle] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [responsePayload, setResponsePayload] = useState<unknown>(null);

  const [gatewayOptions, setGatewayOptions] = useState<DropdownOption[]>([]);
  const [environmentOptions, setEnvironmentOptions] = useState<DropdownOption[]>([]);
  const [paymentModeOptions, setPaymentModeOptions] = useState<DropdownOption[]>([]);

  const { data, loading, refetch } = useQuery(GATEWAY_CREDENTIAL_FORM_DATA, {
    variables: { credentialId: isEdit ? id : null },
    fetchPolicy: 'network-only',
  });

  const [createCredential, { loading: creating }] = useMutation(CREATE_GATEWAY_CREDENTIAL);
  const [updateCredential, { loading: updating }] = useMutation(UPDATE_GATEWAY_CREDENTIAL);
  const [rotateWebhookCredentials, { loading: rotating }] = useMutation(ROTATE_GATEWAY_WEBHOOK_CREDENTIALS);

  const payload = normalizeGenericScalarPayload((data as any)?.gatewayCredentialFormData ?? {});
  const formValues = firstObject([payload?.formValues, payload?.credential, payload?.form?.values, payload?.form]);
  const formOptions = firstObject([payload?.formOptions, payload?.options, payload?.form?.options]);
  const credential = firstObject([payload?.credential]);

  useEffect(() => {
    if (bootstrapped) return;
    const hasFormValues = Object.keys(formValues).length > 0;
    const hasFormOptions = Object.keys(formOptions).length > 0;
    if (!hasFormValues && !hasFormOptions) return;

    setForm({
      gatewayCode: String(formValues?.gatewayCode ?? ''),
      name: String(formValues?.name ?? ''),
      paymentModeId: String(formValues?.paymentModeId ?? formValues?.paymentMode?.id ?? ''),
      environment: String(formValues?.environment ?? ''),
      merchantCode: String(formValues?.merchantCode ?? ''),
      apiKey: String(formValues?.apiKey ?? ''),
      consumerSecret: String(formValues?.consumerSecret ?? ''),
      authBaseUrl: String(formValues?.authBaseUrl ?? ''),
      isActive: typeof formValues?.isActive === 'boolean' ? formValues.isActive : true,
      equityCountryCode: String(formValues?.equityCountryCode ?? ''),
      equitySourceName: String(formValues?.equitySourceName ?? ''),
      equitySourceAccountNumber: String(formValues?.equitySourceAccountNumber ?? ''),
      equitySourceCountryCode: String(formValues?.equitySourceCountryCode ?? ''),
      equityDestinationName: String(formValues?.equityDestinationName ?? ''),
      equityDestinationAccountNumber: String(formValues?.equityDestinationAccountNumber ?? ''),
      equityDestinationCountryCode: String(formValues?.equityDestinationCountryCode ?? ''),
      equityDestinationType: String(formValues?.equityDestinationType ?? ''),
      equityTransferType: String(formValues?.equityTransferType ?? ''),
      equityAccountId: String(formValues?.equityAccountId ?? ''),
      equityCurrencyCode: String(formValues?.equityCurrencyCode ?? ''),
      equityBicCode: String(formValues?.equityBicCode ?? ''),
      equityIban: String(formValues?.equityIban ?? ''),
      ncbaInstitutionCode: String(formValues?.ncbaInstitutionCode ?? ''),
      cooperativeBranchCode: String(formValues?.cooperativeBranchCode ?? ''),
    });

    setGatewayOptions(toOptions(formOptions?.gatewayChoices));
    setEnvironmentOptions(toOptions(formOptions?.environmentChoices));
    setPaymentModeOptions(toOptions(formOptions?.paymentModeChoices));
    setBootstrapped(true);
  }, [bootstrapped, formOptions, formValues]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  }

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!form.gatewayCode) nextErrors.gatewayCode = 'Gateway is required';
    if (!form.name.trim()) nextErrors.name = 'Name is required';
    if (!form.environment) nextErrors.environment = 'Environment is required';
    if (!form.merchantCode.trim()) nextErrors.merchantCode = 'Merchant code is required';
    if (!form.apiKey.trim()) nextErrors.apiKey = 'API key is required';
    if (!form.consumerSecret.trim()) nextErrors.consumerSecret = 'Consumer secret is required';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;

    setServerError('');

    const inputBase = {
      name: form.name.trim(),
      paymentModeId: form.paymentModeId || null,
      environment: form.environment,
      merchantCode: form.merchantCode.trim(),
      apiKey: form.apiKey.trim(),
      consumerSecret: form.consumerSecret.trim(),
      authBaseUrl: form.authBaseUrl.trim() || null,
      isActive: form.isActive,
      equityCountryCode: form.equityCountryCode.trim() || null,
      equitySourceName: form.equitySourceName.trim() || null,
      equitySourceAccountNumber: form.equitySourceAccountNumber.trim() || null,
      equitySourceCountryCode: form.equitySourceCountryCode.trim() || null,
      equityDestinationName: form.equityDestinationName.trim() || null,
      equityDestinationAccountNumber: form.equityDestinationAccountNumber.trim() || null,
      equityDestinationCountryCode: form.equityDestinationCountryCode.trim() || null,
      equityDestinationType: form.equityDestinationType.trim() || null,
      equityTransferType: form.equityTransferType.trim() || null,
      equityAccountId: form.equityAccountId.trim() || null,
      equityCurrencyCode: form.equityCurrencyCode.trim() || null,
      equityBicCode: form.equityBicCode.trim() || null,
      equityIban: form.equityIban.trim() || null,
      ncbaInstitutionCode: form.ncbaInstitutionCode.trim() || null,
      cooperativeBranchCode: form.cooperativeBranchCode.trim() || null,
    };

    try {
      const res = isEdit
        ? await updateCredential({ variables: { input: { credentialId: id, ...inputBase } } })
        : await createCredential({ variables: { input: { gatewayCode: form.gatewayCode, ...inputBase } } });

      const result = isEdit ? res?.data?.updateGatewayCredential : res?.data?.createGatewayCredential;
      if (result?.success) {
        Alert.alert('Saved', result?.message ?? 'Gateway credential saved successfully.');
        await refetch();
        router.replace('/(tabs)/payments/gateway-credentials' as any);
      } else {
        setServerError(result?.message ?? 'Could not save gateway credential.');
      }
    } catch (e: any) {
      setServerError(e?.message ?? 'Could not save gateway credential.');
    }
  }

  async function handleRotateWebhookCredentials() {
    if (!id) return;
    try {
      const res = await rotateWebhookCredentials({ variables: { input: { credentialId: id } } });
      const result = res?.data?.rotateGatewayWebhookCredentials;
      if (result?.success) {
        setResponseTitle('Webhook credentials rotated');
        setResponseMessage(result?.message ?? 'Webhook credentials rotated successfully.');
        setResponsePayload({
          webhookClientKey: result?.webhookClientKey,
          webhookClientSecret: result?.webhookClientSecret,
          webhookBasicAuthHeader: result?.webhookBasicAuthHeader,
        });
        setResponseOpen(true);
        await refetch();
      } else {
        Alert.alert('Rotation failed', result?.message ?? 'Could not rotate webhook credentials.');
      }
    } catch (e: any) {
      Alert.alert('Rotation failed', e?.message ?? 'Could not rotate webhook credentials.');
    }
  }

  const saving = creating || updating;

  const credentialCopyItems = {
    webhookEndpoint: credential?.webhookEndpoint ?? credential?.webhookUrl ?? payload?.webhookEndpoint,
    webhookClientKey: credential?.webhookClientKey,
    webhookClientSecret: credential?.webhookClientSecret,
    webhookBasicAuthHeader: credential?.webhookBasicAuthHeader,
    callbackHistoryUrl: credential?.callbackHistoryUrl ?? payload?.actions?.callbackHistory,
  };
  const generatedPublicKey = String(
    credential?.generatedPublicKey ??
    credential?.publicKey ??
    credential?.webhookPublicKey ??
    payload?.generatedPublicKey ??
    payload?.publicKey ??
    payload?.webhookPublicKey ??
    '',
  ).trim();

  const hasCredentialCopyItems = Object.values(credentialCopyItems).some((v) => Boolean(v));

  return (
    <FormLayout
      title={isEdit ? String(payload?.title ?? 'Edit Gateway Credential') : String(payload?.title ?? 'Create Gateway Credential')}
      onBack={() => router.push('/(tabs)/payments/gateway-credentials' as any)}
      rightElement={
        isEdit ? (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(tabs)/payments/gateway-credentials/delete', params: { id: String(id) } } as any)}
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={22} color="#E53935" />
          </TouchableOpacity>
        ) : undefined
      }
    >
      {serverError ? <ServerErrorBanner message={serverError} /> : null}

      <SectionLabel>Credential Details</SectionLabel>

      <SearchableDropdown
        label="Gateway"
        value={form.gatewayCode}
        displayValue={gatewayOptions.find((x) => x.id === form.gatewayCode)?.label}
        options={gatewayOptions}
        onSelect={(opt) => setField('gatewayCode', opt.id)}
        searchable={false}
        clearable={false}
        error={errors.gatewayCode}
        disabled={isEdit}
      />

      <Input label="Name" value={form.name} onChangeText={(v) => setField('name', v)} error={errors.name} />

      <SearchableDropdown
        label="Environment"
        value={form.environment}
        displayValue={environmentOptions.find((x) => x.id === form.environment)?.label}
        options={environmentOptions}
        onSelect={(opt) => setField('environment', opt.id)}
        searchable={false}
        clearable={false}
        error={errors.environment}
      />

      <SearchableDropdown
        label="Payment Mode"
        value={form.paymentModeId}
        displayValue={paymentModeOptions.find((x) => x.id === form.paymentModeId)?.label}
        options={paymentModeOptions}
        onSelect={(opt) => setField('paymentModeId', opt.id)}
      />

      <Input label="Merchant Code" value={form.merchantCode} onChangeText={(v) => setField('merchantCode', v)} error={errors.merchantCode} />
      <Input label="API Key" value={form.apiKey} onChangeText={(v) => setField('apiKey', v)} error={errors.apiKey} secureTextEntry secureToggle />
      <Input label="Consumer Secret" value={form.consumerSecret} onChangeText={(v) => setField('consumerSecret', v)} error={errors.consumerSecret} secureTextEntry secureToggle />
      <Input label="Auth Base URL" value={form.authBaseUrl} onChangeText={(v) => setField('authBaseUrl', v)} placeholder="Optional" />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Active</Text>
        <Switch value={form.isActive} onValueChange={(v) => setField('isActive', v)} />
      </View>

      <TouchableOpacity style={styles.expandRow} onPress={() => setAdvancedExpanded((s) => !s)} activeOpacity={0.8}>
        <Text style={styles.expandTitle}>Provider-Specific Fields</Text>
        <Ionicons name={advancedExpanded ? 'chevron-up-outline' : 'chevron-down-outline'} size={16} color={colors.textMuted} />
      </TouchableOpacity>

      {advancedExpanded ? (
        <>
          <Input label="Equity Country Code" value={form.equityCountryCode} onChangeText={(v) => setField('equityCountryCode', v)} />
          <Input label="Equity Source Name" value={form.equitySourceName} onChangeText={(v) => setField('equitySourceName', v)} />
          <Input label="Equity Source Account Number" value={form.equitySourceAccountNumber} onChangeText={(v) => setField('equitySourceAccountNumber', v)} />
          <Input label="Equity Source Country Code" value={form.equitySourceCountryCode} onChangeText={(v) => setField('equitySourceCountryCode', v)} />
          <Input label="Equity Destination Name" value={form.equityDestinationName} onChangeText={(v) => setField('equityDestinationName', v)} />
          <Input label="Equity Destination Account Number" value={form.equityDestinationAccountNumber} onChangeText={(v) => setField('equityDestinationAccountNumber', v)} />
          <Input label="Equity Destination Country Code" value={form.equityDestinationCountryCode} onChangeText={(v) => setField('equityDestinationCountryCode', v)} />
          <Input label="Equity Destination Type" value={form.equityDestinationType} onChangeText={(v) => setField('equityDestinationType', v)} />
          <Input label="Equity Transfer Type" value={form.equityTransferType} onChangeText={(v) => setField('equityTransferType', v)} />
          <Input label="Equity Account ID" value={form.equityAccountId} onChangeText={(v) => setField('equityAccountId', v)} />
          <Input label="Equity Currency Code" value={form.equityCurrencyCode} onChangeText={(v) => setField('equityCurrencyCode', v)} />
          <Input label="Equity BIC Code" value={form.equityBicCode} onChangeText={(v) => setField('equityBicCode', v)} />
          <Input label="Equity IBAN" value={form.equityIban} onChangeText={(v) => setField('equityIban', v)} />
          <Input label="NCBA Institution Code" value={form.ncbaInstitutionCode} onChangeText={(v) => setField('ncbaInstitutionCode', v)} />
          <Input label="Cooperative Branch Code" value={form.cooperativeBranchCode} onChangeText={(v) => setField('cooperativeBranchCode', v)} />
        </>
      ) : null}

      {isEdit && generatedPublicKey ? (
        <>
          <TouchableOpacity style={styles.expandRow} onPress={() => setPublicKeyExpanded((s) => !s)} activeOpacity={0.8}>
            <Text style={styles.expandTitle}>Generated Public Key</Text>
            <Ionicons name={publicKeyExpanded ? 'chevron-up-outline' : 'chevron-down-outline'} size={16} color={colors.textMuted} />
          </TouchableOpacity>
          {publicKeyExpanded ? (
            <CopyableUrlList
              title="Generated Public Key"
              items={{ generatedPublicKey }}
            />
          ) : null}
        </>
      ) : null}

      {isEdit && hasCredentialCopyItems ? (
        <>
          <TouchableOpacity style={styles.expandRow} onPress={() => setCredentialExpanded((s) => !s)} activeOpacity={0.8}>
            <Text style={styles.expandTitle}>Webhook Details</Text>
            <Ionicons name={credentialExpanded ? 'chevron-up-outline' : 'chevron-down-outline'} size={16} color={colors.textMuted} />
          </TouchableOpacity>
          {credentialExpanded ? <CopyableUrlList title="Webhook & History" items={credentialCopyItems} /> : null}
        </>
      ) : null}

      {isEdit ? (
        <Button
          title={rotating ? 'Rotating...' : 'Rotate Webhook Credentials'}
          onPress={handleRotateWebhookCredentials}
          disabled={rotating}
        />
      ) : null}

      {isEdit ? (
        <View style={{ height: Spacing.sm }} />
      ) : null}

      <Button title={saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Credential'} onPress={handleSave} loading={saving || loading} />
      <View style={{ height: Spacing.xl }} />

      <OperationResponseModal
        visible={responseOpen}
        title={responseTitle || 'Operation Result'}
        message={responseMessage}
        response={responsePayload}
        onClose={() => setResponseOpen(false)}
      />
    </FormLayout>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
    },
    switchLabel: {
      color: c.text,
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightMedium,
    },
    expandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    expandTitle: {
      color: c.text,
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
    },
  });
}
