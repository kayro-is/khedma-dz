import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { getDictionary, getLocale } from '@/i18n/server';

export default async function HomePage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const modules = Object.entries(dict.home.modules);

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-11 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white"
          >
            {dict.app.name.charAt(0)}
          </span>
          <div>
            <p className="text-lg font-bold">{dict.app.name}</p>
            <p className="text-sm text-text-secondary">
              {dict.app.area} · {dict.app.nameAlt}
            </p>
          </div>
        </div>
        <LanguageSwitcher locale={locale} dict={dict} />
      </header>

      <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h1 className="text-2xl font-bold">{dict.home.title}</h1>
        <p className="mt-2 text-text-secondary">{dict.home.restricted}</p>
        <p className="mt-4 rounded-lg bg-primary-light px-4 py-3 text-sm text-primary-dark">
          {dict.home.pending}
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-text-secondary uppercase">
          {dict.home.modulesTitle}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {modules.map(([key, label]) => (
            <li key={key} className="rounded-xl border border-border bg-surface px-4 py-3">
              {label}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
