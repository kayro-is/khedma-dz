import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme';

export type FieldProps = {
  label?: string;
  optional?: boolean;
  helper?: string;
  /** Message d'erreur déjà traduit. */
  error?: string;
  children: ReactNode;
};

/** Libellé + aide + erreur autour d'un champ, avec un rendu cohérent pour tous les formulaires. */
export function Field({ label, optional, helper, error, children }: FieldProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.field}>
      {label ? (
        <View style={styles.labelRow}>
          <Text variant="label">{label}</Text>
          {optional ? (
            <Text variant="caption" color="textSecondary">
              ({t('common.optional')})
            </Text>
          ) : null}
        </View>
      ) : null}
      {children}
      {error ? (
        <View style={styles.messageRow} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Icon name="alert-circle" size={14} color="error" />
          <Text variant="caption" color="error" style={styles.messageText}>
            {error}
          </Text>
        </View>
      ) : helper ? (
        <Text variant="caption" color="textSecondary">
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  messageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  messageText: { flex: 1 },
});
