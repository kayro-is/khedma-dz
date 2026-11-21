/**
 * DONNÉES FICTIVES — utilisées UNIQUEMENT par le catalogue de composants (écran de développement).
 * Les personnes sont inventées. Les wilayas et communes citées existent réellement,
 * mais la liste complète proviendra de la base de données (KHD-007).
 */
import type { LocalizedText } from '@khedma/types';

export const SAMPLE_CATEGORIES: { slug: string; label: LocalizedText }[] = [
  { slug: 'plomberie', label: { fr: 'Plomberie', ar: 'سباكة' } },
  { slug: 'electricite', label: { fr: 'Électricité', ar: 'كهرباء' } },
  { slug: 'climatisation', label: { fr: 'Climatisation', ar: 'تكييف' } },
  { slug: 'peinture', label: { fr: 'Peinture', ar: 'دهان' } },
  { slug: 'menuiserie', label: { fr: 'Menuiserie', ar: 'نجارة' } },
  { slug: 'maconnerie', label: { fr: 'Maçonnerie', ar: 'بناء' } },
  { slug: 'jardinage', label: { fr: 'Jardinage', ar: 'بستنة' } },
  { slug: 'nettoyage', label: { fr: 'Nettoyage', ar: 'تنظيف' } },
  { slug: 'mecanique', label: { fr: 'Mécanique', ar: 'ميكانيك' } },
  { slug: 'serrurerie', label: { fr: 'Serrurerie', ar: 'أقفال' } },
  { slug: 'electromenager', label: { fr: 'Électroménager', ar: 'أجهزة كهرومنزلية' } },
  { slug: 'renovation', label: { fr: 'Rénovation', ar: 'ترميم' } },
];

export const SAMPLE_WILAYAS: { id: string; code: string; label: LocalizedText }[] = [
  { id: 'w16', code: '16', label: { fr: 'Alger', ar: 'الجزائر' } },
  { id: 'w25', code: '25', label: { fr: 'Constantine', ar: 'قسنطينة' } },
  { id: 'w31', code: '31', label: { fr: 'Oran', ar: 'وهران' } },
];

export const SAMPLE_COMMUNES: { id: string; wilayaId: string; label: LocalizedText }[] = [
  { id: 'c1', wilayaId: 'w16', label: { fr: 'Alger-Centre', ar: 'الجزائر الوسطى' } },
  { id: 'c2', wilayaId: 'w16', label: { fr: 'Bab El Oued', ar: 'باب الوادي' } },
  { id: 'c3', wilayaId: 'w16', label: { fr: 'Hydra', ar: 'حيدرة' } },
  { id: 'c4', wilayaId: 'w16', label: { fr: 'Kouba', ar: 'القبة' } },
  { id: 'c5', wilayaId: 'w25', label: { fr: 'Constantine', ar: 'قسنطينة' } },
  { id: 'c6', wilayaId: 'w25', label: { fr: 'El Khroub', ar: 'الخروب' } },
  { id: 'c7', wilayaId: 'w31', label: { fr: 'Oran', ar: 'وهران' } },
  { id: 'c8', wilayaId: 'w31', label: { fr: 'Bir El Djir', ar: 'بئر الجير' } },
  { id: 'c9', wilayaId: 'w31', label: { fr: 'Es Senia', ar: 'السانية' } },
];

export const SAMPLE_ARTISANS = [
  {
    name: { fr: 'Karim Benali', ar: 'كريم بن علي' },
    trade: { fr: 'Plombier chauffagiste', ar: 'سبّاك وتدفئة' },
    commune: { fr: 'Hydra', ar: 'حيدرة' },
    ratingAverage: 4.5,
    reviewCount: 23,
    distanceKm: 2.3,
    verified: true,
  },
  {
    name: { fr: 'Yacine Haddad', ar: 'ياسين حداد' },
    trade: { fr: 'Électricien', ar: 'كهربائي' },
    commune: { fr: 'Bir El Djir', ar: 'بئر الجير' },
    ratingAverage: null,
    reviewCount: 0,
    distanceKm: 0.4,
    verified: false,
  },
] satisfies {
  name: LocalizedText;
  trade: LocalizedText;
  commune: LocalizedText;
  ratingAverage: number | null;
  reviewCount: number;
  distanceKm: number;
  verified: boolean;
}[];

export const SAMPLE_TEXTS = {
  requestTitle: {
    fr: "Fuite d'eau sous l'évier de la cuisine, intervention rapide souhaitée",
    ar: 'تسرّب مياه تحت حوض المطبخ، أرجو التدخل السريع',
  },
  proposalMessage: {
    fr: 'Je peux passer demain matin pour remplacer le siphon et vérifier les joints. Pièces comprises.',
    ar: 'يمكنني المرور غدًا صباحًا لتغيير السيفون وفحص الحشوات. القطع مشمولة.',
  },
  serviceTitle: { fr: 'Installation de climatiseur split', ar: 'تركيب مكيّف سبليت' },
  serviceDescription: {
    fr: 'Pose, mise en service et vérification de l’étanchéité du circuit.',
    ar: 'تركيب وتشغيل وفحص إحكام الدارة.',
  },
  messageIn: {
    fr: 'Bonjour, êtes-vous disponible samedi ?',
    ar: 'السلام عليكم، هل أنت متاح يوم السبت؟',
  },
  messageOut: { fr: 'Oui, à partir de 9 h.', ar: 'نعم، ابتداءً من الساعة 9.' },
  notificationTitle: { fr: 'Nouvelle proposition', ar: 'عرض جديد' },
  notificationBody: {
    fr: 'Karim Benali a répondu à votre demande « Fuite d’eau ».',
    ar: 'ردّ كريم بن علي على طلبك «تسرّب مياه».',
  },
} satisfies Record<string, LocalizedText>;
