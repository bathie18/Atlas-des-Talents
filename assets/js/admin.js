/* Back-office RISCE Talents : vue d'ensemble, circuit de validation, profils, banque de CV,
   entrepreneurs, référentiels métiers, comptes et rôles, journal.
   Prototype : toutes les modifications sont conservées dans le navigateur. */
(function () {
  const RT = window.RT;
  const WF = [['soumise', 'Nouvelles demandes'], ['verif_referent', 'Vérification référent·e'], ['validation_commission', 'Validation commission'], ['complement', 'Compléments demandés']];
  const LABEL = { soumise: 'Nouvelle', verif_referent: 'Vérification', validation_commission: 'En commission', complement: 'Compléments', activee: 'Activée', rejetee: 'Rejetée' };
  const TABS = [
    ['apercu', 'Vue d\'ensemble', 'all'], ['demandes', 'Demandes', 'all'], ['profils', 'Profils', 'all'], ['cv', 'Banque de CV', 'all'],
    ['entrepreneurs', 'Entrepreneurs', 'admin'], ['referentiels', 'Domaines & filières', 'admin'], ['comptes', 'Comptes & rôles', 'admin'], ['journal', 'Journal', 'admin'],
  ];
  const S = { tab: 'apercu', pq: '', ppays: '', pdom: '', petat: '', cq: '', cf: '', eq: '', confirm: null };

  const isAdmin = () => RT.state.role === 'admin';
  const refPays = () => RT.ROLES.referent.pays;
  const inScope = (pays) => isAdmin() || (RT.state.role === 'referent' && pays === refPays());
  const talentsInScope = () => RT.state.talents.filter((t) => inScope(t.pays));
  const findT = (id) => RT.state.talents.find((t) => t.id === id);
  const who = (t) => `${t.prenom} ${t.nom} (${t.id})`;
  const after = () => { RT.refreshCounts(); RT.refreshTalents(); RT.refreshCarte(); RT.refreshEntrepreneurs(); RT.save(); render(); };

  // ------------------------------------------------------------------ circuit de validation
  function actionsFor(d) {
    const a = [];
    if (!inScope(d.pays)) return '<span class="meta">Hors de votre périmètre</span>';
    if (d.etape === 'soumise') a.push(['verif_referent', 'Prendre en charge', 'btn-primary']);
    if (d.etape === 'verif_referent') { a.push(['validation_commission', 'Identité vérifiée', 'btn-primary']); a.push(['complement', 'Compléments', 'btn-ghost']); }
    if (d.etape === 'complement') a.push(['verif_referent', 'Compléments reçus', 'btn-ghost']);
    if (d.etape === 'validation_commission') { if (isAdmin()) a.push(['activee', 'Activer le compte', 'btn-primary']); else return '<span class="meta">En attente de la commission</span>'; }
    if (isAdmin()) a.push(['rejetee', 'Rejeter', 'btn-danger']);
    return a.map(([to, l, c]) => `<button class="btn btn-sm ${c}" type="button" data-move="${d.id}" data-to="${to}">${l}</button>`).join('');
  }

  function moveTo(d, to) {
    const msg = { verif_referent: d.etape === 'complement' ? 'Compléments reçus' : 'Prise en charge par le ou la référent·e', validation_commission: 'Identité et appartenance vérifiées', complement: 'Compléments demandés au candidat', activee: 'Compte activé par la commission', rejetee: 'Demande rejetée' }[to];
    d.etape = to; d.historique.push({ date: RT.today(), action: msg, par: RT.ROLES[RT.state.role].nom });
    if (to === 'activee') {
      const dm = RT.dom(d.domaine) || RT.state.ref.domaines[0];
      RT.state.talents.push({ id: 'T' + String(RT.state.talents.length + 1).padStart(4, '0') + Date.now().toString(36).slice(-2), prenom: d.prenom, nom: d.nom, genre: d.genre, ville: d.ville, pays: d.pays, lat: d.lat, lon: d.lon,
        domaine: d.domaine, filiere: d.filiere, metier: d.metier, secteur: d.secteur, niveau: d.niveau || 'Bac+5 / Master', experience: d.experience,
        langues: d.langues || ['Français'], competences: d.competences && d.competences.length ? d.competences : [dm.filieres[0].libelle], contributions: d.contributions || ['Mentorat (Give Back)'],
        statut: 'Membre adhérent', adhesion: RT.today(), cv: !!d.cv, visibilite: d.visibilite || 'membres', accroche: d.metier, actif: true, ...(d.entreprise ? { entreprise: d.entreprise } : {}) });
    }
    RT.log(msg, `${d.prenom} ${d.nom} (${d.id})`);
    RT.toast(`${d.prenom} ${d.nom} : ${msg.toLowerCase()}.`);
    after();
  }

  function openDemande(d) {
    const dm = RT.dom(d.domaine);
    RT.modal(`<div class="modal-head"><div style="min-width:0"><span class="eyebrow">Demande ${RT.esc(d.id)} · ${LABEL[d.etape]}</span><h2>${RT.esc(d.prenom)} ${RT.esc(d.nom)}</h2><p class="muted">${RT.esc(d.metier)} · ${RT.esc(d.ville)}, ${RT.esc(RT.paysNom(d.pays))}</p></div><button class="modal-x" type="button" data-close aria-label="Fermer">×</button></div>
      <div class="modal-body"><dl class="dl">
        <dt>E-mail</dt><dd class="mono" style="font-size:.8rem">${RT.esc(d.email)}</dd>
        <dt>Domaine / filière</dt><dd>${RT.esc(dm ? dm.libelle : d.domaine)} · ${RT.esc(d.filiere)}</dd>
        <dt>Expérience</dt><dd class="num">${d.experience} ans · ${RT.esc(d.secteur)}</dd>
        <dt>Parrainage</dt><dd>${d.parrain ? RT.esc(d.parrain) : 'Candidature spontanée'}</dd>
        <dt>CV</dt><dd>${d.cv ? 'Déposé (PDF)' : 'Non déposé'}</dd>
        <dt>Entrepreneuriat</dt><dd>${d.entreprise ? `${RT.esc(d.entreprise.type)} · ${RT.esc(d.entreprise.nom)} (${RT.esc(d.entreprise.stade)})` : 'Non'}</dd></dl>
        <div><span class="eyebrow">Historique</span><div class="log">${d.historique.map((h) => `<div class="log-row"><span class="num muted">${RT.dateFr(h.date)}</span><span>${RT.esc(h.par)}</span><span>${RT.esc(h.action)}</span></div>`).join('')}</div></div>
        <div class="row-acts" style="justify-content:flex-start">${['activee', 'rejetee'].includes(d.etape) ? '' : actionsFor(d)}</div></div>`, (back, close) => {
      back.addEventListener('click', (e) => { const b = e.target.closest('[data-move]'); if (b) { close(); moveTo(d, b.dataset.to); } });
    });
  }

  // ------------------------------------------------------------------ édition d'un profil
  function openEdit(t) {
    const ref = RT.state.ref;
    const metiers = ref.domaines.flatMap((d) => d.filieres.flatMap((f) => f.metiers.map((m) => ({ d: d.code, dl: d.libelle, f: f.libelle, m }))));
    const pays = RT.geo.countries.filter((c) => c.iso2).map((c) => [c.iso2, c.nom]).sort((a, b) => a[1].localeCompare(b[1], 'fr'));
    const opt = (list, cur) => list.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${RT.esc(v)}"${v === cur ? ' selected' : ''}>${RT.esc(l)}</option>`; }).join('');
    RT.modal(`<div class="modal-head"><div style="min-width:0"><span class="eyebrow">Modifier le profil · ${t.id}</span><h2>${RT.esc(t.prenom)} ${RT.esc(t.nom)}</h2></div><button class="modal-x" type="button" data-close aria-label="Fermer">×</button></div>
      <form class="modal-body" id="edit-form">
        <div class="form-grid">
          <div class="field"><label for="ed-prenom">Prénom</label><input class="input" id="ed-prenom" value="${RT.esc(t.prenom)}"></div>
          <div class="field"><label for="ed-nom">Nom</label><input class="input" id="ed-nom" value="${RT.esc(t.nom)}"></div>
          <div class="field" style="grid-column:1/-1"><label for="ed-met">Métier (domaine › filière)</label><select class="input" id="ed-met">${metiers.map((x, i) => `<option value="${i}"${x.m === t.metier && x.f === t.filiere ? ' selected' : ''}>${RT.esc(x.m)} · ${RT.esc(x.dl)} › ${RT.esc(x.f)}</option>`).join('')}</select></div>
          <div class="field"><label for="ed-ville">Ville</label><input class="input" id="ed-ville" value="${RT.esc(t.ville)}"></div>
          <div class="field"><label for="ed-pays">Pays</label><select class="input" id="ed-pays">${opt(pays, t.pays)}</select></div>
          <div class="field"><label for="ed-exp">Expérience (ans)</label><input class="input" id="ed-exp" type="number" min="0" max="60" value="${t.experience}"></div>
          <div class="field"><label for="ed-sect">Secteur</label><select class="input" id="ed-sect">${opt(ref.secteurs, t.secteur)}</select></div>
          <div class="field"><label for="ed-niv">Niveau d'études</label><select class="input" id="ed-niv">${opt(ref.niveaux, t.niveau)}</select></div>
          <div class="field"><label for="ed-statut">Type de membre</label><select class="input" id="ed-statut">${opt(ref.statuts, t.statut)}</select></div>
          <div class="field"><label for="ed-vis">Visibilité</label><select class="input" id="ed-vis">${opt([['publique', 'Public'], ['membres', 'Membres connectés'], ['admin', 'Administrateurs seulement']], t.visibilite)}</select></div>
        </div>
        <div class="row-acts"><button class="btn btn-ghost" type="button" data-close>Annuler</button><button class="btn btn-primary" type="submit">Enregistrer</button></div>
      </form>`, (back, close) => {
      back.querySelector('#edit-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const g = (id) => back.querySelector('#' + id).value.trim();
        const m = metiers[+g('ed-met')];
        const ville = g('ed-ville'), paysV = g('ed-pays');
        Object.assign(t, { prenom: g('ed-prenom') || t.prenom, nom: g('ed-nom') || t.nom, domaine: m.d, filiere: m.f, metier: m.m, experience: Math.max(0, +g('ed-exp') || 0), secteur: g('ed-sect'), niveau: g('ed-niv'), statut: g('ed-statut'), visibilite: g('ed-vis') });
        if (ville !== t.ville || paysV !== t.pays) {
          const c = RT.geo.cities.find((x) => RT.norm(x.nom) === RT.norm(ville) && x.pays === paysV) || RT.geo.countryByIso.get(paysV);
          Object.assign(t, { ville, pays: paysV, lat: c ? c.lat : t.lat, lon: c ? c.lon : t.lon });
        }
        RT.log('Profil modifié', who(t)); close(); RT.toast('Profil enregistré.'); after();
      });
    });
  }

  function openEntEdit(t) {
    const e = t.entreprise, en = RT.state.ref.entrepreneuriat;
    const opt = (list, cur) => list.map((v) => `<option${v === cur ? ' selected' : ''}>${RT.esc(v)}</option>`).join('');
    RT.modal(`<div class="modal-head"><div style="min-width:0"><span class="eyebrow">Entreprise ou projet</span><h2>${RT.esc(e.nom)}</h2><p class="muted">${RT.esc(t.prenom)} ${RT.esc(t.nom)}</p></div><button class="modal-x" type="button" data-close aria-label="Fermer">×</button></div>
      <form class="modal-body" id="ent-form"><div class="form-grid">
        <div class="field"><label for="ee-nom">Nom</label><input class="input" id="ee-nom" value="${RT.esc(e.nom)}"></div>
        <div class="field"><label for="ee-type">Profil</label><select class="input" id="ee-type">${opt(en.types, e.type)}</select></div>
        <div class="field" style="grid-column:1/-1"><label for="ee-act">Activité</label><input class="input" id="ee-act" value="${RT.esc(e.activite)}"></div>
        <div class="field"><label for="ee-stade">Stade</label><select class="input" id="ee-stade">${opt(en.stades, e.stade)}</select></div>
        <div class="field"><label for="ee-sn">Lien avec le Sénégal</label><select class="input" id="ee-sn">${opt(['Activité au Sénégal', "Projet d'implantation au Sénégal", 'Pas encore'], e.senegal)}</select></div>
      </div><div class="row-acts"><button class="btn btn-ghost" type="button" data-close>Annuler</button><button class="btn btn-primary" type="submit">Enregistrer</button></div></form>`, (back, close) => {
      back.querySelector('#ent-form').addEventListener('submit', (ev) => {
        ev.preventDefault(); const g = (id) => back.querySelector('#' + id).value.trim();
        Object.assign(e, { nom: g('ee-nom') || e.nom, type: g('ee-type'), activite: g('ee-act') || e.activite, stade: g('ee-stade'), senegal: g('ee-sn') });
        RT.log('Entreprise modifiée', `${e.nom} · ${who(t)}`); close(); RT.toast('Entreprise enregistrée.'); after();
      });
    });
  }

  // ------------------------------------------------------------------ vues
  const confirmBar = (msg, key) => (S.confirm === key ? `<div class="confirm-bar">${msg}<span style="flex:1"></span><button class="btn btn-sm btn-danger" type="button" data-confirm="${RT.esc(key)}">Confirmer</button><button class="btn btn-sm btn-ghost" type="button" data-cancel>Annuler</button></div>` : '');

  function vApercu() {
    const dem = RT.state.demandes.filter((d) => !['activee', 'rejetee'].includes(d.etape) && (isAdmin() || inScope(d.pays)));
    const tl = talentsInScope();
    const withCv = tl.filter((t) => t.cv).length;
    const ents = tl.filter((t) => t.entreprise);
    const cards = [
      ['demandes', dem.length, 'demandes en cours de validation'],
      ['profils', tl.filter((t) => t.actif !== false).length, `profils actifs · ${tl.filter((t) => t.actif === false).length} suspendus`],
      ['cv', withCv, `CV dans la banque · ${Math.round((withCv / Math.max(1, tl.length)) * 100)} % des profils`],
      [isAdmin() ? 'entrepreneurs' : 'profils', ents.length, `entrepreneurs · ${ents.filter((t) => t.entreprise.une).length} à la une`],
    ];
    const steps = WF.map(([k, l]) => `<tr><td>${l}</td><td class="num" style="text-align:right">${dem.filter((d) => d.etape === k).length}</td></tr>`).join('');
    return `<div class="ov-grid">${cards.map(([t, n, l]) => `<button class="panel ov-card" type="button" data-goto="${t}"><b class="num">${n}</b><span>${l}</span></button>`).join('')}</div>
      <div class="dash-grid">
        <div class="panel chart-card span-2" style="padding-bottom:14px"><div><h3>Circuit de validation</h3><p class="sub">Demandes par étape</p></div><table class="data" style="margin-top:8px">${steps}</table></div>
        <div class="panel chart-card span-4" style="padding-bottom:14px"><div><h3>Dernières actions</h3><p class="sub">Journal du back-office</p></div>
          ${RT.state.journal.length ? `<div class="log">${RT.state.journal.slice(0, 6).map((j) => `<div class="log-row"><span class="num muted">${new Date(j.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span><span>${RT.esc(j.qui)}</span><span>${RT.esc(j.action)} · <span class="muted">${RT.esc(j.cible)}</span></span></div>`).join('')}</div>` : '<p class="muted" style="font-size:.85rem;margin-top:8px">Aucune action pour le moment.</p>'}</div>
      </div>`;
  }

  function vDemandes() {
    const vis = RT.state.demandes.filter((d) => isAdmin() || inScope(d.pays));
    const done = vis.filter((d) => ['activee', 'rejetee'].includes(d.etape));
    return `${!isAdmin() ? '<p class="lock-note" style="margin-bottom:12px">Vous voyez et traitez les demandes de votre pays. La validation finale appartient à la commission.</p>' : ''}
      <div class="kanban">${WF.map(([k, l]) => { const items = vis.filter((d) => d.etape === k); return `<div class="kcol"><h3>${l}<span class="count mono">${items.length}</span></h3>${items.map((d) => `
        <div class="kcard"><div style="display:flex;justify-content:space-between;gap:8px;align-items:start"><b>${RT.esc(d.prenom)} ${RT.esc(d.nom)}</b><button class="btn btn-ghost btn-sm" type="button" data-open="${d.id}">Détail</button></div>
        <div class="meta">${RT.esc(d.metier)}<br>${RT.esc(d.ville)}, ${RT.esc(RT.paysNom(d.pays))} · ${RT.dateFr(d.date)}${d.entreprise ? '<br><span class="tag-ent">◆ Entrepreneur</span>' : ''}</div>
        <div class="acts">${actionsFor(d)}</div></div>`).join('') || '<p class="muted" style="font-size:.8rem;padding:4px">Aucune demande</p>'}</div>`; }).join('')}</div>
      <h3 style="margin:26px 0 10px;font-size:1.1rem">Demandes clôturées <span class="muted mono" style="font-size:.8rem">${done.length}</span></h3>
      ${done.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>Candidat·e</th><th>Ville</th><th>Métier</th><th>Décision</th><th>Date</th></tr></thead><tbody>${done.map((d) => `<tr><td>${RT.esc(d.prenom)} ${RT.esc(d.nom)}</td><td>${RT.esc(d.ville)}</td><td>${RT.esc(d.metier)}</td><td><span class="pill ${d.etape === 'activee' ? 'ok' : 'ko'}">${LABEL[d.etape]}</span></td><td class="num">${RT.dateFr(d.historique[d.historique.length - 1].date)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Aucune.</p>'}`;
  }

  function vProfils() {
    const nq = RT.norm(S.pq);
    const base = talentsInScope();
    const list = base.filter((t) => (!nq || RT.norm(`${t.prenom} ${t.nom} ${t.metier} ${t.ville} ${t.id}`).includes(nq)) && (!S.ppays || t.pays === S.ppays) && (!S.pdom || t.domaine === S.pdom)
      && (!S.petat || (S.petat === 'actif' ? t.actif !== false : t.actif === false)));
    const pays = [...new Set(base.map((t) => t.pays))].map((p) => [p, RT.paysNom(p)]).sort((a, b) => a[1].localeCompare(b[1], 'fr'));
    const o = (arr, cur) => arr.map(([v, l]) => `<option value="${RT.esc(v)}"${v === cur ? ' selected' : ''}>${RT.esc(l)}</option>`).join('');
    const del = S.confirm && S.confirm.startsWith('del-') ? findT(S.confirm.slice(4)) : null;
    return `<div class="toolbar"><input class="input grow" id="ap-q" type="search" placeholder="Nom, métier, ville, identifiant" value="${RT.esc(S.pq)}">
        <select class="input" id="ap-pays"><option value="">Tous les pays</option>${o(pays, S.ppays)}</select>
        <select class="input" id="ap-dom"><option value="">Tous les domaines</option>${o(RT.state.ref.domaines.map((d) => [d.code, d.libelle]), S.pdom)}</select>
        <select class="input" id="ap-etat"><option value="">Tous les états</option>${o([['actif', 'Actifs'], ['suspendu', 'Suspendus']], S.petat)}</select>
        <span class="muted num" style="font-size:.85rem">${list.length} profil${list.length > 1 ? 's' : ''}${list.length > 100 ? ' · 100 premiers affichés' : ''}</span></div>
      ${del ? confirmBar(`Supprimer définitivement le profil de ${RT.esc(del.prenom)} ${RT.esc(del.nom)} ? Son CV sera aussi retiré.`, S.confirm) : ''}
      <div class="table-wrap"><table class="data"><thead><tr><th>Membre</th><th>Métier</th><th>Ville</th><th>Type</th><th>Visibilité</th><th>État</th><th></th></tr></thead><tbody>
      ${list.slice(0, 100).map((t) => `<tr><td><b>${RT.esc(t.prenom)} ${RT.esc(t.nom)}</b><br><span class="muted mono" style="font-size:.72rem">${t.id}${t.entreprise ? ' · ◆ entrepreneur' : ''}</span></td><td>${RT.esc(t.metier)}</td><td>${RT.esc(t.ville)} <span class="muted">${t.pays}</span></td><td>${RT.esc(t.statut)}</td>
        <td><select class="input" style="padding:4px 6px;width:auto" data-vis="${t.id}" aria-label="Visibilité de ${RT.esc(t.prenom)} ${RT.esc(t.nom)}">${[['publique', 'Public'], ['membres', 'Membres'], ['admin', 'Admins']].map(([v, l]) => `<option value="${v}" ${t.visibilite === v ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
        <td>${t.actif === false ? '<span class="pill ko">Suspendu</span>' : '<span class="pill ok">Actif</span>'}</td>
        <td><div class="row-acts"><button class="btn btn-ghost btn-sm" type="button" data-edit="${t.id}">Modifier</button><button class="btn btn-ghost btn-sm" type="button" data-toggle="${t.id}">${t.actif === false ? 'Réactiver' : 'Suspendre'}</button>${isAdmin() ? `<button class="btn btn-danger btn-sm" type="button" data-ask="del-${t.id}">Supprimer</button>` : ''}</div></td></tr>`).join('')}</tbody></table></div>`;
  }

  function vCv() {
    const nq = RT.norm(S.cq);
    const base = talentsInScope();
    const list = base.filter((t) => (!nq || RT.norm(`${t.prenom} ${t.nom} ${t.metier} ${t.ville}`).includes(nq)) && (!S.cf || (S.cf === 'avec' ? t.cv : !t.cv)));
    const withCv = base.filter((t) => t.cv).length;
    const del = S.confirm && S.confirm.startsWith('cv-') ? findT(S.confirm.slice(3)) : null;
    return `<p class="muted" style="max-width:72ch;margin-bottom:12px;font-size:.9rem">${withCv} CV sur ${base.length} profils. Dans la version cible, les fichiers sont stockés dans MinIO, servis par lien signé de courte durée, et chaque consultation est tracée.</p>
      <div class="toolbar"><input class="input grow" id="cv-q" type="search" placeholder="Rechercher un membre" value="${RT.esc(S.cq)}">
        <select class="input" id="cv-f"><option value="">Tous les profils</option><option value="avec"${S.cf === 'avec' ? ' selected' : ''}>Avec CV</option><option value="sans"${S.cf === 'sans' ? ' selected' : ''}>Sans CV</option></select>
        <span class="muted num" style="font-size:.85rem">${list.length} ligne${list.length > 1 ? 's' : ''}</span></div>
      ${del ? confirmBar(`Retirer le CV de ${RT.esc(del.prenom)} ${RT.esc(del.nom)} de la banque ?`, S.confirm) : ''}
      <input type="file" id="cv-file" accept="application/pdf" hidden>
      <div class="table-wrap"><table class="data"><thead><tr><th>Membre</th><th>Métier</th><th>Fichier</th><th>Déposé le</th><th>Taille</th><th>Consultations</th><th></th></tr></thead><tbody>
      ${list.slice(0, 100).map((t) => { const c = RT.cvInfo(t); return `<tr><td><b>${RT.esc(t.prenom)} ${RT.esc(t.nom)}</b><br><span class="muted" style="font-size:.75rem">${RT.esc(t.ville)}</span></td><td>${RT.esc(t.metier)}</td>
        ${c ? `<td class="mono" style="font-size:.75rem">${RT.esc(c.fichier)}</td><td class="num">${RT.dateFr(c.depose)}</td><td class="num">${c.taille} Ko</td><td class="num">${c.vues}</td>
        <td><div class="row-acts"><button class="btn btn-ghost btn-sm" type="button" data-cvview="${t.id}">Consulter</button><button class="btn btn-ghost btn-sm" type="button" data-cvup="${t.id}">Remplacer</button><button class="btn btn-danger btn-sm" type="button" data-ask="cv-${t.id}">Retirer</button></div></td>`
        : `<td colspan="4"><span class="pill wait">CV manquant</span></td><td><div class="row-acts"><button class="btn btn-ghost btn-sm" type="button" data-cvremind="${t.id}">Relancer</button><button class="btn btn-ghost btn-sm" type="button" data-cvup="${t.id}">Ajouter</button></div></td>`}</tr>`; }).join('')}</tbody></table></div>`;
  }

  function vEntrepreneurs() {
    const nq = RT.norm(S.eq);
    const list = RT.state.talents.filter((t) => t.entreprise && (!nq || RT.norm(`${t.entreprise.nom} ${t.prenom} ${t.nom} ${t.entreprise.activite}`).includes(nq)))
      .sort((a, b) => (b.entreprise.une - a.entreprise.une) || a.entreprise.nom.localeCompare(b.entreprise.nom, 'fr'));
    const une = RT.state.talents.filter((t) => t.entreprise && t.entreprise.une).length;
    return `<p class="muted" style="max-width:72ch;margin-bottom:12px;font-size:.9rem">Choisissez les entreprises mises en avant sur l'accueil et dans la vitrine. ${une} à la une ; l'accueil en affiche 6 au maximum.</p>
      <div class="toolbar"><input class="input grow" id="ae-q" type="search" placeholder="Entreprise, fondateur, activité" value="${RT.esc(S.eq)}"><span class="muted num" style="font-size:.85rem">${list.length} entreprises et projets</span></div>
      <div class="table-wrap"><table class="data"><thead><tr><th>Entreprise ou projet</th><th>Porté par</th><th>Stade</th><th>Sénégal</th><th>Recherche</th><th>À la une</th><th></th></tr></thead><tbody>
      ${list.map((t) => { const e = t.entreprise; return `<tr><td><b>${RT.esc(e.nom)}</b><br><span class="muted" style="font-size:.75rem">${RT.esc(e.type)}</span></td><td>${RT.esc(t.prenom)} ${RT.esc(t.nom)}<br><span class="muted" style="font-size:.75rem">${RT.esc(t.ville)}</span></td><td>${RT.esc(e.stade)}</td><td>${RT.esc(e.senegal)}</td><td style="font-size:.8rem">${RT.esc(e.besoins.join(', '))}</td>
        <td><button class="switch" type="button" role="switch" aria-checked="${!!e.une}" aria-label="Mettre ${RT.esc(e.nom)} à la une" data-une="${t.id}"></button></td>
        <td><button class="btn btn-ghost btn-sm" type="button" data-entedit="${t.id}">Modifier</button></td></tr>`; }).join('')}</tbody></table></div>`;
  }

  function vReferentiels() {
    const used = (pred) => RT.state.talents.filter(pred).length;
    return `<p class="muted" style="max-width:72ch;margin-bottom:12px;font-size:.9rem">Nomenclature à trois niveaux : domaine, filière, métier. Un élément utilisé par des profils ne peut pas être supprimé ; réaffectez d'abord les profils. Dans la version cible, chaque métier porte un code ISCO-08 et un code ROME.</p>
      <form class="toolbar panel" id="add-dom" style="padding:12px"><b style="font-size:.9rem">Nouveau domaine</b><input class="input grow" id="nd-lib" placeholder="Libellé du domaine" required><label class="sr" for="nd-col">Couleur</label><input id="nd-col" type="color" value="#4848C0" style="width:44px;height:36px;border:0;background:none"><button class="btn btn-primary btn-sm" type="submit">Ajouter</button></form>
      <div class="ref-tree" style="margin-top:12px">${RT.state.ref.domaines.map((d) => `<div class="panel">
        <div class="ref-item"><span style="display:flex;gap:8px;align-items:center"><i class="dot" style="background:${d.couleur}"></i><b>${RT.esc(d.libelle)}</b></span><span style="display:flex;gap:4px;align-items:center"><span class="mono muted" style="font-size:.7rem">${used((t) => t.domaine === d.code)}</span><button class="x" type="button" title="Supprimer le domaine" data-deldom="${d.code}">×</button></span></div>
        ${d.filieres.map((f, fi) => `<div class="ref-fil"><div class="ref-item"><b style="font-size:.82rem">${RT.esc(f.libelle)}</b><span style="display:flex;gap:4px;align-items:center"><span class="mono muted" style="font-size:.7rem">${used((t) => t.domaine === d.code && t.filiere === f.libelle)}</span><button class="x" type="button" title="Supprimer la filière" data-delfil="${d.code}|${fi}">×</button></span></div>
          <ul>${f.metiers.map((m, mi) => `<li class="ref-item"><span>${RT.esc(m)}</span><button class="x" type="button" title="Supprimer le métier" data-delmet="${d.code}|${fi}|${mi}">×</button></li>`).join('')}</ul>
          <form class="inline-add" data-addmet="${d.code}|${fi}"><input class="input" placeholder="Ajouter un métier" aria-label="Nouveau métier dans ${RT.esc(f.libelle)}"><button class="btn btn-ghost btn-sm" type="submit">+</button></form></div>`).join('')}
        <form class="inline-add" data-addfil="${d.code}" style="margin-top:12px"><input class="input" placeholder="Ajouter une filière" aria-label="Nouvelle filière dans ${RT.esc(d.libelle)}"><button class="btn btn-ghost btn-sm" type="submit">+</button></form>
      </div>`).join('')}</div>`;
  }

  function vComptes() {
    const pays = RT.geo.countries.filter((c) => c.iso2 && c.iso2 !== 'SN').map((c) => [c.iso2, c.nom]).sort((a, b) => a[1].localeCompare(b[1], 'fr'));
    return `<div class="dash-grid">
      <div class="panel chart-card span-3" style="padding-bottom:14px"><div><h3>Comptes de test</h3><p class="sub">Prototype ; dans la cible, les comptes sont gérés dans Keycloak</p></div>
        <table class="data" style="margin-top:8px"><thead><tr><th>Identifiant</th><th>Rôle</th></tr></thead><tbody>${Object.entries(RT.ACCOUNTS).map(([u, a]) => `<tr><td class="mono">${u}</td><td>${RT.esc(RT.ROLES[a.role].titre)}</td></tr>`).join('')}</tbody></table></div>
      <div class="panel chart-card span-3" style="padding-bottom:14px"><div><h3>Rôles et droits</h3><p class="sub">Ce que chaque rôle peut faire</p></div>
        <table class="data" style="margin-top:8px"><tbody>${Object.values(RT.ROLES).map((r) => `<tr><td><b>${RT.esc(r.titre || r.nom)}</b></td><td style="font-size:.8rem">${RT.esc(r.droits.join(' · '))}</td></tr>`).join('')}</tbody></table></div>
      <div class="panel chart-card span-6" style="padding-bottom:14px"><div><h3>Référent·es pays</h3><p class="sub">Ils vérifient les demandes des membres résidant dans leur pays</p></div>
        ${confirmBar('Retirer ce rôle de référent·e ?', S.confirm && S.confirm.startsWith('ref-') ? S.confirm : '__')}
        <table class="data" style="margin-top:8px"><thead><tr><th>Nom</th><th>Pays</th><th>Demandes en cours</th><th></th></tr></thead><tbody>
        ${RT.state.referents.map((r, i) => `<tr><td>${RT.esc(r.nom)}${r.login ? ` <span class="mono muted" style="font-size:.72rem">(${RT.esc(r.login)})</span>` : ''}</td><td>${RT.esc(RT.paysNom(r.pays))}</td><td class="num">${RT.state.demandes.filter((d) => d.pays === r.pays && !['activee', 'rejetee'].includes(d.etape)).length}</td><td><div class="row-acts"><button class="btn btn-danger btn-sm" type="button" data-ask="ref-${i}">Retirer</button></div></td></tr>`).join('')}
        </tbody></table>
        <form class="toolbar" id="add-ref" style="margin-top:12px"><input class="input grow" id="nr-nom" placeholder="Prénom Nom du ou de la référent·e" required><select class="input" id="nr-pays">${pays.map(([v, l]) => `<option value="${v}">${RT.esc(l)}</option>`).join('')}</select><button class="btn btn-primary btn-sm" type="submit">Nommer</button></form></div>
    </div>`;
  }

  function vJournal() {
    return RT.state.journal.length ? `<div class="log">${RT.state.journal.slice(0, 300).map((j) => `<div class="log-row"><span class="num muted">${new Date(j.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span><span>${RT.esc(j.qui)}</span><span>${RT.esc(j.action)} · <span class="muted">${RT.esc(j.cible)}</span></span></div>`).join('')}</div>`
      : '<div class="empty">Le journal est vide. Validez une demande, consultez un CV ou modifiez un profil : chaque action y sera tracée.</div>';
  }

  const VIEWS = { apercu: vApercu, demandes: vDemandes, profils: vProfils, cv: vCv, entrepreneurs: vEntrepreneurs, referentiels: vReferentiels, comptes: vComptes, journal: vJournal };

  function render() {
    if (!RT.$('#v-admin') || RT.$('#v-admin').hidden) return;
    if (!RT.isStaff()) { RT.$('#admin-tabs').innerHTML = ''; RT.$('#admin-body').innerHTML = '<div class="empty">Espace réservé aux référent·es et administrateur·rices. <a href="#connexion">Se connecter</a> (identifiant de test : admin / admin).</div>'; return; }
    const tabs = TABS.filter((t) => t[2] === 'all' || isAdmin());
    if (!tabs.some((t) => t[0] === S.tab)) S.tab = 'apercu';
    RT.$('#admin-title').textContent = isAdmin() ? 'Administration' : `Espace référent·e · ${RT.paysNom(refPays())}`;
    const open = RT.state.demandes.filter((d) => !['activee', 'rejetee'].includes(d.etape) && (isAdmin() || inScope(d.pays))).length;
    RT.$('#admin-tabs').innerHTML = tabs.map(([k, l]) => `<button role="tab" type="button" data-tab="${k}" aria-selected="${S.tab === k}">${l}${k === 'demandes' ? `<span class="count">${open}</span>` : ''}</button>`).join('');
    const focusId = document.activeElement && document.activeElement.id;
    RT.$('#admin-body').innerHTML = VIEWS[S.tab]();
    if (focusId && ['ap-q', 'cv-q', 'ae-q'].includes(focusId)) { const n = RT.$('#' + focusId); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }
  }

  // ------------------------------------------------------------------ actions
  function doConfirm(key) {
    if (key.startsWith('del-')) {
      const t = findT(key.slice(4)); RT.state.talents = RT.state.talents.filter((x) => x !== t);
      RT.log('Profil supprimé', who(t)); RT.toast('Profil supprimé.');
    } else if (key.startsWith('cv-')) {
      const t = findT(key.slice(3)); t.cv = false; delete t.cvInfo; RT.log('CV retiré de la banque', who(t)); RT.toast('CV retiré.');
    } else if (key.startsWith('ref-')) {
      const r = RT.state.referents.splice(+key.slice(4), 1)[0]; RT.log('Rôle de référent·e retiré', `${r.nom} · ${RT.paysNom(r.pays)}`);
    }
    S.confirm = null; after();
  }

  function refAction(el) {
    const ref = RT.state.ref;
    const count = (pred) => RT.state.talents.filter(pred).length;
    if (el.dataset.deldom) {
      const code = el.dataset.deldom, n = count((t) => t.domaine === code);
      if (n) return RT.toast(`Impossible : ${n} profil${n > 1 ? 's' : ''} rattaché${n > 1 ? 's' : ''} à ce domaine.`);
      const d = RT.dom(code); ref.domaines = ref.domaines.filter((x) => x.code !== code); RT.log('Domaine supprimé', d.libelle);
    }
    if (el.dataset.delfil) {
      const [code, fi] = el.dataset.delfil.split('|'); const d = RT.dom(code), f = d.filieres[+fi];
      const n = count((t) => t.domaine === code && t.filiere === f.libelle);
      if (n) return RT.toast(`Impossible : ${n} profil${n > 1 ? 's' : ''} dans cette filière.`);
      d.filieres.splice(+fi, 1); RT.log('Filière supprimée', `${d.libelle} › ${f.libelle}`);
    }
    if (el.dataset.delmet) {
      const [code, fi, mi] = el.dataset.delmet.split('|'); const f = RT.dom(code).filieres[+fi], m = f.metiers[+mi];
      const n = count((t) => t.metier === m && t.filiere === f.libelle);
      if (n) return RT.toast(`Impossible : ${n} profil${n > 1 ? 's' : ''} exerce${n > 1 ? 'nt' : ''} ce métier.`);
      f.metiers.splice(+mi, 1); RT.log('Métier supprimé', `${f.libelle} › ${m}`);
    }
    after(); RT.refreshReferentiels();
  }

  RT.initAdmin = () => {
    const body = RT.$('#admin-body');
    RT.$('#admin-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) { S.tab = b.dataset.tab; S.confirm = null; render(); } });
    body.addEventListener('click', (e) => {
      const q = (a) => e.target.closest(`[data-${a}]`);
      let b;
      if ((b = q('goto'))) { S.tab = b.dataset.goto; render(); return; }
      if ((b = q('move'))) return moveTo(RT.state.demandes.find((d) => d.id === b.dataset.move), b.dataset.to);
      if ((b = q('open'))) return openDemande(RT.state.demandes.find((d) => d.id === b.dataset.open));
      if ((b = q('edit'))) return openEdit(findT(b.dataset.edit));
      if ((b = q('entedit'))) return openEntEdit(findT(b.dataset.entedit));
      if ((b = q('toggle'))) { const t = findT(b.dataset.toggle); t.actif = t.actif === false; RT.log(t.actif ? 'Profil réactivé' : 'Profil suspendu', who(t)); return after(); }
      if ((b = q('ask'))) { S.confirm = b.dataset.ask; render(); body.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
      if ((b = q('confirm'))) return doConfirm(b.dataset.confirm);
      if (q('cancel')) { S.confirm = null; render(); return; }
      if ((b = q('une'))) { const t = findT(b.dataset.une); t.entreprise.une = !t.entreprise.une; RT.log(t.entreprise.une ? 'Entreprise mise à la une' : 'Entreprise retirée de la une', t.entreprise.nom); return after(); }
      if ((b = q('cvview'))) { const t = findT(b.dataset.cvview); RT.cvInfo(t).vues++; RT.log('Consultation de CV', who(t)); RT.save(); RT.openCV(t); return; }
      if ((b = q('cvremind'))) { const t = findT(b.dataset.cvremind); RT.log('Relance pour dépôt de CV', who(t)); RT.toast(`Relance envoyée à ${t.prenom} ${t.nom}.`); return; }
      if ((b = q('cvup'))) { S.upFor = b.dataset.cvup; RT.$('#cv-file').click(); return; }
      if ((b = e.target.closest('[data-deldom],[data-delfil],[data-delmet]'))) return refAction(b);
    });
    body.addEventListener('change', (e) => {
      const el = e.target;
      if (el.dataset.vis) { const t = findT(el.dataset.vis); t.visibilite = el.value; RT.log(`Visibilité passée à « ${el.options[el.selectedIndex].text} »`, who(t)); RT.toast('Visibilité mise à jour.'); return after(); }
      if (el.id === 'cv-file' && el.files[0]) {
        const t = findT(S.upFor), f = el.files[0];
        t.cv = true; t.cvInfo = { fichier: f.name, depose: RT.today(), taille: Math.max(1, Math.round(f.size / 1024)), vues: 0 };
        RT.log('CV déposé dans la banque', `${f.name} · ${who(t)}`); RT.toast('CV enregistré.'); el.value = ''; return after();
      }
      const map = { 'ap-pays': 'ppays', 'ap-dom': 'pdom', 'ap-etat': 'petat', 'cv-f': 'cf' };
      if (map[el.id]) { S[map[el.id]] = el.value; render(); }
    });
    body.addEventListener('input', (e) => {
      const map = { 'ap-q': 'pq', 'cv-q': 'cq', 'ae-q': 'eq' };
      if (map[e.target.id]) { S[map[e.target.id]] = e.target.value; render(); }
    });
    body.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target, ref = RT.state.ref;
      if (f.id === 'add-dom') {
        const lib = f.querySelector('#nd-lib').value.trim(); if (!lib) return;
        const code = RT.norm(lib).replace(/[^a-z]/g, '').slice(0, 3).toUpperCase() + (ref.domaines.length + 1);
        ref.domaines.push({ code, libelle: lib, couleur: f.querySelector('#nd-col').value, filieres: [] }); RT.log('Domaine ajouté', lib);
      } else if (f.dataset.addfil) {
        const v = f.querySelector('input').value.trim(); if (!v) return;
        RT.dom(f.dataset.addfil).filieres.push({ libelle: v, metiers: [] }); RT.log('Filière ajoutée', `${RT.dom(f.dataset.addfil).libelle} › ${v}`);
      } else if (f.dataset.addmet) {
        const v = f.querySelector('input').value.trim(); if (!v) return;
        const [code, fi] = f.dataset.addmet.split('|'); const fil = RT.dom(code).filieres[+fi]; fil.metiers.push(v); RT.log('Métier ajouté', `${fil.libelle} › ${v}`);
      } else if (f.id === 'add-ref') {
        const nom = f.querySelector('#nr-nom').value.trim(), p = f.querySelector('#nr-pays').value; if (!nom) return;
        RT.state.referents.push({ nom, pays: p, login: '' }); RT.log('Référent·e nommé·e', `${nom} · ${RT.paysNom(p)}`); RT.toast(`${nom} est référent·e pour ${RT.paysNom(p)}.`);
      } else return;
      after(); RT.refreshReferentiels();
    });
  };

  RT.showAdmin = render;
  RT.updateBadges = render;
  // les listes déroulantes des autres vues suivent les référentiels modifiés
  RT.refreshReferentiels = () => { if (RT.refreshTalents) RT.refreshTalents(); };
})();
