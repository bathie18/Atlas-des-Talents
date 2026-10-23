# RISCE Talents

> Dépôt *Atlas des Talents* · démonstration en ligne : https://bathie18.github.io/Atlas-des-Talents/

**Prototype de plateforme cartographique des talents et des entrepreneurs de la diaspora sénégalaise**, destiné à devenir l'onglet « Trouver un talent » du site du [RISCE](https://www.risce.org/) (Réseau International des Sénégalais Cadres et Entrepreneurs de l'Extérieur).

> *L'intelligence collective au service de la communauté.*

Initiative contributive de Bathie Ndiaye (membre du COPIL, commissions Stratégie et IT), présentée à la commission et au COPIL. Le CEGIT est partenaire du RISCE.

⚠️ **Toutes les personnes du prototype sont fictives** (prénoms et noms combinés au hasard par `scripts/generer_donnees_demo.py`). Aucune donnée réelle de membre n'est utilisée.

## Ce que montre le prototype

| Écran | Contenu |
|---|---|
| **Accueil** | Globe 3D animé (arcs convergeant vers Dakar), recherche d'un pays ou d'une ville avec survol automatique de son emprise, phrase d'accroche animée, chiffres clés, domaines |
| **Carte des talents** | Carte MapLibre : effectifs par pays puis par ville en zoomant, filtres domaine / filière / contribution / langue, liste des profils de la sélection |
| **Entrepreneurs** | Vitrine des chefs d'entreprise, fondateurs, indépendants et porteurs de projet : sélection « à la une », filtres par profil, stade, besoin et lien avec le Sénégal |
| **Trouver un talent** | Banque de profils et de CV : mot-clé, recherche avancée (domaine, filière, métier, pays, ville, secteur, niveau, expérience, langue, contribution, CV), tri, pagination |
| **Tableau de bord** | Choroplèthe mondiale, top villes, domaines, adhésions cumulées, secteurs, expérience, capacités de contribution |
| **Rejoindre** | Demande de compte en 4 étapes, avec consentement et choix de visibilité |
| **Connexion** | Bouton en haut à droite ; comptes de test ci-dessous |
| **Administration** | Vue d'ensemble, circuit de validation, profils (modification, visibilité, suspension, suppression), banque de CV (consulter, remplacer, retirer, relancer), entrepreneurs à la une, domaines / filières / métiers, comptes et référent·es pays, journal |

### Comptes de test

| Identifiant | Mot de passe | Rôle |
|---|---|---|
| `admin` | `admin` | Administrateur·rice : tout le back-office |
| `referent` | `referent` | Référent·e France : demandes, profils et CV de son pays |
| `membre` | `membre` | Membre : fiches complètes et CV |
| **Le projet** | Note de cadrage : architecture cible, modèle de données, protection des données, feuille de route |

Les actions effectuées pendant une démonstration (demandes, validations, modifications de profils, de CV ou de référentiels) sont conservées dans le navigateur de la personne qui teste. Le bouton « Remettre la démo à zéro », en pied de page, efface ces modifications et restaure les données fictives d'origine : utile avant une présentation au COPIL.

### Scénario de démonstration conseillé (5 minutes)
1. Accueil : taper « Canada », puis « Lyon » ; le globe survole l'emprise et affiche la synthèse.
2. « Voir sur la carte », zoomer sur l'Europe, cliquer un cercle de ville.
3. Trouver un talent : chercher « PostGIS » ou filtrer *Santé › Médecine* ; ouvrir une fiche en visiteur (identité masquée).
4. Rejoindre : déposer une demande.
5. Se connecter avec `admin` / `admin` : faire avancer la demande jusqu'à « Activer le compte » ; le profil apparaît sur la carte.
6. Entrepreneurs : parcourir la vitrine, puis mettre une entreprise à la une depuis l'administration.
7. Le projet : architecture et modèle de données.

## Publier sur GitHub Pages

```bash
git init && git add . && git commit -m "Prototype RISCE Nos talents"
git branch -M main
git remote add origin https://github.com/<compte>/risce-talents.git
git push -u origin main
```

Puis, sur GitHub : **Settings › Pages › Build and deployment › Deploy from a branch › `main` / root**. L'URL à présenter sera `https://<compte>.github.io/risce-talents/`.

En local : `python3 -m http.server 8000` puis http://localhost:8000 (un serveur est nécessaire : les données sont chargées par `fetch`).

## Arborescence

```
index.html                 application monopage (navigation par ancres #accueil, #carte…)
assets/css/app.css         charte (jetons de couleur en tête de fichier)
assets/js/core.js          données, rôles, visibilité, géocodeur local
assets/js/accueil.js       globe globe.gl et recherche géographique
assets/js/carte.js         carte MapLibre
assets/js/talents.js       annuaire et recherche avancée
assets/js/tableau.js       tableau de bord ECharts
assets/js/entrepreneurs.js vitrine des entrepreneurs
assets/js/comptes.js       demande de compte et connexion
assets/js/admin.js         back-office
assets/js/main.js          démarrage et navigation
data/                      pays (Natural Earth, noms français), référentiels, talents et demandes fictifs
docs/ARCHITECTURE.md       architecture cible et intégration au site WordPress
docs/MODELE_DONNEES.md     modèle de données
docs/sql/schema.sql        schéma PostgreSQL / PostGIS exécutable
scripts/                   génération des données de démonstration
vendor/                    feuille de style MapLibre
```

## Charte graphique

La plateforme reprend la charte du logo RISCE : rose `#F060B4`, dégradé bleu-violet `#1E4AA0 → #4848C0 → #6448CC`, titres à empattements (DM Serif Display) en écho au logotype, ciel indigo pour le globe. Sur le globe d'accueil, trois rubans animés enroulent la Terre comme dans l'emblème du RISCE : leur face avant est bleu-violet, leur face arrière rose.

Toutes les couleurs sont des variables CSS en tête de `assets/css/app.css`. L'emblème est dans `assets/img/` (`risce-globe.png` détouré, `logo-risce.png` complet, `favicon.png`).

## Pile technique (100 % open source)

globe.gl / three.js (MIT) · MapLibre GL JS (BSD-3) · Apache ECharts (Apache-2.0) · TopoJSON (ISC) · Natural Earth (domaine public) · OpenStreetMap (ODbL, fond optionnel).
Cible : PostgreSQL + PostGIS, Django/GeoDjango, Keycloak, MinIO, Photon/Nominatim. Détails dans [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Régénérer les données

```bash
npm install                                   # world-atlas, i18n-iso-countries, topojson-client
node scripts/build-countries.mjs              # data/pays-50m.topo.json
node scripts/build-countries.mjs node_modules/world-atlas/countries-110m.json data/pays-110m.topo.json
python3 scripts/generer_donnees_demo.py       # talents, demandes, référentiels
```

## Licence

Code sous licence MIT (voir `LICENSE`), à confirmer par le RISCE.
