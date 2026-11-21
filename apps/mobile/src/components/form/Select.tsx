import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { buildSearchIndex, searchIndex } from '@/lib/searchRank';
import { colors, radius, spacing } from '@/theme';

import { Field } from './Field';
import { SearchInput } from './SearchInput';

export type SelectOption<T extends string | number> = {
  value: T;
  label: string;
  description?: string;
  /** Termes de recherche supplémentaires, non affichés (autre langue, code…). */
  keywords?: string;
};

export type SelectProps<T extends string | number> = {
  label: string;
  options: readonly SelectOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  placeholder?: string;
  /** Recherche instantanée bilingue, insensible aux accents, au tashkil et à la ponctuation. */
  searchable?: boolean;
  searchPlaceholder?: string;
  helper?: string;
  error?: string;
  optional?: boolean;
  disabled?: boolean;
  testID?: string;
};

export function Select<T extends string | number>({
  label,
  options,
  value,
  onChange,
  placeholder,
  searchable = false,
  searchPlaceholder,
  helper,
  error,
  optional,
  disabled = false,
  testID,
}: SelectProps<T>) {
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((option) => option.value === value);
  // Index normalisé calculé une fois par liste, puis filtrage à chaque frappe (sans réseau).
  const index = useMemo(() => buildSearchIndex(options), [options]);
  const filtered = useMemo(() => searchIndex(index, query), [index, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <Field label={label} helper={helper} error={error} optional={optional}>
      <Pressable
        testID={testID}
        disabled={disabled}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: selected?.label ?? placeholder ?? t('select.placeholder') }}
        accessibilityState={{ disabled, expanded: open }}
        accessibilityHint={error ?? helper}
        style={[
          styles.trigger,
          { borderColor: error ? colors.error : colors.border },
          disabled && styles.disabled,
        ]}
      >
        <Text
          variant="body"
          color={selected ? 'textPrimary' : 'textDisabled'}
          numberOfLines={1}
          style={styles.triggerText}
        >
          {selected?.label ?? placeholder ?? t('select.placeholder')}
        </Text>
        <Icon name="chevron-down" size={20} color="textSecondary" />
      </Pressable>

      <BottomSheet visible={open} onClose={close} title={label}>
        {searchable ? (
          <View style={styles.search}>
            <SearchInput
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder ?? t('select.searchPlaceholder')}
            />
          </View>
        ) : null}
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.value)}
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: height * 0.55 }}
          initialNumToRender={20}
          ListEmptyComponent={
            <Text variant="body" color="textSecondary" align="center" style={styles.empty}>
              {t('common.noResults')}
            </Text>
          }
          renderItem={({ item }) => {
            const isSelected = item.value === value;
            return (
              <Pressable
                onPress={() => {
                  onChange(item.value);
                  close();
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              >
                <View style={styles.optionText}>
                  <Text
                    variant={isSelected ? 'bodyStrong' : 'body'}
                    color={isSelected ? 'primaryDark' : 'textPrimary'}
                  >
                    {item.label}
                  </Text>
                  {item.description ? (
                    <Text variant="caption" color="textSecondary">
                      {item.description}
                    </Text>
                  ) : null}
                </View>
                {isSelected ? <Icon name="checkmark" size={20} color="primary" /> : null}
              </Pressable>
            );
          }}
        />
      </BottomSheet>
    </Field>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  triggerText: { flex: 1 },
  disabled: { backgroundColor: colors.surfaceMuted, opacity: 0.7 },
  search: { marginBottom: spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  optionPressed: { backgroundColor: colors.surfaceMuted },
  optionText: { flex: 1, gap: spacing.xxs },
  empty: { paddingVertical: spacing.xl },
});
