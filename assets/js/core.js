/* RISCE · Nos talents — noyau : données, rôles, géocodeur, utilitaires.
   Prototype statique : les données viennent de data/*.json ; les actions
   (validation, inscription…) sont conservées dans le navigateur (localStorage). */
(function () {
  const RT = (window.RT = {});
  const LS_KEY = 'risce-talents-demo-v2';

  // ---------------------------------------------------------------- utilitaires
  RT.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  RT.norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  RT.$ = (sel, root = document) => root.querySelector(sel);
  RT.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  RT.fmt = (n) => new Intl.NumberFormat('fr-FR').format(n);
  RT.dateFr = (iso) => new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  RT.today = () => new Date().toISOString().slice(0, 10);
  RT.countBy = (arr, fn) => arr.reduce((m, x) => { const ks = [].concat(fn(x)); ks.forEach((k) => m.set(k, (m.get(k) || 0) + 1)); return m; }, new Map());

  RT.toast = (msg) => {
    const t = RT.$('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(RT._tt); RT._tt = setTimeout(() => (t.hidden = true), 2800);
  };

  // ---------------------------------------------------------------- stockage local
  const ls = {
    get() { try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(LS_KEY, JSON.stringify(v)); } catch (e) { /* stockage indisponible : la démo reste en mémoire */ } },
    clear() { try { localStorage.removeItem(LS_KEY); } catch (e) {} },
  };

  RT.state = { role: 'visiteur', talents: [], demandes: [], journal: [], ref: null, referents: [], focus: null };

  RT.save = () => ls.set({ role: RT.state.role, talents: RT.state.talents, demandes: RT.state.demandes, journal: RT.state.journal, ref: RT.state.ref, referents: RT.state.referents });
  RT.resetDemo = () => { ls.clear(); location.hash = '#accueil'; location.reload(); };
  RT.log = (action, cible) => {
    RT.state.journal.unshift({ date: new Date().toISOString(), qui: RT.ROLES[RT.state.role].nom, action, cible });
    RT.save();
  };

  // ---------------------------------------------------------------- rôles de démonstration
  RT.ROLES = {
    visiteur: { nom: 'Visiteur', init: 'V', desc: 'Public, non connecté', droits: ['Carte et effectifs agrégés', 'Profils publics : prénom et initiale', 'Tableau de bord'] },
    membre: { nom: 'Aminata Sarr', init: 'AS', titre: 'Membre', desc: 'Membre actif·ve connecté·e', droits: ['Fiches complètes des membres', 'Consultation des CV', 'Contact via la plateforme'] },
    referent: { nom: 'Ousmane Diallo', init: 'OD', titre: 'Référent·e pays', pays: 'FR', desc: 'Référent de l\'antenne France', droits: ['Tout ce que voit un membre', 'Vérification des demandes de son pays', 'Demande de compléments'] },
    admin: { nom: 'Admin RISCE', init: 'AR', titre: 'Administrateur·rice', desc: 'Bureau / commission IT', droits: ['Validation finale des comptes', 'Gestion des profils et visibilités', 'Référentiels, journal, exports'] },
  };
  // Comptes de test (prototype uniquement ; la cible passe par Keycloak)
  RT.ACCOUNTS = {
    admin: { pwd: 'admin', role: 'admin' },
    referent: { pwd: 'referent', role: 'referent' },
    membre: { pwd: 'membre', role: 'membre' },
  };
  RT.isMember = () => RT.state.role !== 'visiteur';
  RT.isStaff = () => RT.state.role === 'referent' || RT.state.role === 'admin';

  // ---------------------------------------------------------------- référentiels
  RT.dom = (code) => RT.state.ref.domaines.find((d) => d.code === code);
  RT.paysNom = (iso2) => (RT.geo.countryByIso.get(iso2) || {}).nom || iso2;
  RT.ZONES = {
    'Europe': ['FR', 'BE', 'CH', 'LU', 'DE', 'NL', 'GB', 'ES', 'IT', 'PT', 'SE', 'IE', 'AT', 'DK', 'NO', 'FI', 'PL', 'GR', 'CZ'],
    'Amérique du Nord': ['CA', 'US', 'MX'],
    'Afrique': ['MA', 'TN', 'CI', 'GH', 'ML', 'MR', 'GA', 'RW', 'KE', 'ZA', 'NG', 'EG', 'GM', 'GN', 'CV', 'TG', 'BJ', 'BF', 'NE', 'CM', 'CD', 'ET', 'SN'],
    'Moyen-Orient': ['AE', 'QA', 'SA', 'TR'],
    'Asie-Pacifique': ['CN', 'JP', 'SG', 'AU', 'KR', 'IN'],
    'Amérique latine': ['BR', 'AR'],
  };
  RT.zoneOf = (iso2) => Object.keys(RT.ZONES).find((z) => RT.ZONES[z].includes(iso2)) || 'Autre';

  // couleur d'avatar stable par personne
  const AV = ['#4848C0', '#C92A84', '#1E4AA0', '#6448CC', '#9D2C7A', '#2E3A8C', '#7A3FB8', '#B8336F', '#3B5BB5', '#5B3E9E'];
  RT.avColor = (t) => AV[[...t.id].reduce((a, c) => a + c.charCodeAt(0), 0) % AV.length];
  RT.initials = (t) => (t.prenom[0] + t.nom[0]).toUpperCase();

  // ---------------------------------------------------------------- visibilité des profils
  RT.canSeeIdentity = (t) => t.visibilite === 'publique' || (RT.isMember() && t.visibilite !== 'admin') || RT.state.role === 'admin';
  RT.displayName = (t) => (RT.isMember() ? `${t.prenom} ${t.nom}` : `${t.prenom} ${t.nom[0]}.`);
  RT.visibleTalents = (list) => list.filter((t) => t.actif !== false && RT.canSeeIdentity(t));

  // ---------------------------------------------------------------- géocodeur local
  RT.geo = { countries: [], countryByIso: new Map(), cities: [] };

  function ringsOf(geom) {
    if (!geom) return [];
    if (geom.type === 'Polygon') return [geom.coordinates];
    if (geom.type === 'MultiPolygon') return geom.coordinates;
    return [];
  }
  function bboxOf(coords) {
    let w = 180, s = 90, e = -180, n = -90;
    coords.forEach(([x, y]) => { if (x < w) w = x; if (x > e) e = x; if (y < s) s = y; if (y > n) n = y; });
    return [w, s, e, n];
  }
  function polyArea(ring) {
    let a = 0; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
    return Math.abs(a / 2);
  }
  // Emprise d'un pays : celle de son territoire principal (évite qu'outre-mers ou îles éloignées
  // n'élargissent la vue), étendue aux autres polygones proches.
  function mainCentroid(geom) {
    const polys = ringsOf(geom); if (!polys.length) return null;
    const r = polys.reduce((a, p) => (polyArea(p[0]) > polyArea(a[0]) ? p : a))[0];
    let a = 0, x = 0, y = 0;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const f = r[j][0] * r[i][1] - r[i][0] * r[j][1]; a += f; x += (r[j][0] + r[i][0]) * f; y += (r[j][1] + r[i][1]) * f; }
    return a ? [x / (3 * a), y / (3 * a)] : null;
  }
  function countryExtent(geom) {
    const polys = ringsOf(geom);
    if (!polys.length) return null;
    const main = polys.reduce((a, p) => (polyArea(p[0]) > polyArea(a[0]) ? p : a));
    let bb = bboxOf(main[0]);
    const cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2, span = Math.max(bb[2] - bb[0], bb[3] - bb[1]);
    polys.forEach((p) => {
      const b = bboxOf(p[0]); const px = (b[0] + b[2]) / 2, py = (b[1] + b[3]) / 2;
      if (Math.abs(px - cx) < span * 1.2 + 4 && Math.abs(py - cy) < span * 1.2 + 4) bb = [Math.min(bb[0], b[0]), Math.min(bb[1], b[1]), Math.max(bb[2], b[2]), Math.max(bb[3], b[3])];
    });
    return bb;
  }

  RT.geo.search = (q, limit = 7) => {
    const nq = RT.norm(q);
    if (nq.length < 2) return [];
    const score = (name) => { const n = RT.norm(name); if (n === nq) return 0; if (n.startsWith(nq)) return 1; if (n.split(/[\s-]/).some((w) => w.startsWith(nq))) return 2; if (n.includes(nq)) return 3; return 9; };
    const out = [];
    RT.geo.countries.forEach((c) => { const s = Math.min(score(c.nom), c.iso2 && RT.norm(c.iso2) === nq ? 0 : 9); if (s < 9) out.push({ type: 'pays', s, ...c }); });
    RT.geo.cities.forEach((c) => { const s = score(c.nom); if (s < 9) out.push({ type: 'ville', s: s + 0.5, ...c }); });
    out.sort((a, b) => a.s - b.s || (b.n || 0) - (a.n || 0) || a.nom.localeCompare(b.nom, 'fr'));
    return out.slice(0, limit);
  };

  // Repli en ligne (version déployée) : Nominatim d'OpenStreetMap. Inopérant hors ligne.
  RT.geo.remote = async (q) => {
    try {
      const ctl = new AbortController(); setTimeout(() => ctl.abort(), 4000);
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=fr&q=${encodeURIComponent(q)}`, { signal: ctl.signal });
      const [hit] = await r.json();
      if (!hit) return null;
      const [s, n, w, e] = hit.boundingbox.map(Number);
      return { type: hit.addresstype === 'country' ? 'pays' : 'ville', nom: hit.name, lat: +hit.lat, lon: +hit.lon, bbox: [w, s, e, n], pays: (hit.address && hit.address.country_code || '').toUpperCase() };
    } catch (e) { return null; }
  };

  // ---------------------------------------------------------------- composant de suggestions
  RT.attachSuggest = (input, list, onPick) => {
    let items = [], idx = -1;
    const render = () => {
      if (!items.length) { list.hidden = true; return; }
      list.innerHTML = items.map((it, i) => `<button type="button" role="option" aria-selected="${i === idx}" data-i="${i}">
        <span>${RT.esc(it.nom)}${it.type === 'ville' ? ` <span style="opacity:.6">· ${RT.esc(RT.paysNom(it.pays))}</span>` : ''}</span>
        <small>${it.type === 'pays' ? 'PAYS' : 'VILLE'}${it.n ? ` · ${it.n} talent${it.n > 1 ? 's' : ''}` : ''}</small></button>`).join('');
      list.hidden = false;
    };
    input.addEventListener('input', () => { items = RT.geo.search(input.value); idx = -1; render(); });
    input.addEventListener('keydown', (e) => {
      if (list.hidden) return;
      if (e.key === 'ArrowDown') { idx = Math.min(items.length - 1, idx + 1); render(); e.preventDefault(); }
      if (e.key === 'ArrowUp') { idx = Math.max(0, idx - 1); render(); e.preventDefault(); }
      if (e.key === 'Escape') { list.hidden = true; }
      if (e.key === 'Enter' && idx >= 0) { e.preventDefault(); pick(items[idx]); }
    });
    list.addEventListener('mousedown', (e) => { const b = e.target.closest('button'); if (b) { e.preventDefault(); pick(items[+b.dataset.i]); } });
    input.addEventListener('blur', () => setTimeout(() => (list.hidden = true), 120));
    function pick(it) { input.value = it.nom; list.hidden = true; onPick(it); }
    return {
      async submit() {
        if (!input.value.trim()) return;
        const local = RT.geo.search(input.value, 1)[0];
        if (local) return pick(local);
        const remote = await RT.geo.remote(input.value);
        if (remote) { list.hidden = true; onPick(remote); }
        else RT.toast(`« ${input.value} » introuvable. Essayez un nom de pays ou de grande ville.`);
      },
    };
  };

  // ---------------------------------------------------------------- options de listes
  RT.fillSelect = (sel, values, allLabel, current) => {
    sel.innerHTML = `<option value="">${RT.esc(allLabel)}</option>` + values.map((v) => {
      const [val, lab] = Array.isArray(v) ? v : [v, v];
      return `<option value="${RT.esc(val)}"${val === current ? ' selected' : ''}>${RT.esc(lab)}</option>`;
    }).join('');
  };

  // ---------------------------------------------------------------- modale
  RT.modal = (html, onMount) => {
    const root = RT.$('#modal-root');
    root.innerHTML = `<div class="modal-back" role="dialog" aria-modal="true"><div class="modal">${html}</div></div>`;
    const back = root.firstElementChild;
    const close = () => { root.innerHTML = ''; document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    back.addEventListener('click', (e) => { if (e.target === back || e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', onKey);
    const x = back.querySelector('.modal-x'); if (x) x.focus();
    if (onMount) onMount(back, close);
    return close;
  };

  RT.avatarHtml = (t, size) => `<span class="avatar" style="background:${RT.avColor(t)}${size ? `;width:${size}px;height:${size}px` : ''}">${RT.initials(t)}</span>`;

  RT.openProfile = (t) => {
    const d = RT.dom(t.domaine);
    const member = RT.isMember();
    const contribs = t.contributions.map((c) => `<span class="chip">${RT.esc(c)}</span>`).join('');
    const comp = t.competences.map((c) => `<span class="chip">${RT.esc(c)}</span>`).join('');
    RT.modal(`
      <div class="modal-head">
        ${RT.avatarHtml(t)}
        <div style="min-width:0">
          <span class="eyebrow">${RT.esc(t.statut)} · depuis ${RT.dateFr(t.adhesion)}</span>
          <h2>${RT.esc(RT.displayName(t))}</h2>
          <p class="muted">${RT.esc(t.metier)} · ${RT.esc(t.ville)}, ${RT.esc(RT.paysNom(t.pays))}</p>
        </div>
        <button class="modal-x" type="button" data-close aria-label="Fermer">×</button>
      </div>
      <div class="modal-body">
        <dl class="dl">
          <dt>Domaine</dt><dd><span class="dot" style="background:${d.couleur}"></span> ${RT.esc(d.libelle)}</dd>
          <dt>Filière</dt><dd>${RT.esc(t.filiere)}</dd>
          <dt>Expérience</dt><dd class="num">${t.experience} ans · ${RT.esc(t.niveau)}</dd>
          <dt>Secteur</dt><dd>${RT.esc(t.secteur)}</dd>
          <dt>Langues</dt><dd>${RT.esc(t.langues.join(', '))}</dd>
          <dt>Compétences</dt><dd><div class="chips">${comp}</div></dd>
          <dt>Souhaite contribuer</dt><dd><div class="chips">${contribs}</div></dd>
        </dl>
        ${t.entreprise ? RT.entrepriseBlock(t) : ''}
        ${member ? `
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${t.cv ? '<button class="btn btn-primary" type="button" data-cv>Consulter le CV</button>' : '<span class="pill info">CV non déposé</span>'}
            <button class="btn btn-ghost" type="button" data-contact>Proposer une mise en relation</button>
          </div>`
        : `<p class="lock-note">Le nom complet, le CV et la mise en relation sont réservés aux membres connectés. <a href="#connexion" data-close>Se connecter</a> ou <a href="#rejoindre" data-close>rejoindre le réseau</a>.</p>`}
      </div>`, (back, close) => {
      const cv = back.querySelector('[data-cv]');
      if (cv) cv.addEventListener('click', () => { const ci = RT.cvInfo(t); if (ci) ci.vues++; RT.log('Consultation de CV', `${t.prenom} ${t.nom} (${t.id})`); RT.openCV(t); });
      const ct = back.querySelector('[data-contact]');
      if (ct) ct.addEventListener('click', () => { RT.log('Demande de mise en relation', `${t.prenom} ${t.nom} (${t.id})`); close(); RT.toast(`Demande de mise en relation transmise à ${t.prenom}.`); });
    });
  };

  RT.entrepriseBlock = (t) => {
    const e = t.entreprise;
    return `<div class="ent-block">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:start;flex-wrap:wrap">
        <div><span class="eyebrow">${RT.esc(e.type)}</span><h3 style="font-size:1.3rem">${RT.esc(e.nom)}</h3></div>
        <span class="pill info">${RT.esc(e.stade)}</span>
      </div>
      <p class="muted" style="font-size:.9rem">${RT.esc(e.activite.charAt(0).toUpperCase() + e.activite.slice(1))}${e.annee ? ` · depuis ${e.annee}` : ''} · ${RT.esc(e.senegal)}</p>
      <div class="chips"><span class="muted" style="font-size:.75rem;align-self:center">Recherche :</span>${e.besoins.map((x) => `<span class="chip need">${RT.esc(x)}</span>`).join('')}</div>
    </div>`;
  };

  // Métadonnées du CV (dans la cible : table talents.document + objet MinIO)
  RT.cvInfo = (t) => {
    if (!t.cv) return null;
    if (!t.cvInfo) {
      const seed = [...t.id].reduce((a, c) => a + c.charCodeAt(0), 0);
      t.cvInfo = { fichier: `CV_${RT.norm(t.prenom).replace(/\W+/g, '-')}_${RT.norm(t.nom).replace(/\W+/g, '-')}.pdf`, depose: t.adhesion, taille: 120 + (seed * 37) % 680, vues: seed % 14 };
    }
    return t.cvInfo;
  };

  RT.openCV = (t) => {
    const d = RT.dom(t.domaine);
    const debut = 2026 - t.experience;
    RT.modal(`
      <div class="modal-head">
        <div style="min-width:0"><span class="eyebrow">Aperçu de CV · document fictif</span><h2>${RT.esc(t.prenom)} ${RT.esc(t.nom)}</h2><p class="muted">${RT.esc(t.metier)}</p></div>
        <button class="modal-x" type="button" data-close aria-label="Fermer">×</button>
      </div>
      <div class="modal-body">
        <div class="cv-sheet">
          <div><h4>Profil</h4><p>${RT.esc(t.metier)} avec ${t.experience} ans d'expérience en ${RT.esc(t.filiere.toLowerCase())} (${RT.esc(d.libelle.toLowerCase())}), basé·e à ${RT.esc(t.ville)}. ${RT.esc(t.niveau)}.</p></div>
          <div><h4>Parcours</h4><p>${debut + Math.round(t.experience / 2)} – aujourd'hui · ${RT.esc(t.metier)} · ${RT.esc(t.secteur)}<br>${debut} – ${debut + Math.round(t.experience / 2)} · ${RT.esc(d.filieres[0].metiers[0])} · ${RT.esc(t.secteur === 'Start-up' ? 'Grand groupe' : 'PME / ETI')}</p></div>
          <div><h4>Compétences clés</h4><p>${RT.esc(t.competences.join(' · '))}</p></div>
          <div><h4>Langues</h4><p>${RT.esc(t.langues.join(' · '))}</p></div>
        </div>
        <p class="muted" style="font-size:.8rem">Dans la version cible, le CV déposé (PDF) est servi par un lien signé valable quelques minutes, et chaque consultation est inscrite au journal.</p>
      </div>`);
  };

  // ---------------------------------------------------------------- chargement
  RT.load = async () => {
    const [topo, topoLight, ref, talents, demandes] = await Promise.all(
      ['data/pays-50m.topo.json', 'data/pays-110m.topo.json', 'data/referentiels.json', 'data/talents.json', 'data/demandes.json'].map((u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u); return r.json(); }))
    );
    const saved = ls.get();
    RT.state.ref = saved && saved.ref ? saved.ref : ref;
    RT.state.referents = saved && saved.referents ? saved.referents : [{ nom: 'Ousmane Diallo', pays: 'FR', login: 'referent' }, { nom: 'Coumba Faye', pays: 'CA', login: '' }, { nom: 'Pape Mbaye', pays: 'US', login: '' }];
    RT.state.talents = saved && saved.talents ? saved.talents : talents;
    RT.state.demandes = saved && saved.demandes ? saved.demandes : demandes;
    RT.state.journal = saved && saved.journal ? saved.journal : [];
    RT.state.role = saved && saved.role && RT.ROLES[saved.role] ? saved.role : 'visiteur';

    const fc = topojson.feature(topo, topo.objects.countries);
    // Cartes planes : on retire l'Antarctique et on « déplie » les anneaux qui franchissent
    // l'antiméridien (Russie, Fidji), sinon ils tracent des bandes horizontales parasites.
    fc.features = fc.features.filter((f) => f.properties.nom !== 'Antarctique');
    fc.features.forEach((f) => {
      ringsOf(f.geometry).forEach((poly) => poly.forEach((ring) => {
        if (!ring.some((p, i) => i && Math.abs(p[0] - ring[i - 1][0]) > 180)) return;
        ring.forEach((p) => { if (p[0] < 0) p[0] += 360; if (p[0] > 180) p[0] = 180; });
      }));
    });
    RT.geo.featureCollection = fc;
    RT.geo.light = topojson.feature(topoLight, topoLight.objects.countries); // globe : géométries allégées
    fc.features.forEach((f) => {
      const bb = countryExtent(f.geometry);
      if (!bb) return;
      const ct = mainCentroid(f.geometry) || [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2];
      const c = { nom: f.properties.nom, iso2: f.properties.iso2, bbox: bb, lat: ct[1], lon: ct[0], feature: f };
      RT.geo.countries.push(c);
      if (c.iso2) RT.geo.countryByIso.set(c.iso2, c);
    });
    RT.geo.cities = ref.villes.map((v) => ({ ...v }));
    RT.refreshCounts();
  };

  // effectifs pour l'autocomplétion
  RT.refreshCounts = () => {
    const act = RT.state.talents.filter((t) => t.actif !== false);
    const byC = RT.countBy(act, (t) => t.pays), byV = RT.countBy(act, (t) => t.ville + '|' + t.pays);
    RT.geo.countries.forEach((c) => (c.n = byC.get(c.iso2) || 0));
    RT.geo.cities.forEach((c) => (c.n = byV.get(c.nom + '|' + c.pays) || 0));
  };

  // statistiques d'une emprise (pays ou ville) pour la fiche du globe et la carte
  RT.placeStats = (place) => {
    const act = RT.state.talents.filter((t) => t.actif !== false);
    const list = place.type === 'pays' ? act.filter((t) => t.pays === place.iso2)
      : act.filter((t) => t.ville === place.nom && (!place.pays || t.pays === place.pays));
    const doms = [...RT.countBy(list, (t) => t.domaine)].sort((a, b) => b[1] - a[1]).slice(0, 3);
    return { list, villes: new Set(list.map((t) => t.ville)).size, doms };
  };
})();
