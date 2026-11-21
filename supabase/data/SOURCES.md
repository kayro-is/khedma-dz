# Référentiel géographique officiel — sources et vérifications (KHD-007)

Fichiers :

- `geo-dz-2026.json` : référentiel versionné (69 wilayas, 1 541 communes, noms français et arabes, codes officiels), généré par `scripts/geo/build-geo.mjs` ;
- `supabase/migrations/20261121120000_geo_reference_2026.sql` : migration générée à partir de ce fichier ;
- `geo-crosscheck.md` : rapport de contrôle croisé avec les textes officiels (`scripts/geo/crosscheck-official.mjs`) ;
- `LICENSE-geoalgeria.txt` : licence MIT des données compilées réutilisées.

## 1. Textes officiels vérifiés (PDF du Journal officiel et de l'ONS, lus intégralement)

| Texte                                                 | Objet                                                                                                                                                                                                | Publication                                                                                                                                                             | Statut                                          |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Loi n° 84-09 du 4 février 1984, modifiée et complétée | Découpage territorial (articles 4 à 52 : une wilaya par article)                                                                                                                                     | JO n° 6 de 1984                                                                                                                                                         | En vigueur                                      |
| Loi n° 19-12 du 11 décembre 2019                      | Wilayas 49 à 58                                                                                                                                                                                      | JO n° 78 du 18 décembre 2019                                                                                                                                            | En vigueur                                      |
| **Loi n° 26-06 du 4 avril 2026**                      | **69 wilayas et 1 541 communes** (art. 3) ; listes nominatives des 11 nouvelles wilayas (art. 52 bis 10 à 52 bis 20) et des 10 wilayas mères redécoupées (art. 7, 9, 11, 16, 17, 18, 21, 30, 32, 36) | [JO n° 25 du 5 avril 2026](https://www.joradp.dz/FTP/jo-francais/2026/F2026025.pdf), p. 4 à 9                                                                           | **En vigueur** depuis sa publication (art. 6)   |
| **Décret présidentiel n° 26-206 du 25 mai 2026**      | Noms, chefs-lieux et **numéros 59 à 69**                                                                                                                                                             | [JO n° 40 du 3 juin 2026](https://www.joradp.dz/FTP/jo-francais/2026/F2026040.pdf), p. 5 (version arabe : [p. 6](https://www.joradp.dz/FTP/jo-arabe/2026/A2026040.pdf)) | **En vigueur**                                  |
| Décret exécutif n° 26-208 du 26 mai 2026              | Partage de l'actif et du passif entre wilayas mères et nouvelles wilayas                                                                                                                             | JO n° 40 du 3 juin 2026                                                                                                                                                 | En vigueur, exécution jusqu'au 31 décembre 2026 |
| ONS — Code géographique national (juin 2021)          | Code à 4 chiffres des 1 541 communes (wilaya + rang)                                                                                                                                                 | [ons.dz](https://www.ons.dz/IMG/pdf/code_geo_2021.pdf)                                                                                                                  | Dernière édition publiée (58 wilayas)           |

### Voté, promulgué ou effectivement en vigueur

- **Découpage territorial à 69 wilayas : en vigueur.** La loi n° 26-06 a été adoptée par le Parlement (APN le 9 mars 2026), promulguée le 4 avril 2026 et publiée au JO n° 25 du 5 avril 2026. Les numéros 59 à 69 sont fixés par le décret n° 26-206, publié au JO n° 40 du 3 juin 2026.
- **Mise en place administrative : transitoire jusqu'au 31 décembre 2026.** L'art. 54 dispose que les autorités des wilayas mères continuent d'assumer la gestion des nouvelles wilayas jusqu'à l'installation de leurs conseils exécutifs. Les walis leur transfèrent progressivement leurs prérogatives, au plus tard le 31 décembre 2026. Les budgets 2026 restent exécutés par les wilayas mères (art. 55 et 57).
- **Conséquence pour Khedma DZ** : l'adresse d'un utilisateur relève dès maintenant de l'une des 69 wilayas. Le référentiel suit donc le découpage légal (69), et non l'organisation des services administratifs pendant la transition.
- **Non vérifié sur le JO, donc non utilisé** :
  - le changement des plaques d'immatriculation au 1er janvier 2027, rapporté par la presse ;
  - la liste des daïras (décret exécutif n° 26-253, JO n° 52), dont les daïras ne sont pas importées.
- **Codes ONS** : aucune édition du code géographique national postérieure à la réforme n'a été trouvée. Les 108 communes rattachées aux wilayas 59 à 69 gardent leur code ONS 2021 (préfixe de la wilaya mère, par exemple Aflou = 0319 dans la wilaya 59). Le code reste un identifiant stable ; la wilaya actuelle est enregistrée séparément. Si l'ONS renumérote un jour, une migration mettra les codes à jour sans changer les identifiants internes.

## 2. Résultat du contrôle croisé (détail : `geo-crosscheck.md`)

| Contrôle                                           | Résultat                                                                                                                                         |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Loi 26-06, art. 3 : 69 wilayas, 1 541 communes     | ✔ identique                                                                                                                                      |
| Loi 26-06 : 21 listes nominatives (408 communes)   | ✔ 408 / 408 appariées, effectifs identiques, 0 variante                                                                                          |
| Décret 26-206 : numéros, noms, chefs-lieux 59 à 69 | ✔ 11 / 11 ; noms arabes relus sur la version arabe du JO                                                                                         |
| ONS 2021 : codes des 1 541 communes                | ✔ 1 541 / 1 541, aucun code manquant ou en trop                                                                                                  |
| ONS 2021 : noms français                           | 1 257 identiques, 264 variantes orthographiques, 20 différences à examiner (abréviations ONS, translittérations, 3 changements de nom possibles) |
| ONS 2021 : noms arabes                             | 1 101 identiques, 71 écarts d'une lettre, 62 différences à examiner (principalement l'article « ال »), 307 non comparables (extraction PDF)      |

Aucune incohérence d'effectif, de rattachement, de numérotation ou de code. Les écarts de noms ne sont pas bloquants : la commune est identifiée par son code, et un nom peut être corrigé en relançant la migration, qui met à jour les noms sans changer les identifiants.

## 3. Source des données compilées et licence

- **Paquet** : `geoalgeria` **2.4.1** (npm, publié le 30 octobre 2026), dépôt <https://github.com/yasserstudio/geoalgeria>. Archive vérifiée : `https://registry.npmjs.org/geoalgeria/-/geoalgeria-2.4.1.tgz`.
- **Pourquoi 2.4.1 plutôt que 2.4.0** : seules différences dans les communes, deux noms arabes corrigés (Illizi « إليزي », Bordj Bou Arreridj « برج بوعريريج »), qui sont les graphies usuelles des wilayas. Le reste est identique.
- **Licence exacte** (fichiers `LICENSE` et `NOTICE` du paquet) :
  - code et **compilation des wilayas, communes, noms bilingues et codes administratifs : MIT**, © 2025-2026 Yasser's studio ;
  - **non MIT, donc non utilisés** :
    - les polygones des wilayas, 323 coordonnées de communes, ainsi que les identifiants OpenStreetMap et Wikidata (**ODbL 1.0**, qui imposerait attribution et partage à l'identique) ;
    - les données `data/poste/` (© Algérie Poste, redistribuées « pour référence »).
- **Champs repris** :
  - wilayas : numéro, noms, année, wilaya mère, code du chef-lieu ;
  - communes : code ONS, wilaya, noms.
  - **Aucune coordonnée, aucun code postal, aucune daïra.**
- **Obligation MIT** : conserver la mention de copyright et de licence. Voir `LICENSE-geoalgeria.txt`, à reprendre aussi dans l'écran « Licences » de l'application lorsqu'il existera.

### Corrections appliquées (justifiées par un texte officiel)

| Élément                          | geoalgeria 2.4.1  | Valeur retenue | Justification                                  |
| -------------------------------- | ----------------- | -------------- | ---------------------------------------------- |
| Wilaya 59, nom arabe             | آفلو              | **أفلو**       | Décret 26-206, version arabe : « ولاية أفلو »  |
| Commune 0319 Aflou, nom arabe    | آفلو              | **أفلو**       | Même décret : « مقرها مدينة أفلو »             |
| Commune 2732 Hassiane, nom arabe | الحسيان (بني ياحي | **الحسيان**    | Parenthèse non fermée ; ONS 2021 : « الحسيان » |

## 4. Coordonnées GPS

- Les 9 communes de démonstration du projet de TEST gardent leurs coordonnées approximatives existantes, rattachées par code officiel dans `seed.sql`.
- **Aucune coordonnée n'est importée ni inventée pour les 1 532 autres communes.** Les coordonnées des chefs-lieux de wilaya ne servent jamais de substitut.
- Correspondance artisan ↔ demande : la zone par **liste de communes** fonctionne partout. La zone par **rayon** (`st_dwithin`) ne s'applique qu'aux communes ayant des coordonnées : la fonction ignore déjà les coordonnées absentes. Une source de coordonnées libre de droits est à choisir avant d'activer le rayon à l'échelle nationale.

## 5. Reproduire

```bash
# 1. Données (archive npm officielle) et textes officiels, dans un dossier temporaire
curl -sSLO https://registry.npmjs.org/geoalgeria/-/geoalgeria-2.4.1.tgz && tar -xzf geoalgeria-2.4.1.tgz
curl -sSLO https://www.joradp.dz/FTP/jo-francais/2026/F2026025.pdf
curl -sSLO https://www.joradp.dz/FTP/jo-francais/2026/F2026040.pdf
curl -sSLO https://www.ons.dz/IMG/pdf/code_geo_2021.pdf

# 2. Référentiel + migration, puis contrôles
pnpm geo:build <dossier>/package          # écrit geo-dz-2026.json et la migration
pnpm geo:check                            # revalide sans réseau (inclus dans « pnpm check »)
pnpm geo:crosscheck --law F2026025.pdf --decree F2026040.pdf --ons code_geo_2021.pdf
pnpm geo:test-local                       # PostgreSQL local jetable : migration, idempotence, relations
```
