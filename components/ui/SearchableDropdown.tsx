import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';
import { Radius, Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../context/theme';

export interface DropdownOption {
  id: string;
  label: string;
  sublabel?: string;
  /** Optional extra data to pass back on select */
  meta?: Record<string, any>;
}

interface SearchableDropdownProps {
  label?: string;
  value: string; // selected id
  displayValue?: string; // display text for selected value
  options: DropdownOption[];
  onSelect: (option: DropdownOption) => void;
  onSearch?: (query: string) => void;
  loading?: boolean;
  error?: string;
  placeholder?: string;
  clearable?: boolean;
  onClear?: () => void;
  containerStyle?: ViewStyle;
  disabled?: boolean;
  /** Multi-select mode */
  multiSelect?: boolean;
  selectedIds?: string[];
  onToggle?: (opt: DropdownOption) => void;
}

export function SearchableDropdown({
  label,
  value,
  displayValue,
  options,
  onSelect,
  onSearch,
  loading,
  error,
  placeholder = 'Select...',
  clearable = true,
  onClear,
  containerStyle,
  disabled,
  multiSelect,
  selectedIds,
  onToggle,
}: SearchableDropdownProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<TextInput>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      onSearch?.('');
      setTimeout(() => searchRef.current?.focus(), 150);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleSearch(text: string) {
    setQuery(text);
    onSearch?.(text);
  }

  function handleSelect(opt: DropdownOption) {
    if (multiSelect) {
      onToggle?.(opt);
    } else {
      onSelect(opt);
      setOpen(false);
    }
  }

  function handleClear() {
    onClear?.();
  }

  const multiCount = selectedIds?.length ?? 0;
  const hasValue = multiSelect ? multiCount > 0 : !!value;
  const triggerDisplay = multiSelect
    ? multiCount === 0
      ? placeholder
      : multiCount === 1
        ? (options.find(o => o.id === selectedIds![0])?.label ?? placeholder)
        : `${multiCount} tenants selected`
    : hasValue
      ? (displayValue ?? value)
      : placeholder;

  return (
    <View style={[{ marginBottom: Spacing.md }, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      ) : null}

      <TouchableOpacity
        style={[
          styles.trigger,
          {
            borderColor: error ? colors.error : colors.border,
            backgroundColor: colors.surface,
          },
          disabled && { opacity: 0.5 },
        ]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.triggerText,
            { color: hasValue ? colors.text : colors.textMuted },
          ]}
          numberOfLines={1}
        >
          {triggerDisplay}
        </Text>
        <View style={styles.triggerRight}>
          {hasValue && clearable && !disabled ? (
            <TouchableOpacity onPress={handleClear} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
          <Ionicons
            name="chevron-down"
            size={16}
            color={colors.textMuted}
            style={{ marginLeft: 4 }}
          />
        </View>
      </TouchableOpacity>

      {error ? (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      ) : null}

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setOpen(false)}
        />
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              {label ?? 'Select'}
            </Text>
            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={[styles.searchRow, { borderBottomColor: colors.border }]}>
            <Ionicons name="search" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              ref={searchRef}
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search..."
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={handleSearch}
              returnKeyType="search"
              autoCorrect={false}
            />
            {query ? (
              <TouchableOpacity onPress={() => handleSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* List */}
          {loading ? (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={{ paddingVertical: Spacing.xl }}
            />
          ) : (
            <FlatList
              data={options}
              keyExtractor={item => item.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: multiSelect ? 0 : Spacing.xl }}
              ItemSeparatorComponent={() => (
                <View style={[styles.separator, { backgroundColor: colors.border }]} />
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No results found
                </Text>
              }
              renderItem={({ item }) => {
                const selected = multiSelect
                  ? (selectedIds ?? []).includes(item.id)
                  : item.id === value;
                return (
                  <TouchableOpacity
                    style={[
                      styles.optionRow,
                      selected && { backgroundColor: colors.primary + '15' },
                    ]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.optionLabel,
                          { color: selected ? colors.primary : colors.text },
                        ]}
                      >
                        {item.label}
                      </Text>
                      {item.sublabel ? (
                        <Text style={[styles.optionSublabel, { color: colors.textMuted }]}>
                          {item.sublabel}
                        </Text>
                      ) : null}
                    </View>
                    {selected ? (
                      <Ionicons name={multiSelect ? 'checkbox' : 'checkmark'} size={18} color={colors.primary} />
                    ) : multiSelect ? (
                      <Ionicons name="square-outline" size={18} color={colors.textMuted} />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {/* Done button for multi-select */}
          {multiSelect ? (
            <TouchableOpacity
              style={[styles.doneBtn, { backgroundColor: colors.primary }]}
              onPress={() => setOpen(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.doneBtnText}>
                Done{multiCount > 0 ? ` (${multiCount} selected)` : ''}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: Typography.fontSizeSm,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    minHeight: 48,
  },
  triggerText: {
    flex: 1,
    fontSize: Typography.fontSizeMd,
    marginRight: 8,
  },
  triggerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    fontSize: Typography.fontSizeXs,
    marginTop: 4,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: {
    fontSize: Typography.fontSizeMd,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSizeMd,
    paddingVertical: 4,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.lg,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  optionLabel: {
    fontSize: Typography.fontSizeMd,
    fontWeight: '500',
  },
  optionSublabel: {
    fontSize: Typography.fontSizeSm,
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: Spacing.xl,
    fontSize: Typography.fontSizeSm,
  },
  doneBtn: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#fff',
    fontSize: Typography.fontSizeMd,
    fontWeight: '600',
  },
});
