import * as Haptics from 'expo-haptics';
import { router, usePreventRemove } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ARTISAN_RULES } from '@khedma/validation';

import { FormAlert } from '@/components/auth/FormAlert';
import { SearchInput } from '@/components/form/SearchInput';
import { Select } from '@/components/form/Select';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { Modal } from '@/components/ui/Modal';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import type { ProProfile, ProZone } from '@/features/artisan/proProfileApi';
import {
  groupZonesByWilaya,
  proErrorKey,
  type ProErrorKey,
} from '@/features/artisan/proProfileLogic';
import { useProProfile, useSaveZones } from '@/features/artisan/useProProfile';
import { useCommunes, useWilayas } from '@/features/profile/useProfile';
import { useDirection } from '@/hooks/useDirection';
import { buildSearchIndex, searchIndex, sortByLabel } from '@/lib/searchRank';
import { toast } from '@/store/toastStore';
import { colors, MIN_TOUCH_SIZE, radius, spacing } from '@/theme';

/** Zones d'intervention : communes du référentiel officiel (KHD-007), sans calcul de distance. */
export default function ProZonesScreen() {
  const { t } = useTranslation();
  const pro = useProProfile();
  return (
    <Screen
      scroll
      edges={['top', 'bottom', 'left', 'right']}
      header={<ScreenHeader title={t('pro.zones.title')} onBack={() => router.back()} />}
    >
      {pro.isPending ? (
        <LoadingSkeleton count={3} />
      ) : pro.isError || !pro.data ? (
        <ErrorState title={t('space.artisan.loadError')} onRetry={() => void pro.refetch()} />
      ) : (
        <ZonesEditor profile={pro.data} />
      )}
    </Screen>
  );
}

function ZonesEditor({ profile }: { profile: ProProfile }) {
  const { t } = useTranslation();
  const { locale } = useDirection();
  const save = useSaveZones();
  const [draft, setDraft] = useState<Map<number, ProZone>>(
    () => new Map(profile.zones.map((z) => [z.communeId, z])),
  );
  const [picker, setPicker] = useState(false);
  const [serverError, setServerError] = useState<ProErrorKey | null>(null);
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);
  const [leaving, setLeaving] = useState(false);

  const initialIds = profile.zones.map((z) => z.communeId);
  const dirty = draft.size !== initialIds.length || initialIds.some((id) => !draft.has(id));
  usePreventRemove(dirty && !leaving, ({ repeat }) => setPendingLeave(() => repeat));
  const leaveThen = (navigate: () => void) => {
    setLeaving(true);
    requestAnimationFrame(navigate);
  };

  const groups = useMemo(() => groupZonesByWilaya([...draft.values()], locale), [draft, locale]);
  const label = (named: { nameFr: string; nameAr: string }) =>
    locale === 'ar' ? named.nameAr : named.nameFr;

  const remove = (zone: ProZone) => {
    if (profile.isPublished && draft.size === 1) {
      toast.error(t('pro.errors.lastZone'));
      return;
    }
    void Haptics.selectionAsync().catch(() => undefined);
    setDraft((current) => {
      const next = new Map(current);
      next.delete(zone.communeId);
      return next;
    });
  };

  const toggle = (zone: ProZone) => {
    setDraft((current) => {
      const next = new Map(current);
      if (next.has(zone.communeId)) {
        if (profile.isPublished && next.size === 1) {
          toast.error(t('pro.errors.lastZone'));
          return current;
        }
        next.delete(zone.communeId);
      } else {
        if (next.size >= ARTISAN_RULES.zonesMax) {
          toast.error(t('pro.errors.zonesLimit'));
          return current;
        }
        next.set(zone.communeId, zone);
      }
      return next;
    });
  };

  const onSave = async () => {
    setServerError(null);
    try {
      await save.mutateAsync({ currentIds: initialIds, nextIds: [...draft.keys()] });
      toast.success(t('pro.saved'));
      leaveThen(() => router.back());
    } catch (error) {
      setServerError(proErrorKey(error));
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="body" color="textSecondary">
        {t('pro.zones.subtitle')}
      </Text>
      <View style={styles.counterRow}>
        <Text
          variant="label"
          color={draft.size >= ARTISAN_RULES.zonesMax ? 'warningDark' : 'textSecondary'}
        >
          {t('pro.zones.count', { count: draft.size, max: ARTISAN_RULES.zonesMax })}
        </Text>
        <Button
          label={t('pro.zones.add')}
          icon="add"
          size="sm"
          variant="secondary"
          onPress={() => setPicker(true)}
        />
      </View>
      {serverError ? <FormAlert message={t(`pro.errors.${serverError}`)} /> : null}

      {groups.length === 0 ? (
        <EmptyState
          icon="map-outline"
          title={t('pro.zones.emptyTitle')}
          description={t('pro.zones.emptyBody')}
          action={{ label: t('pro.zones.add'), icon: 'add', onPress: () => setPicker(true) }}
        />
      ) : (
        groups.map((group) => (
          <View key={group.code} style={styles.group}>
            <Text variant="bodyStrong">
              {group.code} · {group.name}{' '}
              <Text variant="caption" color="textSecondary">
                ({group.zones.length})
              </Text>
            </Text>
            <View style={styles.chips}>
              {group.zones.map((zone) => (
                <Pressable
                  key={zone.communeId}
                  onPress={() => remove(zone)}
                  accessibilityRole="button"
                  accessibilityLabel={t('pro.zones.removeA11y', { name: label(zone) })}
                  style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
                >
                  <Text variant="label" color="primaryDark">
                    {label(zone)}
                  </Text>
                  <Icon name="close" size={16} color="primaryDark" />
                </Pressable>
              ))}
            </View>
          </View>
        ))
      )}

      {profile.baseCommune && !draft.has(profile.baseCommune.id) ? (
        <FormAlert tone="info" message={t('pro.zones.baseCommuneNote')} />
      ) : null}

      <Button
        label={t('common.save')}
        size="lg"
        fullWidth
        disabled={!dirty}
        loading={save.isPending}
        onPress={() => void onSave()}
      />

      <CommunePicker
        visible={picker}
        onClose={() => setPicker(false)}
        selected={draft}
        onToggle={toggle}
      />

      <Modal
        visible={pendingLeave !== null}
        onClose={() => setPendingLeave(null)}
        title={t('profile.editScreen.unsavedTitle')}
        description={t('profile.editScreen.unsavedBody')}
        secondaryAction={{ label: t('common.cancel'), onPress: () => setPendingLeave(null) }}
        primaryAction={{
          label: t('profile.editScreen.discard'),
          destructive: true,
          onPress: () => {
            const leave = pendingLeave;
            setPendingLeave(null);
            if (leave) leaveThen(leave);
          },
        }}
      />
    </View>
  );
}

