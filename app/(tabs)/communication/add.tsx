import { Button } from '@/components/ui/Button';
import { DatePickerInput } from '@/components/ui/DatePickerInput';
import { FormLayout } from '@/components/ui/FormLayout';
import { Input } from '@/components/ui/Input';
import { DropdownOption, SearchableDropdown } from '@/components/ui/SearchableDropdown';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ServerErrorBanner } from '@/components/ui/ServerErrorBanner';
import { AppColors, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { CREATE_UPDATE_CAMPAIGN } from '@/graphql/properties/mutations/communication';
import { BUILDINGS_DROPDOWN } from '@/graphql/properties/queries/building';
import { CAMPAIGN_LIST_DATA } from '@/graphql/properties/queries/communication';
import { TENANTS_DROPDOWN } from '@/graphql/properties/queries/tenants';
import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const FILTER_TYPES = [
  { value: 'ALL', label: 'All Tenants' },
  { value: 'WITH_BALANCE', label: 'With Balance' },
  { value: 'OVERDUE_RENT', label: 'Overdue Rent' },
  { value: 'HIGH_CONSUMPTION', label: 'High Consumption' },
  { value: 'CUSTOM', label: 'Custom' },
];

const FREQUENCIES = [
  { value: 'ONCE', label: 'Once' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
];

const PLACEHOLDER_GROUPS = [
  {
    group: 'Tenant',
    items: [
      { label: 'name', token: '{tenant_name}' },
      { label: 'first name', token: '{tenant_first_name}' },
      { label: 'phone', token: '{tenant_phone}' },
      { label: 'email', token: '{tenant_email}' },
      { label: 'payment link', token: '{tenant_payment_link}' },
    ],
  },
  {
    group: 'Unit',
    items: [
      { label: 'unit no.', token: '{unit_number}' },
      { label: 'rent', token: '{unit_rent}' },
      { label: 'acct no.', token: '{unit_account_number}' },
    ],
  },
  {
    group: 'Building',
    items: [
      { label: 'building', token: '{building_name}' },
      { label: 'address', token: '{building_address}' },
    ],
  },
  {
    group: 'Financial',
    items: [
      { label: 'balance', token: '{balance}' },
      { label: 'rent amount', token: '{rent_amount}' },
      { label: 'due amount', token: '{due_amount}' },
      { label: 'due date', token: '{due_date}' },
      { label: 'days overdue', token: '{days_overdue}' },
    ],
  },
  {
    group: 'M-Pesa',
    items: [
      { label: 'paybill', token: '{mpesa_paybill}' },
      { label: 'account', token: '{mpesa_account_number}' },
    ],
  },
  {
    group: 'Company',
    items: [
      { label: 'company', token: '{company_name}' },
      { label: 'co. phone', token: '{company_phone}' },
    ],
  },
];

export default function AddCampaign() {
  const router = useRouter();
  const { campaignId, name: initName, subject: initSubject, message: initMessage,
    filterType: initFilter, frequency: initFreq, sendEmail: initEmail,
    sendSms: initSms, sendWhatsapp: initWa, scheduledDatetime: initSched,
    buildingId: initBuilding, selectedTenants: initSelectedTenants } = useLocalSearchParams<{
    campaignId?: string; name?: string; subject?: string; message?: string;
    filterType?: string; frequency?: string; sendEmail?: string; sendSms?: string;
    sendWhatsapp?: string; scheduledDatetime?: string; buildingId?: string;
    selectedTenants?: string;
  }>();
  const isEdit = !!campaignId;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [serverError, setServerError] = useState('');

  // Building dropdown state
  const [buildingDisplay, setBuildingDisplay] = useState('');
  const [buildingSearch, setBuildingSearch] = useState('');

  // Tenant multi-select state (for CUSTOM filter)
  const [tenantSearch, setTenantSearch] = useState('');
  const [selectedTenants, setSelectedTenants] = useState<{ id: string; label: string }[]>([]);

  const { data: buildingsData, loading: buildingsLoading } = useQuery(BUILDINGS_DROPDOWN, {
    variables: { first: 50, search: buildingSearch || undefined },
    fetchPolicy: 'cache-and-network',
  });

  const buildingOptions: DropdownOption[] = useMemo(
    () =>
      (buildingsData?.buildings?.edges ?? []).map((e: any) => ({
        id: e.node.id,
        label: e.node.name,
        sublabel: e.node.code ?? undefined,
      })),
    [buildingsData]
  );

  const [form, setForm] = useState({
    name: '',
    subject: '',
    message: '',
    filterType: 'ALL',
    frequency: 'ONCE',
    sendEmail: false,
    sendSms: false,
    sendWhatsapp: false,
    scheduledDatetime: '',
    buildingId: '',
    minBalanceAmount: '',
  });

  const { data: tenantsData, loading: tenantsLoading } = useQuery(TENANTS_DROPDOWN, {
    variables: { first: 50, search: tenantSearch || undefined },
    fetchPolicy: 'cache-and-network',
    skip: form.filterType !== 'CUSTOM',
  });

  const tenantOptions: DropdownOption[] = useMemo(
    () =>
      (tenantsData?.tenants?.edges ?? []).map((e: any) => ({
        id: e.node.id,
        label: e.node.fullName,
        sublabel: e.node.phone ?? undefined,
      })),
    [tenantsData]
  );

  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [msgCursor, setMsgCursor] = useState(0);

  useEffect(() => {
    if (isEdit) {
      setForm(f => ({
        ...f,
        name: initName ?? '',
        subject: initSubject ?? '',
        message: initMessage ?? '',
        filterType: initFilter ?? 'ALL',
        frequency: initFreq ?? 'ONCE',
        sendEmail: initEmail === 'true',
        sendSms: initSms === 'true',
        sendWhatsapp: initWa === 'true',
        scheduledDatetime: initSched ? initSched.split('T')[0] : '',
        buildingId: initBuilding ?? '',
        minBalanceAmount: '',
      }));
      // Pre-populate custom tenant selection
      if (initFilter === 'CUSTOM' && initSelectedTenants) {
        try {
          const parsed: { id: string; name: string }[] = JSON.parse(initSelectedTenants);
          setSelectedTenants(parsed.map(t => ({ id: t.id, label: t.name })));
        } catch { /* ignore */ }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  const [saveCampaign, { loading }] = useMutation(CREATE_UPDATE_CAMPAIGN, {
    refetchQueries: [{ query: CAMPAIGN_LIST_DATA }],
    onCompleted(data: any) {
      const result = data?.createUpdateNotificationCampaignView?.result;
      if (result?.success) {
        router.back();
      } else {
        setServerError(result?.message ?? 'Something went wrong.');
      }
    },
    onError(err: any) {
      setServerError(err.message);
    },
  });

  function setStr(field: keyof typeof form) {
    return (value: string) => {
      setForm(f => ({ ...f, [field]: value }));
      if (errors[field]) setErrors(e => ({ ...e, [field]: '' }));
    };
  }

  function insertPlaceholder(token: string) {
    const pos = msgCursor;
    const current = form.message;
    const next = current.slice(0, pos) + token + current.slice(pos);
    setForm(f => ({ ...f, message: next }));
    setMsgCursor(pos + token.length);
    if (errors.message) setErrors(e => ({ ...e, message: '' }));
  }

  function validate() {
    const e: Partial<Record<keyof typeof form | 'tenants', string>> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.subject.trim()) e.subject = 'Subject is required';
    if (!form.message.trim()) e.message = 'Message is required';
    if (!form.sendEmail && !form.sendSms && !form.sendWhatsapp) {
      e.sendEmail = 'Select at least one channel';
    }
    if (form.filterType === 'CUSTOM' && selectedTenants.length === 0) {
      e.tenants = 'Select at least one tenant';
    }
    return e;
  }

  function submit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e as any); return; }
    setServerError('');
    saveCampaign({
      variables: {
        id: isEdit ? parseInt(campaignId!, 10) : undefined,
        name: form.name.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
        filterType: form.filterType || undefined,
        frequency: form.frequency || undefined,
        sendEmail: form.sendEmail,
        sendSms: form.sendSms,
        sendWhatsapp: form.sendWhatsapp,
        scheduledDatetime: form.scheduledDatetime ? `${form.scheduledDatetime}T00:00:00` : undefined,
        buildingId: form.buildingId ? decodeRelayId(form.buildingId) : undefined,
        minBalanceAmount: form.filterType === 'WITH_BALANCE' && form.minBalanceAmount ? form.minBalanceAmount : undefined,
        tenantIds: form.filterType === 'CUSTOM' ? selectedTenants.map(t => decodeRelayId(t.id)) : undefined,
      },
    });
  }

  return (
    <FormLayout title={isEdit ? 'Edit Campaign' : 'New Campaign'}>
      <ServerErrorBanner message={serverError} />

      <SectionLabel>Campaign details</SectionLabel>

      <Input
        label="Campaign name *"
        error={errors.name}
        value={form.name}
        onChangeText={setStr('name')}
        placeholder="e.g. January Rent Reminder"
        autoCapitalize="words"
      />

      <Input
        label="Subject *"
        error={errors.subject}
        value={form.subject}
        onChangeText={setStr('subject')}
        placeholder="Email subject / notification title"
        autoCapitalize="sentences"
      />

      <Input
        label="Message *"
        error={errors.message}
        value={form.message}
        onChangeText={setStr('message')}
        placeholder="Your message to tenants…"
        multiline
        numberOfLines={5}
        autoCapitalize="sentences"
        onSelectionChange={e => setMsgCursor(e.nativeEvent.selection.start)}
      />

      <View style={styles.placeholderWrap}>
        <Text style={styles.placeholderHint}>Insert placeholder</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.placeholderScroll}
          keyboardShouldPersistTaps="handled"
        >
          {PLACEHOLDER_GROUPS.flatMap((grp, gi) => [
            <Text key={`lbl${gi}`} style={[styles.groupLabel, gi === 0 && { marginLeft: 0 }]}>{grp.group}</Text>,
            ...grp.items.map(item => (
              <TouchableOpacity
                key={item.token}
                style={styles.placeholderChip}
                onPress={() => insertPlaceholder(item.token)}
                activeOpacity={0.7}
              >
                <Text style={styles.placeholderChipText}>{item.label}</Text>
              </TouchableOpacity>
            )),
          ])}
        </ScrollView>
      </View>

      <SectionLabel>Recipients</SectionLabel>

      <View style={{ marginBottom: Spacing.sm }}>
        <Text style={styles.fieldLabel}>Filter type</Text>
        <View style={styles.chipRow}>
          {FILTER_TYPES.map(t => (
            <TouchableOpacity
              key={t.value}
              style={[styles.optionChip, form.filterType === t.value && styles.optionChipActive]}
              onPress={() => {
                setForm(f => ({ ...f, filterType: t.value }));
                if (t.value !== 'CUSTOM') setSelectedTenants([]);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionChipText, form.filterType === t.value && styles.optionChipTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Min balance input for WITH_BALANCE filter */}
      {form.filterType === 'WITH_BALANCE' ? (
        <Input
          label="Minimum balance amount"
          value={form.minBalanceAmount}
          onChangeText={setStr('minBalanceAmount')}
          placeholder="e.g. 5000"
          keyboardType="decimal-pad"
        />
      ) : null}

      {/* Custom tenant multi-select for CUSTOM filter */}
      {form.filterType === 'CUSTOM' ? (
        <View style={{ marginBottom: Spacing.md }}>
          <SearchableDropdown
            label="Select tenants *"
            value=""
            placeholder={selectedTenants.length === 0 ? 'Search and add tenants…' : `${selectedTenants.length} selected`}
            options={tenantOptions}
            onSelect={() => {}}
            onSearch={setTenantSearch}
            loading={tenantsLoading}
            multiSelect
            selectedIds={selectedTenants.map(t => t.id)}
            onToggle={opt => {
              setSelectedTenants(prev => {
                const exists = prev.find(t => t.id === opt.id);
                return exists
                  ? prev.filter(t => t.id !== opt.id)
                  : [...prev, { id: opt.id, label: opt.label }];
              });
              if ((errors as any).tenants) setErrors(e => ({ ...e, tenants: '' }));
            }}
            clearable={false}
          />
          {(errors as any).tenants ? (
            <Text style={[styles.channelError, { marginTop: -Spacing.sm }]}>{(errors as any).tenants}</Text>
          ) : null}
          {selectedTenants.length > 0 ? (
            <View style={styles.tenantChipsWrap}>
              {selectedTenants.map(t => (
                <View key={t.id} style={styles.tenantChip}>
                  <Text style={styles.tenantChipText} numberOfLines={1}>{t.label}</Text>
                  <TouchableOpacity
                    hitSlop={6}
                    onPress={() => setSelectedTenants(prev => prev.filter(x => x.id !== t.id))}
                  >
                    <Ionicons name="close-circle" size={15} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <SearchableDropdown
        label="Building (optional)"
        value={form.buildingId}
        displayValue={buildingDisplay}
        options={buildingOptions}
        onSelect={opt => {
          setForm(f => ({ ...f, buildingId: opt.id }));
          setBuildingDisplay(opt.label);
        }}
        onSearch={setBuildingSearch}
        onClear={() => {
          setForm(f => ({ ...f, buildingId: '' }));
          setBuildingDisplay('');
        }}
        loading={buildingsLoading}
        placeholder="All buildings"
      />

      <SectionLabel>Channels</SectionLabel>

      {errors.sendEmail ? <Text style={styles.channelError}>{errors.sendEmail}</Text> : null}

      <View style={styles.togglesRow}>
        {[
          { key: 'sendEmail' as const, label: 'Email', icon: '??' },
          { key: 'sendSms' as const, label: 'SMS', icon: '??' },
          { key: 'sendWhatsapp' as const, label: 'WhatsApp', icon: '??' },
        ].map(ch => (
          <TouchableOpacity
            key={ch.key}
            style={[styles.toggleChip, form[ch.key] && styles.toggleChipActive]}
            onPress={() => setForm(f => ({ ...f, [ch.key]: !f[ch.key] }))}
            activeOpacity={0.7}
          >
            <Text style={styles.toggleIcon}>{ch.icon}</Text>
            <Text style={[styles.toggleLabel, form[ch.key] && styles.toggleLabelActive]}>{ch.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionLabel>Schedule</SectionLabel>

      <View style={{ marginBottom: Spacing.sm }}>
        <Text style={styles.fieldLabel}>Frequency</Text>
        <View style={styles.chipRow}>
          {FREQUENCIES.map(f => (
            <TouchableOpacity
              key={f.value}
              style={[styles.optionChip, form.frequency === f.value && styles.optionChipActive]}
              onPress={() => setForm(fm => ({ ...fm, frequency: f.value }))}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionChipText, form.frequency === f.value && styles.optionChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <DatePickerInput
        label="Scheduled date"
        value={form.scheduledDatetime}
        onChange={setStr('scheduledDatetime')}
        placeholder="Select scheduled date"
      />

      <Button title={isEdit ? 'Save changes' : 'Create campaign'} onPress={submit} loading={loading} />
    </FormLayout>
  );
}

/** Decode a Relay global ID (base64 "TypeName:123") to its numeric part. */
function decodeRelayId(relayId: string): number | undefined {
  try {
    const decoded = atob(relayId);
    const parts = decoded.split(':');
    const num = parseInt(parts[parts.length - 1], 10);
    return isNaN(num) ? undefined : num;
  } catch {
    const num = parseInt(relayId, 10);
    return isNaN(num) ? undefined : num;
  }
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    fieldLabel: {
      fontSize: Typography.fontSizeSm,
      fontWeight: '500',
      color: c.textSecondary,
      marginBottom: Spacing.xs,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
    optionChip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: 8,
      borderRadius: Radius.full,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    optionChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    optionChipText: { fontSize: Typography.fontSizeSm, fontWeight: '500', color: c.textMuted },
    optionChipTextActive: { color: '#fff' },
    channelError: { fontSize: Typography.fontSizeXs, color: c.error, marginBottom: Spacing.xs },
    togglesRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    toggleChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    toggleChipActive: { backgroundColor: c.primary + '20', borderColor: c.primary },
    toggleIcon: { fontSize: 14 },
    toggleLabel: { fontSize: Typography.fontSizeXs, fontWeight: '500', color: c.textMuted },
    toggleLabelActive: { color: c.primary },
    placeholderWrap: {
      marginTop: -Spacing.sm,
      marginBottom: Spacing.md,
      borderWidth: 1.5,
      borderColor: c.border,
      borderBottomLeftRadius: Radius.md,
      borderBottomRightRadius: Radius.md,
      overflow: 'hidden',
    },
    placeholderHint: {
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
      paddingHorizontal: Spacing.md,
      paddingVertical: 5,
      backgroundColor: c.surfaceAlt,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    placeholderScroll: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.sm,
      paddingVertical: 6,
      gap: 4,
    },
    groupLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginLeft: Spacing.sm,
      marginRight: 2,
    },
    placeholderChip: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: Radius.full,
      backgroundColor: c.primary + '18',
      borderWidth: 1,
      borderColor: c.primary + '40',
    },
    placeholderChipText: {
      fontSize: 11,
      color: c.primary,
      fontWeight: '500',
    },
    tenantChipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
      marginTop: Spacing.xs,
    },
    tenantChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 5,
      borderRadius: Radius.full,
      borderWidth: 1.5,
      borderColor: c.primary + '60',
      backgroundColor: c.primary + '12',
      maxWidth: 180,
    },
    tenantChipText: {
      fontSize: Typography.fontSizeSm,
      color: c.primary,
      fontWeight: '500',
      flexShrink: 1,
    },
  });
}
