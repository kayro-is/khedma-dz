import type { ReactNode } from 'react';
import { Modal as RNModal, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, shadows, spacing } from '@/theme';

import { Button } from './Button';
import { Text } from './Text';

type ModalAction = {
  label: string;
  onPress: () => void;
  loading?: boolean;
};

export type ModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  primaryAction?: ModalAction & { destructive?: boolean };
  secondaryAction?: ModalAction;
  /** Fermeture au toucher de l'arrière-plan (désactiver pour une action critique en cours). */
  dismissable?: boolean;
};

/** Fenêtre de dialogue centrée (confirmation, information). */
export function Modal({
  visible,
  onClose,
  title,
  description,
  children,
  primaryAction,
  secondaryAction,
  dismissable = true,
}: ModalProps) {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={dismissable ? onClose : () => undefined}
    >
      <View style={styles.root}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissable ? onClose : undefined}
          accessible={false}
        />
        <View style={styles.dialog} accessibilityViewIsModal accessibilityRole="alert">
          <Text variant="h3" accessibilityRole="header">
            {title}
          </Text>
          {description ? (
            <Text variant="body" color="textSecondary">
              {description}
            </Text>
          ) : null}
          {children}
          {primaryAction || secondaryAction ? (
            <View style={styles.actions}>
              {secondaryAction ? (
                <Button
                  label={secondaryAction.label}
                  variant="ghost"
                  onPress={secondaryAction.onPress}
                  loading={secondaryAction.loading}
                />
              ) : null}
              {primaryAction ? (
                <Button
                  label={primaryAction.label}
                  variant={primaryAction.destructive ? 'danger' : 'primary'}
                  onPress={primaryAction.onPress}
                  loading={primaryAction.loading}
                />
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.raised,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
