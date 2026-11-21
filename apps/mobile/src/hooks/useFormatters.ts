import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { approximateDistanceKm, formatDzdNumber, formatNumber, relativeDay } from '@/lib/format';

import { useDirection } from './useDirection';

/** Formats localisés prêts à afficher (montants, distances, dates relatives, notes). */
export function useFormatters() {
  const { t } = useTranslation();
  const { locale } = useDirection();

  const dzd = useCallback(
    (amount: number) => t('currency.amount', { amount: formatDzdNumber(amount, locale) }),
    [t, locale],
  );

  const distance = useCallback(
    (km: number) => {
      const rounded = approximateDistanceKm(km);
      return rounded === null
        ? t('artisan.distanceNear')
        : t('artisan.distance', { distance: formatNumber(rounded, locale, 1) });
    },
    [t, locale],
  );

  const dayOrTime = useCallback(
    (value: Date | string) => {
      const result = relativeDay(value, locale);
      if (result.kind === 'today') return result.time;
      if (result.kind === 'yesterday') return t('time.yesterday');
      return result.date;
    },
    [t, locale],
  );

  const rating = useCallback((value: number) => formatNumber(value, locale, 1), [locale]);

  return useMemo(
    () => ({ dzd, distance, dayOrTime, rating, number: (n: number) => formatNumber(n, locale) }),
    [dzd, distance, dayOrTime, rating, locale],
  );
}
