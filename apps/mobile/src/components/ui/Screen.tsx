import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

export type ScreenProps = {
  children: ReactNode;
  /** Contenu défilant (formulaires, pages longues). Les listes utilisent FlatList directement. */
  scroll?: boolean;
  padded?: boolean;
  header?: ReactNode;
  /** Par défaut la barre d'onglets gère le bas de l'écran. */
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
};

export function Screen({
  children,
  scroll = false,
  padded = true,
  header,
  edges = ['top', 'left', 'right'],
  contentStyle,
}: ScreenProps) {
  const padding = padded ? styles.padded : undefined;

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {header}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[padding, styles.scrollContent, contentStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, padding, contentStyle]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  padded: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  scrollContent: { paddingBottom: spacing.xxxl },
});
