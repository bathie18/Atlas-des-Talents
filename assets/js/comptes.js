/* Demande de compte et connexion. Le back-office est dans admin.js. */
(function () {
  const RT = window.RT;

  // =================================================================== DEMANDE DE COMPTE
  const STEPS = ['Identité', 'Résidence', 'Parcours', 'Contribution'];
  let step = 0;
  const J = { prenom: '', nom: '', email: '', tel: '', genre: '', pays: '', ville: '', domaine: '', filiere: '', metier: '', experience: '', niveau: '', secteur: '', langues: ['Français'], competences: '', cv: '', contributions: [], parrain: '', visibilite: 'membres', rgpd: false, charte: false, entOn: false, entType: '', entNom: '', entStade: '', entActivite: '', entSenegal: '', entBesoins: [] };

  const f = (id, label, html) => `<div class="field"><label for="${id}">${label}</label>${html}</div>`;
  const inp = (id, key, type = 'text', ph = '') => `<input class="input" id="${id}" data-k="${key}" type="${type}" value="${RT.esc(J[key])}" placeholder="${RT.esc(ph)}">`;
  const sel = (id, key, opts, all) => `<select class="input" id="${id}" data-k="${key}"><option value="">${all}</option>${opts.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${RT.esc(v)}"${J[key] === v ? ' selected' : ''}>${RT.esc(l)}</option>`; }).join('')}</select>`;
  const chipsOf = (key, opts) => `<div class="chips" data-multi="${key}">${opts.map((o) => `<button type="button" class="chip" aria-pressed="${J[key].includes(o)}" data-v="${RT.esc(o)}">${RT.esc(o)}</button>`).join('')}</div>`;

  function renderForm() {
    const ref = RT.state.ref;
    RT.$('#form-steps').innerHTML = STEPS.map((s, i) => `<button type="button" data-s="${i}" ${i === step ? 'aria-current="step"' : ''} class="${i < step ? 'done' : ''}"><span class="n">${i < step ? '✓' : i + 1}</span>${s}</button>`).join('');
    let body = '';
    if (step === 0) body = `<h3>Qui êtes-vous ?</h3>
      <div class="grid-2">${f('j-prenom', 'Prénom *', inp('j-prenom', 'prenom'))}${f('j-nom', 'Nom *', inp('j-nom', 'nom'))}</div>
      <div class="grid-2">${f('j-email', 'Adresse e-mail *', inp('j-email', 'email', 'email', 'prenom.nom@exemple.org'))}${f('j-tel', 'Téléphone (facultatif)', inp('j-tel', 'tel', 'tel', '+33 6 …'))}</div>
      ${f('j-genre', 'Genre (facultatif)', sel('j-genre', 'genre', [['F', 'Femme'], ['H', 'Homme']], 'Non renseigné'))}`;
    if (step === 1) {
      const pays = RT.geo.countries.filter((c) => c.iso2 && c.iso2 !== 'SN').map((c) => [c.iso2, c.nom]).sort((a, b) => a[1].localeCompare(b[1], 'fr'));
      const villes = RT.geo.cities.filter((c) => !J.pays || c.pays === J.pays).map((c) => c.nom);
      body = `<h3>Où résidez-vous ?</h3>
        <p class="muted" style="font-size:.85rem">Seule la ville est enregistrée. Sur la carte, votre profil est placé au centre de la ville, jamais à votre adresse.</p>
        <div class="grid-2">${f('j-pays', 'Pays de résidence *', sel('j-pays', 'pays', pays, 'Choisir'))}
        ${f('j-ville', 'Ville *', `<input class="input" id="j-ville" data-k="ville" list="j-villes" value="${RT.esc(J.ville)}" placeholder="Commencez à saisir"><datalist id="j-villes">${villes.map((v) => `<option value="${RT.esc(v)}">`).join('')}</datalist>`)}</div>`;
    }
    if (step === 2) {
      const dom = J.domaine ? RT.dom(J.domaine) : null;
      const fils = dom ? dom.filieres.map((x) => x.libelle) : [];
      const mets = dom && J.filiere ? (dom.filieres.find((x) => x.libelle === J.filiere) || { metiers: [] }).metiers : [];
      body = `<h3>Votre parcours</h3>
        <div class="grid-2">${f('j-dom', 'Domaine *', sel('j-dom', 'domaine', ref.domaines.map((d) => [d.code, d.libelle]), 'Choisir'))}${f('j-fil', 'Filière *', sel('j-fil', 'filiere', fils, dom ? 'Choisir' : 'Choisir d\'abord un domaine'))}</div>
        <div class="grid-2">${f('j-met', 'Métier *', sel('j-met', 'metier', mets, J.filiere ? 'Choisir' : 'Choisir d\'abord une filière'))}${f('j-exp', 'Années d\'expérience *', inp('j-exp', 'experience', 'number', 'ex. 8'))}</div>
        <div class="grid-2">${f('j-niv', 'Niveau d\'études', sel('j-niv', 'niveau', ref.niveaux, 'Choisir'))}${f('j-sect', 'Secteur de l\'employeur', sel('j-sect', 'secteur', ref.secteurs, 'Choisir'))}</div>
        <div class="field"><span class="lbl">Langues parlées</span>${chipsOf('langues', ref.langues)}</div>
        ${f('j-comp', 'Compétences clés (séparées par des virgules)', inp('j-comp', 'competences', 'text', 'PostGIS, gestion de projet, OHADA…'))}
        ${f('j-cv', 'CV (PDF, 5 Mo maximum)', `<input class="input" id="j-cv" type="file" accept="application/pdf">${J.cv ? `<span class="muted" style="font-size:.8rem">Fichier retenu : ${RT.esc(J.cv)}</span>` : ''}`)}`;
    }
    if (step === 3) body = `<h3>Comment souhaitez-vous contribuer ?</h3>
      <div class="field"><span class="lbl">Contributions possibles *</span>${chipsOf('contributions', ref.contributions)}</div>
      <div class="ent-block" style="background:var(--surface-2)">
        <label class="check"><input type="checkbox" id="j-enton" ${J.entOn ? 'checked' : ''}><span><b>Je suis entrepreneur, indépendant·e, chef·fe d'entreprise ou porteur·se de projet</b><br><span class="muted">Votre activité pourra être mise en avant dans la vitrine des entrepreneurs.</span></span></label>
        ${J.entOn ? `<div class="grid-2">${f('j-etype', 'Profil *', sel('j-etype', 'entType', ref.entrepreneuriat.types, 'Choisir'))}${f('j-enom', 'Nom de l\'entreprise ou du projet *', inp('j-enom', 'entNom', 'text', 'ex. Saloum Agritech'))}</div>
          <div class="grid-2">${f('j-estade', 'Stade *', sel('j-estade', 'entStade', ref.entrepreneuriat.stades, 'Choisir'))}${f('j-esn', 'Lien avec le Sénégal', sel('j-esn', 'entSenegal', ['Activité au Sénégal', 'Projet d\'implantation au Sénégal', 'Pas encore'], 'Choisir'))}</div>
          ${f('j-eact', 'Activité en une phrase', inp('j-eact', 'entActivite', 'text', 'ex. transformation de céréales locales'))}
          <div class="field"><span class="lbl">Ce que vous recherchez via le réseau</span>${chipsOf('entBesoins', ref.entrepreneuriat.besoins)}</div>` : ''}
      </div>
      ${f('j-parrain', 'Parrain ou marraine au sein du RISCE (facultatif)', inp('j-parrain', 'parrain', 'text', 'Prénom Nom'))}
      <div class="field"><span class="lbl">Visibilité de mon profil</span>
        ${[['publique', 'Public', 'Prénom, initiale, métier et ville visibles de tous ; le reste réservé aux membres.'], ['membres', 'Membres connectés', 'Recommandé. Visible uniquement par les membres du RISCE.'], ['admin', 'Administrateurs seulement', 'Compté dans les statistiques, invisible dans l\'annuaire.']]
          .map(([v, l, d]) => `<label class="check"><input type="radio" name="vis" value="${v}" ${J.visibilite === v ? 'checked' : ''}><span><b>${l}</b><br><span class="muted">${d}</span></span></label>`).join('')}
      </div>
      <label class="check"><input type="checkbox" id="j-rgpd" ${J.rgpd ? 'checked' : ''}><span>J'accepte que le RISCE traite ces informations pour l'annuaire des talents, conformément à la loi sénégalaise n° 2008-12 et au RGPD. Je peux retirer mon consentement à tout moment. *</span></label>
      <label class="check"><input type="checkbox" id="j-charte" ${J.charte ? 'checked' : ''}><span>J'adhère aux valeurs du RISCE : excellence, pertinence, impact. *</span></label>`;
    RT.$('#join-form').innerHTML = body + `<p class="err" id="j-err" hidden></p>
      <div class="form-nav"><button class="btn btn-ghost" type="button" id="j-prev" ${step === 0 ? 'disabled' : ''}>Précédent</button>
      ${step < 3 ? '<button class="btn btn-primary" type="submit">Continuer</button>' : '<button class="btn btn-primary" type="submit">Envoyer ma demande</button>'}</div>`;
  }

  function readForm() {
    RT.$$('#join-form [data-k]').forEach((el) => (J[el.dataset.k] = el.value.trim()));
    const r = RT.$('#join-form input[name="vis"]:checked'); if (r) J.visibilite = r.value;
    if (RT.$('#j-rgpd')) J.rgpd = RT.$('#j-rgpd').checked;
    if (RT.$('#j-charte')) J.charte = RT.$('#j-charte').checked;
    if (RT.$('#j-enton')) J.entOn = RT.$('#j-enton').checked;
  }

  function check() {
    const miss = [];
    if (step === 0) { if (!J.prenom) miss.push('le prénom'); if (!J.nom) miss.push('le nom'); if (!/^\S+@\S+\.\S+$/.test(J.email)) miss.push('une adresse e-mail valide'); }
    if (step === 1) { if (!J.pays) miss.push('le pays'); if (!J.ville) miss.push('la ville'); }
    if (step === 2) { if (!J.domaine) miss.push('le domaine'); if (!J.filiere) miss.push('la filière'); if (!J.metier) miss.push('le métier'); if (J.experience === '' || +J.experience < 0) miss.push('les années d\'expérience'); }
    if (step === 3) { if (!J.contributions.length) miss.push('au moins une contribution'); if (!J.rgpd) miss.push('le consentement au traitement des données'); if (!J.charte) miss.push('l\'adhésion aux valeurs'); if (J.entOn) { if (!J.entType) miss.push('le profil entrepreneurial'); if (!J.entNom) miss.push('le nom de l\'entreprise ou du projet'); if (!J.entStade) miss.push('le stade'); } }
    const e = RT.$('#j-err');
    if (miss.length) { e.textContent = 'À compléter : ' + miss.join(', ') + '.'; e.hidden = false; return false; }
    return true;
  }

  function locate() {
    const c = RT.geo.cities.find((x) => RT.norm(x.nom) === RT.norm(J.ville) && x.pays === J.pays);
    if (c) return [c.lat, c.lon];
    const p = RT.geo.countryByIso.get(J.pays); return p ? [p.lat, p.lon] : [0, 0];
  }

  function submit() {
    const [lat, lon] = locate();
    const id = 'D' + String(RT.state.demandes.length + 1).padStart(3, '0') + '-' + Date.now().toString(36).slice(-3);
    const d = { id, prenom: J.prenom, nom: J.nom, genre: J.genre || 'N', email: J.email, ville: J.ville, pays: J.pays, lat, lon, domaine: J.domaine, filiere: J.filiere, metier: J.metier,
      experience: +J.experience, secteur: J.secteur || 'Non précisé', niveau: J.niveau || 'Non précisé', langues: J.langues.slice(), competences: J.competences.split(',').map((s) => s.trim()).filter(Boolean),
      contributions: J.contributions.slice(), visibilite: J.visibilite, parrain: J.parrain, cv: !!J.cv, date: RT.today(), etape: 'soumise',
      entreprise: J.entOn ? { type: J.entType, nom: J.entNom, stade: J.entStade, activite: J.entActivite || 'activité à préciser', annee: null, senegal: J.entSenegal || 'Pas encore', besoins: J.entBesoins.slice(), une: false } : null,
      historique: [{ date: RT.today(), action: 'Demande déposée', par: 'Candidat·e' }] };
    RT.state.demandes.unshift(d); RT.save();
    RT.$('#join-form').innerHTML = `<span class="pill ok">Demande enregistrée</span><h3>Merci ${RT.esc(J.prenom)}, votre demande est déposée.</h3>
      <p>Référence <b class="mono">${RT.esc(id)}</b>. Le ou la référent·e ${RT.esc(RT.paysNom(J.pays))} va vérifier votre profil, puis la commission validera l'adhésion. Vous recevrez un e-mail à chaque étape.</p>
      <p class="lock-note">Démonstration : <a href="#connexion">connectez-vous</a> avec <b class="mono">admin</b> / <b class="mono">admin</b> pour faire avancer cette demande dans le circuit de validation.</p>
      <div class="form-nav"><a class="btn btn-ghost" href="#accueil">Retour à l'accueil</a><button class="btn btn-primary" type="button" id="j-new">Nouvelle demande</button></div>`;
    RT.$('#form-steps').innerHTML = STEPS.map((s) => `<button type="button" class="done" disabled><span class="n">✓</span>${s}</button>`).join('');
    RT.$('#j-new').onclick = () => { Object.assign(J, { prenom: '', nom: '', email: '', tel: '', genre: '', pays: '', ville: '', domaine: '', filiere: '', metier: '', experience: '', niveau: '', secteur: '', langues: ['Français'], competences: '', cv: '', contributions: [], parrain: '', visibilite: 'membres', rgpd: false, charte: false, entOn: false, entType: '', entNom: '', entStade: '', entActivite: '', entSenegal: '', entBesoins: [] }); step = 0; renderForm(); };
    RT.updateBadges();
  }

  RT.initJoin = () => {
    renderForm();
    const form = RT.$('#join-form');
    form.addEventListener('submit', (e) => { e.preventDefault(); readForm(); if (!check()) return; if (step < 3) { step++; renderForm(); form.scrollIntoView({ block: 'start', behavior: 'smooth' }); } else submit(); });
    form.addEventListener('change', (e) => {
      if (e.target.id === 'j-cv') { J.cv = e.target.files[0] ? e.target.files[0].name : ''; return; }
      const k = e.target.dataset && e.target.dataset.k;
      if (e.target.id === 'j-enton') { readForm(); renderForm(); return; }
      if (['pays', 'domaine', 'filiere'].includes(k)) { readForm(); if (k === 'domaine') { J.filiere = ''; J.metier = ''; } if (k === 'filiere') J.metier = ''; if (k === 'pays') J.ville = ''; renderForm(); }
    });
    form.addEventListener('click', (e) => {
      const c = e.target.closest('[data-multi] .chip');
      if (c) { const key = c.parentElement.dataset.multi, v = c.dataset.v; readForm(); J[key] = J[key].includes(v) ? J[key].filter((x) => x !== v) : J[key].concat(v); c.setAttribute('aria-pressed', J[key].includes(v)); }
      if (e.target.id === 'j-prev') { readForm(); step = Math.max(0, step - 1); renderForm(); }
    });
    RT.$('#form-steps').addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (b && +b.dataset.s < step) { readForm(); step = +b.dataset.s; renderForm(); } });
  };

  // =================================================================== CONNEXION
  RT.initLogin = () => {
    RT.$('#login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const u = RT.$('#lg-user').value.trim().toLowerCase(), p = RT.$('#lg-pwd').value;
      const acc = RT.ACCOUNTS[u];
      const err = RT.$('#lg-err');
      if (!acc || acc.pwd !== p) { err.textContent = 'Identifiant ou mot de passe incorrect. Utilisez l\'un des comptes de test.'; err.hidden = false; return; }
      err.hidden = true; RT.$('#lg-pwd').value = '';
      RT.setRole(acc.role); RT.log('Connexion', u);
      RT.toast(`Bienvenue ${RT.ROLES[acc.role].nom}.`);
      location.hash = RT.isStaff() ? '#admin' : '#talents';
    });
    const chip = RT.$('#role-chip'), menu = RT.$('#user-menu');
    chip.addEventListener('click', (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; chip.setAttribute('aria-expanded', String(!menu.hidden)); });
    document.addEventListener('click', (e) => { if (!menu.hidden && !e.target.closest('#user-menu')) { menu.hidden = true; chip.setAttribute('aria-expanded', 'false'); } });
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) menu.hidden = true; });
    RT.$('#logout').onclick = () => { menu.hidden = true; RT.log('Déconnexion', ''); RT.setRole('visiteur'); RT.toast('Vous êtes déconnecté·e.'); location.hash = '#accueil'; };
  };

  RT.setRole = (role) => {
    RT.state.role = role; RT.save();
    const r = RT.ROLES[role], logged = role !== 'visiteur';
    RT.$('#login-btn').hidden = logged; RT.$('#role-chip').hidden = !logged;
    RT.$('#role-av').textContent = r.init; RT.$('#role-lbl').textContent = r.nom;
    RT.$('#um-name').textContent = r.nom; RT.$('#um-role').textContent = r.titre || '';
    RT.$('#um-admin').hidden = !RT.isStaff();
    RT.$('#nav-admin').hidden = !RT.isStaff();
    RT.refreshTalents(); RT.refreshCarte(); if (RT.refreshEntrepreneurs) RT.refreshEntrepreneurs();
    if (!RT.isStaff() && location.hash === '#admin') location.hash = '#connexion';
  };
})();
