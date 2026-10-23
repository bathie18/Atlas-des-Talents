/* Annuaire « Trouver un talent » : recherche plein texte + recherche avancée. */
(function () {
  const RT = window.RT;
  const PAGE = 24;
  const D = { q: '', dom: '', fil: '', met: '', pays: '', ville: '', sect: '', niv: '', exp: 0, lang: '', contrib: '', cv: false, sort: 'pertinence', page: 1 };

  RT.presetDirectory = (p) => {
    Object.assign(D, { q: '', dom: '', fil: '', met: '', pays: '', ville: '', page: 1 });
    if (p.domaine) D.dom = p.domaine;
    if (p.type === 'pays') D.pays = p.iso2;
    if (p.type === 'ville') { D.pays = p.pays || ''; D.ville = p.nom; }
    if (RT._dirReady) { syncControls(); render(); }
  };

  function haystack(t) {
    const d = RT.dom(t.domaine);
    return RT.norm([RT.isMember() ? t.prenom + ' ' + t.nom : t.prenom, t.metier, t.filiere, d.libelle, t.competences.join(' '), t.ville, RT.paysNom(t.pays), t.secteur, t.langues.join(' '), t.contributions.join(' ')].join(' '));
  }

  function results() {
    const terms = RT.norm(D.q).split(/\s+/).filter(Boolean);
    let list = RT.state.talents.filter((t) => t.actif !== false
      && (!D.dom || t.domaine === D.dom) && (!D.fil || t.filiere === D.fil) && (!D.met || t.metier === D.met)
      && (!D.pays || t.pays === D.pays) && (!D.ville || t.ville === D.ville) && (!D.sect || t.secteur === D.sect)
      && (!D.niv || t.niveau === D.niv) && t.experience >= D.exp && (!D.lang || t.langues.includes(D.lang))
      && (!D.contrib || t.contributions.includes(D.contrib)) && (!D.cv || t.cv));
    let scored = list.map((t) => {
      if (!terms.length) return [t, 1];
      const h = haystack(t); let s = 0;
      for (const w of terms) { if (!h.includes(w)) return [t, 0]; s += RT.norm(t.metier).includes(w) ? 3 : RT.norm(t.competences.join(' ')).includes(w) ? 2 : 1; }
      return [t, s];
    }).filter(([, s]) => s > 0);
    const by = { pertinence: (a, b) => b[1] - a[1] || b[0].experience - a[0].experience, recent: (a, b) => b[0].adhesion.localeCompare(a[0].adhesion), exp: (a, b) => b[0].experience - a[0].experience, nom: (a, b) => a[0].nom.localeCompare(b[0].nom, 'fr') };
    scored.sort(by[D.sort]);
    return scored.map(([t]) => t);
  }

  function syncControls() {
    const ref = RT.state.ref;
    RT.fillSelect(RT.$('#f-dom'), ref.domaines.map((d) => [d.code, d.libelle]), 'Tous les domaines', D.dom);
    const fils = D.dom ? RT.dom(D.dom).filieres : ref.domaines.flatMap((d) => d.filieres);
    RT.fillSelect(RT.$('#f-fil'), fils.map((f) => f.libelle), 'Toutes les filières', D.fil);
    const mets = (D.fil ? fils.filter((f) => f.libelle === D.fil) : fils).flatMap((f) => f.metiers);
    RT.fillSelect(RT.$('#f-met'), [...new Set(mets)].sort((a, b) => a.localeCompare(b, 'fr')), 'Tous les métiers', D.met);
    const act = RT.state.talents.filter((t) => t.actif !== false);
    const pays = [...new Set(act.map((t) => t.pays))].map((p) => [p, RT.paysNom(p)]).sort((a, b) => a[1].localeCompare(b[1], 'fr'));
    RT.fillSelect(RT.$('#f-pays'), pays, 'Tous les pays', D.pays);
    const villes = [...new Set(act.filter((t) => !D.pays || t.pays === D.pays).map((t) => t.ville))].sort((a, b) => a.localeCompare(b, 'fr'));
    RT.fillSelect(RT.$('#f-ville'), villes, 'Toutes les villes', D.ville);
    RT.fillSelect(RT.$('#f-sect'), ref.secteurs, 'Tous les secteurs', D.sect);
    RT.fillSelect(RT.$('#f-niv'), ref.niveaux, 'Tous niveaux', D.niv);
    RT.fillSelect(RT.$('#f-lang'), ref.langues, 'Toutes', D.lang);
    RT.fillSelect(RT.$('#f-contrib'), ref.contributions, 'Indifférent', D.contrib);
    RT.$('#f-exp').value = D.exp; RT.$('#f-exp-v').textContent = D.exp;
    RT.$('#f-cv').checked = D.cv; RT.$('#dir-q').value = D.q; RT.$('#dir-sort').value = D.sort;
  }

  function card(t) {
    const d = RT.dom(t.domaine);
    return `<button class="panel tcard" type="button" data-id="${t.id}">
      <div class="top">${RT.avatarHtml(t)}<div style="min-width:0"><div class="who">${RT.esc(RT.displayName(t))}</div><div class="where">${RT.esc(t.ville)} · ${RT.esc(RT.paysNom(t.pays))}</div></div></div>
      <div class="what">${RT.esc(t.metier)}</div>
      <div class="chips"><span class="chip"><i class="dot" style="background:${d.couleur}"></i>${RT.esc(t.filiere)}</span></div>
      <div class="foot"><span class="num">${t.experience} ans d'exp.</span><span>${t.cv ? (RT.isMember() ? 'CV disponible' : 'CV · membres') : 'Sans CV'}</span></div>
    </button>`;
  }

  function render() {
    const all = results();
    const vis = RT.visibleTalents(all);
    const hidden = all.length - vis.length;
    const pages = Math.max(1, Math.ceil(vis.length / PAGE));
    D.page = Math.min(D.page, pages);
    RT.$('#dir-count').innerHTML = `<b class="num">${vis.length}</b> profil${vis.length > 1 ? 's' : ''} affiché${vis.length > 1 ? 's' : ''}` + (hidden ? ` · ${hidden} autre${hidden > 1 ? 's' : ''} réservé${hidden > 1 ? 's' : ''} aux membres connectés` : '');
    RT.$('#dir-cards').innerHTML = vis.length ? vis.slice((D.page - 1) * PAGE, D.page * PAGE).map(card).join('') : '<div class="empty" style="grid-column:1/-1">Aucun profil ne correspond. Élargissez la recherche ou retirez un filtre.</div>';
    RT.$('#dir-pager').innerHTML = pages > 1 ? `<button class="btn btn-ghost btn-sm" data-p="${D.page - 1}" ${D.page === 1 ? 'disabled' : ''}>Précédent</button><span class="num">Page ${D.page} / ${pages}</span><button class="btn btn-ghost btn-sm" data-p="${D.page + 1}" ${D.page === pages ? 'disabled' : ''}>Suivant</button>` : '';
    RT.$('#dir-export').hidden = !RT.isStaff();
  }

  function exportCsv() {
    const rows = RT.visibleTalents(results());
    const cols = ['id', 'prenom', 'nom', 'metier', 'filiere', 'domaine', 'ville', 'pays', 'experience', 'secteur', 'langues', 'contributions'];
    const csv = [cols.join(';')].concat(rows.map((t) => cols.map((c) => `"${String(Array.isArray(t[c]) ? t[c].join(', ') : t[c]).replace(/"/g, '""')}"`).join(';'))).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'talents-risce-extraction.csv'; a.click();
    RT.log('Export CSV de l\'annuaire', `${rows.length} profils`);
    RT.toast(`${rows.length} profils exportés.`);
  }

  RT.initTalents = () => {
    syncControls(); render(); RT._dirReady = true;
    const bind = (id, key, num) => RT.$(id).addEventListener('change', (e) => {
      D[key] = num ? +e.target.value : e.target.value; D.page = 1;
      if (key === 'dom') { D.fil = ''; D.met = ''; } if (key === 'fil') D.met = ''; if (key === 'pays') D.ville = '';
      syncControls(); render();
    });
    bind('#f-dom', 'dom'); bind('#f-fil', 'fil'); bind('#f-met', 'met'); bind('#f-pays', 'pays'); bind('#f-ville', 'ville');
    bind('#f-sect', 'sect'); bind('#f-niv', 'niv'); bind('#f-lang', 'lang'); bind('#f-contrib', 'contrib'); bind('#dir-sort', 'sort');
    RT.$('#f-exp').addEventListener('input', (e) => { D.exp = +e.target.value; RT.$('#f-exp-v').textContent = D.exp; D.page = 1; render(); });
    RT.$('#f-cv').addEventListener('change', (e) => { D.cv = e.target.checked; D.page = 1; render(); });
    RT.$('#dir-form').addEventListener('submit', (e) => { e.preventDefault(); D.q = RT.$('#dir-q').value; D.page = 1; render(); });
    RT.$('#dir-q').addEventListener('input', (e) => { if (!e.target.value) { D.q = ''; render(); } });
    RT.$('#f-reset').onclick = () => { Object.assign(D, { q: '', dom: '', fil: '', met: '', pays: '', ville: '', sect: '', niv: '', exp: 0, lang: '', contrib: '', cv: false, page: 1 }); syncControls(); render(); };
    RT.$('#dir-cards').onclick = (e) => { const c = e.target.closest('[data-id]'); if (c) RT.openProfile(RT.state.talents.find((t) => t.id === c.dataset.id)); };
    RT.$('#dir-pager').onclick = (e) => { const b = e.target.closest('[data-p]'); if (b && !b.disabled) { D.page = +b.dataset.p; render(); RT.$('#v-talents').scrollIntoView({ behavior: 'smooth' }); } };
    RT.$('#dir-export').onclick = exportCsv;
  };
  RT.refreshTalents = () => { if (RT._dirReady) { syncControls(); render(); } };
})();
