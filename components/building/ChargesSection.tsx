import { InfoRow } from '@/components/ui/InfoRow';
import { SectionCard } from '@/components/ui/SectionCard';
import { Colors, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';

type ChargeType = 'FIXED' | 'USAGE_BASED';
type ChargeView = 'definitions' | 'actions' | 'summary';
type ActionPanelKey = 'apply' | 'post' | 'updateVoid';

type ChargeRowInput = { occupancyId: string; amount: string; unitsUsed: string };
type ActionOption = { id: string; label: string };

type ChargeForm = {
  id: string;
  name: string;
  chargeType: ChargeType;
  serviceTypeId: string;
  fixedAmount: string;
  ratePerUnit: string;
  unitLabel: string;
  description: string;
  isActive: boolean;
};

type ChargeActionForm = {
  definitionId: string;
  billingMonth: string;
  chargeDate: string;
  dueDate: string;
  notes: string;
  occupancyId: string;
  amount: string;
  unitsUsed: string;
  entryId: string;
  chargeId: string;
  scheduleId: string;
};

type ChargesSectionProps = {
  styles: any;
  colors: any;
  chargeForm: ChargeForm;
  setChargeForm: React.Dispatch<React.SetStateAction<ChargeForm>>;
  onResetChargeForm: () => void;
  savingChargeDef: boolean;
  saveChargeDef: () => void;
  chargeDefinitions: any[];
  extraChargesLoading: boolean;
  startEditCharge: (def: any) => void;
  onDeleteChargeDefinition: (definitionId: string) => void;
  chargeActionForm: ChargeActionForm;
  setChargeActionForm: React.Dispatch<React.SetStateAction<ChargeActionForm>>;
  occupancyOptions: ActionOption[];
  chargeRows: ChargeRowInput[];
  updateChargeRow: (index: number, patch: Partial<ChargeRowInput>) => void;
  removeChargeRow: (index: number) => void;
  addChargeRow: () => void;
  entryOptions: ActionOption[];
  chargeOptions: ActionOption[];
  scheduleOptions: ActionOption[];
  selectEntryForActions: (entryId: string) => void;
  selectChargeForVoid: (chargeId: string) => void;
  selectScheduleForVoid: (scheduleId: string) => void;
  runApplyCharges: () => void;
  applyingCharges: boolean;
  runPostTenantCharge: () => void;
  postingTenantCharge: boolean;
  runUpdateChargeEntry: () => void;
  updatingChargeEntry: boolean;
  runVoidCharge: () => void;
  voidingTenantCharge: boolean;
  runVoidSchedule: () => void;
  voidingRentSchedule: boolean;
  chargesLoading: boolean;
  chargesReport: any;
};

export function ChargesSection({
  styles,
  colors,
  chargeForm,
  setChargeForm,
  onResetChargeForm,
  savingChargeDef,
  saveChargeDef,
  chargeDefinitions,
  extraChargesLoading,
  startEditCharge,
  onDeleteChargeDefinition,
  chargeActionForm,
  setChargeActionForm,
  occupancyOptions,
  chargeRows,
  updateChargeRow,
  removeChargeRow,
  addChargeRow,
  entryOptions,
  chargeOptions,
  scheduleOptions,
  selectEntryForActions,
  selectChargeForVoid,
  selectScheduleForVoid,
  runApplyCharges,
  applyingCharges,
  runPostTenantCharge,
  postingTenantCharge,
  runUpdateChargeEntry,
  updatingChargeEntry,
  runVoidCharge,
  voidingTenantCharge,
  runVoidSchedule,
  voidingRentSchedule,
  chargesLoading,
  chargesReport,
}: ChargesSectionProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [chargeView, setChargeView] = useState<ChargeView>('definitions');
  const [expandedPanel, setExpandedPanel] = useState<ActionPanelKey | null>('apply');
  const localStyles = useMemo(() => makeLocalStyles(colors), [colors]);

  const togglePanel = (panel: ActionPanelKey) => {
    setExpandedPanel((prev) => (prev === panel ? null : panel));
  };

  return (
    <>
      <SectionCard title="Charges Workspace">
        <Text style={styles.helperText}>Choose a workflow view to reduce clutter and focus on one task at a time.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unitStatusRow}>
          {([
            { key: 'definitions', label: 'Definitions' },
            { key: 'actions', label: 'Actions' },
            { key: 'summary', label: 'Summary' },
          ] as const).map((item) => {
            const active = chargeView === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.statusChip, active && styles.statusChipActive]}
                onPress={() => setChargeView(item.key)}
              >
                <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SectionCard>

      {chargeView === 'definitions' && (
        <>
          <SectionCard title={chargeForm.id ? 'Edit Charge Definition' : 'Create Charge Definition'}>
            <TextInput
              style={styles.textInput}
              placeholder="Definition name"
              placeholderTextColor={colors.textMuted}
              value={chargeForm.name}
              onChangeText={(v) => setChargeForm((s) => ({ ...s, name: v }))}
            />
            <View style={styles.inlineInputs}>
              <TextInput
                style={[styles.textInput, styles.inlineInput]}
                placeholder="Service Type ID"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                value={chargeForm.serviceTypeId}
                onChangeText={(v) => setChargeForm((s) => ({ ...s, serviceTypeId: v }))}
              />
              <TextInput
                style={[styles.textInput, styles.inlineInput]}
                placeholder="Unit label (optional)"
                placeholderTextColor={colors.textMuted}
                value={chargeForm.unitLabel}
                onChangeText={(v) => setChargeForm((s) => ({ ...s, unitLabel: v }))}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unitStatusRow}>
              {(['FIXED', 'USAGE_BASED'] as ChargeType[]).map((ct) => (
                <TouchableOpacity
                  key={ct}
                  style={[styles.statusChip, chargeForm.chargeType === ct && styles.statusChipActive]}
                  onPress={() => setChargeForm((s) => ({ ...s, chargeType: ct }))}
                >
                  <Text style={[styles.statusChipText, chargeForm.chargeType === ct && styles.statusChipTextActive]}>
                    {ct.replace(/_/g, ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.inlineInputs}>
              <TextInput
                style={[styles.textInput, styles.inlineInput]}
                placeholder="Fixed amount"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={chargeForm.fixedAmount}
                onChangeText={(v) => setChargeForm((s) => ({ ...s, fixedAmount: v }))}
              />
              <TextInput
                style={[styles.textInput, styles.inlineInput]}
                placeholder="Rate per unit"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={chargeForm.ratePerUnit}
                onChangeText={(v) => setChargeForm((s) => ({ ...s, ratePerUnit: v }))}
              />
            </View>

            <TextInput
              style={[styles.textInput, styles.textInputMultiline]}
              placeholder="Description"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={chargeForm.description}
              onChangeText={(v) => setChargeForm((s) => ({ ...s, description: v }))}
            />

            <View style={styles.prefRow}>
              <Text style={styles.prefTitle}>Active</Text>
              <Switch
                value={chargeForm.isActive}
                onValueChange={(v) => setChargeForm((s) => ({ ...s, isActive: v }))}
                thumbColor="#ffffff"
                trackColor={{ true: colors.primary, false: colors.border }}
              />
            </View>

            <View style={styles.actionRow}>
              {chargeForm.id ? (
                <TouchableOpacity style={[styles.ghostBtn, { flex: 1 }]} onPress={onResetChargeForm}>
                  <Text style={styles.ghostBtnText}>Cancel Edit</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1 }, savingChargeDef && { opacity: 0.6 }]}
                onPress={saveChargeDef}
                disabled={savingChargeDef}
              >
                <Text style={styles.primaryBtnText}>{savingChargeDef ? 'Saving...' : chargeForm.id ? 'Update Definition' : 'Create Definition'}</Text>
              </TouchableOpacity>
            </View>
          </SectionCard>

          <SectionCard title={`Definitions (${chargeDefinitions.length})`}>
            {extraChargesLoading ? (
              <ActivityIndicator color={colors.primary} style={{ paddingVertical: Spacing.md }} />
            ) : chargeDefinitions.length === 0 ? (
              <Text style={styles.emptyText}>No charge definitions found from extra charges payload.</Text>
            ) : (
              chargeDefinitions.map((def: any) => (
                <View key={def.id ?? `${def.name}-${def.chargeType}`} style={styles.listRowTall}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listTitle}>{def.name ?? 'Charge Definition'}</Text>
                    <Text style={styles.listSub}>{(def.chargeType ?? 'N/A').replace(/_/g, ' ')}</Text>
                  </View>
                  <View style={styles.iconActions}>
                    <TouchableOpacity onPress={() => startEditCharge(def)} hitSlop={8}>
                      <Ionicons name="create-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    {def.id ? (
                      <TouchableOpacity onPress={() => onDeleteChargeDefinition(def.id)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={18} color={Colors.error} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </SectionCard>
        </>
      )}

      {chargeView === 'actions' && (
        <>
          <SectionCard title="Action Setup">
            <Text style={styles.helperText}>Set shared values, then expand only the action panel you need.</Text>
            <Text style={styles.prefGroupTitle}>Charge Definition</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unitStatusRow}>
              {chargeDefinitions.map((def: any) => {
                const active = chargeActionForm.definitionId === def.id;
                return (
                  <TouchableOpacity
                    key={def.id}
                    style={[styles.statusChip, active && styles.statusChipActive]}
                    onPress={() => setChargeActionForm((s) => ({ ...s, definitionId: def.id }))}
                  >
                    <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>{def.name ?? 'Definition'}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.inlineInputs}>
              <TextInput
                style={[styles.textInput, styles.inlineInput]}
                placeholder="Billing month (YYYY-MM)"
                placeholderTextColor={colors.textMuted}
                value={chargeActionForm.billingMonth}
                onChangeText={(v) => setChargeActionForm((s) => ({ ...s, billingMonth: v }))}
              />
              <TextInput
                style={[styles.textInput, styles.inlineInput]}
                placeholder="Definition ID (optional override)"
                placeholderTextColor={colors.textMuted}
                value={chargeActionForm.definitionId}
                onChangeText={(v) => setChargeActionForm((s) => ({ ...s, definitionId: v }))}
              />
            </View>
            <View style={styles.inlineInputs}>
              <TextInput
                style={[styles.textInput, styles.inlineInput]}
                placeholder="Charge date (YYYY-MM-DD)"
                placeholderTextColor={colors.textMuted}
                value={chargeActionForm.chargeDate}
                onChangeText={(v) => setChargeActionForm((s) => ({ ...s, chargeDate: v }))}
              />
              <TextInput
                style={[styles.textInput, styles.inlineInput]}
                placeholder="Due date (YYYY-MM-DD)"
                placeholderTextColor={colors.textMuted}
                value={chargeActionForm.dueDate}
                onChangeText={(v) => setChargeActionForm((s) => ({ ...s, dueDate: v }))}
              />
            </View>
          </SectionCard>

          <View style={localStyles.panelCard}>
            <TouchableOpacity style={localStyles.panelHeader} onPress={() => togglePanel('apply')} activeOpacity={0.8}>
              <View style={{ flex: 1 }}>
                <Text style={localStyles.panelTitle}>Apply Building Charges</Text>
                <Text style={localStyles.panelSub}>Manage rows and apply charges in bulk.</Text>
              </View>
              <Ionicons name={expandedPanel === 'apply' ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            {expandedPanel === 'apply' && (
              <View style={localStyles.panelContent}>
                {chargeRows.map((row, idx) => (
                  <View key={`row-${idx}`} style={styles.rowBox}>
                    <Text style={styles.listSub}>Row {idx + 1}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unitStatusRow}>
                      {occupancyOptions.map((opt) => {
                        const active = row.occupancyId === opt.id;
                        return (
                          <TouchableOpacity
                            key={`${opt.id}-${idx}`}
                            style={[styles.statusChip, active && styles.statusChipActive]}
                            onPress={() => updateChargeRow(idx, { occupancyId: opt.id })}
                          >
                            <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>{opt.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                    <View style={styles.inlineInputs}>
                      <TextInput
                        style={[styles.textInput, styles.inlineInput]}
                        placeholder="Amount"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                        value={row.amount}
                        onChangeText={(v) => updateChargeRow(idx, { amount: v })}
                      />
                      <TextInput
                        style={[styles.textInput, styles.inlineInput]}
                        placeholder="Units used"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                        value={row.unitsUsed}
                        onChangeText={(v) => updateChargeRow(idx, { unitsUsed: v })}
                      />
                    </View>
                    <TouchableOpacity style={styles.ghostBtn} onPress={() => removeChargeRow(idx)}>
                      <Text style={styles.ghostBtnText}>Remove Row</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.ghostBtn} onPress={addChargeRow}>
                  <Text style={styles.ghostBtnText}>Add Charge Row</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={localStyles.panelCard}>
            <TouchableOpacity style={localStyles.panelHeader} onPress={() => togglePanel('post')} activeOpacity={0.8}>
              <View style={{ flex: 1 }}>
                <Text style={localStyles.panelTitle}>Post Tenant Charge</Text>
                <Text style={localStyles.panelSub}>Choose occupancy and amount for manual posting.</Text>
              </View>
              <Ionicons name={expandedPanel === 'post' ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            {expandedPanel === 'post' && (
              <View style={localStyles.panelContent}>
                <Text style={styles.prefGroupTitle}>Occupancy for Tenant Post</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unitStatusRow}>
                  {occupancyOptions.map((opt) => {
                    const active = chargeActionForm.occupancyId === opt.id;
                    return (
                      <TouchableOpacity
                        key={`occ-${opt.id}`}
                        style={[styles.statusChip, active && styles.statusChipActive]}
                        onPress={() => setChargeActionForm((s) => ({ ...s, occupancyId: opt.id }))}
                      >
                        <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>{opt.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <View style={styles.inlineInputs}>
                  <TextInput
                    style={[styles.textInput, styles.inlineInput]}
                    placeholder="Amount"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    value={chargeActionForm.amount}
                    onChangeText={(v) => setChargeActionForm((s) => ({ ...s, amount: v }))}
                  />
                  <TextInput
                    style={[styles.textInput, styles.inlineInput]}
                    placeholder="Units used"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    value={chargeActionForm.unitsUsed}
                    onChangeText={(v) => setChargeActionForm((s) => ({ ...s, unitsUsed: v }))}
                  />
                </View>
              </View>
            )}
          </View>

          <View style={localStyles.panelCard}>
            <TouchableOpacity style={localStyles.panelHeader} onPress={() => togglePanel('updateVoid')} activeOpacity={0.8}>
              <View style={{ flex: 1 }}>
                <Text style={localStyles.panelTitle}>Update and Void</Text>
                <Text style={localStyles.panelSub}>Pick existing entries, charges, and schedules to modify.</Text>
              </View>
              <Ionicons name={expandedPanel === 'updateVoid' ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            {expandedPanel === 'updateVoid' && (
              <View style={localStyles.panelContent}>
                <Text style={styles.prefGroupTitle}>Entry for Update</Text>
                {entryOptions.length === 0 ? (
                  <Text style={styles.emptyText}>No charge history entries found for selector yet.</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unitStatusRow}>
                    {entryOptions.map((opt) => {
                      const active = chargeActionForm.entryId === opt.id;
                      return (
                        <TouchableOpacity
                          key={`entry-${opt.id}`}
                          style={[styles.statusChip, active && styles.statusChipActive]}
                          onPress={() => selectEntryForActions(opt.id)}
                        >
                          <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>{opt.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                <Text style={styles.prefGroupTitle}>Charge for Void Tenant Charge</Text>
                {chargeOptions.length === 0 ? (
                  <Text style={styles.emptyText}>No charge records found for selector yet.</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unitStatusRow}>
                    {chargeOptions.map((opt) => {
                      const active = chargeActionForm.chargeId === opt.id;
                      return (
                        <TouchableOpacity
                          key={`charge-${opt.id}`}
                          style={[styles.statusChip, active && styles.statusChipActive]}
                          onPress={() => selectChargeForVoid(opt.id)}
                        >
                          <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>{opt.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                <Text style={styles.prefGroupTitle}>Schedule for Void Rent Schedule</Text>
                {scheduleOptions.length === 0 ? (
                  <Text style={styles.emptyText}>No schedules found for selector yet.</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unitStatusRow}>
                    {scheduleOptions.map((opt) => {
                      const active = chargeActionForm.scheduleId === opt.id;
                      return (
                        <TouchableOpacity
                          key={`schedule-${opt.id}`}
                          style={[styles.statusChip, active && styles.statusChipActive]}
                          onPress={() => selectScheduleForVoid(opt.id)}
                        >
                          <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>{opt.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                <View style={styles.inlineInputs}>
                  <TextInput
                    style={[styles.textInput, styles.inlineInput]}
                    placeholder="Entry ID override (optional)"
                    placeholderTextColor={colors.textMuted}
                    value={chargeActionForm.entryId}
                    onChangeText={(v) => setChargeActionForm((s) => ({ ...s, entryId: v }))}
                  />
                  <TextInput
                    style={[styles.textInput, styles.inlineInput]}
                    placeholder="Charge ID override (optional)"
                    placeholderTextColor={colors.textMuted}
                    value={chargeActionForm.chargeId}
                    onChangeText={(v) => setChargeActionForm((s) => ({ ...s, chargeId: v }))}
                  />
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Schedule ID override (optional)"
                  placeholderTextColor={colors.textMuted}
                  value={chargeActionForm.scheduleId}
                  onChangeText={(v) => setChargeActionForm((s) => ({ ...s, scheduleId: v }))}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Notes"
                  placeholderTextColor={colors.textMuted}
                  value={chargeActionForm.notes}
                  onChangeText={(v) => setChargeActionForm((s) => ({ ...s, notes: v }))}
                />
              </View>
            )}
          </View>

          <View style={localStyles.stickyActionDock}>
            <Text style={localStyles.dockTitle}>Quick Actions</Text>
            {(isTablet || expandedPanel === 'apply') && (
              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }, applyingCharges && { opacity: 0.6 }]} onPress={runApplyCharges} disabled={applyingCharges}>
                  <Text style={styles.primaryBtnText}>{applyingCharges ? 'Applying...' : 'Apply Charges'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {(isTablet || expandedPanel === 'post') && (
              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.ghostBtn, { flex: 1 }, postingTenantCharge && { opacity: 0.6 }]} onPress={runPostTenantCharge} disabled={postingTenantCharge}>
                  <Text style={styles.ghostBtnText}>{postingTenantCharge ? 'Posting...' : 'Post Charge'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {(isTablet || expandedPanel === 'updateVoid') && (
              <>
                <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.ghostBtn, { flex: 1 }, updatingChargeEntry && { opacity: 0.6 }]} onPress={runUpdateChargeEntry} disabled={updatingChargeEntry}>
                    <Text style={styles.ghostBtnText}>{updatingChargeEntry ? 'Updating...' : 'Update Entry'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.ghostBtn, { flex: 1 }, voidingTenantCharge && { opacity: 0.6 }]} onPress={runVoidCharge} disabled={voidingTenantCharge}>
                    <Text style={styles.ghostBtnText}>{voidingTenantCharge ? 'Voiding...' : 'Void Charge'}</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={[styles.ghostBtn, voidingRentSchedule && { opacity: 0.6 }]} onPress={runVoidSchedule} disabled={voidingRentSchedule}>
                  <Text style={styles.ghostBtnText}>{voidingRentSchedule ? 'Voiding...' : 'Void Schedule'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </>
      )}

      {chargeView === 'summary' && (
        <SectionCard title="Charges Report Summary">
          {chargesLoading ? (
            <ActivityIndicator color={colors.primary} style={{ paddingVertical: Spacing.md }} />
          ) : chargesReport ? (
            <>
              <View style={[styles.inlineInputs, { marginBottom: Spacing.sm }]}> 
                <View style={styles.rowBox}>
                  <Text style={styles.listSub}>Total Charges</Text>
                  <Text style={styles.listTitle}>{String(chargesReport.totalCharges ?? '-')}</Text>
                </View>
                <View style={styles.rowBox}>
                  <Text style={styles.listSub}>Outstanding</Text>
                  <Text style={[styles.listTitle, { color: Colors.error }]}>KES {Number(chargesReport.totalOutstanding ?? 0).toLocaleString()}</Text>
                </View>
              </View>
              <InfoRow label="Total Amount" icon="cash-outline" value={`KES ${Number(chargesReport.totalAmount ?? 0).toLocaleString()}`} />
              <InfoRow label="Total Paid" icon="checkmark-circle-outline" value={`KES ${Number(chargesReport.totalPaid ?? 0).toLocaleString()}`} />
              <InfoRow label="Outstanding" icon="alert-circle-outline" value={`KES ${Number(chargesReport.totalOutstanding ?? 0).toLocaleString()}`} />
            </>
          ) : (
            <Text style={styles.emptyText}>No charges report data available.</Text>
          )}
        </SectionCard>
      )}
    </>
  );
}

function makeLocalStyles(colors: any) {
  return StyleSheet.create({
    panelCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderRadius: 12,
      marginBottom: Spacing.sm,
      overflow: 'hidden',
    },
    panelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      backgroundColor: colors.surfaceAlt,
    },
    panelTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    panelSub: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 1,
    },
    panelContent: {
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.sm,
    },
    stickyActionDock: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderRadius: 12,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
    },
    dockTitle: {
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      color: colors.textMuted,
      fontWeight: '600',
      marginBottom: Spacing.xs,
    },
  });
}
