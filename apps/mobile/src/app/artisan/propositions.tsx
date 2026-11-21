import { useTranslation } from 'react-i18next';

import { ComingSoonScreen } from '@/components/navigation/ComingSoonScreen';

export default function Screen() {
  const { t } = useTranslation();
  return (
    <ComingSoonScreen
      title={t('nav.proposals')}
      icon="pricetags-outline"
      emptyTitle={t('space.empty.artisan.proposals.title')}
      description={t('space.empty.artisan.proposals.body')}
    />
  );
}
