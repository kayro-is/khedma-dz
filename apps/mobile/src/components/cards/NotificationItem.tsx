import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useFormatters } from '@/hooks/useFormatters';
import { colors, radius, spacing } from '@/theme';

export type NotificationKind = 'proposal' | 'message' | 'request' | 'job' | 'review' | 'system';

const KIND_ICON: Record<NotificationKind, IconName> = {
  proposal: 'pricetag-outline',
  message: 'chatbubble-ellipses-outline',
  request: 'megaphone-outline',
  job: 'construct-outline',
  review: 'star-outline',
  system: 'information-circle-outline',
};

export type NotificationItemProps = {
  kind: NotificationKind;
  /** Titre et contenu déjà traduits (générés à partir de modèles fr / ar). */
  title: string;
  body: string;
  createdAt: Date | string;
  read: boolean;
  onPress?: () => void;
};

export function NotificationItem({
  kind,
  title,
  body,
  createdAt,
  read,
  onPress,
}: NotificationItemProps) {
  const { t } = useTranslation();
  const { dayOrTime } = useFormatters();
  const when = dayOrTime(createdAt);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, body, when, read ? '' : t('notification.unread')]
        .filter(Boolean)
        .join(', ')}
      style={({ pressed }) => [styles.row, !read && styles.unread, pressed && styles.pressed]}
    >
      <View style={[styles.iconCircle, !read && styles.iconCircleUnread]}>
        <Icon name={KIND_ICON[kind]} size={22} color={read ? 'textSecondary' : 'primary'} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text variant={read ? 'body' : 'bodyStrong'} numberOfLines={1} style={styles.flex}>
            {title}
          </Text>
          <Text variant="caption" color="textSecondary">
            {when}
          </Text>
        </View>
        <Text variant="bodySmall" color="textSecondary" numberOfLines={2}>
          {body}
        </Text>
      </View>
      {!read ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  unread: { backgroundColor: colors.primaryLight },
  pressed: { opacity: 0.8 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleUnread: { backgroundColor: colors.surface },
  body: { flex: 1, gap: spacing.xxs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: spacing.sm,
  },
});
