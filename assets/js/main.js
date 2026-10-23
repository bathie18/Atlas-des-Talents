/* Démarrage et navigation par ancres (#accueil, #carte, #talents…). */
(function () {
  const RT = window.RT;
  const VIEWS = ['accueil', 'carte', 'talents', 'entrepreneurs', 'tableau', 'rejoindre', 'connexion', 'admin', 'projet'];

  // Modèle de données affiché dans « Le projet » (détail complet : docs/MODELE_DONNEES.md)
  const ER = [
    ['membre', 'RISCE Manager', true, ['pk id', 'numero_adherent', 'nom, prenom', 'email', 'type_membre', 'date_adhesion', 'statut']],
    ['profil_talent', 'talents', false, ['pk id', 'fk membre_id (1–1)', 'fk ville_id', 'fk metier_id', 'experience_annees', 'fk niveau_etudes_id', 'fk secteur_id', 'accroche, biographie', 'visibilite', 'statut_publication', 'maj_le']],
    ['ref_pays', 'référentiel', false, ['pk iso2', 'iso3, nom_fr', 'zone', 'geom (MultiPolygon, 4326)']],
    ['ref_ville', 'référentiel', false, ['pk id', 'geonames_id', 'nom', 'fk pays_iso2', 'geom (Point, 4326)']],
    ['ref_domaine / ref_filiere / ref_metier', 'référentiel', false, ['pk code', 'libelle', 'fk parent', 'code_isco08', 'code_rome']],
    ['talent_competence', 'talents', false, ['fk profil_id', 'fk competence_id', 'niveau']],
    ['talent_langue', 'talents', false, ['fk profil_id', 'langue (ISO 639)', 'niveau (CECRL)']],
    ['talent_contribution', 'talents', false, ['fk profil_id', 'fk type_contribution', 'fk programme (PPED, GBTC, PDC)', 'disponibilite']],
    ['entreprise', 'talents', false, ['pk id', 'fk profil_id', 'type (chef·fe d\'entreprise, indépendant·e…)', 'nom, activite', 'stade, annee_creation', 'lien_senegal', 'a_la_une, publie_le']],
    ['entreprise_besoin', 'talents', false, ['fk entreprise_id', 'besoin (financement, partenaires…)']],
    ['experience / diplome', 'talents', false, ['pk id', 'fk profil_id', 'intitule, organisation', 'debut, fin', 'fk pays_iso2']],
    ['document', 'talents', false, ['pk id', 'fk profil_id', 'type (CV…)', 'cle_objet_minio', 'sha256, taille', 'depose_le']],
    ['demande_compte', 'workflow', false, ['pk id', 'fk membre_id (nullable)', 'donnees_soumises (jsonb)', 'etape', 'fk referent_id', 'cree_le']],
    ['etape_validation', 'workflow', false, ['pk id', 'fk demande_id', 'de_etape → vers_etape', 'fk acteur_id', 'motif', 'horodatage']],
    ['consentement', 'conformité', false, ['pk id', 'fk membre_id', 'finalite', 'version_texte', 'donne_le', 'retire_le']],
    ['journal_acces', 'conformité', false, ['pk id', 'fk acteur_id', 'action', 'objet, objet_id', 'horodatage', 'ip_hash']],
  ];

  function renderER() {
    RT.$('#er-model').innerHTML = ER.map(([n, sch, risce, cols]) => `<div class="ent${risce ? ' risce' : ''}"><h4>${RT.esc(n)}<em>${RT.esc(sch)}</em></h4><ul>${cols.map((c) => {
      const cls = c.startsWith('pk ') ? 'pk' : c.startsWith('fk ') ? 'fk' : '';
      return `<li class="${cls}">${RT.esc(c.replace(/^(pk|fk) /, cls === 'pk' ? '◆ ' : cls === 'fk' ? '→ ' : ''))}</li>`;
    }).join('')}</ul></div>`).join('');
  }

  const inited = {};
  function show() {
    let v = (location.hash || '#accueil').slice(1);
    if (!VIEWS.includes(v)) v = 'accueil';
    if (v === 'admin' && !RT.isStaff()) v = 'admin'; // la vue affiche elle-même un message d'accès
    VIEWS.forEach((k) => (RT.$('#v-' + k).hidden = k !== v));
    RT.$$('.nav a').forEach((a) => a.setAttribute('aria-current', a.getAttribute('href') === '#' + v ? 'page' : 'false'));
    if (v === 'carte') RT.showCarte();
    if (v === 'tableau') RT.showTableau();
    if (v === 'admin') RT.showAdmin();
    if (v === 'projet' && !inited.er) { renderER(); inited.er = true; }
    if (RT._world) RT._world.controls().enabled = v === 'accueil';
    if (v !== 'accueil') window.scrollTo(0, 0);
  }

  async function start() {
    try { await RT.load(); }
    catch (e) {
      console.error(e);
      document.querySelector('main').innerHTML = `<div class="wrap section"><div class="empty">Les données n'ont pas pu être chargées (${RT.esc(e.message)}). Ouvrez le prototype via un serveur web (GitHub Pages, ou <span class="mono">python3 -m http.server</span>) plutôt qu'en double-cliquant sur le fichier.</div></div>`;
      return;
    }
    RT.initHome(); RT.initCarte(); RT.initTalents(); RT.initEntrepreneurs(); RT.initTableau(); RT.initJoin(); RT.initLogin(); RT.initAdmin();
    RT.setRole(RT.state.role);
    RT.$('#reset-demo').onclick = RT.resetDemo;
    addEventListener('hashchange', show);
    show();
  }
  start();
})();
