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
    CHECK_MPESA_SETUP_BALANCE,
    CREATE_MPESA_SETUP,
    FETCH_MPESA_SETUP_PULL,
    REGISTER_MPESA_SETUP_C2B,
    REGISTER_MPESA_SETUP_PULL,
    UPDATE_MPESA_SETUP,
} from '@/graphql/properties/mutations/mpesa';
import { MPESA_SETUP_FORM_DATA } from '@/graphql/properties/queries/mpesa';
import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

type FormState = {
  name: string;
  shortCode: string;
  passKey: string;
  consumerKey: string;
  consumerSecret: string;
  initiatorName: string;
  initiatorPassword: string;
  certificate: string;
  deployment: string;
  paymentModeId: string;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  name: '',
  shortCode: '',
  passKey: '',
  consumerKey: '',
  consumerSecret: '',
  initiatorName: '',
  initiatorPassword: '',
  certificate: '',
  deployment: 'sandbox',
  paymentModeId: '',
  active: true,
};

function toOptions(value: any): DropdownOption[] {
  if (Array.isArray(value)) {
    return value
      .map((item: any) => {
        if (typeof item === 'string') {
          return { id: item, label: item };
        }
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

function firstObject(candidates: any[]): Record<string, any> {
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate) && Object.keys(candidate).length > 0) {
      return candidate;
    }
  }
  return {};
}

export default function MpesaSetupFormScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [buildingIds, setBuildingIds] = useState<string[]>([]);
  const [buildingOptions, setBuildingOptions] = useState<DropdownOption[]>([]);
  const [deploymentOptions, setDeploymentOptions] = useState<DropdownOption[]>([]);
  const [paymentModeOptions, setPaymentModeOptions] = useState<DropdownOption[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [bootstrapped, setBootstrapped] = useState(false);
  const [callbackExpanded, setCallbackExpanded] = useState(false);
  const [responseOpen, setResponseOpen] = useState(false);
  const [responseTitle, setResponseTitle] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [responsePayload, setResponsePayload] = useState<unknown>(null);

  const { data, loading, refetch } = useQuery(MPESA_SETUP_FORM_DATA, {
    variables: { setupId: isEdit ? id : null },
    fetchPolicy: 'network-only',
  });

  const [createSetup, { loading: creating }] = useMutation(CREATE_MPESA_SETUP);
  const [updateSetup, { loading: updating }] = useMutation(UPDATE_MPESA_SETUP);
  const [registerC2B, { loading: registeringC2B }] = useMutation(REGISTER_MPESA_SETUP_C2B);
  const [registerPull, { loading: registeringPull }] = useMutation(REGISTER_MPESA_SETUP_PULL);
  const [checkBalance, { loading: checkingBalance }] = useMutation(CHECK_MPESA_SETUP_BALANCE);
  const [fetchPull, { loading: fetchingPull }] = useMutation(FETCH_MPESA_SETUP_PULL);

  const payload = normalizeGenericScalarPayload((data as any)?.mpesaSetupFormData ?? {});
  const formValues = firstObject([
    payload?.formValues,
    payload?.setup,
    payload?.form?.values,
    payload?.form,
  ]);
  const formOptions = firstObject([
    payload?.formOptions,
    payload?.options,
    payload?.form?.options,
  ]);
  const callbacks =
    payload?.setup?.callbackUrls ??
    payload?.callbackUrls ??
    formValues?.callbackUrls ??
    {};

  useEffect(() => {
    if (bootstrapped) return;
    const hasFormValues = Object.keys(formValues).length > 0;
    const hasFormOptions = Object.keys(formOptions).length > 0;
    if (!hasFormValues && !hasFormOptions) return;

    const nextForm: FormState = {
      name: String(formValues?.name ?? ''),
      shortCode: String(formValues?.shortCode ?? ''),
      passKey: String(formValues?.passKey ?? ''),
      consumerKey: String(formValues?.consumerKey ?? ''),
      consumerSecret: String(formValues?.consumerSecret ?? ''),
      initiatorName: String(formValues?.initiatorName ?? ''),
      initiatorPassword: String(formValues?.initiatorPassword ?? ''),
      certificate: String(formValues?.certificate ?? ''),
      deployment: String(formValues?.deployment ?? 'sandbox'),
      paymentModeId: String(formValues?.paymentModeId ?? formValues?.paymentMode?.id ?? ''),
      active: typeof formValues?.active === 'boolean' ? formValues.active : true,
    };

    setForm(nextForm);
    setDeploymentOptions(toOptions(formOptions?.deploymentChoices));
    setPaymentModeOptions(toOptions(formOptions?.paymentModeChoices));
    setBuildingOptions(toOptions(formOptions?.buildingChoices));
    const selectedBuildings =
      formOptions?.selectedBuildingIds ??
      formValues?.buildingIds ??
      formValues?.buildings?.map?.((b: any) => b?.id) ??
      [];
    setBuildingIds((selectedBuildings ?? []).map((x: any) => String(x)));
    setBootstrapped(true);
  }, [bootstrapped, formOptions, formValues]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
    if (errors[key]) {
      setErrors((e) => ({ ...e, [key]: '' }));
    }
  }

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = 'Name is required';
    if (!form.shortCode.trim()) nextErrors.shortCode = 'Short code is required';
    if (!form.passKey.trim()) nextErrors.passKey = 'Pass key is required';
    if (!form.consumerKey.trim()) nextErrors.consumerKey = 'Consumer key is required';
    if (!form.consumerSecret.trim()) nextErrors.consumerSecret = 'Consumer secret is required';
    if (!form.initiatorName.trim()) nextErrors.initiatorName = 'Initiator name is required';
    if (!form.deployment) nextErrors.deployment = 'Deployment is required';
    if (!form.paymentModeId) nextErrors.paymentModeId = 'Payment mode is required';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;

    setServerError('');
    const inputBase = {
      name: form.name.trim(),
      shortCode: form.shortCode.trim(),
      passKey: form.passKey.trim(),
      consumerKey: form.consumerKey.trim(),
      consumerSecret: form.consumerSecret.trim(),
      initiatorName: form.initiatorName.trim(),
      initiatorPassword: form.initiatorPassword.trim() || null,
      certificate: form.certificate.trim() || null,
      deployment: form.deployment,
      paymentModeId: form.paymentModeId,
      active: form.active,
      buildingIds,
    };

    try {
      const res = isEdit
        ? await updateSetup({ variables: { input: { ...inputBase, setupId: id } } })
        : await createSetup({ variables: { input: inputBase } });

      const result = isEdit ? res?.data?.updateMpesaSetup : res?.data?.createMpesaSetup;
      if (result?.success) {
        Alert.alert('Saved', result?.message ?? 'M-Pesa setup saved successfully.');
        await refetch();
        router.replace('/(tabs)/payments/mpesa-setup' as any);
      } else {
        setServerError(result?.message ?? 'Could not save M-Pesa setup.');
      }
    } catch (e: any) {
      setServerError(e?.message ?? 'Could not save M-Pesa setup.');
    }
  }

  async function runOperation(action: () => Promise<any>, title: string) {
    if (!id) return;
    try {
      const res = await action();
      const result =
        res?.data?.registerMpesaSetupC2b ||
        res?.data?.registerMpesaSetupPull ||
        res?.data?.checkMpesaSetupBalance ||
        res?.data?.fetchMpesaSetupPull;

      if (result?.success) {
        setResponseTitle(title);
        setResponseMessage(result?.message ?? 'Operation successful.');
        setResponsePayload(result?.response ?? null);
        setResponseOpen(true);
      } else {
        Alert.alert('Operation failed', result?.message ?? 'Please try again.');
      }
    } catch (e: any) {
      Alert.alert('Operation failed', e?.message ?? 'Please try again.');
    }
  }

  const saving = creating || updating;

  return (
    <FormLayout
      title={isEdit ? String(payload?.title ?? 'Edit M-Pesa Setup') : String(payload?.title ?? 'Create M-Pesa Setup')}
      onBack={() => router.push('/(tabs)/payments/mpesa-setup' as any)}
      rightElement={
        isEdit ? (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(tabs)/payments/mpesa-setup/delete', params: { id: String(id) } } as any)}
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={22} color="#E53935" />
          </TouchableOpacity>
        ) : undefined
      }
    >
      {serverError ? <ServerErrorBanner message={serverError} /> : null}

      <SectionLabel>Setup Details</SectionLabel>

      <Input label="Name" value={form.name} onChangeText={(v) => setField('name', v)} error={errors.name} />
      <Input label="Short Code" value={form.shortCode} onChangeText={(v) => setField('shortCode', v)} error={errors.shortCode} />
      <Input label="Pass Key" value={form.passKey} onChangeText={(v) => setField('passKey', v)} error={errors.passKey} secureTextEntry secureToggle />
      <Input label="Consumer Key" value={form.consumerKey} onChangeText={(v) => setField('consumerKey', v)} error={errors.consumerKey} secureTextEntry secureToggle />
      <Input label="Consumer Secret" value={form.consumerSecret} onChangeText={(v) => setField('consumerSecret', v)} error={errors.consumerSecret} secureTextEntry secureToggle />
      <Input label="Initiator Name" value={form.initiatorName} onChangeText={(v) => setField('initiatorName', v)} error={errors.initiatorName} />
      <Input label="Initiator Password" value={form.initiatorPassword} onChangeText={(v) => setField('initiatorPassword', v)} secureTextEntry secureToggle />
      <Input label="Certificate" value={form.certificate} onChangeText={(v) => setField('certificate', v)} multiline />

      <SearchableDropdown
        label="Deployment"
        value={form.deployment}
        displayValue={deploymentOptions.find((x) => x.id === form.deployment)?.label}
        options={deploymentOptions}
        onSelect={(opt) => setField('deployment', opt.id)}
        searchable={false}
        clearable={false}
        error={errors.deployment}
      />

      <SearchableDropdown
        label="Payment Mode"
        value={form.paymentModeId}
        displayValue={paymentModeOptions.find((x) => x.id === form.paymentModeId)?.label}
        options={paymentModeOptions}
        onSelect={(opt) => setField('paymentModeId', opt.id)}
        error={errors.paymentModeId}
      />

      <SearchableDropdown
        label="Buildings"
        value=""
        selectedIds={buildingIds}
        options={buildingOptions}
        onSelect={() => {}}
        onToggle={(opt) => {
          setBuildingIds((prev) =>
            prev.includes(opt.id) ? prev.filter((x) => x !== opt.id) : [...prev, opt.id],
          );
        }}
        multiSelect
      />

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Active</Text>
        <Switch value={form.active} onValueChange={(v) => setField('active', v)} />
      </View>

      {Object.keys(callbacks).length > 0 ? (
        <>
          <TouchableOpacity
            style={styles.callbackToggle}
            onPress={() => setCallbackExpanded((s) => !s)}
            activeOpacity={0.8}
          >
            <Text style={styles.callbackToggleText}>Callback URLs</Text>
            <Ionicons
              name={callbackExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={16}
              color={colors.textMuted}
            />
          </TouchableOpacity>
          {callbackExpanded ? <CopyableUrlList title="Callback URLs" items={callbacks} /> : null}
        </>
      ) : null}

      {isEdit ? (
        <>
          <SectionLabel>M-Pesa Operations</SectionLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.opsRow}>
            <Button
              title={registeringC2B ? 'Registering...' : 'Register C2B URL'}
              onPress={() => runOperation(() => registerC2B({ variables: { input: { setupId: id } } }), 'C2B URL registration')}
              disabled={registeringC2B}
            />
            <Button
              title={registeringPull ? 'Registering...' : 'Register Pull URL'}
              onPress={() => runOperation(() => registerPull({ variables: { input: { setupId: id } } }), 'Pull URL registration')}
              disabled={registeringPull}
            />
            <Button
              title={checkingBalance ? 'Checking...' : 'Check Balance'}
              onPress={() => runOperation(() => checkBalance({ variables: { input: { setupId: id } } }), 'Balance check')}
              disabled={checkingBalance}
            />
            <Button
              title={fetchingPull ? 'Fetching...' : 'Fetch Transactions'}
              onPress={() => runOperation(() => fetchPull({ variables: { input: { setupId: id } } }), 'Pull transaction fetch')}
              disabled={fetchingPull}
            />
          </ScrollView>
        </>
      ) : null}

      <View style={{ height: Spacing.md }} />
      <Button title={saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Setup'} onPress={handleSave} loading={saving || loading} />
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
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      marginBottom: Spacing.sm,
    },
    toggleLabel: {
      fontSize: Typography.fontSizeSm,
      color: c.text,
      fontWeight: Typography.fontWeightMedium,
    },
    callbackToggle: {
      marginTop: Spacing.sm,
      marginBottom: Spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    callbackToggleText: {
      fontSize: Typography.fontSizeSm,
      color: c.text,
      fontWeight: Typography.fontWeightSemibold,
    },
    opsRow: {
      gap: Spacing.sm,
      paddingBottom: Spacing.sm,
    },
  });
}
