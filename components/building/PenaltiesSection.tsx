import { SectionCard } from '@/components/ui/SectionCard';
import { Colors, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

type CalcType = 'FIXED' | 'PERCENTAGE' | 'DAILY_RATE';

type PenaltyForm = {
  id: string;
  name: string;
  calculationType: CalcType;
  fixedAmount: string;
  percentage: string;
  dailyRate: string;
  gracePeriodDays: string;
  isActive: boolean;
};

type PenaltyTestForm = {
  ruleId: string;
  rentAmount: string;
  daysOverdue: string;
};

type PenaltiesSectionProps = {
  styles: any;
  colors: any;
  penaltyForm: PenaltyForm;
  setPenaltyForm: React.Dispatch<React.SetStateAction<PenaltyForm>>;
  onResetPenaltyForm: () => void;
  savingPenalty: boolean;
  savePenaltyRule: () => void;
  penaltyRules: any[];
  rulesLoading: boolean;
  startEditPenalty: (rule: any) => void;
  onTogglePenaltyRule: (ruleId: string) => void;
  onDeletePenaltyRule: (ruleId: string) => void;
  appliedPenalties: any[];
  appliedLoading: boolean;
  formatDate: (value?: string | null) => string;
  penaltyTestForm: PenaltyTestForm;
  setPenaltyTestForm: React.Dispatch<React.SetStateAction<PenaltyTestForm>>;
  testingPenalty: boolean;
  runPenaltyTest: () => void;
};

export function PenaltiesSection({
  styles,
  colors,
  penaltyForm,
  setPenaltyForm,
  onResetPenaltyForm,
  savingPenalty,
  savePenaltyRule,
  penaltyRules,
  rulesLoading,
  startEditPenalty,
  onTogglePenaltyRule,
  onDeletePenaltyRule,
  appliedPenalties,
  appliedLoading,
  formatDate,
  penaltyTestForm,
  setPenaltyTestForm,
  testingPenalty,
  runPenaltyTest,
}: PenaltiesSectionProps) {
  return (
    <>
      <SectionCard title={penaltyForm.id ? 'Edit Penalty Rule' : 'Create Penalty Rule'}>
        <TextInput
          style={styles.textInput}
          placeholder="Rule name"
          placeholderTextColor={colors.textMuted}
          value={penaltyForm.name}
          onChangeText={(v) => setPenaltyForm((s) => ({ ...s, name: v }))}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unitStatusRow}>
          {(['FIXED', 'PERCENTAGE', 'DAILY_RATE'] as CalcType[]).map((ct) => (
            <TouchableOpacity
              key={ct}
              style={[styles.statusChip, penaltyForm.calculationType === ct && styles.statusChipActive]}
              onPress={() => setPenaltyForm((s) => ({ ...s, calculationType: ct }))}
            >
              <Text style={[styles.statusChipText, penaltyForm.calculationType === ct && styles.statusChipTextActive]}>
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
            value={penaltyForm.fixedAmount}
            onChangeText={(v) => setPenaltyForm((s) => ({ ...s, fixedAmount: v }))}
          />
          <TextInput
            style={[styles.textInput, styles.inlineInput]}
            placeholder="Percent"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            value={penaltyForm.percentage}
            onChangeText={(v) => setPenaltyForm((s) => ({ ...s, percentage: v }))}
          />
        </View>

        <View style={styles.inlineInputs}>
          <TextInput
            style={[styles.textInput, styles.inlineInput]}
            placeholder="Daily rate"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            value={penaltyForm.dailyRate}
            onChangeText={(v) => setPenaltyForm((s) => ({ ...s, dailyRate: v }))}
          />
          <TextInput
            style={[styles.textInput, styles.inlineInput]}
            placeholder="Grace days"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            value={penaltyForm.gracePeriodDays}
            onChangeText={(v) => setPenaltyForm((s) => ({ ...s, gracePeriodDays: v }))}
          />
        </View>

        <View style={styles.prefRow}>
          <Text style={styles.prefTitle}>Active</Text>
          <Switch
            value={penaltyForm.isActive}
            onValueChange={(v) => setPenaltyForm((s) => ({ ...s, isActive: v }))}
            thumbColor="#ffffff"
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>

        <View style={styles.actionRow}>
          {penaltyForm.id ? (
            <TouchableOpacity style={[styles.ghostBtn, { flex: 1 }]} onPress={onResetPenaltyForm}>
              <Text style={styles.ghostBtnText}>Cancel Edit</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.primaryBtn, { flex: 1 }, savingPenalty && { opacity: 0.6 }]}
            onPress={savePenaltyRule}
            disabled={savingPenalty}
          >
            <Text style={styles.primaryBtnText}>{savingPenalty ? 'Saving...' : penaltyForm.id ? 'Update Rule' : 'Create Rule'}</Text>
          </TouchableOpacity>
        </View>
      </SectionCard>

      <SectionCard title={`Rules (${penaltyRules.length})`}>
        {rulesLoading ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: Spacing.md }} />
        ) : penaltyRules.length === 0 ? (
          <Text style={styles.emptyText}>No penalty rules configured.</Text>
        ) : (
          penaltyRules.map((rule: any) => (
            <View key={rule.id} style={styles.listRowTall}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{rule.name}</Text>
                <Text style={styles.listSub}>
                  {(rule.calculationType ?? 'N/A').replace(/_/g, ' ')} · Grace {rule.gracePeriodDays ?? 0} day(s)
                </Text>
              </View>
              <View style={styles.iconActions}>
                <TouchableOpacity onPress={() => startEditPenalty(rule)} hitSlop={8}>
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onTogglePenaltyRule(rule.id)} hitSlop={8}>
                  <Ionicons name={rule.isActive ? 'pause-circle-outline' : 'play-circle-outline'} size={18} color={Colors.warning} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onDeletePenaltyRule(rule.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard title={`Applied Penalties (${appliedPenalties.length})`}>
        {appliedLoading ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: Spacing.md }} />
        ) : appliedPenalties.length === 0 ? (
          <Text style={styles.emptyText}>No applied penalties found.</Text>
        ) : (
          appliedPenalties.map((entry: any) => (
            <View key={entry.id} style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{entry.penaltyRule?.name ?? 'Penalty'}</Text>
                <Text style={styles.listSub}>{formatDate(entry.createdAt)}</Text>
              </View>
              <Text style={styles.amountText}>KES {Number(entry.amount ?? 0).toLocaleString()}</Text>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard title="Test Penalty Calculation">
        <Text style={styles.helperText}>Validate a selected rule before applying it globally.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unitStatusRow}>
          {penaltyRules.map((rule: any) => {
            const active = penaltyTestForm.ruleId === rule.id;
            return (
              <TouchableOpacity
                key={rule.id}
                style={[styles.statusChip, active && styles.statusChipActive]}
                onPress={() => setPenaltyTestForm((s) => ({ ...s, ruleId: rule.id }))}
              >
                <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>{rule.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={styles.inlineInputs}>
          <TextInput
            style={[styles.textInput, styles.inlineInput]}
            placeholder="Rent amount"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            value={penaltyTestForm.rentAmount}
            onChangeText={(v) => setPenaltyTestForm((s) => ({ ...s, rentAmount: v }))}
          />
          <TextInput
            style={[styles.textInput, styles.inlineInput]}
            placeholder="Days overdue"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            value={penaltyTestForm.daysOverdue}
            onChangeText={(v) => setPenaltyTestForm((s) => ({ ...s, daysOverdue: v }))}
          />
        </View>
        <TouchableOpacity
          style={[styles.primaryBtn, testingPenalty && { opacity: 0.6 }]}
          onPress={runPenaltyTest}
          disabled={testingPenalty}
        >
          <Text style={styles.primaryBtnText}>{testingPenalty ? 'Testing...' : 'Run Test'}</Text>
        </TouchableOpacity>
      </SectionCard>
    </>
  );
}
