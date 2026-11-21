import { useState, type ComponentRef, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TextInput as RNTextInput,
  StyleSheet,
  View,
  type TextInputProps as RNTextInputProps,
} from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { useDirection } from '@/hooks/useDirection';
import { colors, fontFamilyFor, radius, spacing } from '@/theme';

import { Field } from './Field';

export type TextInputProps = Omit<RNTextInputProps, 'style' | 'placeholderTextColor'> & {
  label?: string;
  helper?: string;
  error?: string;
  optional?: boolean;
  icon?: IconName;
  /** Mot de passe : masqué avec bouton afficher / masquer. */
  password?: boolean;
  ref?: Ref<ComponentRef<typeof RNTextInput>>;
};

export function TextInput({
  label,
  helper,
  error,
  optional,
  icon,
  password = false,
  multiline,
  editable = true,
  onFocus,
  onBlur,
  ref,
  ...rest
}: TextInputProps) {
  const { t } = useTranslation();
  const { script } = useDirection();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const borderColor = error ? colors.error : focused ? colors.primary : colors.border;

  return (
    <Field label={label} helper={helper} error={error} optional={optional}>
      <View
        style={[
          styles.container,
          multiline && styles.multilineContainer,
          { borderColor },
          !editable && styles.disabled,
        ]}
      >
        {icon ? <Icon name={icon} size={20} color="textSecondary" /> : null}
        <RNTextInput
          ref={ref}
          {...rest}
          editable={editable}
          multiline={multiline}
          secureTextEntry={password && !revealed}
          autoCapitalize={password ? 'none' : rest.autoCapitalize}
          autoCorrect={password ? false : rest.autoCorrect}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          accessibilityHint={error ?? helper}
          placeholderTextColor={colors.textDisabled}
          cursorColor={colors.primary}
          selectionColor={colors.primaryLight}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            styles.input,
            { fontFamily: fontFamilyFor(script, 'regular') },
            multiline && styles.multilineInput,
          ]}
        />
        {password ? (
          <IconButton
            icon={revealed ? 'eye-off-outline' : 'eye-outline'}
            size="sm"
            color="textSecondary"
            accessibilityLabel={t(revealed ? 'password.hide' : 'password.show')}
            onPress={() => setRevealed((value) => !value)}
          />
        ) : null}
      </View>
    </Field>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  multilineContainer: { alignItems: 'flex-start', paddingVertical: spacing.sm },
  disabled: { backgroundColor: colors.surfaceMuted },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
  },
  multilineInput: { minHeight: 104, textAlignVertical: 'top' },
});