/** Choix des communes d'une wilaya, avec recherche bilingue. */
function CommunePicker({
  visible,
  onClose,
  selected,
  onToggle,
}: {
  visible: boolean;
  onClose: () => void;
  selected: Map<number, ProZone>;
  onToggle: (zone: ProZone) => void;
}) {
  const { t } = useTranslation();
  const { locale } = useDirection();
  const { height } = useWindowDimensions();
  const wilayas = useWilayas();
  const [wilayaId, setWilayaId] = useState<number | null>(null);
  const communes = useCommunes(wilayaId);
  const [query, setQuery] = useState('');

  const wilaya = wilayas.data?.find((w) => w.id === wilayaId) ?? null;
  const wilayaOptions = (wilayas.data ?? []).map((w) => ({
    value: w.id,
    label: `${w.code} · ${locale === 'ar' ? w.nameAr : w.nameFr}`,
    keywords: `${locale === 'ar' ? w.nameFr : w.nameAr} ${w.code}`,
  }));
  const options = useMemo(
    () =>
      sortByLabel(
        (communes.data ?? []).map((c) => ({
          zone: {
            communeId: c.id,
            nameFr: c.nameFr,
            nameAr: c.nameAr,
            wilaya: wilaya
              ? { id: wilaya.id, code: wilaya.code, nameFr: wilaya.nameFr, nameAr: wilaya.nameAr }
              : null,
          } satisfies ProZone,
          label: locale === 'ar' ? c.nameAr : c.nameFr,
          keywords: locale === 'ar' ? c.nameFr : c.nameAr,
        })),
        locale,
      ),
    [communes.data, wilaya, locale],
  );
  const index = useMemo(() => buildSearchIndex(options), [options]);
  const filtered = useMemo(() => searchIndex(index, query), [index, query]);

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('pro.zones.pickerTitle')}>
      <View style={styles.picker}>
        <Select
          label={t('location.wilaya')}
          placeholder={t('location.selectWilaya')}
          searchPlaceholder={t('location.searchWilaya')}
          searchable
          options={wilayaOptions}
          value={wilayaId}
          disabled={wilayas.isPending}
          onChange={(id) => {
            setWilayaId(id);
            setQuery('');
          }}
        />
        {wilayaId === null ? (
          <Text variant="bodySmall" color="textSecondary">
            {t('location.selectWilayaFirst')}
          </Text>
        ) : communes.isError ? (
          <FormAlert
            message={t('pro.errors.network')}
            action={{ label: t('common.retry'), onPress: () => void communes.refetch() }}
          />
        ) : (
          <>
            <SearchInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('location.searchCommune')}
            />
            <FlatList
              data={filtered}
              keyExtractor={(item) => String(item.zone.communeId)}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: height * 0.45 }}
              ListEmptyComponent={
                <Text variant="body" color="textSecondary" align="center" style={styles.empty}>
                  {communes.isPending ? t('common.loading') : t('common.noResults')}
                </Text>
              }
              renderItem={({ item }) => {
                const checked = selected.has(item.zone.communeId);
                return (
                  <Pressable
                    onPress={() => onToggle(item.zone)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    accessibilityLabel={item.label}
                    style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                  >
                    <Icon
                      name={checked ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={checked ? 'primary' : 'textSecondary'}
                    />
                    <Text variant={checked ? 'bodyStrong' : 'body'} style={styles.flex}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </>
        )}
        <Button label={t('pro.zones.done')} fullWidth onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  group: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
  },
  chipPressed: { opacity: 0.7 },
  picker: { gap: spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  optionPressed: { backgroundColor: colors.surfaceMuted },
  flex: { flex: 1 },
  empty: { paddingVertical: spacing.xl },
});
