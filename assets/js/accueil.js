/* Accueil : globe 3D (globe.gl), recherche pays/ville et fiche de synthèse. */
(function () {
  const RT = window.RT;
  const DAKAR = { lat: 14.6937, lng: -17.4441 };
  let world = null, selected = null;

  function cityAggregates() {
    const m = new Map();
    RT.state.talents.filter((t) => t.actif !== false).forEach((t) => {
      const k = t.ville + '|' + t.pays;
      if (!m.has(k)) m.set(k, { nom: t.ville, pays: t.pays, lat: t.lat, lng: t.lon, n: 0 });
      m.get(k).n++;
    });
    return [...m.values()];
  }

  function altitudeFor(place) {
    if (place.type === 'ville') return 0.32;
    const [w, s, e, n] = place.bbox;
    const span = Math.max(e - w, (n - s) * 1.3);
    return Math.min(2.4, Math.max(0.35, span / 38));
  }


  // ------------------------------------------------------------------ rubans
  // Inspirés de l'emblème du RISCE : trois rubans enroulent le globe. Chaque
  // ruban est une ellipse découpée en deux : la moitié arrière (rose, comme
  // l'intérieur des rubans du logo) passe derrière le globe, la moitié avant
  // (dégradé bleu-violet) devant. Un tiret glisse le long de l'ellipse : le
  // ruban semble tourner autour de la Terre.
  const NS = 'http://www.w3.org/2000/svg';
  const BANDS = [
    { y: -0.56, rx: 1.06, ry: 0.22, w: 0.075, dash: '96 104' },
    { y: 0.0, rx: 1.3, ry: 0.3, w: 0.105, dash: '118 82' },
    { y: 0.56, rx: 1.02, ry: 0.2, w: 0.07, dash: '88 112' },
  ];
  function drawRibbons() {
    const el = RT.$('#globe'), back = RT.$('#ribbons-back'), front = RT.$('#ribbons-front');
    if (!world || !back) return;
    const w = el.clientWidth, h = el.clientHeight;
    [back, front].forEach((svg) => { svg.style.top = el.offsetTop + 'px'; svg.style.height = h + 'px'; svg.setAttribute('viewBox', `0 0 ${w} ${h}`); });
    const alt = world.pointOfView().altitude;
    const fov = ((world.camera().fov || 50) * Math.PI) / 180;
    const d = 100 * (1 + alt);
    const R = (h / 2) * Math.tan(Math.asin(Math.min(0.999, 100 / d))) / Math.tan(fov / 2);
    const op = Math.max(0, Math.min(1, (alt - 0.95) / 0.5));
    back.style.opacity = front.style.opacity = op;
    const cx = w / 2, cy = h / 2, tilt = -17;
    const defs = `<defs>
      <linearGradient id="rb-front" gradientUnits="userSpaceOnUse" x1="${-1.3 * R}" y1="0" x2="${1.3 * R}" y2="0">
        <stop offset="0" stop-color="#1E4AA0"/><stop offset=".55" stop-color="#4848C0"/><stop offset="1" stop-color="#6448CC"/></linearGradient>
      <linearGradient id="rb-back" gradientUnits="userSpaceOnUse" x1="${-1.3 * R}" y1="0" x2="${1.3 * R}" y2="0">
        <stop offset="0" stop-color="#F590CC"/><stop offset="1" stop-color="#F060B4"/></linearGradient>
      <clipPath id="rb-clip-front" clipPathUnits="userSpaceOnUse"><rect x="${-2 * R}" y="0" width="${4 * R}" height="${2 * R}"/></clipPath>
      <clipPath id="rb-clip-back" clipPathUnits="userSpaceOnUse"><rect x="${-2 * R}" y="${-2 * R}" width="${4 * R}" height="${2 * R}"/></clipPath></defs>`;
    const band = (b, i, side) => `<g transform="translate(${cx} ${cy}) rotate(${tilt}) translate(0 ${b.y * R})">
        <ellipse class="band b${i + 1}" cx="0" cy="0" rx="${b.rx * R}" ry="${b.ry * R}" pathLength="200" stroke-dasharray="${b.dash}"
          stroke="url(#rb-${side})" stroke-width="${b.w * R}" clip-path="url(#rb-clip-${side})" opacity="${side === 'back' ? '.8' : '.9'}"/>
        ${side === 'front' ? `<ellipse class="band b${i + 1}" cx="0" cy="0" rx="${b.rx * R}" ry="${b.ry * R - b.w * R * 0.42}" pathLength="200" stroke-dasharray="${b.dash}" stroke="#B8B0FF" stroke-opacity=".55" stroke-width="1.2" clip-path="url(#rb-clip-front)"/>` : ''}
      </g>`;
    back.innerHTML = defs + BANDS.map((b, i) => band(b, i, 'back')).join('');
    front.innerHTML = defs.replace(/rb-/g, 'rf-') + BANDS.map((b, i) => band(b, i, 'front')).join('').replace(/rb-/g, 'rf-');
  }

  RT.initGlobe = () => {
    const el = RT.$('#globe');
    if (typeof Globe !== 'function') { el.innerHTML = '<div class="globe-fallback">Le globe nécessite WebGL et une connexion pour charger globe.gl.</div>'; return; }
    const cities = cityAggregates();
    const byCountry = RT.countBy(RT.state.talents.filter((t) => t.actif !== false), (t) => t.pays);
    const maxC = Math.max(...byCountry.values());
    const feats = RT.geo.light.features.filter((f) => f.properties.nom !== 'Antarctique');

    try {
      world = Globe({ animateIn: true })(el)
        .backgroundColor('rgba(0,0,0,0)')
        .showAtmosphere(true).atmosphereColor('#8C7BFF').atmosphereAltitude(0.17)
        .hexPolygonsData(feats)
        .hexPolygonResolution(3)
        .hexPolygonMargin(0.42)
        .hexPolygonUseDots(false)
        .hexPolygonColor((f) => {
          const iso = f.properties.iso2;
          if (iso === 'SN') return '#FFFFFF';
          if (selected && selected.type === 'pays' && selected.iso2 === iso) return '#FFE3F3';
          const n = byCountry.get(iso) || 0;
          if (!n) return 'rgba(190,182,255,0.24)';
          return `rgba(240,96,180,${(0.4 + 0.6 * Math.sqrt(n / maxC)).toFixed(2)})`;
        })
        .hexPolygonLabel((f) => {
          const n = byCountry.get(f.properties.iso2) || 0;
          return `<div style="font:12px var(--f-body);background:#1B1650;color:#F3F0FF;padding:6px 9px;border-radius:8px;border:1px solid rgba(255,255,255,.15)"><b>${RT.esc(f.properties.nom)}</b><br>${n ? n + ' talent' + (n > 1 ? 's' : '') : 'Aucun talent référencé'}</div>`;
        })
        .onHexPolygonClick((f) => { const c = RT.geo.countryByIso.get(f.properties.iso2); if (c) focusPlace({ type: 'pays', ...c }); })
        .pointsData(cities)
        .pointLat('lat').pointLng('lng')
        .pointColor(() => '#FFFFFF')
        .pointAltitude((d) => 0.012 + Math.min(0.18, d.n / 260))
        .pointRadius((d) => 0.22 + Math.sqrt(d.n) * 0.09)
        .pointsMerge(false)
        .pointLabel((d) => `<div style="font:12px var(--f-body);background:#1B1650;color:#F3F0FF;padding:6px 9px;border-radius:8px;border:1px solid rgba(255,255,255,.15)"><b>${RT.esc(d.nom)}</b> · ${RT.esc(RT.paysNom(d.pays))}<br>${d.n} talent${d.n > 1 ? 's' : ''}</div>`)
        .onPointClick((d) => focusPlace({ type: 'ville', nom: d.nom, pays: d.pays, lat: d.lat, lon: d.lng }))
        .arcsData(cities.map((c) => ({ startLat: c.lat, startLng: c.lng, endLat: DAKAR.lat, endLng: DAKAR.lng, n: c.n })))
        .arcColor(() => ['rgba(157,140,255,0.55)', 'rgba(240,96,180,0.95)'])
        .arcStroke((d) => 0.18 + Math.min(0.5, d.n / 120))
        .arcDashLength(0.45).arcDashGap(1.4).arcDashInitialGap(() => Math.random() * 2)
        .arcDashAnimateTime(() => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 3200 + Math.random() * 2400))
        .arcAltitudeAutoScale(0.42)
        .ringsData([{ lat: DAKAR.lat, lng: DAKAR.lng, dakar: true }])
        .ringColor((d) => (d.dakar ? (t) => `rgba(240,96,180,${1 - t})` : (t) => `rgba(255,255,255,${1 - t})`))
        .ringMaxRadius((d) => (d.dakar ? 4 : 6)).ringPropagationSpeed(2.2).ringRepeatPeriod(1300)
        .labelsData([{ lat: DAKAR.lat, lng: DAKAR.lng, text: 'Dakar' }])
        .labelColor(() => '#FFD6EE').labelSize(0.9).labelDotRadius(0.35).labelAltitude(0.012).labelResolution(2);

      const mat = world.globeMaterial();
      mat.color.set('#1B1650'); mat.emissive && mat.emissive.set('#0A0826'); mat.shininess = 6;
      const ctl = world.controls();
      ctl.autoRotate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
      ctl.autoRotateSpeed = 0.35; ctl.enableZoom = true; ctl.minDistance = 120; ctl.maxDistance = 650;
      el.addEventListener('pointerdown', () => (ctl.autoRotate = false), { once: true });
      world.pointOfView({ lat: 24, lng: -16, altitude: innerWidth < 600 ? 2.4 : 1.7 });
      const size = () => { world.width(el.clientWidth).height(el.clientHeight); drawRibbons(); };
      world.onZoom(() => drawRibbons());
      size(); addEventListener('resize', size);
      RT._world = world;
    } catch (e) {
      console.error(e);
      el.innerHTML = '<div class="globe-fallback">Votre navigateur ne permet pas d\'afficher le globe 3D (WebGL indisponible).</div>';
      world = null;
    }
  };

  function focusPlace(place) {
    selected = place;
    if (world) {
      world.controls().autoRotate = false;
      world.pointOfView({ lat: place.lat, lng: place.lon, altitude: altitudeFor(place) }, 1600);
      const fn = world.hexPolygonColor(); world.hexPolygonColor((f) => fn(f)); // rafraîchit la surbrillance
      world.ringsData([{ lat: 14.6937, lng: -17.4441, dakar: true }, { lat: place.lat, lng: place.lon }]);
    }
    renderPlaceCard(place);
  }
  RT.focusOnGlobe = focusPlace;

  function renderPlaceCard(place) {
    const card = RT.$('#place-card');
    const st = RT.placeStats(place);
    const n = st.list.length;
    const max = st.doms.length ? st.doms[0][1] : 1;
    const sub = place.type === 'pays' ? 'Pays' : `Ville · ${RT.esc(RT.paysNom(place.pays))}`;
    card.innerHTML = `
      <button class="close" type="button" aria-label="Fermer">×</button>
      <span class="eyebrow" style="color:#C9C3F0">${sub}</span>
      <h3>${RT.esc(place.nom)}</h3>
      ${n ? `
        <div class="stats">
          <div><b class="num">${n}</b><span>talent${n > 1 ? 's' : ''}</span></div>
          ${place.type === 'pays' ? `<div><b class="num">${st.villes}</b><span>ville${st.villes > 1 ? 's' : ''}</span></div>` : ''}
          <div><b class="num">${new Set(st.list.map((t) => t.domaine)).size}</b><span>domaines</span></div>
        </div>
        <div class="bars">${st.doms.map(([c, k]) => `<div class="bar"><div>${RT.esc(RT.dom(c).libelle)}<i style="width:${(k / max) * 100}%"></i></div><span class="num">${k}</span></div>`).join('')}</div>
        <div class="actions">
          <button class="btn btn-gold btn-sm" type="button" data-go="carte">Voir sur la carte</button>
          <button class="btn btn-sm" style="background:rgba(255,255,255,.12);color:#F3F0FF" type="button" data-go="talents">Voir les profils</button>
        </div>`
      : `<p style="color:#C9C3F0;font-size:.85rem">Aucun talent référencé ici pour le moment. Vous y vivez ? Votre profil serait le premier.</p>
         <div class="actions"><a class="btn btn-gold btn-sm" href="#rejoindre">Déposer mon profil</a></div>`}`;
    card.hidden = false;
    card.querySelector('.close').onclick = () => { card.hidden = true; };
    card.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => {
      RT.state.focus = place;
      if (b.dataset.go === 'talents') RT.presetDirectory(place);
      location.hash = '#' + b.dataset.go;
    }));
  }

  RT.initHome = () => {
    const act = RT.state.talents.filter((t) => t.actif !== false);
    const pays = new Set(act.map((t) => t.pays)).size, villes = new Set(act.map((t) => t.ville)).size;
    RT.$('#home-kpis').innerHTML = [
      [act.length, 'talents référencés'], [pays, 'pays de résidence'], [villes, 'villes'], [RT.state.ref.domaines.length, 'domaines d\'expertise'],
    ].map(([n, l]) => `<div class="kpi"><b>${RT.fmt(n)}</b><span>${l}</span></div>`).join('');

    const byDom = RT.countBy(act, (t) => t.domaine);
    RT.$('#home-domains').innerHTML = RT.state.ref.domaines.slice().sort((a, b) => (byDom.get(b.code) || 0) - (byDom.get(a.code) || 0)).slice(0, 8)
      .map((d) => `<button class="domain-row" type="button" data-dom="${d.code}"><span class="lab"><i class="dot" style="background:${d.couleur}"></i><span>${RT.esc(d.libelle)}</span></span><span class="n">${byDom.get(d.code) || 0}</span></button>`).join('');
    RT.$('#home-domains').onclick = (e) => { const b = e.target.closest('[data-dom]'); if (b) { RT.presetDirectory({ domaine: b.dataset.dom }); location.hash = '#talents'; } };

    const quick = ['France', 'Canada', 'États-Unis', 'Montréal', 'Dubaï', 'Abidjan', 'Londres'];
    RT.$('#home-quick').innerHTML = quick.map((q) => `<button type="button">${q}</button>`).join('');
    RT.$('#home-quick').onclick = (e) => { const b = e.target.closest('button'); if (b) { const hit = RT.geo.search(b.textContent, 1)[0]; if (hit) { RT.$('#home-q').value = hit.nom; focusPlace(hit); } } };

    const s = RT.attachSuggest(RT.$('#home-q'), RT.$('#home-suggest'), focusPlace);
    RT.$('#home-search').addEventListener('submit', (e) => { e.preventDefault(); s.submit(); });
    RT.initGlobe();
  };
})();
