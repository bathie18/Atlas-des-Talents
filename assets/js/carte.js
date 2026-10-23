/* Carte des talents : MapLibre GL JS, choroplèthe par pays + effectifs par ville. */
(function () {
  const RT = window.RT;
  let map = null, markers = [], selCity = null, selCountry = null, osmOn = false;
  const F = { dom: '', fil: '', contrib: '', lang: '' };
  const RAMP = ['#2A2463', '#53307F', '#82399A', '#B946A9', '#F060B4'];

  function filtered() {
    return RT.state.talents.filter((t) => t.actif !== false
      && (!F.dom || t.domaine === F.dom) && (!F.fil || t.filiere === F.fil)
      && (!F.contrib || t.contributions.includes(F.contrib)) && (!F.lang || t.langues.includes(F.lang)));
  }

  function countriesData(list) {
    const by = RT.countBy(list, (t) => t.pays);
    return {
      type: 'FeatureCollection',
      features: RT.geo.featureCollection.features.map((f) => ({ type: 'Feature', geometry: f.geometry, properties: { nom: f.properties.nom, iso2: f.properties.iso2, n: by.get(f.properties.iso2) || 0, sn: f.properties.iso2 === 'SN' ? 1 : 0 } })),
    };
  }

  function buildMap() {
    if (typeof maplibregl === 'undefined') { RT.$('#map').innerHTML = '<div class="globe-fallback">MapLibre GL JS n\'a pas pu être chargé.</div>'; return; }
    map = new maplibregl.Map({
      container: 'map',
      style: {
        version: 8,
        sources: {
          pays: { type: 'geojson', data: countriesData(filtered()) },
          osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 19, attribution: '© contributeurs OpenStreetMap' },
        },
        layers: [
          { id: 'ocean', type: 'background', paint: { 'background-color': '#120E33' } },
          { id: 'osm', type: 'raster', source: 'osm', layout: { visibility: 'none' }, paint: { 'raster-saturation': -0.5, 'raster-opacity': 0.9 } },
          { id: 'pays-fill', type: 'fill', source: 'pays', paint: {
            'fill-color': ['case', ['==', ['get', 'sn'], 1], '#E9E6FF',
              ['==', ['get', 'n'], 0], RAMP[0],
              ['interpolate', ['linear'], ['get', 'n'], 1, RAMP[1], 5, RAMP[2], 15, RAMP[3], 60, RAMP[4]]],
            'fill-opacity': 0.92 } },
          { id: 'pays-line', type: 'line', source: 'pays', paint: { 'line-color': '#433C96', 'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.4, 6, 1.2] } },
          { id: 'pays-sel', type: 'line', source: 'pays', filter: ['==', ['get', 'iso2'], '__'], paint: { 'line-color': '#FFFFFF', 'line-width': 2.2 } },
        ],
      },
      center: [0, 30], zoom: 1.4, minZoom: 1, maxZoom: 13, renderWorldCopies: false,
      attributionControl: { compact: true, customAttribution: 'Limites : Natural Earth (domaine public)' },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => { renderMarkers(); applyFocus(); });
    map.on('zoomend', () => { const m = map.getZoom() < 3 && !selCity ? 'pays' : 'ville'; if (m !== mode) renderMarkers(); });
    map.on('click', 'pays-fill', (e) => {
      if (e.originalEvent.target.closest && e.originalEvent.target.closest('.city-marker')) return;
      const p = e.features[0].properties;
      const c = RT.geo.countryByIso.get(p.iso2);
      if (c) selectCountry(c);
    });
    map.on('mousemove', 'pays-fill', () => (map.getCanvas().style.cursor = 'pointer'));
    map.on('mouseleave', 'pays-fill', () => (map.getCanvas().style.cursor = ''));
    window.addEventListener('resize', () => map && map.resize());
  }

  let mode = 'pays';
  function renderMarkers() {
    markers.forEach((m) => m.remove()); markers = [];
    mode = map.getZoom() < 3 && !selCity ? 'pays' : 'ville';
    const agg = new Map();
    filtered().forEach((t) => {
      const k = mode === 'pays' ? t.pays : t.ville + '|' + t.pays;
      if (!agg.has(k)) {
        const c = RT.geo.countryByIso.get(t.pays);
        agg.set(k, mode === 'pays' ? { type: 'pays', nom: c ? c.nom : t.pays, pays: t.pays, lat: c ? c.lat : t.lat, lon: c ? c.lon : t.lon, n: 0 }
          : { type: 'ville', nom: t.ville, pays: t.pays, lat: t.lat, lon: t.lon, n: 0 });
      }
      agg.get(k).n++;
    });
    [...agg.values()].sort((a, b) => a.n - b.n).forEach((c) => {
      const el = document.createElement('button');
      el.type = 'button'; el.className = 'city-marker' + ((selCity && selCity.nom === c.nom) || (selCountry && c.type === 'pays' && selCountry.iso2 === c.pays) ? ' on' : '');
      const s = Math.round(22 + Math.sqrt(c.n) * (mode === 'pays' ? 4 : 5));
      el.style.width = el.style.height = s + 'px';
      el.textContent = c.n; el.title = `${c.nom} : ${c.n} talent${c.n > 1 ? 's' : ''}`;
      el.setAttribute('aria-label', el.title);
      el.addEventListener('click', (e) => { e.stopPropagation(); if (c.type === 'pays') selectCountry(RT.geo.countryByIso.get(c.pays)); else selectCity(c, true); });
      markers.push(new maplibregl.Marker({ element: el }).setLngLat([c.lon, c.lat]).addTo(map));
    });
    if (map.getSource('pays')) map.getSource('pays').setData(countriesData(filtered()));
  }

  function selectCity(c, fly) {
    selCity = c; selCountry = null;
    map.setFilter('pays-sel', ['==', ['get', 'iso2'], '__']);
    if (fly) map.flyTo({ center: [c.lon, c.lat], zoom: Math.max(map.getZoom(), 7.5), speed: 1.4 });
    renderMarkers(); renderSide();
  }
  function selectCountry(c) {
    selCountry = c; selCity = null;
    map.setFilter('pays-sel', ['==', ['get', 'iso2'], c.iso2]);
    map.fitBounds([[c.bbox[0], c.bbox[1]], [c.bbox[2], c.bbox[3]]], { padding: 40, maxZoom: 7, duration: 1200 });
    renderMarkers(); renderSide();
  }
  function goTo(place) {
    if (place.type === 'pays' && place.iso2) return selectCountry(RT.geo.countryByIso.get(place.iso2) || place);
    if (place.bbox) map.fitBounds([[place.bbox[0], place.bbox[1]], [place.bbox[2], place.bbox[3]]], { padding: 40, maxZoom: 10 });
    selectCity({ nom: place.nom, pays: place.pays, lat: place.lat, lon: place.lon }, !place.bbox);
  }
  function applyFocus() {
    if (RT.state.focus && map) { goTo(RT.state.focus); RT.state.focus = null; } else renderSide();
  }

  function renderSide() {
    const box = RT.$('#map-results');
    const all = filtered();
    let scope = all, title = 'Monde entier', back = '';
    if (selCity) { scope = all.filter((t) => t.ville === selCity.nom && (!selCity.pays || t.pays === selCity.pays)); title = `${selCity.nom} · ${RT.paysNom(selCity.pays)}`; }
    else if (selCountry) { scope = all.filter((t) => t.pays === selCountry.iso2); title = selCountry.nom; }
    if (selCity || selCountry) back = '<button class="btn btn-ghost btn-sm" type="button" id="side-all">Tout le monde</button>';
    const visible = RT.visibleTalents(scope);
    const hidden = scope.length - visible.length;
    let html = `<div class="side-sum"><div><span class="eyebrow">Sélection</span><div style="font-weight:700">${RT.esc(title)}</div></div><div style="text-align:right"><b class="num" style="font-size:1.3rem">${scope.length}</b><div class="muted" style="font-size:.75rem">talent${scope.length > 1 ? 's' : ''}</div></div></div>${back}`;
    if (!selCity && !selCountry) {
      const top = [...RT.countBy(all, (t) => t.ville + '|' + t.pays)].sort((a, b) => b[1] - a[1]).slice(0, 10);
      html += '<span class="eyebrow" style="margin-top:6px">Principales villes</span>' + top.map(([k, n]) => {
        const [v, p] = k.split('|');
        return `<button class="domain-row" type="button" data-city="${RT.esc(k)}"><span class="lab"><span>${RT.esc(v)} <span class="muted" style="font-weight:400">· ${RT.esc(RT.paysNom(p))}</span></span></span><span class="n">${n}</span></button>`;
      }).join('') + '<p class="muted" style="font-size:.8rem">Cliquez sur un pays ou un cercle pour afficher les profils.</p>';
    } else {
      html += visible.slice(0, 60).map((t) => `<button class="result-card" type="button" data-id="${t.id}">${RT.avatarHtml(t)}<div style="min-width:0"><div class="who">${RT.esc(RT.displayName(t))}</div><div class="what">${RT.esc(t.metier)}<br>${RT.esc(t.ville)} · ${t.experience} ans</div></div></button>`).join('');
      if (visible.length > 60) html += `<p class="muted" style="font-size:.8rem">… et ${visible.length - 60} autres : affinez avec les filtres ou ouvrez l'annuaire.</p>`;
      if (hidden > 0) html += `<p class="lock-note">${hidden} profil${hidden > 1 ? 's' : ''} supplémentaire${hidden > 1 ? 's' : ''} visible${hidden > 1 ? 's' : ''} uniquement par les membres connectés.</p>`;
      if (!scope.length) html += '<p class="empty">Aucun talent ne correspond à ces filtres ici.</p>';
    }
    box.innerHTML = html;
    const a = RT.$('#side-all'); if (a) a.onclick = () => { selCity = selCountry = null; map.setFilter('pays-sel', ['==', ['get', 'iso2'], '__']); map.flyTo({ center: [0, 30], zoom: 1.4 }); renderMarkers(); renderSide(); };
    box.onclick = (e) => {
      const r = e.target.closest('[data-id]'); if (r) return RT.openProfile(RT.state.talents.find((t) => t.id === r.dataset.id));
      const c = e.target.closest('[data-city]'); if (c) { const [v, p] = c.dataset.city.split('|'); const t = all.find((x) => x.ville === v && x.pays === p); selectCity({ nom: v, pays: p, lat: t.lat, lon: t.lon }, true); }
    };
  }

  function legend() {
    RT.$('#map-legend').innerHTML = `<b>Talents par pays</b><div class="ramp">${RAMP.map((c) => `<i style="background:${c}"></i>`).join('')}</div><div class="ends"><span>0</span><span>60+</span></div><div style="display:flex;gap:6px;align-items:center"><span class="dot" style="background:#FFFFFF;border:2px solid #120E33;box-shadow:0 0 0 2px #F060B4;width:14px;height:14px"></span>Effectif par pays, puis par ville en zoomant</div>`;
  }

  function fillFilters() {
    const doms = RT.state.ref.domaines;
    RT.fillSelect(RT.$('#mf-dom'), doms.map((d) => [d.code, d.libelle]), 'Tous', F.dom);
    const fils = F.dom ? RT.dom(F.dom).filieres.map((f) => f.libelle) : [];
    RT.fillSelect(RT.$('#mf-fil'), fils, F.dom ? 'Toutes' : 'Choisir un domaine', F.fil);
    RT.$('#mf-fil').disabled = !F.dom;
    RT.fillSelect(RT.$('#mf-contrib'), RT.state.ref.contributions, 'Toutes', F.contrib);
    RT.fillSelect(RT.$('#mf-lang'), RT.state.ref.langues, 'Toutes', F.lang);
  }

  RT.initCarte = () => {
    fillFilters(); legend();
    ['dom', 'fil', 'contrib', 'lang'].forEach((k) => RT.$('#mf-' + k).addEventListener('change', (e) => {
      F[k] = e.target.value; if (k === 'dom') F.fil = '';
      fillFilters(); if (map) { renderMarkers(); renderSide(); }
    }));
    const s = RT.attachSuggest(RT.$('#map-q'), RT.$('#map-suggest'), (p) => map && goTo(p));
    RT.$('#map-q').addEventListener('keydown', (e) => { if (e.key === 'Enter' && RT.$('#map-suggest').hidden) { e.preventDefault(); s.submit(); } });
    RT.$('#map-world').onclick = () => { selCity = selCountry = null; if (map) { map.setFilter('pays-sel', ['==', ['get', 'iso2'], '__']); map.flyTo({ center: [0, 30], zoom: 1.4 }); renderMarkers(); renderSide(); } };
    RT.$('#map-osm').onclick = (e) => {
      const btn = e.currentTarget;
      if (osmOn) { osmOn = false; map.setLayoutProperty('osm', 'visibility', 'none'); map.setPaintProperty('pays-fill', 'fill-opacity', 0.92); btn.setAttribute('aria-pressed', 'false'); return; }
      const img = new Image();
      img.onload = () => { osmOn = true; map.setLayoutProperty('osm', 'visibility', 'visible'); map.setPaintProperty('pays-fill', 'fill-opacity', 0.45); btn.setAttribute('aria-pressed', 'true'); };
      img.onerror = () => RT.toast('Fond OpenStreetMap indisponible ici (connexion ou aperçu restreint).');
      img.src = 'https://tile.openstreetmap.org/0/0/0.png';
    };
  };

  RT.showCarte = () => {
    if (!map) buildMap(); else { map.resize(); applyFocus(); }
  };
  RT.refreshCarte = () => { if (map && map.loaded()) { renderMarkers(); renderSide(); } };
})();
