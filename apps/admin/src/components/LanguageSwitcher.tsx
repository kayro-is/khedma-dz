import { SUPPORTED_LOCALES, type Locale } from '@khedma/types';

import { setLocaleAction } from '@/features/i18n/actions';
import type { Dictionary } from '@/i18n/server';

type Props = { locale: Locale; dict: Dictionary };

export function LanguageSwitcher({ locale, dict }: Props) {
  return (
    <form
      action={setLocaleAction}
      className="flex items-center gap-2"
      aria-label={dict.language.label}
    >
      {SUPPORTED_LOCALES.map((code) => (
        <button
          key={code}
          type="submit"
          name="locale"
          value={code}
          lang={code}
          aria-pressed={code === locale}
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-primary-light aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-white"
        >
          {dict.language[code]}
        </button>
      ))}
    </form>
  );
}
