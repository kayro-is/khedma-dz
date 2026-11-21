import { useTranslation } from 'react-i18next';

import { ComingSoonScreen } from '@/components/navigation/ComingSoonScreen';

export default function Screen() {
  const { t } = useTranslation();
  return (
    <ComingSoonScreen
      title={t('nav.requests')}
      icon="megaphone-outline"
      emptyTitle={t('space.empty.artisan.requests.title')}
      description={t('space.empty.artisan.requests.body')}
    />
  );
}
