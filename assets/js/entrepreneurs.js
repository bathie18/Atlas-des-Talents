/* Vitrine des entrepreneurs : entreprises et projets portés par les talents de la diaspora.
   Les entreprises « à la une » sont choisies par l'administration (back-office). */
(function () {
  const RT = window.RT;
  const E = { q: '', type: '', stade: '', besoin: '', sn: '' };

  const all = () => RT.state.talents.filter((t) => t.actif !== false && t.entreprise && t.visibilite !== 'admin');

  function card(t, big) {
    const e = t.entreprise, d = RT.dom(t.domaine);
    return `<button class="panel une-card" type="button" data-id="${t.id}">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:start"><span class="tag-ent">◆ ${RT.esc(e.type)}</span>${e.une && !big ? '<span class="pill ok">À la une</span>' : ''}</div>
      <h3>${RT.esc(e.nom)}</h3>
      <p class="desc">${RT.esc(e.activite.charAt(0).toUpperCase() + e.activite.slice(1))}</p>
      <div class="chips"><span class="chip"><i class="dot" style="background:${d.couleur}"></i>${RT.esc(d.libelle)}</span><span class="chip">${RT.esc(e.stade)}</span>${e.senegal !== 'Pas encore' ? `<span class="chip need">${RT.esc(e.senegal)}</span>` : ''}</div>
      <div class="who">${RT.avatarHtml(t, 32)}<div style="min-width:0"><b>${RT.esc(RT.displayName(t))}</b><div class="muted" style="font-size:.75rem">${RT.esc(t.ville)} · ${RT.esc(RT.paysNom(t.pays))}</div></div></div>
      ${big ? `<div class="chips"><span class="muted" style="font-size:.72rem;align-self:center">Recherche :</span>${e.besoins.map((b) => `<span class="chip">${RT.esc(b)}</span>`).join('')}</div>` : ''}
    </button>`;
  }

  RT.renderUne = (sel) => {
    const box = RT.$(sel); if (!box) return;
    const une = all().filter((t) => t.entreprise.une).slice(0, 6);
    box.innerHTML = une.length ? une.map((t) => card(t, true)).join('') : '<div class="empty" style="grid-column:1/-1">Aucune entreprise à la une. Les administrateurs choisissent les entreprises mises en avant depuis le back-office.</div>';
    box.onclick = (ev) => { const c = ev.target.closest('[data-id]'); if (c) RT.openProfile(RT.state.talents.find((t) => t.id === c.dataset.id)); };
  };

  function render() {
    const list = all();
    const sn = list.filter((t) => t.entreprise.senegal === 'Activité au Sénégal').length;
    const proj = list.filter((t) => t.entreprise.senegal === "Projet d'implantation au Sénégal").length;
    RT.$('#ent-kpis').innerHTML = [[list.length, 'entrepreneurs et indépendants'], [sn, 'déjà actifs au Sénégal'], [proj, 'projets d\'implantation au Sénégal'], [new Set(list.map((t) => t.pays)).size, 'pays de résidence']]
      .map(([n, l]) => `<div><b class="num">${n}</b><span>${l}</span></div>`).join('');
    RT.renderUne('#ent-une');
    const nq = RT.norm(E.q);
    const res = list.filter((t) => {
      const e = t.entreprise;
      return (!E.type || e.type === E.type) && (!E.stade || e.stade === E.stade) && (!E.besoin || e.besoins.includes(E.besoin)) && (!E.sn || e.senegal === E.sn)
        && (!nq || RT.norm(`${e.nom} ${e.activite} ${t.metier} ${RT.dom(t.domaine).libelle} ${t.ville}`).includes(nq));
    }).sort((a, b) => (b.entreprise.une - a.entreprise.une) || a.entreprise.nom.localeCompare(b.entreprise.nom, 'fr'));
    RT.$('#ent-count').innerHTML = `<b class="num">${res.length}</b> entreprise${res.length > 1 ? 's' : ''} ou projet${res.length > 1 ? 's' : ''}`;
    RT.$('#ent-cards').innerHTML = res.length ? res.map((t) => card(t, false)).join('') : '<div class="empty" style="grid-column:1/-1">Aucun résultat. Retirez un filtre.</div>';
  }

  RT.initEntrepreneurs = () => {
    const en = RT.state.ref.entrepreneuriat;
    RT.fillSelect(RT.$('#e-type'), en.types, 'Tous');
    RT.fillSelect(RT.$('#e-stade'), en.stades, 'Tous');
    RT.fillSelect(RT.$('#e-besoin'), en.besoins, 'Tout');
    RT.fillSelect(RT.$('#e-sn'), ['Activité au Sénégal', "Projet d'implantation au Sénégal", 'Pas encore'], 'Indifférent');
    ['type', 'stade', 'besoin', 'sn'].forEach((k) => RT.$('#e-' + k).addEventListener('change', (ev) => { E[k] = ev.target.value; render(); }));
    RT.$('#e-q').addEventListener('input', (ev) => { E.q = ev.target.value; render(); });
    RT.$('#ent-cards').onclick = (ev) => { const c = ev.target.closest('[data-id]'); if (c) RT.openProfile(RT.state.talents.find((t) => t.id === c.dataset.id)); };
    render();
    RT.renderUne('#home-une');
  };
  RT.refreshEntrepreneurs = () => { if (RT.$('#ent-kpis').innerHTML) { render(); RT.renderUne('#home-une'); } };
})();
