# Modèle de données — RISCE · Nos talents

Le script exécutable est dans [`sql/schema.sql`](sql/schema.sql) (PostgreSQL 16 + PostGIS 3).

## Principe : compléter, ne pas dupliquer

La base du site et de RISCE Manager reste la **source de vérité de l'identité** (nom, e-mail, type de membre, statut d'adhésion). Le module ajoute un **profil talent** relié au membre par une clé étrangère `membre_id`, en relation 1–1.

```
risce.membre (existant) 1 ──── 1 talents.profil ──── * talents.profil_competence ──── 1 ref.competence
                                        │  ├──── * talents.profil_langue
                                        │  ├──── * talents.profil_contribution ──── ref.programme (PPED, GBTC, PDC)
                                        │  ├──── * talents.experience / talents.diplome
                                        │  └──── * talents.document (CV → MinIO)
                                        ├── 1 ref.ville ──── 1 ref.pays ──── ref.zone
                                        └── 1 ref.metier ──── ref.filiere ──── ref.domaine

workflow.demande_compte 1 ──── * workflow.transition          audit.consentement · audit.journal
```

## Schémas

| Schéma | Contenu |
|---|---|
| `risce` | Table `membre` de l'outil d'adhésion (ou son miroir synchronisé par API) |
| `ref` | Référentiels : pays (géométries), villes (centroïdes GeoNames), domaine › filière › métier, compétences, niveaux, secteurs, programmes, types de contribution |
| `talents` | Profils, compétences, langues, contributions, expériences, diplômes, documents |
| `workflow` | Demandes de compte, transitions, périmètres des référent·es |
| `audit` | Consentements et journal des accès |

## Tables principales

### `talents.profil`
| Colonne | Type | Remarque |
|---|---|---|
| `id` | uuid | clé primaire |
| `membre_id` | uuid | → `risce.membre.id`, unique |
| `ville_id` | integer | → `ref.ville` ; **seule localisation stockée** |
| `metier_id` | integer | → `ref.metier` (donne filière et domaine) |
| `experience_annees` | smallint | 0–60 |
| `niveau_etudes_id`, `secteur_id` | smallint | référentiels |
| `genre` | char(1) | facultatif, pour les statistiques de parité |
| `accroche`, `biographie`, `linkedin_url` | text | |
| `visibilite` | enum | `publique`, `membres`, `admin` |
| `publication` | enum | `brouillon`, `publie`, `suspendu`, `archive` |
| `recherche` | tsvector | index plein texte alimenté par trigger |

### Nomenclature des métiers
Trois niveaux : **domaine** (14 dans le prototype) › **filière** › **métier**. Chaque métier porte un code **ISCO-08** (classification internationale du BIT) et un code **ROME** (France Travail) pour rapprocher les profils des offres d'emploi, notamment pour le PPED. La liste du prototype est une proposition à valider par la commission.

### Contributions
`talents.profil_contribution` relie chaque profil aux manières de contribuer (mentorat, recrutement, missions d'expertise, investissement, formation, accueil de stagiaires) et, le cas échéant, à un programme du RISCE (PPED, Give Back to the Community, Diaspora Connect).

### Circuit de validation
`workflow.demande_compte` conserve le formulaire tel que déposé (`jsonb`) et l'étape courante ; `workflow.transition` trace chaque passage (de → vers, acteur, motif, horodatage). À l'activation, un `risce.membre` est créé ou rattaché, puis le `talents.profil` est publié.

### Vues publiques
`talents.v_effectifs_ville` et `talents.v_effectifs_pays` exposent des **effectifs agrégés sans identité** : ce sont elles qu'utilisent le globe, la carte et le tableau de bord publics. La sécurité au niveau des lignes (RLS) sur `talents.profil` applique la visibilité choisie par chaque membre.

## Correspondance avec le prototype

Les fichiers `data/*.json` du prototype sont une version aplatie de ce modèle :

| Prototype (`data/talents.json`) | Cible |
|---|---|
| `prenom`, `nom`, `statut`, `adhesion` | `risce.membre` |
| `ville`, `pays`, `lat`, `lon` | `ref.ville` (+ `ref.pays`) |
| `domaine`, `filiere`, `metier` | `ref.domaine` › `ref.filiere` › `ref.metier` |
| `experience`, `niveau`, `secteur`, `genre`, `visibilite` | `talents.profil` |
| `competences`, `langues`, `contributions` | tables d'association `talents.profil_*` |
| `cv` | `talents.document` (type `cv`) |
| `data/demandes.json` | `workflow.demande_compte` + `workflow.transition` |
