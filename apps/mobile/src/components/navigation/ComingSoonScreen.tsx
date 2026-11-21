import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/EmptyState';
import type { IconName } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

/**
 * Onglet dont le contenu est livré par un ticket ultérieur : état vide explicite, sans données
 * fictives ni action qui laisserait croire que la fonctionnalité est disponible.
 */
export function ComingSoonScreen({
  title,
  icon,
  emptyTitle,
  description,
}: {
  title: string;
  icon: IconName;
  emptyTitle?: string;
  description?: string;
}) {
  const { t } = useTranslation();
  return (
    <Screen header={<ScreenHeader title={title} />} contentStyle={{ justifyContent: 'center' }}>
      <EmptyState
        icon={icon}
        title={emptyTitle ?? t('comingSoon.title')}
        description={description ?? t('comingSoon.description')}
      />
    </Screen>
  );
}
