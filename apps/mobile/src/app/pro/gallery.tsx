import { Image } from 'expo-image';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ARTISAN_RULES, portfolioCaptionSchema } from '@khedma/validation';

import { FormAlert } from '@/components/auth/FormAlert';
import { TextInput } from '@/components/form/TextInput';
import { PortfolioImage } from '@/components/pro/PortfolioImage';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import { Modal } from '@/components/ui/Modal';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { pickPortfolioPhotos, type PreparedPhoto } from '@/features/artisan/pickPortfolioPhotos';
import type { ProPortfolioItem, ProProfile } from '@/features/artisan/proProfileApi';
import { moveItem, proErrorKey } from '@/features/artisan/proProfileLogic';
import { usePortfolioMutations, useProProfile } from '@/features/artisan/useProProfile';
import { toast } from '@/store/toastStore';
import { colors, radius, spacing } from '@/theme';
import { BACK_FALLBACK, safeBack } from '@/lib/navigation';

type Pending = PreparedPhoto & { caption: string };

/** Galerie des réalisations : 1 photo = 1 réalisation, légende facultative, ordre modifiable. */
export default function ProGalleryScreen() {
  const { t } = useTranslation();
  const pro = useProProfile();
  return (
    <Screen
      scroll
      edges={['top', 'bottom', 'left', 'right']}
      header={
        <ScreenHeader title={t('pro.gallery.title')} onBack={() => safeBack(BACK_FALLBACK.pro)} />
      }
    >
      {pro.isPending ? (
        <View style={styles.grid}>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} width="31%" height={110} borderRadius={radius.md} />
          ))}
        </View>
      ) : pro.isError || !pro.data ? (
        <ErrorState title={t('space.artisan.loadError')} onRetry={() => void pro.refetch()} />
      ) : (
        <Gallery profile={pro.data} />
      )}
    </Screen>
  );
}

