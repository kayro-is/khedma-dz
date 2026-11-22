import { Redirect } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { REQUEST_URGENCIES, type LocalizedText, type RequestUrgency } from '@khedma/types';
import { VALIDATION_MESSAGES } from '@khedma/validation';

import {
  ArtisanCard,
  MessageBubble,
  NotificationItem,
  ProposalCard,
  RequestCard,
  ServiceCard,
} from '@/components/cards';
import {
  CategorySelector,
  Checkbox,
  ImageUploader,
  LocationPicker,
  RadioGroup,
  SearchInput,
  Select,
  TextInput,
  type LocationValue,
} from '@/components/form';
import {
  Avatar,
  Badge,
  BottomSheet,
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingSkeleton,
  Modal,
  RatingStars,
  RatingSummary,
  Screen,
  ScreenHeader,
  Text,
  VerifiedBadge,
} from '@/components/ui';
import { categoryIcon } from '@/features/categories/categoryIcons';
import {
  SAMPLE_ARTISANS,
  SAMPLE_CATEGORIES,
  SAMPLE_COMMUNES,
  SAMPLE_TEXTS,
  SAMPLE_WILAYAS,
} from '@/features/dev/sampleData';
import type { PickedImage } from '@/features/media/validateImages';
import { useDirection } from '@/hooks/useDirection';
import { toast } from '@/store/toastStore';
import { spacing, textVariants, type TextVariant } from '@/theme';
import { BACK_FALLBACK, safeBack } from '@/lib/navigation';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="h2" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

