import { useTranslation } from 'react-i18next';

import { ComingSoonScreen } from '@/components/navigation/ComingSoonScreen';

export default function Screen() {
  const { t } = useTranslation();
  return (
    <ComingSoonScreen
      title={t('nav.myRequests')}
      icon="document-text-outline"
      emptyTitle={t('space.empty.particulier.requests.title')}
      description={t('space.empty.particulier.requests.body')}
    />
  );
}
