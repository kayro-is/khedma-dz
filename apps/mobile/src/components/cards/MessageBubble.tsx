import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { formatTime } from '@/lib/format';
import { useDirection } from '@/hooks/useDirection';
import { colors, radius, spacing, type ColorToken } from '@/theme';

export type MessageStatus = 'sending' | 'sent' | 'read' | 'failed';

export type MessageBubbleProps = {
  /** Texte saisi par l'utilisateur : affiché tel quel, jamais traduit automatiquement. */
  text?: string;
  /** URL signée de courte durée (bucket privé). */
  imageUrl?: string;
  isOwn: boolean;
  createdAt: Date | string;
  status?: MessageStatus;
  onRetry?: () => void;
  /** Premier message d'un groupe consécutif du même auteur (coin arrondi complet). */
  isFirstInGroup?: boolean;
};

const STATUS_ICON: Record<MessageStatus, { icon: IconName; color: ColorToken }> = {
  sending: { icon: 'time-outline', color: 'primaryLight' },
  sent: { icon: 'checkmark', color: 'primaryLight' },
  read: { icon: 'checkmark-done', color: 'accent' },
  failed: { icon: 'alert-circle', color: 'error' },
};

export function MessageBubble({
  text,
  imageUrl,
  isOwn,
  createdAt,
  status,
  onRetry,
  isFirstInGroup = true,
}: MessageBubbleProps) {
  const { t } = useTranslation();
  const { locale } = useDirection();
  const time = formatTime(createdAt, locale);
  const statusLabel = status ? t(`message.${status}`) : '';

  return (
    <View style={[styles.wrapper, isOwn ? styles.wrapperOwn : styles.wrapperOther]}>
      <View
        accessible
        accessibilityLabel={[text ?? t('message.image'), time, isOwn ? statusLabel : '']
          .filter(Boolean)
          .join(', ')}
        style={[
          styles.bubble,
          isOwn ? styles.own : styles.other,
          isFirstInGroup && (isOwn ? styles.ownFirst : styles.otherFirst),
        ]}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={150}
          />
        ) : null}
        {text ? (
          <Text variant="body" color={isOwn ? 'onPrimary' : 'textPrimary'} selectable>
            {text}
          </Text>
        ) : null}
        <View style={styles.footer}>
          <Text variant="caption" color={isOwn ? 'primaryLight' : 'textSecondary'}>
            {time}
          </Text>
          {isOwn && status ? (
            <Icon name={STATUS_ICON[status].icon} size={14} color={STATUS_ICON[status].color} />
          ) : null}
        </View>
      </View>
      {isOwn && status === 'failed' && onRetry ? (
        <Pressable onPress={onRetry} accessibilityRole="button" hitSlop={8} style={styles.retry}>
          <Icon name="refresh" size={14} color="error" />
          <Text variant="caption" color="error">
            {t('message.retry')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { maxWidth: '82%', gap: spacing.xxs },
  wrapperOwn: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  wrapperOther: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  own: { backgroundColor: colors.primary },
  other: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  // Propriétés logiques (start / end) : inversées automatiquement en arabe.
  ownFirst: { borderTopEndRadius: radius.xs },
  otherFirst: { borderTopStartRadius: radius.xs },
  image: { width: 220, height: 220, borderRadius: radius.md },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-end' },
  retry: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
