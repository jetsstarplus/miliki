import { SectionCard } from '@/components/ui/SectionCard';
import { Colors, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

type ChannelSectionKey = 'due' | 'arrears' | 'charges';
type ChannelKey = 'enabled' | 'sms' | 'email' | 'whatsapp';

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

type NotificationsSectionProps = {
  styles: any;
  colors: any;
  blockAllNotifications: boolean;
  setBlockAllNotifications: (value: boolean) => void;
  prefs: NotificationPrefsForm;
  setPrefs: React.Dispatch<React.SetStateAction<NotificationPrefsForm>>;
  setChannel: (section: ChannelSectionKey, channel: ChannelKey, value: boolean) => void;
  savingPrefs: boolean;
  saveNotifications: () => void;
  onCreateCampaign: () => void;
  buildingCampaigns: any[];
  onCampaignAction: (action: 'preview' | 'send' | 'toggle' | 'delete', campaignId: string) => void;
};

export function NotificationsSection({
  styles,
  colors,
  blockAllNotifications,
  setBlockAllNotifications,
  prefs,
  setPrefs,
  setChannel,
  savingPrefs,
  saveNotifications,
  onCreateCampaign,
  buildingCampaigns,
  onCampaignAction,
}: NotificationsSectionProps) {
  return (
    <SectionCard title="Building Notifications">
      <View style={styles.prefRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.prefTitle}>Block all automatic notifications</Text>
          <Text style={styles.prefSub}>Disable automatic reminders and notification jobs for this building.</Text>
        </View>
        <Switch
          value={blockAllNotifications}
          onValueChange={setBlockAllNotifications}
          thumbColor="#ffffff"
          trackColor={{ true: colors.primary, false: colors.border }}
        />
      </View>

      <View style={styles.prefGroup}>
        <Text style={styles.prefGroupTitle}>Days Before Due Reminder</Text>
        <TextInput
          value={String(prefs.daysBeforeDue)}
          onChangeText={(v) => setPrefs((p) => ({ ...p, daysBeforeDue: Number(v) || 0 }))}
          keyboardType="number-pad"
          style={styles.textInput}
        />
      </View>

      {([
        { key: 'due', label: 'Rent Due Reminder' },
        { key: 'arrears', label: 'Arrears Reminder' },
        { key: 'charges', label: 'New Charge Posted' },
      ] as const).map((section) => {
        const value = prefs[section.key];
        return (
          <View key={section.key} style={styles.prefGroup}>
            <View style={styles.prefRow}>
              <Text style={styles.prefTitle}>{section.label}</Text>
              <Switch
                value={value.enabled}
                onValueChange={(v) => setChannel(section.key, 'enabled', v)}
                thumbColor="#ffffff"
                trackColor={{ true: colors.primary, false: colors.border }}
              />
            </View>
            <View style={styles.channelRow}>
              {(['sms', 'email', 'whatsapp'] as const).map((ch) => (
                <TouchableOpacity
                  key={ch}
                  style={[styles.channelChip, value[ch] && styles.channelChipActive]}
                  onPress={() => setChannel(section.key, ch, !value[ch])}
                >
                  <Text style={[styles.channelChipText, value[ch] && styles.channelChipTextActive]}>{ch.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })}

      <TouchableOpacity
        style={[styles.primaryBtn, savingPrefs && { opacity: 0.6 }]}
        onPress={saveNotifications}
        disabled={savingPrefs}
      >
        <Text style={styles.primaryBtnText}>{savingPrefs ? 'Saving...' : 'Save Preferences'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.ghostBtn, { marginTop: Spacing.sm }]} onPress={onCreateCampaign}>
        <Text style={styles.ghostBtnText}>Create Tenant Notification Campaign</Text>
      </TouchableOpacity>

      <View style={{ marginTop: Spacing.md }}>
        <Text style={styles.prefGroupTitle}>Campaigns ({buildingCampaigns.length})</Text>
        {buildingCampaigns.length === 0 ? (
          <Text style={styles.emptyText}>No campaigns created for this building.</Text>
        ) : (
          buildingCampaigns.map((c: any) => (
            <View key={c.id} style={styles.listRowTall}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{c.name}</Text>
                <Text style={styles.listSub}>{c.status || 'DRAFT'} {c.frequency ? `· ${c.frequency}` : ''}</Text>
              </View>
              <View style={styles.iconActions}>
                <TouchableOpacity onPress={() => onCampaignAction('preview', c.id)} hitSlop={8}>
                  <Ionicons name="people-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onCampaignAction('send', c.id)} hitSlop={8}>
                  <Ionicons name="paper-plane-outline" size={18} color={Colors.success} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onCampaignAction('toggle', c.id)} hitSlop={8}>
                  <Ionicons name="power-outline" size={18} color={Colors.warning} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onCampaignAction('delete', c.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </SectionCard>
  );
}
