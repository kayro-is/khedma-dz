import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme';

import { Field } from './Field';

export type RadioOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
  /** Langue du libellé (ex. « العربية » dans l'écran de choix de langue). */
  lang?: string;
};

export type RadioGroupProps<T extends string> = {
  options: readonly RadioOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  label?: string;
  error?: string;
  helper?: string;
};

export function RadioGroup<T extends string>({
  options,
  value,
  onChange,
  label,
  error,
  helper,
}: RadioGroupProps<T>) {
  return (
    <Field label={label} error={error} helper={helper}>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.group}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={option.label}
              accessibilityHint={option.description}
              accessibilityLanguage={option.lang}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <View style={styles.dot} /> : null}
              </View>
              <View style={styles.texts}>
                <Text
                  variant={selected ? 'bodyStrong' : 'body'}
                  color={selected ? 'primaryDark' : 'textPrimary'}
                >
                  {option.label}
                </Text>
                {option.description ? (
                  <Text variant="caption" color="textSecondary">
                    {option.description}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Field>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.primary },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  texts: { flex: 1, gap: spacing.xxs },
});