/** Catalogue visuel de tous les composants, pour vérification en français et en arabe. */
export default function UiCatalogScreen() {
  const { t } = useTranslation();
  const { locale } = useDirection();
  const L = (text: LocalizedText) => text[locale];

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [query, setQuery] = useState('');
  const [trade, setTrade] = useState<string | null>(null);
  const [terms, setTerms] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [urgency, setUrgency] = useState<RequestUrgency>('NORMAL');
  const [rating, setRating] = useState(0);
  const [location, setLocation] = useState<LocationValue>({ wilayaId: null, communeId: null });
  const [images, setImages] = useState<PickedImage[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filters, setFilters] = useState<string[]>([]);
  const [favorite, setFavorite] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!__DEV__) return <Redirect href="/" />;

  const categoryItems = SAMPLE_CATEGORIES.map((c) => ({
    id: c.slug,
    label: L(c.label),
    icon: categoryIcon(c.slug),
  }));
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);

  return (
    <Screen
      scroll
      edges={['top', 'left', 'right', 'bottom']}
      header={
        <ScreenHeader
          title={t('dev.title')}
          subtitle={t('dev.subtitle')}
          onBack={() => safeBack(BACK_FALLBACK.entry)}
        />
      }
    >
      <Section title={t('dev.sections.typography')}>
        {(Object.keys(textVariants) as TextVariant[]).map((variant) => (
          <Text key={variant} variant={variant} numberOfLines={1}>
            {`${variant} · ${t('app.slogan')}`}
          </Text>
        ))}
        <Text variant="body" color="textSecondary">
          {t('dev.longText')}
        </Text>
      </Section>

      <Section title={t('dev.sections.buttons')}>
        <Button label={t('dev.primary')} icon="add" fullWidth onPress={() => undefined} />
        <Button
          label={t('dev.secondary')}
          variant="secondary"
          iconEnd="arrow-forward"
          iconEndFlipInRTL
          fullWidth
        />
        <View style={styles.row}>
          <Button label={t('dev.ghost')} variant="ghost" size="sm" />
          <Button label={t('dev.danger')} variant="danger" size="sm" icon="trash-outline" />
          <Button label={t('dev.disabled')} size="sm" disabled />
          <Button label={t('common.loading')} size="sm" loading />
        </View>
        <View style={styles.row}>
          <IconButton
            icon="notifications-outline"
            variant="surface"
            accessibilityLabel={t('dev.primary')}
          />
          <IconButton icon="add" variant="filled" accessibilityLabel={t('dev.primary')} />
          <IconButton
            icon="arrow-forward"
            variant="tonal"
            flipInRTL
            accessibilityLabel={t('common.back')}
          />
          <IconButton icon="close" size="sm" accessibilityLabel={t('common.close')} />
        </View>
      </Section>

      <Section title={t('dev.sections.inputs')}>
        <TextInput
          label={t('dev.fullName')}
          value={name}
          onChangeText={setName}
          icon="person-outline"
        />
        <TextInput
          label={t('dev.phone')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          icon="call-outline"
          helper={t('dev.phoneHelper')}
          error={
            phone.length > 0 && phone.length < 10 ? t(VALIDATION_MESSAGES.phoneInvalid) : undefined
          }
        />
        <TextInput label={t('dev.password')} password icon="lock-closed-outline" />
        <TextInput label={t('dev.description')} optional multiline />
        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('dev.searchPlaceholder')}
        />
      </Section>

      <Section title={t('dev.sections.selection')}>
        <Select
          label={t('dev.tradeLabel')}
          searchable
          options={categoryItems.map((c) => ({ value: c.id, label: c.label }))}
          value={trade}
          onChange={setTrade}
        />
        <Checkbox
          checked={terms}
          onChange={setTerms}
          label={t('dev.terms')}
          error={terms ? undefined : t(VALIDATION_MESSAGES.required)}
        />
        <Checkbox
          checked={notifications}
          onChange={setNotifications}
          label={t('dev.notifications')}
        />
        <RadioGroup
          label={t('dev.urgencyLabel')}
          options={REQUEST_URGENCIES.map((u) => ({ value: u, label: t(`urgency.${u}`) }))}
          value={urgency}
          onChange={setUrgency}
        />
      </Section>

      <Section title={t('dev.sections.badges')}>
        <View style={styles.row}>
          <VerifiedBadge />
          <Badge label={t('badge.new')} tone="accent" />
          <Badge label={t('requestStatus.IN_PROGRESS')} tone="warning" />
          <Badge label={t('proposalStatus.REJECTED')} tone="error" />
          <Badge label={t('requestStatus.COMPLETED')} tone="success" />
          <Badge label={t('requestStatus.CANCELLED')} />
        </View>
        <View style={styles.row}>
          <Avatar name={L(SAMPLE_ARTISANS[0]!.name)} size={64} verified />
          <Avatar name={L(SAMPLE_ARTISANS[1]!.name)} size={48} />
          <Avatar name="Sofiane" size={36} />
        </View>
      </Section>

      <Section title={t('dev.sections.ratings')}>
        <RatingStars value={4.5} size={20} />
        <RatingStars
          value={rating}
          size={32}
          onChange={setRating}
          accessibilityLabel={t('dev.rateLabel')}
        />
        <RatingSummary average={4.5} count={23} />
        <RatingSummary average={5} count={1} />
        <RatingSummary average={null} count={0} />
      </Section>

      <Section title={t('dev.sections.cards')}>
        {SAMPLE_ARTISANS.map((artisan) => (
          <ArtisanCard
            key={artisan.name.fr}
            displayName={L(artisan.name)}
            trade={L(artisan.trade)}
            commune={L(artisan.commune)}
            ratingAverage={artisan.ratingAverage}
            reviewCount={artisan.reviewCount}
            distanceKm={artisan.distanceKm}
            verified={artisan.verified}
            isFavorite={favorite}
            onToggleFavorite={() => setFavorite((v) => !v)}
            onPress={() => undefined}
          />
        ))}
        <ServiceCard
          title={L(SAMPLE_TEXTS.serviceTitle)}
          categoryLabel={L(SAMPLE_CATEGORIES[2]!.label)}
          icon={categoryIcon('climatisation')}
          description={L(SAMPLE_TEXTS.serviceDescription)}
          priceFrom={8500}
          onPress={() => undefined}
        />
        <RequestCard
          title={L(SAMPLE_TEXTS.requestTitle)}
          categoryLabel={L(SAMPLE_CATEGORIES[0]!.label)}
          commune={L(SAMPLE_COMMUNES[2]!.label)}
          createdAt={now}
          status="OPEN"
          urgency="URGENT"
          budget={5000}
          proposalsCount={3}
          onPress={() => undefined}
        />
        <RequestCard
          title={t('dev.longText')}
          categoryLabel={L(SAMPLE_CATEGORIES[3]!.label)}
          commune={L(SAMPLE_COMMUNES[7]!.label)}
          createdAt={yesterday}
          status="IN_PROGRESS"
          urgency="LOW"
          budget={null}
          proposalsCount={0}
        />
        <ProposalCard
          artisanName={L(SAMPLE_ARTISANS[0]!.name)}
          artisanVerified
          ratingAverage={4.5}
          reviewCount={23}
          amount={4500}
          estimatedDays={1}
          message={L(SAMPLE_TEXTS.proposalMessage)}
          status="PENDING"
          onAccept={() => toast.success(t('dev.toastSuccessMessage'))}
          onReject={() => undefined}
          onDiscuss={() => undefined}
        />
        <ProposalCard
          artisanName={L(SAMPLE_ARTISANS[1]!.name)}
          artisanVerified={false}
          ratingAverage={null}
          reviewCount={0}
          amount={6250.5}
          estimatedDays={3}
          message={L(SAMPLE_TEXTS.proposalMessage)}
          status="REJECTED"
        />
      </Section>

      <Section title={t('dev.sections.messages')}>
        <View style={styles.chat}>
          <MessageBubble text={L(SAMPLE_TEXTS.messageIn)} isOwn={false} createdAt={yesterday} />
          <MessageBubble text={L(SAMPLE_TEXTS.messageOut)} isOwn createdAt={now} status="read" />
          <MessageBubble
            text={t('dev.longText')}
            isOwn
            createdAt={now}
            status="sent"
            isFirstInGroup={false}
          />
          <MessageBubble
            text={L(SAMPLE_TEXTS.messageOut)}
            isOwn
            createdAt={now}
            status="failed"
            onRetry={() => undefined}
          />
        </View>
      </Section>

      <Section title={t('dev.sections.notifications')}>
        <NotificationItem
          kind="proposal"
          title={L(SAMPLE_TEXTS.notificationTitle)}
          body={L(SAMPLE_TEXTS.notificationBody)}
          createdAt={now}
          read={false}
          onPress={() => undefined}
        />
        <NotificationItem
          kind="message"
          title={t('nav.messages')}
          body={L(SAMPLE_TEXTS.messageIn)}
          createdAt={yesterday}
          read
          onPress={() => undefined}
        />
      </Section>

      <Section title={t('dev.sections.feedback')}>
        <EmptyState
          icon="document-text-outline"
          title={t('dev.emptyTitle')}
          description={t('dev.emptyDescription')}
          action={{ label: t('dev.emptyAction'), icon: 'add', onPress: () => undefined }}
        />
        <ErrorState kind="network" onRetry={() => undefined} />
        <LoadingSkeleton count={2} />
      </Section>

      <Section title={t('dev.sections.overlays')}>
        <Button
          label={t('dev.openModal')}
          variant="secondary"
          fullWidth
          onPress={() => setModalOpen(true)}
        />
        <Button
          label={t('dev.openSheet')}
          variant="secondary"
          fullWidth
          onPress={() => setSheetOpen(true)}
        />
        <Button
          label={t('dev.toastSuccess')}
          variant="ghost"
          onPress={() => toast.success(t('dev.toastSuccessMessage'))}
        />
        <Button
          label={t('dev.toastError')}
          variant="ghost"
          onPress={() => toast.error(t('dev.toastErrorMessage'))}
        />
      </Section>

      <Section title={t('dev.sections.location')}>
        <LocationPicker
          wilayas={SAMPLE_WILAYAS.map((w) => ({ id: w.id, code: w.code, label: L(w.label) }))}
          communes={SAMPLE_COMMUNES.map((c) => ({
            id: c.id,
            wilayaId: c.wilayaId,
            label: L(c.label),
          }))}
          value={location}
          onChange={setLocation}
        />
      </Section>

      <Section title={t('dev.sections.images')}>
        <ImageUploader value={images} onChange={setImages} max={5} />
      </Section>

      <Section title={t('dev.sections.categories')}>
        <CategorySelector
          label={t('dev.categoryLabel')}
          items={categoryItems}
          value={categories}
          onChange={setCategories}
        />
        <CategorySelector
          items={categoryItems}
          value={filters}
          onChange={setFilters}
          mode="multiple"
          layout="chips"
        />
      </Section>

      <Modal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t('dev.modalTitle')}
        description={t('dev.modalBody')}
        secondaryAction={{ label: t('common.cancel'), onPress: () => setModalOpen(false) }}
        primaryAction={{
          label: t('dev.danger'),
          destructive: true,
          onPress: () => {
            setModalOpen(false);
            toast.success(t('dev.toastSuccessMessage'));
          },
        }}
      />
      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t('dev.sheetTitle')}
      >
        <RadioGroup
          options={REQUEST_URGENCIES.map((u) => ({ value: u, label: t(`urgency.${u}`) }))}
          value={urgency}
          onChange={(value) => {
            setUrgency(value);
            setSheetOpen(false);
          }}
        />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md, marginBottom: spacing.xxl },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  chat: { gap: spacing.sm },
});
