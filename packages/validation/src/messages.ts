/**
 * Les messages d'erreur de validation sont des CLÉS de traduction,
 * jamais du texte affiché directement. Chaque application les traduit
 * via ses fichiers fr.json / ar.json (section "validation").
 */
export const VALIDATION_MESSAGES = {
  required: 'validation.required',
  phoneInvalid: 'validation.phoneInvalid',
  amountInvalid: 'validation.amountInvalid',
  amountTooLarge: 'validation.amountTooLarge',
  emailInvalid: 'validation.emailInvalid',
  nameInvalid: 'validation.nameInvalid',
  nameTooLong: 'validation.nameTooLong',
  passwordTooShort: 'validation.passwordTooShort',
  passwordTooLong: 'validation.passwordTooLong',
  passwordLowercase: 'validation.passwordLowercase',
  passwordUppercase: 'validation.passwordUppercase',
  passwordDigit: 'validation.passwordDigit',
  passwordsMismatch: 'validation.passwordsMismatch',
  termsRequired: 'validation.termsRequired',
  passwordSameAsCurrent: 'validation.passwordSameAsCurrent',
  deleteConfirmationMismatch: 'validation.deleteConfirmationMismatch',
  communeInvalid: 'validation.communeInvalid',
  businessNameTooShort: 'validation.businessNameTooShort',
  businessNameTooLong: 'validation.businessNameTooLong',
  businessNameInvalid: 'validation.businessNameInvalid',
  categoryRequired: 'validation.categoryRequired',
  communeRequired: 'validation.communeRequired',
  yearsExperienceInvalid: 'validation.yearsExperienceInvalid',
  descriptionTooLong: 'validation.descriptionTooLong',
  tradesTooMany: 'validation.tradesTooMany',
  captionTooLong: 'validation.captionTooLong',
} as const;

export type ValidationMessageKey = (typeof VALIDATION_MESSAGES)[keyof typeof VALIDATION_MESSAGES];
