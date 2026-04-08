import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import {
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';
import { Radius, Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../context/theme';

interface DatePickerInputProps {
  label?: string;
  value: string; // YYYY-MM-DD, empty string = no date
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  containerStyle?: ViewStyle;
  minimumDate?: Date;
  maximumDate?: Date;
}

function strToDate(str: string): Date {
  if (!str) return new Date();
  const parts = str.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function dateToStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplay(str: string): string | null {
  if (!str) return null;
  try {
    const parts = str.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return str;
  }
}

export function DatePickerInput({
  label,
  value,
  onChange,
  placeholder,
  error,
  containerStyle,
  minimumDate,
  maximumDate,
}: DatePickerInputProps) {
  const { colors } = useTheme();
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(() => strToDate(value));
  const displayValue = formatDisplay(value);

  function open() {
    setTempDate(strToDate(value));
    setShow(true);
  }

  function clear() {
    onChange('');
  }

  // Android: picker renders inline when visible
  if (Platform.OS === 'android') {
    return (
      <View style={[styles.container, containerStyle]}>
        {label ? <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text> : null}
        <TouchableOpacity
          style={[
            styles.field,
            {
              backgroundColor: colors.inputBackground,
              borderColor: error ? colors.error : colors.border,
            },
          ]}
          onPress={open}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.valueText, { color: displayValue ? colors.text : colors.textMuted }]}>
            {displayValue ?? placeholder ?? 'Select date'}
          </Text>
          {value ? (
            <TouchableOpacity onPress={clear} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </TouchableOpacity>
        {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
        {show && (
          <DateTimePicker
            mode="date"
            display="spinner"
            value={tempDate}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={(_: DateTimePickerEvent, selected?: Date) => {
              setShow(false);
              if (selected) onChange(dateToStr(selected));
            }}
          />
        )}
      </View>
    );
  }

  // iOS: bottom-sheet modal
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text> : null}
      <TouchableOpacity
        style={[
          styles.field,
          {
            backgroundColor: colors.inputBackground,
            borderColor: error ? colors.error : colors.border,
          },
        ]}
        onPress={open}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
        <Text style={[styles.valueText, { color: displayValue ? colors.text : colors.textMuted }]}>
          {displayValue ?? placeholder ?? 'Select date'}
        </Text>
        {value ? (
          <TouchableOpacity onPress={clear} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

      <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShow(false)} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.sheetHeader, { borderBottomColor: colors.borderLight }]}>
            <TouchableOpacity onPress={() => setShow(false)}>
              <Text style={[styles.sheetBtn, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{label ?? 'Select date'}</Text>
            <TouchableOpacity
              onPress={() => {
                onChange(dateToStr(tempDate));
                setShow(false);
              }}
            >
              <Text style={[styles.sheetBtn, { color: colors.primary, fontWeight: '600' }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            mode="date"
            display="spinner"
            value={tempDate}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={(_: DateTimePickerEvent, selected?: Date) => {
              if (selected) setTempDate(selected);
            }}
            style={styles.picker}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: {
    fontSize: Typography.fontSizeSm,
    fontWeight: '500',
    marginBottom: 6,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
  },
  valueText: { flex: 1, fontSize: Typography.fontSizeSm },
  error: { fontSize: Typography.fontSizeXs, marginTop: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  sheetTitle: { fontSize: Typography.fontSizeMd, fontWeight: '600' },
  sheetBtn: { fontSize: Typography.fontSizeMd, paddingVertical: 4 },
  picker: { width: '100%' },
});
