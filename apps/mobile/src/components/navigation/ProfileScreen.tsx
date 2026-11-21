import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { formatDzMobileForDisplay } from '@khedma/validation';

import { SpaceSwitcher } from '@/components/navigation/SpaceSwitcher';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { ListRow, ListSection } from '@/components/ui/ListRow';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import { Modal } from '@/components/ui/Modal';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/AuthProvider';
import type { MyProfile } from '@/features/profile/profileApi';
import { profileErrorKey } from '@/features/profile/profileErrors';
import { pickAndCompressAvatar } from '@/features/profile/pickAvatar';
import { useAvatarMutations, useMyProfile } from '@/features/profile/useProfile';
import { useDirection } from '@/hooks/useDirection';
import { toast } from '@/store/toastStore';
import { colors, radius, shadows, spacing } from '@/theme';

type PendingConfirm = 'signOut' | 'signOutEverywhere' | null;

/** « Mon profil » (commun aux deux espaces), avec le sélecteur d'espace Particulier / Artisan. */
export function ProfileScreen({ onBack }: { onBack?: () => void } = {}) {
  const { t } = useTranslation();
  const profile = useMyProfile();

  return (
    <Screen
      scroll
      // Hors onglets (écran empilé), la zone sûre du bas est gérée ici.
      edges={onBack ? ['top', 'bottom', 'left', 'right'] : undefined}
      header={<ScreenHeader title={t('profile.title')} onBack={onBack} />}
      contentStyle={styles.content}
    >
      {profile.isPending ? (
        <ProfileSkeleton />
      ) : profile.isError ? (
        <ErrorState
          kind={profileErrorKey(profile.error) === 'network' ? 'network' : 'generic'}
          title={t('profile.loadError')}
          onRetry={() => void profile.refetch()}
          retrying={profile.isFetching}
        />
      ) : (
        <ProfileContent profile={profile.data} />
      )}
    </Screen>
  );
}

