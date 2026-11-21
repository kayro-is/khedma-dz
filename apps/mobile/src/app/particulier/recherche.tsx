import { useTranslation } from 'react-i18next';

import { ComingSoonScreen } from '@/components/navigation/ComingSoonScreen';

export default function Screen() {
  const { t } = useTranslation();
  return (
    <ComingSoonScreen
      title={t('nav.search')}
      icon="search-outline"
      emptyTitle={t('space.empty.particulier.search.title')}
      description={t('space.empty.particulier.search.body')}
    />
  );
}
