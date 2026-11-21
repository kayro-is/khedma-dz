import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { BrandMark } from '@/components/ui/BrandMark';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme';

import { LanguageToggle } from './LanguageToggle';

type AuthLayoutProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

/** Gabarit commun des écrans d'authentification : barre (retour + langue), en-tête, formulaire, pied. */
export function AuthLayout({ title, subtitle, onBack, children, footer }: AuthLayoutProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const entering = reduceMotion ? undefined : FadeInDown.duration(320);

  return (
    <Screen scroll edges={['top', 'bottom', 'left', 'right']} contentStyle={styles.content}>
      <View style={styles.topBar}>
        {onBack ? (
          <IconButton
            icon="arrow-back"
            flipInRTL
            variant="surface"
            accessibilityLabel={t('common.back')}
            onPress={onBack}
          />
        ) : (
          <View />
        )}
        <LanguageToggle />
      </View>

      <Animated.View entering={entering} style={styles.header}>
        <BrandMark size={52} />
        <Text variant="h1" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </Animated.View>

      <Animated.View
        entering={reduceMotion ? undefined : FadeInDown.duration(320).delay(80)}
        style={styles.body}
      >
        {children}
      </Animated.View>

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, gap: spacing.xl },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  header: { gap: spacing.sm, alignItems: 'flex-start' },
  body: { gap: spacing.lg },
  footer: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
});