function ProfileContent({ profile }: { profile: MyProfile }) {
  const { t } = useTranslation();
  const { locale } = useDirection();
  const { signOut } = useAuth();
  const avatar = useAvatarMutations(profile.avatarPath);
  const [photoSheet, setPhotoSheet] = useState(false);
  const [confirm, setConfirm] = useState<PendingConfirm>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const uploading = avatar.replace.isPending || avatar.remove.isPending;
  const location = profile.commune
    ? [
        locale === 'ar' ? profile.commune.nameAr : profile.commune.nameFr,
        profile.wilaya ? (locale === 'ar' ? profile.wilaya.nameAr : profile.wilaya.nameFr) : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : t('profile.notProvided');

  const changePhoto = async () => {
    setPhotoSheet(false);
    try {
      const prepared = await pickAndCompressAvatar();
      if (!prepared) return;
      // Aperçu local immédiat pendant l'envoi ; retiré en cas d'échec.
      setPreviewUri(prepared.uri);
      await avatar.replace.mutateAsync(prepared.bytes);
      toast.success(t('profile.photo.updated'));
    } catch (error) {
      toast.error(t(`profile.errors.${profileErrorKey(error, 'photoFailed')}`));
    } finally {
      setPreviewUri(null);
    }
  };

  const deletePhoto = async () => {
    setPhotoSheet(false);
    try {
      await avatar.remove.mutateAsync();
      toast.success(t('profile.photo.removed'));
    } catch (error) {
      toast.error(t(`profile.errors.${profileErrorKey(error, 'photoFailed')}`));
    }
  };

  const runSignOut = async () => {
    const scope = confirm === 'signOutEverywhere' ? 'global' : 'local';
    setSigningOut(true);
    try {
      await signOut(scope);
      toast.success(
        t(scope === 'global' ? 'profile.signOutEverywhereDone' : 'auth.signOut.success'),
      );
    } catch (error) {
      toast.error(t(`profile.errors.${profileErrorKey(error)}`));
      setSigningOut(false);
      setConfirm(null);
    }
  };

  return (
    <>
      <View style={styles.hero}>
        <Pressable
          onPress={() => setPhotoSheet(true)}
          disabled={uploading}
          accessibilityRole="button"
          accessibilityLabel={t('profile.photo.a11y')}
          style={styles.avatarWrap}
        >
          <Avatar
            name={fullName || profile.email}
            uri={previewUri ?? profile.avatarUrl}
            size={96}
          />
          <View style={styles.cameraBadge}>
            {uploading ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Icon name="camera" size={16} color="onPrimary" />
            )}
          </View>
        </Pressable>
        <Text variant="h2" align="center" numberOfLines={2}>
          {fullName}
        </Text>
        <Text variant="bodySmall" color="textSecondary" align="center" numberOfLines={1}>
          {profile.email}
        </Text>
        <Button
          label={t('profile.edit')}
          icon="create-outline"
          variant="secondary"
          size="sm"
          style={styles.editButton}
          onPress={() => router.push('/account/edit')}
        />
      </View>

      <SpaceSwitcher />

      <ListSection title={t('profile.personalInfo')}>
        <ListRow icon="mail-outline" label={t('profile.email')} value={profile.email} />
        <ListRow
          icon="call-outline"
          label={t('profile.phone')}
          value={formatDzMobileForDisplay(profile.phone) ?? t('profile.notProvided')}
          description={
            profile.phone && !profile.phoneVerified ? t('profile.phoneVerificationSoon') : undefined
          }
          trailing={
            profile.phone && !profile.phoneVerified ? (
              <Badge label={t('profile.phoneUnverified')} tone="warning" />
            ) : undefined
          }
        />
        <ListRow icon="location-outline" label={t('profile.location')} value={location} />
      </ListSection>

      <ListSection title={t('profile.preferences')}>
        <ListRow
          icon="language-outline"
          label={t('profile.language')}
          value={t(`language.${locale}`)}
          onPress={() => router.push('/language')}
        />
      </ListSection>

      <ListSection title={t('profile.security')}>
        <ListRow
          icon="key-outline"
          label={t('profile.changePassword')}
          onPress={() => router.push('/account/password')}
        />
        <ListRow
          icon="phone-portrait-outline"
          label={t('profile.signOutEverywhere')}
          onPress={() => setConfirm('signOutEverywhere')}
        />
      </ListSection>

      <ListSection title={t('profile.accountSection')}>
        <ListRow
          icon="log-out-outline"
          label={t('auth.signOut.action')}
          onPress={() => setConfirm('signOut')}
        />
        <ListRow
          icon="trash-outline"
          label={t('profile.deleteAccount')}
          destructive
          onPress={() => router.push('/account/delete')}
        />
      </ListSection>

      <Text variant="caption" color="textDisabled" align="center">
        {t('profile.version', { version: Constants.expoConfig?.version ?? '0.0.0' })}
      </Text>

      <BottomSheet
        visible={photoSheet}
        onClose={() => setPhotoSheet(false)}
        title={t('profile.photo.title')}
      >
        <View style={styles.sheetActions}>
          <Button
            label={t('profile.photo.choose')}
            icon="images-outline"
            fullWidth
            onPress={() => void changePhoto()}
          />
          {profile.avatarPath ? (
            <Button
              label={t('profile.photo.remove')}
              icon="trash-outline"
              variant="ghost"
              fullWidth
              onPress={() => void deletePhoto()}
            />
          ) : null}
        </View>
      </BottomSheet>

      <Modal
        visible={confirm !== null}
        onClose={() => setConfirm(null)}
        dismissable={!signingOut}
        title={t(
          confirm === 'signOutEverywhere'
            ? 'profile.signOutEverywhereTitle'
            : 'auth.signOut.confirmTitle',
        )}
        description={t(
          confirm === 'signOutEverywhere'
            ? 'profile.signOutEverywhereBody'
            : 'auth.signOut.confirmBody',
        )}
        secondaryAction={{ label: t('common.cancel'), onPress: () => setConfirm(null) }}
        primaryAction={{
          label: t(
            confirm === 'signOutEverywhere' ? 'profile.signOutEverywhere' : 'auth.signOut.action',
          ),
          destructive: true,
          loading: signingOut,
          onPress: () => void runSignOut(),
        }}
      />
    </>
  );
}

function ProfileSkeleton() {
  return (
    <View style={styles.skeleton} accessibilityState={{ busy: true }}>
      <Skeleton width={96} height={96} borderRadius={48} />
      <Skeleton width="55%" height={20} />
      <Skeleton width="40%" />
      <Skeleton height={180} borderRadius={radius.lg} style={styles.skeletonBlock} />
      <Skeleton height={64} borderRadius={radius.lg} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl },
  hero: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  avatarWrap: { marginBottom: spacing.sm },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    end: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: { alignSelf: 'center', marginTop: spacing.md },
  sheetActions: { gap: spacing.sm },
  skeleton: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xl },
  skeletonBlock: { marginTop: spacing.lg },
});
