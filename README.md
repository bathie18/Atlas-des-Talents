# RISCE · Nos talents

**Prototype de plateforme cartographique des talents de la diaspora sénégalaise**, destiné à devenir l'onglet « Trouver un talent » du site du [RISCE](https://www.risce.org/) (Réseau International des Sénégalais Cadres et Entrepreneurs de l'Extérieur).

> *L'intelligence collective au service de la communauté.*

Initiative contributive de Bathie Ndiaye (membre du COPIL, commissions Stratégie et IT), présentée à la commission et au COPIL. Le CEGIT est partenaire du RISCE.

⚠️ **Toutes les personnes du prototype sont fictives** (prénoms et noms combinés au hasard par `scripts/generer_donnees_demo.py`). Aucune donnée réelle de membre n'est utilisée.

## Ce que montre le prototype

| Écran | Contenu |
|---|---|
| **Accueil** | Globe 3D animé (arcs convergeant vers Dakar), recherche d'un pays ou d'une ville avec survol automatique de son emprise, phrase d'accroche animée, chiffres clés, domaines |
| **Carte des talents** | Carte MapLibre : effectifs par pays puis par ville en zoomant, filtres domaine / filière / contribution / langue, liste des profils de la sélection |
| **Trouver un talent** | Banque de profils et de CV : mot-clé, recherche avancée (domaine, filière, métier, pays, ville, secteur, niveau, expérience, langue, contribution, CV), tri, pagination |
| **Tableau de bord** | Choroplèthe mondiale, top villes, domaines, adhésions cumulées, secteurs, expérience, capacités de contribution |
| **Rejoindre** | Demande de compte en 4 étapes, avec consentement et choix de visibilité |
| **Connexion** | Profils de démonstration : visiteur, membre, référent·e pays, administrateur·rice |
| **Administration** | Circuit de validation (kanban), gestion des profils et de leur visibilité, référentiels, journal des actions |
| **Le projet** | Note de cadrage : architecture cible, modèle de données, protection des données, feuille de route |

Les actions effectuées (demandes, validations, suspensions) sont conservées dans le navigateur. Le lien « Réinitialiser la démo » restaure l'état initial.

### Scénario de démonstration conseillé (5 minutes)
1. Accueil : taper « Canada », puis « Lyon » ; le globe survole l'emprise et affiche la synthèse.
2. « Voir sur la carte », zoomer sur l'Europe, cliquer un cercle de ville.
3. Trouver un talent : chercher « PostGIS » ou filtrer *Santé › Médecine* ; ouvrir une fiche en visiteur (identité masquée).
4. Rejoindre : déposer une demande.
5. Connexion › Administrateur·rice : faire avancer la demande jusqu'à « Activer le compte » ; le profil apparaît sur la carte.
6. Le projet : architecture et modèle de données.

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
assets/js/comptes.js       demande de compte, connexion, back-office
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
