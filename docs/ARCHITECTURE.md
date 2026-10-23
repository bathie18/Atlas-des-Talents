# Architecture cible — RISCE · Nos talents

## 1. Positionnement

« Nos talents » n'est pas un nouveau site du RISCE. C'est un **module** qui s'ajoute à l'écosystème existant :

| Brique existante | Rôle | Ce que le module en attend |
|---|---|---|
| **risce.org** (WordPress + Elementor) | Vitrine, programmes, contact | Un onglet de menu « Trouver un talent » / « Nos talents » |
| **RISCE Manager** (manage.risce.org) | Candidatures et adhésions | L'identifiant unique de chaque membre et son statut |

Le module apporte : la carte et le globe, la banque de profils et de CV, la recherche avancée, le tableau de bord et le circuit de validation des comptes « talents ».

## 2. Vue d'ensemble

```
                 ┌──────────────────────────── Navigateur ────────────────────────────┐
                 │  risce.org (WordPress)          talents.risce.org (module)          │
                 │  menu « Trouver un talent » ──► globe.gl · MapLibre · ECharts       │
                 └───────────────┬──────────────────────────────┬──────────────────────┘
                                 │ OpenID Connect (SSO)         │ HTTPS / JSON
                         ┌───────▼────────┐            ┌────────▼──────────────────┐
                         │   Keycloak     │◄──────────►│  API « talents »          │
                         │ rôles : visit.,│  jetons    │  Django + GeoDjango + DRF │
                         │ membre, réf.,  │            │  (OpenAPI, back-office)   │
                         │ admin          │            └───┬─────────┬─────────┬───┘
                         └───────▲────────┘                │         │         │
                                 │ fédération         ┌────▼───┐ ┌───▼───┐ ┌───▼────────┐
                         ┌───────┴────────┐  sync API │PostGIS │ │ MinIO │ │ Photon /   │
                         │ RISCE Manager  │──────────►│(talents│ │ (CV)  │ │ Nominatim  │
                         │ (adhésions)    │  membres  │ ref,   │ └───────┘ │ GeoNames   │
                         └────────────────┘           │ audit) │           └────────────┘
                                                      └────────┘
```

## 3. Choix techniques (tous open source)

| Couche | Composant | Licence | Justification |
|---|---|---|---|
| Globe d'accueil | globe.gl (three.js) | MIT | Globe WebGL léger, arcs et points animés |
| Carte | MapLibre GL JS | BSD-3 | Standard ouvert des cartes vectorielles, successeur libre de Mapbox GL |
| Graphiques | Apache ECharts | Apache-2.0 | Choroplèthes, barres, séries temporelles, rendu SVG accessible |
| Fonds de carte | OpenStreetMap, PMTiles auto-hébergées | ODbL | Aucune dépendance à un service propriétaire |
| Limites des pays | Natural Earth | Domaine public | Généralisation adaptée au monde entier |
| Base de données | PostgreSQL 16 + PostGIS 3 | PostgreSQL / GPL-2 | Requêtes spatiales, plein texte, RLS |
| API & back-office | Django 5 + GeoDjango + Django REST Framework | BSD-3 | Admin prête à l'emploi, ORM spatial |
| Identité | Keycloak | Apache-2.0 | SSO OpenID Connect partagé avec WordPress et RISCE Manager |
| Fichiers | MinIO | AGPL-3.0 | Stockage S3 des CV, URL signées et temporaires |
| Recherche | PostgreSQL FTS + pg_trgm (option Meilisearch) | — / MIT | Suffisant jusqu'à plusieurs dizaines de milliers de profils |
| Géocodage | Photon ou Nominatim auto-hébergé + GeoNames | Apache-2.0 / GPL / CC-BY | Autocomplétion pays/villes en français |

Une alternative plus légère, si l'équipe IT préfère éviter Django : **PostgREST** (API générée depuis le schéma) + un petit back-office en Vue. Le schéma SQL reste identique.

## 4. Intégration au site WordPress

Trois options, de la plus simple à la plus intégrée :

1. **Lien de menu** vers `talents.risce.org` (sous-domaine), même charte graphique. Recommandé pour démarrer.
2. **Page WordPress intégrant le module** (`<iframe>` responsive ou bloc Elementor HTML) sur `risce.org/nos-talents`.
3. **Shortcode `[risce_talents]`** d'une petite extension WordPress qui charge le JavaScript du module et appelle l'API. Le plus intégré, à envisager une fois le module stabilisé.

Dans tous les cas, l'authentification passe par Keycloak : un membre connecté sur le site l'est aussi sur le module (extension WordPress *OpenID Connect Generic Client*).

## 5. Rôles et droits

| Rôle | Carte & tableau de bord | Annuaire | Fiche complète & CV | Validation | Administration |
|---|---|---|---|---|---|
| Visiteur | Agrégats | Profils publics (prénom + initiale) | — | — | — |
| Membre | Oui | Profils publics et « membres » | Oui (CV tracé) | — | — |
| Référent·e pays | Oui | Oui | Oui | Étape 2, pour son pays | Profils de son pays |
| Administrateur·rice | Oui | Tous | Oui | Toutes étapes, activation | Profils, référentiels, journal, exports |

## 6. Circuit de validation

```
 Dépôt ──► Vérification référent·e ──► Validation commission ──► Compte activé
   │              │      ▲                      │
   │              ▼      │                      ▼
   │        Compléments demandés            Rejetée (motif)
   └──────────────────────────────────────────►
```

Chaque transition est historisée (`workflow.transition`) avec l'acteur et le motif. Le ou la candidat·e est notifié·e par e-mail à chaque étape.

## 7. Données personnelles

- Cadres : loi sénégalaise n° 2008-12 (CDP) et RGPD pour les résident·es de l'UE.
- Minimisation : ville de résidence uniquement (centroïde), jamais l'adresse.
- Consentement explicite, versionné et révocable (`audit.consentement`).
- Visibilité choisie par la personne : publique, membres, administrateurs.
- CV servis par lien signé de courte durée ; chaque consultation est journalisée.
- Demandes rejetées supprimées au bout de 12 mois ; droit d'accès, de rectification et d'effacement depuis l'espace membre.
- Un registre des traitements et une analyse d'impact (AIPD) sont à produire avant l'ouverture.

## 8. Hébergement indicatif

Un serveur virtuel (4 vCPU, 8 Go de RAM, 100 Go SSD) suffit pour plusieurs milliers de profils : Docker Compose avec PostgreSQL/PostGIS, Keycloak, l'API, MinIO, Caddy (HTTPS automatique) et une sauvegarde chiffrée quotidienne hors site.
