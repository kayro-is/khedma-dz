import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { evaluatePassword, type PasswordRule } from '@khedma/validation';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useDirection } from '@/hooks/useDirection';
import { colors, radius, spacing, type ColorToken } from '@/theme';

const LEVEL_COLORS: Record<1 | 2 | 3 | 4, string> = {
  1: colors.error,
  2: colors.warning,
  3: colors.primary,
  4: colors.success,
};
const LEVEL_TEXT: Record<1 | 2 | 3 | 4, ColorToken> = {
  1: 'error',
  2: 'warningDark',
  3: 'primary',
  4: 'success',
};
const RULES: PasswordRule[] = ['length', 'lowercase', 'uppercase', 'digit'];

function Segment({ active, color }: { active: boolean; color: string }) {
  const reduceMotion = useReducedMotion();
  const { isRTL } = useDirection();
  const fill = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    fill.set(withTiming(active ? 1 : 0, { duration: reduceMotion ? 0 : 220 }));
  }, [active, fill, reduceMotion]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));
  return (
    <View style={styles.segment}>
      {/* Le remplissage part du début de ligne : gauche en français, droite en arabe. */}
      <Animated.View
        style={[
          styles.segmentFill,
          { backgroundColor: color, transformOrigin: isRTL ? 'right' : 'left' },
          style,
        ]}
      />
    </View>
  );
}

/** Jauge de robustesse (4 niveaux) + liste des règles obligatoires, mise à jour à la frappe. */
export function PasswordStrengthMeter({ password }: { password: string }) {
  const { t } = useTranslation();
  const { level, rules } = evaluatePassword(password);
  const color = level === 0 ? colors.border : LEVEL_COLORS[level];

  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <View style={styles.bars}>
        {[1, 2, 3, 4].map((step) => (
          <Segment key={step} active={level >= step} color={color} />
        ))}
      </View>
      {level > 0 ? (
        <Text variant="caption" color={LEVEL_TEXT[level as 1 | 2 | 3 | 4]}>
          {t('auth.strength.label', { level: t(`auth.strength.levels.${level as 1 | 2 | 3 | 4}`) })}
        </Text>
      ) : null}
      <View style={styles.rules}>
        {RULES.map((rule) => (
          <View
            key={rule}
            style={styles.rule}
            accessible
            accessibilityRole="text"
            accessibilityState={{ checked: rules[rule] }}
          >
            <Icon
              name={rules[rule] ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={rules[rule] ? 'success' : 'textDisabled'}
            />
            <Text variant="caption" color={rules[rule] ? 'textPrimary' : 'textSecondary'}>
              {t(`auth.strength.rules.${rule}`)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  bars: { flexDirection: 'row', gap: spacing.xs },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  segmentFill: { flex: 1, borderRadius: radius.pill },
  rules: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.lg, rowGap: spacing.xs },
  rule: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minWidth: '42%' },
});
