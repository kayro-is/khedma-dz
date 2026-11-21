import { useTranslation } from 'react-i18next';

import { ComingSoonScreen } from '@/components/navigation/ComingSoonScreen';

export default function Screen() {
  const { t } = useTranslation();
  return (
    <ComingSoonScreen
      title={t('nav.messages')}
      icon="chatbubbles-outline"
      emptyTitle={t('space.empty.particulier.messages.title')}
      description={t('space.empty.particulier.messages.body')}
    />
  );
}
