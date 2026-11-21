import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';

import { Select } from './Select';

/**
 * Les listes de wilayas et communes proviennent de la base de données : référentiel officiel
 * KHD-007 (69 wilayas, 1 541 communes). Ce composant ne contient aucune donnée géographique.
 * Recherche instantanée sur le nom dans les deux langues et sur le numéro de wilaya.
 */
/** `altLabel` : nom dans l'autre langue, utilisé pour la recherche (non affiché). */
export type WilayaOption = { id: string; code: string; label: string; altLabel?: string };
export type CommuneOption = { id: string; wilayaId: string; label: string; altLabel?: string };

export type LocationValue = { wilayaId: string | null; communeId: string | null };

export type LocationPickerProps = {
  wilayas: readonly WilayaOption[];
  communes: readonly CommuneOption[];
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  errors?: { wilaya?: string; commune?: string };
  disabled?: boolean;
};

export function LocationPicker({
  wilayas,
  communes,
  value,
  onChange,
  errors,
  disabled = false,
}: LocationPickerProps) {
  const { t } = useTranslation();

  const wilayaOptions = useMemo(
    () =>
      wilayas.map((w) => ({
        value: w.id,
        label: `${w.code} · ${w.label}`,
        keywords: `${w.altLabel ?? ''} ${w.code}`,
      })),
    [wilayas],
  );
  const communeOptions = useMemo(
    () =>
      communes
        .filter((c) => c.wilayaId === value.wilayaId)
        .map((c) => ({ value: c.id, label: c.label, keywords: c.altLabel })),
    [communes, value.wilayaId],
  );

  return (
    <View style={styles.container}>
      <Select
        label={t('location.wilaya')}
        placeholder={t('location.selectWilaya')}
        searchPlaceholder={t('location.searchWilaya')}
        searchable
        options={wilayaOptions}
        value={value.wilayaId}
        error={errors?.wilaya}
        disabled={disabled}
        onChange={(wilayaId) =>
          // Changer de wilaya réinitialise la commune.
          onChange({ wilayaId, communeId: wilayaId === value.wilayaId ? value.communeId : null })
        }
      />
      <Select
        label={t('location.commune')}
        placeholder={t('location.selectCommune')}
        searchPlaceholder={t('location.searchCommune')}
        searchable
        options={communeOptions}
        value={value.communeId}
        error={errors?.commune}
        helper={value.wilayaId ? undefined : t('location.selectWilayaFirst')}
        disabled={disabled || !value.wilayaId}
        onChange={(communeId) => onChange({ ...value, communeId })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
});
