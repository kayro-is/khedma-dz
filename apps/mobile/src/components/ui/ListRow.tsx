import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing, type ColorToken } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type ListRowProps = {
  icon: IconName;
  label: string;
  /** Valeur affichée à la fin de la ligne (ex. langue actuelle). */
  value?: string;
  /** Contenu secondaire sous le libellé. */
  description?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  accessibilityHint?: string;
};

/** Ligne de réglage (icône, libellé, valeur, chevron), utilisée dans les listes de paramètres. */
export function ListRow({
  icon,
  label,
  value,
  description,
  trailing,
  onPress,
  destructive = false,
  accessibilityHint,
}: ListRowProps) {
  const tone: ColorToken = destructive ? 'error' : 'textPrimary';
  const content = (
    <>
      <View style={[styles.iconBox, destructive && styles.iconBoxDanger]}>
        <Icon name={icon} size={20} color={destructive ? 'error' : 'primary'} />
      </View>
      <View style={styles.texts}>
        <Text variant="body" color={tone} numberOfLines={1}>
          {label}
        </Text>
        {description ? (
          <Text variant="caption" color="textSecondary">
            {description}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="bodySmall" color="textSecondary" numberOfLines={1} style={styles.value}>
          {value}
        </Text>
      ) : null}
      {trailing}
      {onPress ? <Icon name="chevron-forward" size={18} color="textDisabled" flipInRTL /> : null}
    </>
  );

  if (!onPress) {
    return (
      <View
        style={styles.row}
        accessible
        accessibilityLabel={[label, value, description].filter(Boolean).join(', ')}
      >
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityValue={value ? { text: value } : undefined}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

/** Groupe de lignes avec titre de section. */
export function ListSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text
        variant="label"
        color="textSecondary"
        accessibilityRole="header"
        style={styles.sectionTitle}
      >
        {title}
      </Text>
      <View style={styles.group}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  sectionTitle: { paddingHorizontal: spacing.xs },
  group: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 60,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxDanger: { backgroundColor: colors.errorLight },
  texts: { flex: 1, gap: spacing.xxs },
  value: { maxWidth: '45%' },
});
