import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme';

export type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  testID?: string;
};

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  error,
  disabled = false,
  testID,
}: CheckboxProps) {
  return (
    <View style={styles.wrapper}>
      <Pressable
        testID={testID}
        disabled={disabled}
        onPress={() => {
          void Haptics.selectionAsync().catch(() => undefined);
          onChange(!checked);
        }}
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityHint={error ?? description}
        accessibilityState={{ checked, disabled }}
        style={[styles.row, disabled && styles.disabled]}
      >
        <View
          style={[
            styles.box,
            checked && styles.boxChecked,
            !!error && !checked && { borderColor: colors.error },
          ]}
        >
          {checked ? <Icon name="checkmark" size={16} color="onPrimary" /> : null}
        </View>
        <View style={styles.texts}>
          <Text variant="body">{label}</Text>
          {description ? (
            <Text variant="caption" color="textSecondary">
              {description}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {error ? (
        <Text variant="caption" color="error" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    minHeight: 44,
    paddingVertical: spacing.xs,
  },
  disabled: { opacity: 0.5 },
  box: {
    width: 24,
    height: 24,
    borderRadius: radius.xs,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  texts: { flex: 1, gap: spacing.xxs },
});
