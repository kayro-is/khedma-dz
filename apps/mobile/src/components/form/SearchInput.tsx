import type { ComponentRef, Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput as RNTextInput, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { useDirection } from '@/hooks/useDirection';
import { colors, fontFamilyFor, radius, shadows, spacing } from '@/theme';

export type SearchInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  ref?: Ref<ComponentRef<typeof RNTextInput>>;
  testID?: string;
};

export function SearchInput({
  value,
  onChangeText,
  onSubmit,
  placeholder,
  autoFocus,
  ref,
  testID,
}: SearchInputProps) {
  const { t } = useTranslation();
  const { script } = useDirection();

  return (
    <View style={styles.container} accessibilityRole="search">
      <Icon name="search" size={20} color="textSecondary" />
      <RNTextInput
        ref={ref}
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={() => onSubmit?.(value.trim())}
        placeholder={placeholder ?? t('common.search')}
        placeholderTextColor={colors.textDisabled}
        accessibilityLabel={placeholder ?? t('common.search')}
        returnKeyType="search"
        autoCorrect={false}
        autoFocus={autoFocus}
        cursorColor={colors.primary}
        style={[styles.input, { fontFamily: fontFamilyFor(script, 'regular') }]}
      />
      {value.length > 0 ? (
        <IconButton
          icon="close-circle"
          size="sm"
          color="textSecondary"
          accessibilityLabel={t('common.clear')}
          onPress={() => onChangeText('')}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingStart: spacing.lg,
    paddingEnd: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  input: { flex: 1, fontSize: 16, color: colors.textPrimary, paddingVertical: spacing.sm },
});
