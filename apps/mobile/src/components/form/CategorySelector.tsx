import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme';

import { Field } from './Field';

export type CategoryItem = { id: string; label: string; icon: IconName };

export type CategorySelectorProps = {
  items: readonly CategoryItem[];
  value: readonly string[];
  onChange: (ids: string[]) => void;
  /** `single` : un métier (publication de demande) ; `multiple` : métiers secondaires, filtres. */
  mode?: 'single' | 'multiple';
  /** `grid` : tuiles avec icônes ; `chips` : pastilles défilantes (filtres). */
  layout?: 'grid' | 'chips';
  label?: string;
  error?: string;
};

export function CategorySelector({
  items,
  value,
  onChange,
  mode = 'single',
  layout = 'grid',
  label,
  error,
}: CategorySelectorProps) {
  const toggle = (id: string) => {
    void Haptics.selectionAsync().catch(() => undefined);
    if (mode === 'single') {
      onChange([id]);
      return;
    }
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  const role = mode === 'single' ? 'radio' : 'checkbox';

  const content =
    layout === 'grid' ? (
      <View style={styles.grid} accessibilityRole={mode === 'single' ? 'radiogroup' : undefined}>
        {items.map((item) => {
          const selected = value.includes(item.id);
          return (
            <Pressable
              key={item.id}
              onPress={() => toggle(item.id)}
              accessibilityRole={role}
              accessibilityState={{ checked: selected }}
              accessibilityLabel={item.label}
              style={[styles.tile, selected && styles.tileSelected]}
            >
              <View style={[styles.iconCircle, selected && styles.iconCircleSelected]}>
                <Icon name={item.icon} size={24} color={selected ? 'onPrimary' : 'primary'} />
              </View>
              <Text
                variant="caption"
                align="center"
                numberOfLines={2}
                color={selected ? 'primaryDark' : 'textPrimary'}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    ) : (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {items.map((item) => {
          const selected = value.includes(item.id);
          return (
            <Pressable
              key={item.id}
              onPress={() => toggle(item.id)}
              accessibilityRole={role}
              accessibilityState={{ checked: selected }}
              accessibilityLabel={item.label}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Icon name={item.icon} size={16} color={selected ? 'onPrimary' : 'primary'} />
              <Text
                variant="label"
                color={selected ? 'onPrimary' : 'textPrimary'}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    );

  return (
    <Field label={label} error={error}>
      {content}
    </Field>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    flexBasis: '31%',
    flexGrow: 1,
    maxWidth: '33%',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tileSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleSelected: { backgroundColor: colors.primary },
  chips: { gap: spacing.sm, paddingVertical: spacing.xxs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
});