function Gallery({ profile }: { profile: ProProfile }) {
  const { t } = useTranslation();
  const mutations = usePortfolioMutations();
  const items = profile.portfolio.filter((item) => item.imagePath);
  const remaining = ARTISAN_RULES.portfolioMax - profile.portfolio.length;
  const [pending, setPending] = useState<Pending[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [selected, setSelected] = useState<ProPortfolioItem | null>(null);

  const pick = async () => {
    setPreparing(true);
    try {
      const photos = await pickPortfolioPhotos(remaining);
      if (photos.length) setPending(photos.map((p) => ({ ...p, caption: '' })));
    } catch (error) {
      toast.error(t(`pro.errors.${proErrorKey(error, 'photoFailed')}`));
    } finally {
      setPreparing(false);
    }
  };

  /** Envoi un par un : chaque photo réussie est conservée même si une autre échoue. */
  const upload = async () => {
    const queue = [...pending];
    const startOrder = profile.portfolio.reduce(
      (max, item) => Math.max(max, item.sortOrder + 1),
      0,
    );
    let failed = 0;
    let lastError: unknown = null;
    setProgress({ done: 0, total: queue.length });
    for (const [index, photo] of queue.entries()) {
      try {
        await mutations.add.mutateAsync({
          bytes: photo.bytes,
          caption: portfolioCaptionSchema.parse(photo.caption),
          sortOrder: startOrder + index,
        });
        setPending((current) => current.filter((p) => p.key !== photo.key));
      } catch (error) {
        failed += 1;
        lastError = error;
      }
      setProgress({ done: index + 1, total: queue.length });
    }
    await mutations.refresh();
    setProgress(null);
    if (failed === 0) {
      setPending([]);
      toast.success(t('pro.gallery.added', { count: queue.length }));
    } else {
      toast.error(
        `${t('pro.gallery.partialFailure', { count: failed })} ${t(`pro.errors.${proErrorKey(lastError, 'photoFailed')}`)}`,
      );
    }
  };

  const move = (item: ProPortfolioItem, delta: -1 | 1) => {
    const index = items.findIndex((i) => i.id === item.id);
    const next = moveItem(items, index, delta);
    if (next === items || next.every((it, i) => it.id === items[i]?.id)) return;
    mutations.reorder.mutate(
      next.map((i) => i.id),
      { onError: (error) => toast.error(t(`pro.errors.${proErrorKey(error)}`)) },
    );
  };

  return (
    <View style={styles.container}>
      <Text variant="body" color="textSecondary">
        {t('pro.gallery.subtitle')}
      </Text>
      <View style={styles.counterRow}>
        <Text variant="label" color={remaining <= 0 ? 'warningDark' : 'textSecondary'}>
          {t('pro.gallery.count', {
            count: profile.portfolio.length,
            max: ARTISAN_RULES.portfolioMax,
          })}
        </Text>
        <Button
          label={t('pro.gallery.add')}
          icon="images-outline"
          size="sm"
          variant="secondary"
          disabled={remaining <= 0}
          loading={preparing}
          onPress={() => void pick()}
        />
      </View>

      {items.length === 0 ? (
        <EmptyState
          icon="images-outline"
          title={t('pro.gallery.emptyTitle')}
          description={t('pro.gallery.emptyBody')}
          action={{ label: t('pro.gallery.add'), icon: 'add', onPress: () => void pick() }}
        />
      ) : (
        <View style={styles.grid}>
          {items.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => setSelected(item)}
              accessibilityRole="button"
              accessibilityLabel={
                item.caption
                  ? t('pro.gallery.itemA11y', { index: index + 1, caption: item.caption })
                  : t('pro.gallery.itemA11yNoCaption', { index: index + 1 })
              }
              style={styles.tile}
            >
              <PortfolioImage
                url={item.imageUrl}
                path={item.imagePath}
                style={styles.image}
                onExpired={() => void mutations.refresh()}
              />
              {item.caption ? (
                <View style={styles.captionBar}>
                  <Text variant="caption" color="onPrimary" numberOfLines={1}>
                    {item.caption}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>
      )}

      {/* Aperçu avant publication */}
      <BottomSheet
        visible={pending.length > 0}
        onClose={() => (progress ? undefined : setPending([]))}
        title={t('pro.gallery.previewTitle', { count: pending.length })}
      >
        <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.pendingList}>
            {pending.map((photo) => (
              <View key={photo.key} style={styles.pendingRow}>
                <Image source={{ uri: photo.uri }} style={styles.thumb} contentFit="cover" />
                <View style={styles.flex}>
                  <TextInput
                    value={photo.caption}
                    onChangeText={(caption) =>
                      setPending((current) =>
                        current.map((p) => (p.key === photo.key ? { ...p, caption } : p)),
                      )
                    }
                    placeholder={t('pro.gallery.captionPlaceholder')}
                    maxLength={ARTISAN_RULES.captionMax}
                    editable={!progress}
                  />
                </View>
                <IconButton
                  icon="close"
                  accessibilityLabel={t('pro.gallery.discardOne')}
                  disabled={!!progress}
                  onPress={() =>
                    setPending((current) => current.filter((p) => p.key !== photo.key))
                  }
                />
              </View>
            ))}
          </View>
        </ScrollView>
        {progress ? (
          <View style={styles.progressRow} accessibilityLiveRegion="polite">
            <ActivityIndicator color={colors.primary} />
            <Text variant="bodySmall" color="textSecondary">
              {t('pro.gallery.uploading', { done: progress.done, total: progress.total })}
            </Text>
          </View>
        ) : null}
        <Button
          label={t('pro.gallery.publishPhotos', { count: pending.length })}
          icon="cloud-upload-outline"
          fullWidth
          loading={!!progress}
          onPress={() => void upload()}
        />
      </BottomSheet>

      {selected ? (
        <ItemSheet
          item={selected}
          position={items.findIndex((i) => i.id === selected.id)}
          total={items.length}
          onClose={() => setSelected(null)}
          onMove={(delta) => move(selected, delta)}
        />
      ) : null}
    </View>
  );
}

/** Détail d'une réalisation : légende, ordre, suppression. */
function ItemSheet({
  item,
  position,
  total,
  onClose,
  onMove,
}: {
  item: ProPortfolioItem;
  position: number;
  total: number;
  onClose: () => void;
  onMove: (delta: -1 | 1) => void;
}) {
  const { t } = useTranslation();
  const mutations = usePortfolioMutations();
  const [caption, setCaption] = useState(item.caption ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parsed = portfolioCaptionSchema.safeParse(caption);
  const changed = parsed.success && parsed.data !== item.caption;

  const saveCaption = async () => {
    if (!parsed.success) return;
    setError(null);
    try {
      await mutations.caption.mutateAsync({ itemId: item.id, caption: parsed.data });
      toast.success(t('pro.saved'));
      onClose();
    } catch (e) {
      setError(t(`pro.errors.${proErrorKey(e)}`));
    }
  };

  const remove = async () => {
    try {
      await mutations.remove.mutateAsync(item);
      toast.success(t('pro.gallery.deleted'));
      setConfirmDelete(false);
      onClose();
    } catch (e) {
      setConfirmDelete(false);
      setError(t(`pro.errors.${proErrorKey(e)}`));
    }
  };

  return (
    <BottomSheet
      visible
      onClose={onClose}
      title={t('pro.gallery.itemTitle', { index: position + 1 })}
    >
      <View style={styles.itemSheet}>
        <PortfolioImage
          url={item.imageUrl}
          path={item.imagePath}
          style={styles.large}
          onExpired={() => void mutations.refresh()}
        />
        {error ? <FormAlert message={error} /> : null}
        <TextInput
          label={t('pro.gallery.caption')}
          value={caption}
          onChangeText={setCaption}
          placeholder={t('pro.gallery.captionPlaceholder')}
          maxLength={ARTISAN_RULES.captionMax}
          optional
        />
        <View style={styles.moveRow}>
          <Button
            label={t('pro.gallery.moveBefore')}
            icon="chevron-back"
            iconFlipInRTL
            variant="ghost"
            size="sm"
            disabled={position <= 0 || mutations.reorder.isPending}
            onPress={() => onMove(-1)}
          />
          <Text variant="caption" color="textSecondary">
            {position + 1} / {total}
          </Text>
          <Button
            label={t('pro.gallery.moveAfter')}
            iconEnd="chevron-forward"
            iconEndFlipInRTL
            variant="ghost"
            size="sm"
            disabled={position >= total - 1 || mutations.reorder.isPending}
            onPress={() => onMove(1)}
          />
        </View>
        <Button
          label={t('common.save')}
          fullWidth
          disabled={!changed}
          loading={mutations.caption.isPending}
          onPress={() => void saveCaption()}
        />
        <Button
          label={t('pro.gallery.delete')}
          icon="trash-outline"
          variant="danger"
          fullWidth
          onPress={() => setConfirmDelete(true)}
        />
      </View>
      <Modal
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t('pro.gallery.deleteTitle')}
        description={t('pro.gallery.deleteBody')}
        secondaryAction={{ label: t('common.cancel'), onPress: () => setConfirmDelete(false) }}
        primaryAction={{
          label: t('pro.gallery.delete'),
          destructive: true,
          loading: mutations.remove.isPending,
          onPress: () => void remove(),
        }}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: '31.5%',
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.skeleton,
  },
  image: { width: '100%', height: '100%' },
  captionBar: {
    position: 'absolute',
    start: 0,
    end: 0,
    bottom: 0,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    backgroundColor: colors.overlay,
  },
  sheetScroll: { maxHeight: 360 },
  pendingList: { gap: spacing.md },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: colors.skeleton },
  flex: { flex: 1 },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  itemSheet: { gap: spacing.md },
  large: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
    backgroundColor: colors.skeleton,
  },
  moveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
