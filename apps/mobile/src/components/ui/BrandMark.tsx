import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { colors, radius, shadows } from '@/theme';

import { Icon } from './Icon';

/** Emblème Khedma DZ (provisoire, en attendant le logo définitif) : maison + outil sur fond émeraude. */
export function BrandMark({ size = 56 }: { size?: number }) {
  const { t } = useTranslation();
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('app.name')}
      style={[styles.mark, { width: size, height: size, borderRadius: Math.round(size * 0.3) }]}
    >
      <Icon name="home" size={size * 0.5} color="onPrimary" />
      <View style={[styles.badge, { width: size * 0.42, height: size * 0.42, borderRadius: size }]}>
        <Icon name="construct" size={size * 0.24} color="primaryDark" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.raised,
  },
  badge: {
    position: 'absolute',
    bottom: -4,
    end: -4,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
});
