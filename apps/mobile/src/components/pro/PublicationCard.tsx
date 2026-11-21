import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ARTISAN_RULES } from '@khedma/validation';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { Text } from '@/components/ui/Text';
import { proErrorKey, profileCompletion } from '@/features/artisan/proProfileLogic';
import type { ProProfile } from '@/features/artisan/proProfileApi';
import { useSetPublished } from '@/features/artisan/useProProfile';
import { toast } from '@/store/toastStore';
import { colors, radius, shadows, spacing } from '@/theme';

/**
 * Publication du profil : progression, conditions (vérifiées aussi par le serveur) et action.
 * La vérification d'identité est un statut distinct, jamais modifiable par l'artisan.
 */
export function PublicationCard({
  profile,
  hasAvatar,
}: {
  profile: ProProfile;
  hasAvatar: boolean;
}) {
  const { t } = useTranslation();
  const publish = useSetPublished();
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const completion = profileCompletion({
    description: profile.description,
    zonesCount: profile.zones.length,
    hasAvatar,
    portfolioCount: profile.portfolio.length,
    yearsExperience: profile.yearsExperience,
  });

  const run = async (published: boolean) => {
    try {
      await publish.mutateAsync(published);
      toast.success(t(published ? 'pro.publication.published' : 'pro.publication.unpublished'));
    } catch (error) {
      toast.error(t(`pro.errors.${proErrorKey(error)}`));
    } finally {
      setConfirmUnpublish(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text variant="h3">{t('pro.publication.title')}</Text>
          <Text variant="bodySmall" color="textSecondary">
            {t(profile.isPublished ? 'pro.publication.liveBody' : 'pro.publication.draftBody')}
          </Text>
        </View>
        <Badge
          label={t(profile.isPublished ? 'space.artisan.published' : 'pro.publication.draft')}
          tone={profile.isPublished ? 'success' : 'warning'}
          icon={profile.isPublished ? 'eye-outline' : 'create-outline'}
        />
      </View>

      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t('pro.publication.progressA11y', { percent: completion.percent })}
        accessibilityValue={{ min: 0, max: 100, now: completion.percent }}
        style={styles.progressBlock}
      >
        <View style={styles.progressRow}>
          <Text variant="label" color="textSecondary">
            {t('pro.publication.progress')}
          </Text>
          <Text variant="label" color="primaryDark">
            {completion.percent} %
          </Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${completion.percent}%` }]} />
        </View>
      </View>

      <View style={styles.checklist}>
        {completion.items.map((item) => (
          <View key={item.key} style={styles.checkRow}>
            <Icon
              name={
                item.done
                  ? 'checkmark-circle'
                  : item.required
                    ? 'alert-circle-outline'
                    : 'ellipse-outline'
              }
              size={20}
              color={item.done ? 'success' : item.required ? 'warningDark' : 'textDisabled'}
            />
            <Text variant="bodySmall" style={styles.flex}>
              {t(`pro.completion.${item.key}`, {
                count: completion.descriptionLength,
                min: ARTISAN_RULES.publishDescriptionMin,
              })}
            </Text>
            <Text variant="caption" color={item.required ? 'warningDark' : 'textSecondary'}>
              {t(item.required ? 'pro.completion.required' : 'pro.completion.recommended')}
            </Text>
          </View>
        ))}
      </View>

      {profile.isPublished ? (
        <Button
          label={t('pro.publication.unpublish')}
          variant="secondary"
          icon="eye-off-outline"
          fullWidth
          loading={publish.isPending}
          onPress={() => setConfirmUnpublish(true)}
        />
      ) : (
        <>
          <Button
            label={t('pro.publication.publish')}
            icon="globe-outline"
            fullWidth
            disabled={!completion.canPublish}
            loading={publish.isPending}
            onPress={() => void run(true)}
          />
          {!completion.canPublish ? (
            <Text variant="caption" color="textSecondary" align="center">
              {t('pro.publication.requirementsHint')}
            </Text>
          ) : null}
        </>
      )}

      <Modal
        visible={confirmUnpublish}
        onClose={() => setConfirmUnpublish(false)}
        title={t('pro.publication.unpublishTitle')}
        description={t('pro.publication.unpublishBody')}
        secondaryAction={{ label: t('common.cancel'), onPress: () => setConfirmUnpublish(false) }}
        primaryAction={{
          label: t('pro.publication.unpublish'),
          loading: publish.isPending,
          onPress: () => void run(false),
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  flex: { flex: 1 },
  progressBlock: { gap: spacing.xs },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.primary },
  checklist: { gap: spacing.sm },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
