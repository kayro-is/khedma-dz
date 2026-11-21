import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import type { ValidationMessageKey } from '@khedma/validation';

import { TextInput, type TextInputProps } from './TextInput';

/** Les messages Zod partagés sont des clés « validation.* » (voir @khedma/validation). */
export function translateValidation(
  t: (key: ValidationMessageKey) => string,
  message: string,
): string {
  return t(message as ValidationMessageKey);
}

type FormTextInputProps<T extends FieldValues> = Omit<
  TextInputProps,
  'value' | 'onChangeText' | 'onBlur' | 'error'
> & {
  control: Control<T>;
  name: FieldPath<T>;
};

/**
 * Champ relié à React Hook Form. Les erreurs Zod sont des clés i18n (« validation.* »)
 * traduites ici, dans la langue active.
 */
export function FormTextInput<T extends FieldValues>({
  control,
  name,
  ...rest
}: FormTextInputProps<T>) {
  const { t } = useTranslation();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextInput
          {...rest}
          ref={field.ref}
          value={typeof field.value === 'string' ? field.value : ''}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={
            fieldState.error?.message ? translateValidation(t, fieldState.error.message) : undefined
          }
        />
      )}
    />
  );
}
