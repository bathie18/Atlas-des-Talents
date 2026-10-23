/* Demande de compte, connexion (rôles de démonstration) et back-office. */
(function () {
  const RT = window.RT;

  // =================================================================== DEMANDE DE COMPTE
  const STEPS = ['Identité', 'Résidence', 'Parcours', 'Contribution'];
  let step = 0;
  const J = { prenom: '', nom: '', email: '', tel: '', genre: '', pays: '', ville: '', domaine: '', filiere: '', metier: '', experience: '', niveau: '', secteur: '', langues: ['Français'], competences: '', cv: '', contributions: [], parrain: '', visibilite: 'membres', rgpd: false, charte: false };

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
      ${f('j-genre', 'Genre (facultatif, pour les statistiques de parité)', sel('j-genre', 'genre', [['F', 'Femme'], ['H', 'Homme'], ['N', 'Je préfère ne pas répondre']], 'Non renseigné'))}`;
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
  }

  function check() {
    const miss = [];
    if (step === 0) { if (!J.prenom) miss.push('le prénom'); if (!J.nom) miss.push('le nom'); if (!/^\S+@\S+\.\S+$/.test(J.email)) miss.push('une adresse e-mail valide'); }
    if (step === 1) { if (!J.pays) miss.push('le pays'); if (!J.ville) miss.push('la ville'); }
    if (step === 2) { if (!J.domaine) miss.push('le domaine'); if (!J.filiere) miss.push('la filière'); if (!J.metier) miss.push('le métier'); if (J.experience === '' || +J.experience < 0) miss.push('les années d\'expérience'); }
    if (step === 3) { if (!J.contributions.length) miss.push('au moins une contribution'); if (!J.rgpd) miss.push('le consentement au traitement des données'); if (!J.charte) miss.push('l\'adhésion aux valeurs'); }
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
      historique: [{ date: RT.today(), action: 'Demande déposée', par: 'Candidat·e' }] };
    RT.state.demandes.unshift(d); RT.save();
    RT.$('#join-form').innerHTML = `<span class="pill ok">Demande enregistrée</span><h3>Merci ${RT.esc(J.prenom)}, votre demande est déposée.</h3>
      <p>Référence <b class="mono">${RT.esc(id)}</b>. Le ou la référent·e ${RT.esc(RT.paysNom(J.pays))} va vérifier votre profil, puis la commission validera l'adhésion. Vous recevrez un e-mail à chaque étape.</p>
      <p class="lock-note">Démonstration : choisissez le profil « Référent·e pays » ou « Administrateur·rice » dans <a href="#connexion">Connexion</a> pour faire avancer cette demande dans le circuit de validation.</p>
      <div class="form-nav"><a class="btn btn-ghost" href="#accueil">Retour à l'accueil</a><button class="btn btn-primary" type="button" id="j-new">Nouvelle demande</button></div>`;
    RT.$('#form-steps').innerHTML = STEPS.map((s) => `<button type="button" class="done" disabled><span class="n">✓</span>${s}</button>`).join('');
    RT.$('#j-new').onclick = () => { Object.assign(J, { prenom: '', nom: '', email: '', tel: '', genre: '', pays: '', ville: '', domaine: '', filiere: '', metier: '', experience: '', niveau: '', secteur: '', langues: ['Français'], competences: '', cv: '', contributions: [], parrain: '', visibilite: 'membres', rgpd: false, charte: false }); step = 0; renderForm(); };
    RT.updateBadges();
  }

  RT.initJoin = () => {
    renderForm();
    const form = RT.$('#join-form');
    form.addEventListener('submit', (e) => { e.preventDefault(); readForm(); if (!check()) return; if (step < 3) { step++; renderForm(); form.scrollIntoView({ block: 'start', behavior: 'smooth' }); } else submit(); });
    form.addEventListener('change', (e) => {
      if (e.target.id === 'j-cv') { J.cv = e.target.files[0] ? e.target.files[0].name : ''; return; }
      const k = e.target.dataset && e.target.dataset.k;
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
    const box = RT.$('#roles');
    const draw = () => {
      box.innerHTML = Object.entries(RT.ROLES).map(([k, r]) => `<button type="button" class="panel role-card" data-role="${k}" aria-pressed="${RT.state.role === k}">
        <span class="role-chip" style="border-color:var(--line);color:var(--ink);pointer-events:none;justify-self:start"><span class="av">${r.init}</span>${RT.esc(r.titre || r.nom)}</span>
        <h3>${RT.esc(r.desc)}</h3><ul>${r.droits.map((d) => `<li>${RT.esc(d)}</li>`).join('')}</ul>
        <span class="btn ${RT.state.role === k ? 'btn-primary' : 'btn-ghost'} btn-sm" style="justify-self:start">${RT.state.role === k ? 'Profil actif' : 'Utiliser ce profil'}</span></button>`).join('');
    };
    draw();
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-role]'); if (!b) return;
      RT.setRole(b.dataset.role); draw();
      RT.toast(`Vous naviguez en tant que ${RT.ROLES[b.dataset.role].titre || 'visiteur'}.`);
      if (RT.isStaff()) location.hash = '#admin';
    });
    RT._drawRoles = draw;
  };

  RT.setRole = (role) => {
    RT.state.role = role; RT.save();
    const r = RT.ROLES[role];
    RT.$('#role-av').textContent = r.init; RT.$('#role-lbl').textContent = role === 'visiteur' ? 'Visiteur · se connecter' : r.nom;
    RT.$('#nav-admin').hidden = !RT.isStaff();
    RT.refreshTalents(); RT.refreshCarte(); if (RT._drawRoles) RT._drawRoles();
    if (!RT.isStaff() && location.hash === '#admin') location.hash = '#connexion';
  };

  // =================================================================== ADMINISTRATION
  const WF = [
    ['soumise', 'Nouvelles demandes'], ['verif_referent', 'Vérification référent·e'], ['validation_commission', 'Validation commission'], ['complement', 'Compléments demandés'],
  ];
  const LABEL = { soumise: 'Nouvelle', verif_referent: 'Vérification', validation_commission: 'En commission', complement: 'Compléments', activee: 'Activée', rejetee: 'Rejetée' };
  let tab = 'demandes', profQ = '';

  const myScope = (pays) => RT.state.role === 'admin' || (RT.state.role === 'referent' && pays === RT.ROLES.referent.pays);

  function actionsFor(d) {
    const a = [], isAdmin = RT.state.role === 'admin', mine = myScope(d.pays);
    if (!mine) return '<span class="meta">Hors de votre périmètre</span>';
    if (d.etape === 'soumise') a.push(['verif_referent', 'Prendre en charge', 'btn-primary']);
    if (d.etape === 'verif_referent') { a.push(['validation_commission', 'Identité vérifiée', 'btn-primary']); a.push(['complement', 'Compléments', 'btn-ghost']); }
    if (d.etape === 'complement') a.push(['verif_referent', 'Compléments reçus', 'btn-ghost']);
    if (d.etape === 'validation_commission') { if (isAdmin) a.push(['activee', 'Activer le compte', 'btn-primary']); else return '<span class="meta">En attente de la commission</span>'; }
    if (isAdmin) a.push(['rejetee', 'Rejeter', 'btn-danger']);
    return a.map(([to, l, c]) => `<button class="btn btn-sm ${c}" type="button" data-move="${d.id}" data-to="${to}">${l}</button>`).join('');
  }

  function moveTo(d, to) {
    const msg = { verif_referent: d.etape === 'complement' ? 'Compléments reçus' : 'Prise en charge par le ou la référent·e', validation_commission: 'Identité et appartenance vérifiées', complement: 'Compléments demandés au candidat', activee: 'Compte activé par la commission', rejetee: 'Demande rejetée' }[to];
    d.etape = to; d.historique.push({ date: RT.today(), action: msg, par: RT.ROLES[RT.state.role].nom });
    if (to === 'activee') {
      const dm = RT.dom(d.domaine);
      RT.state.talents.push({ id: 'T' + String(RT.state.talents.length + 1).padStart(4, '0'), prenom: d.prenom, nom: d.nom, genre: d.genre, ville: d.ville, pays: d.pays, lat: d.lat, lon: d.lon,
        domaine: d.domaine, filiere: d.filiere, metier: d.metier, secteur: d.secteur, niveau: d.niveau || 'Bac+5 / Master', experience: d.experience,
        langues: d.langues || ['Français'], competences: d.competences && d.competences.length ? d.competences : [dm.filieres[0].libelle], contributions: d.contributions || ['Mentorat (Give Back)'],
        statut: 'Membre adhérent', adhesion: RT.today(), cv: !!d.cv, visibilite: d.visibilite || 'membres', accroche: d.metier, actif: true });
      RT.refreshCounts();
    }
    RT.log(msg, `${d.prenom} ${d.nom} (${d.id})`);
    RT.updateBadges(); RT.refreshTalents(); RT.refreshCarte();
    RT.toast(`${d.prenom} ${d.nom} : ${msg.toLowerCase()}.`);
    renderAdmin();
  }

  function openDemande(d) {
    const dm = RT.dom(d.domaine);
    RT.modal(`<div class="modal-head"><div style="min-width:0"><span class="eyebrow">Demande ${RT.esc(d.id)} · ${LABEL[d.etape]}</span><h2>${RT.esc(d.prenom)} ${RT.esc(d.nom)}</h2><p class="muted">${RT.esc(d.metier)} · ${RT.esc(d.ville)}, ${RT.esc(RT.paysNom(d.pays))}</p></div><button class="modal-x" type="button" data-close aria-label="Fermer">×</button></div>
      <div class="modal-body"><dl class="dl">
        <dt>E-mail</dt><dd class="mono" style="font-size:.8rem">${RT.esc(d.email)}</dd>
        <dt>Domaine / filière</dt><dd>${RT.esc(dm.libelle)} · ${RT.esc(d.filiere)}</dd>
        <dt>Expérience</dt><dd class="num">${d.experience} ans · ${RT.esc(d.secteur)}</dd>
        <dt>Parrainage</dt><dd>${d.parrain ? RT.esc(d.parrain) : 'Candidature spontanée'}</dd>
        <dt>CV</dt><dd>${d.cv ? 'Déposé (PDF)' : 'Non déposé'}</dd></dl>
        <div><span class="eyebrow">Historique</span><div class="log">${d.historique.map((h) => `<div class="log-row"><span class="num muted">${RT.dateFr(h.date)}</span><span>${RT.esc(h.par)}</span><span>${RT.esc(h.action)}</span></div>`).join('')}</div></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap" class="kcard-acts">${['activee', 'rejetee'].includes(d.etape) ? '' : actionsFor(d)}</div></div>`, (back, close) => {
      back.addEventListener('click', (e) => { const b = e.target.closest('[data-move]'); if (b) { close(); moveTo(d, b.dataset.to); } });
    });
  }

  function renderAdmin() {
    if (!RT.isStaff()) { RT.$('#admin-body').innerHTML = '<div class="empty">Espace réservé aux référent·es et administrateur·rices. <a href="#connexion">Changer de profil</a></div>'; RT.$('#admin-tabs').innerHTML = ''; return; }
    const isAdmin = RT.state.role === 'admin';
    RT.$('#admin-title').textContent = isAdmin ? 'Administration' : `Espace référent·e · ${RT.paysNom(RT.ROLES.referent.pays)}`;
    const scoped = RT.state.demandes.filter((d) => myScope(d.pays) || isAdmin);
    const open = scoped.filter((d) => !['activee', 'rejetee'].includes(d.etape));
    const tabs = [['demandes', 'Demandes', open.length], ['profils', 'Profils', null], ['referentiels', 'Référentiels', null], ['journal', 'Journal', RT.state.journal.length || null]];
    RT.$('#admin-tabs').innerHTML = tabs.map(([k, l, n]) => `<button role="tab" type="button" data-tab="${k}" aria-selected="${tab === k}">${l}${n != null ? `<span class="count">${n}</span>` : ''}</button>`).join('');
    const body = RT.$('#admin-body');

    if (tab === 'demandes') {
      const list = RT.state.role === 'referent' ? RT.state.demandes.filter((d) => myScope(d.pays) || d.etape === 'validation_commission') : RT.state.demandes;
      const done = RT.state.demandes.filter((d) => ['activee', 'rejetee'].includes(d.etape));
      body.innerHTML = `${RT.state.role === 'referent' ? '<p class="lock-note" style="margin-bottom:12px">Vous voyez et traitez les demandes de votre pays. La validation finale appartient à la commission.</p>' : ''}
        <div class="kanban">${WF.map(([k, l]) => { const items = list.filter((d) => d.etape === k && (isAdmin || myScope(d.pays))); return `<div class="kcol"><h3>${l}<span class="count mono">${items.length}</span></h3>${items.map((d) => `
          <div class="kcard"><div style="display:flex;justify-content:space-between;gap:8px;align-items:start"><b>${RT.esc(d.prenom)} ${RT.esc(d.nom)}</b><button class="btn btn-ghost btn-sm" type="button" data-open="${d.id}">Détail</button></div>
          <div class="meta">${RT.esc(d.metier)}<br>${RT.esc(d.ville)}, ${RT.esc(RT.paysNom(d.pays))} · déposée le ${RT.dateFr(d.date)}</div>
          <div class="acts">${actionsFor(d)}</div></div>`).join('') || '<p class="muted" style="font-size:.8rem;padding:4px">Aucune demande</p>'}</div>`; }).join('')}</div>
        <h3 style="margin:26px 0 10px;font-size:1rem">Demandes clôturées <span class="muted mono" style="font-size:.8rem">${done.length}</span></h3>
        ${done.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>Candidat·e</th><th>Ville</th><th>Métier</th><th>Décision</th><th>Date</th></tr></thead><tbody>${done.map((d) => `<tr><td>${RT.esc(d.prenom)} ${RT.esc(d.nom)}</td><td>${RT.esc(d.ville)}</td><td>${RT.esc(d.metier)}</td><td><span class="pill ${d.etape === 'activee' ? 'ok' : 'ko'}">${LABEL[d.etape]}</span></td><td class="num">${RT.dateFr(d.historique[d.historique.length - 1].date)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Aucune.</p>'}`;
    }

    if (tab === 'profils') {
      const nq = RT.norm(profQ);
      const all = RT.state.talents.filter((t) => (isAdmin || t.pays === RT.ROLES.referent.pays) && (!nq || RT.norm(`${t.prenom} ${t.nom} ${t.metier} ${t.ville}`).includes(nq)));
      body.innerHTML = `<div class="dir-toolbar"><input class="input" id="prof-q" type="search" placeholder="Rechercher un profil (nom, métier, ville)" value="${RT.esc(profQ)}" style="max-width:380px"><span class="muted num" style="font-size:.85rem">${all.length} profil${all.length > 1 ? 's' : ''}${all.length > 80 ? ' · 80 premiers affichés' : ''}</span></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>Membre</th><th>Métier</th><th>Ville</th><th>Statut</th><th>Visibilité</th><th>État</th><th></th></tr></thead><tbody>
        ${all.slice(0, 80).map((t) => `<tr><td><b>${RT.esc(t.prenom)} ${RT.esc(t.nom)}</b><br><span class="muted mono" style="font-size:.72rem">${t.id}</span></td><td>${RT.esc(t.metier)}</td><td>${RT.esc(t.ville)} <span class="muted">${t.pays}</span></td><td>${RT.esc(t.statut)}</td>
          <td><select class="input" style="padding:4px 6px;width:auto" data-vis="${t.id}" aria-label="Visibilité de ${RT.esc(t.prenom)} ${RT.esc(t.nom)}">${[['publique', 'Public'], ['membres', 'Membres'], ['admin', 'Admins']].map(([v, l]) => `<option value="${v}" ${t.visibilite === v ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
          <td>${t.actif === false ? '<span class="pill ko">Suspendu</span>' : '<span class="pill ok">Actif</span>'}</td>
          <td><button class="btn btn-ghost btn-sm" type="button" data-toggle="${t.id}">${t.actif === false ? 'Réactiver' : 'Suspendre'}</button></td></tr>`).join('')}</tbody></table></div>`;
      const q = RT.$('#prof-q'); q.oninput = () => { profQ = q.value; renderAdmin(); const n = RT.$('#prof-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
    }

    if (tab === 'referentiels') {
      body.innerHTML = `<p class="muted" style="margin-bottom:14px;max-width:70ch">Nomenclature à trois niveaux : domaine, filière, métier. Dans la version cible, chaque métier porte un code ISCO-08 (BIT) et un code ROME (France Travail) pour permettre les correspondances avec les offres d'emploi et les programmes comme le PPED.</p>
        <div class="ref-tree">${RT.state.ref.domaines.map((d) => `<div class="panel"><div style="display:flex;gap:8px;align-items:center"><i class="dot" style="background:${d.couleur}"></i><b>${RT.esc(d.libelle)}</b><span class="mono muted" style="margin-left:auto;font-size:.72rem">${d.code}</span></div>
          ${d.filieres.map((f) => `<div style="margin-top:8px"><b style="font-size:.82rem">${RT.esc(f.libelle)}</b><ul>${f.metiers.map((m) => `<li>${RT.esc(m)}</li>`).join('')}</ul></div>`).join('')}</div>`).join('')}</div>`;
    }

    if (tab === 'journal') {
      body.innerHTML = RT.state.journal.length ? `<div class="log">${RT.state.journal.slice(0, 200).map((j) => `<div class="log-row"><span class="num muted">${new Date(j.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span><span>${RT.esc(j.qui)}</span><span>${RT.esc(j.action)} · <span class="muted">${RT.esc(j.cible)}</span></span></div>`).join('')}</div>`
        : '<div class="empty">Le journal est vide. Validez une demande, consultez un CV ou modifiez une visibilité : chaque action y sera tracée.</div>';
    }
  }

  RT.initAdmin = () => {
    RT.$('#admin-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; renderAdmin(); } });
    RT.$('#admin-body').addEventListener('click', (e) => {
      const m = e.target.closest('[data-move]'); if (m) return moveTo(RT.state.demandes.find((d) => d.id === m.dataset.move), m.dataset.to);
      const o = e.target.closest('[data-open]'); if (o) return openDemande(RT.state.demandes.find((d) => d.id === o.dataset.open));
      const t = e.target.closest('[data-toggle]');
      if (t) { const p = RT.state.talents.find((x) => x.id === t.dataset.toggle); p.actif = p.actif === false; RT.log(p.actif ? 'Profil réactivé' : 'Profil suspendu', `${p.prenom} ${p.nom} (${p.id})`); RT.refreshCounts(); RT.refreshTalents(); RT.refreshCarte(); renderAdmin(); }
    });
    RT.$('#admin-body').addEventListener('change', (e) => {
      const s = e.target.closest('[data-vis]');
      if (s) { const p = RT.state.talents.find((x) => x.id === s.dataset.vis); p.visibilite = s.value; RT.log(`Visibilité passée à « ${s.options[s.selectedIndex].text} »`, `${p.prenom} ${p.nom} (${p.id})`); RT.refreshTalents(); RT.toast('Visibilité mise à jour.'); }
    });
  };
  RT.showAdmin = renderAdmin;
  RT.updateBadges = () => { if (location.hash === '#admin') renderAdmin(); };
})();
