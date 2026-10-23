/* Tableau de bord : Apache ECharts. Une seule teinte par graphique (magnitude),
   choroplèthe séquentielle, aucun double axe ; couleurs lues dans les jetons CSS. */
(function () {
  const RT = window.RT;
  const T = { dom: '', zone: '', contrib: '' };
  const charts = {};
  let ready = false;

  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  function data() {
    return RT.state.talents.filter((t) => t.actif !== false && (!T.dom || t.domaine === T.dom) && (!T.zone || RT.zoneOf(t.pays) === T.zone) && (!T.contrib || t.contributions.includes(T.contrib)));
  }

  function base() {
    const ink = css('--ink'), muted = css('--muted'), line = css('--line'), surf = css('--surface');
    return {
      ink, muted, line, surf, accent: css('--accent'),
      common: {
        textStyle: { fontFamily: 'Hanken Grotesk, system-ui, sans-serif', color: ink },
        tooltip: { backgroundColor: surf, borderColor: line, textStyle: { color: ink, fontSize: 12 }, extraCssText: 'border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,.12)' },
        animationDuration: 500,
      },
    };
  }

  function chart(id) {
    const el = RT.$('#' + id);
    if (!charts[id]) charts[id] = echarts.init(el, null, { renderer: 'svg' });
    return charts[id];
  }

  function hbar(id, pairs, b, name) {
    const rows = pairs.slice().reverse();
    chart(id).setOption({
      ...b.common,
      tooltip: { ...b.common.tooltip, trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(127,127,127,.08)' } }, formatter: (p) => `${RT.esc(p[0].name)}<br><b>${p[0].value}</b> ${name}` },
      grid: { left: 8, right: 34, top: 6, bottom: 6, containLabel: true },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: b.line, opacity: 0.6 } }, axisLabel: { color: b.muted, fontSize: 10 } },
      yAxis: { type: 'category', data: rows.map((r) => r[0]), axisTick: { show: false }, axisLine: { lineStyle: { color: b.line } }, axisLabel: { color: b.ink, fontSize: 11, width: 150, overflow: 'truncate' } },
      series: [{ type: 'bar', data: rows.map((r) => r[1]), barMaxWidth: 14, itemStyle: { color: b.accent, borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right', color: b.muted, fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' } }],
    }, true);
  }

  function render() {
    if (typeof echarts === 'undefined') { RT.$('#c-map').innerHTML = '<p class="muted">Apache ECharts n\'a pas pu être chargé.</p>'; return; }
    const list = data(), b = base();
    const pays = new Set(list.map((t) => t.pays)).size;
    const femmes = list.length ? Math.round((list.filter((t) => t.genre === 'F').length / list.length) * 100) : 0;
    const expMoy = list.length ? (list.reduce((s, t) => s + t.experience, 0) / list.length).toFixed(1).replace('.', ',') : '0';
    const ents = list.filter((t) => t.entreprise).length;
    RT.$('#d-kpis').innerHTML = [
      [RT.fmt(list.length), 'talents'], [pays, 'pays'], [femmes + ' %', 'de femmes'], [expMoy + ' ans', 'd\'expérience moyenne'], [ents, 'entrepreneurs et indépendants'],
    ].map(([n, l]) => `<div class="panel dash-kpi"><b>${n}</b><span>${l}</span></div>`).join('');

    // Choroplèthe
    if (!echarts.getMap('monde')) {
      echarts.registerMap('monde', { type: 'FeatureCollection', features: RT.geo.featureCollection.features.filter((f) => f.properties.nom !== 'Antarctique') });
    }
    const byP = RT.countBy(list, (t) => t.pays);
        chart('c-map').setOption({
      ...b.common,
      tooltip: { ...b.common.tooltip, trigger: 'item', formatter: (p) => `${RT.esc(p.name)}<br><b>${p.value || 0}</b> talent${p.value > 1 ? 's' : ''}` },
      visualMap: { type: 'piecewise', left: 8, bottom: 8, orient: 'vertical', itemWidth: 12, itemHeight: 10, itemGap: 4, textStyle: { color: b.muted, fontSize: 10 },
        pieces: [{ min: 1, max: 2, label: '1–2' }, { min: 3, max: 5, label: '3–5' }, { min: 6, max: 15, label: '6–15' }, { min: 16, max: 40, label: '16–40' }, { min: 41, label: '41 et +' }],
        inRange: { color: [css('--accent-soft'), b.accent] }, outOfRange: { color: css('--surface-2') } },
      series: [{ type: 'map', map: 'monde', nameProperty: 'nom', roam: true, scaleLimit: { min: 1, max: 12 }, zoom: 1.15, center: [10, 22],
        itemStyle: { areaColor: css('--surface-2'), borderColor: b.surf, borderWidth: 0.6 },
        emphasis: { label: { show: false }, itemStyle: { areaColor: css('--gold') } }, select: { disabled: true },
        data: [...byP].map(([iso, n]) => ({ name: RT.paysNom(iso), value: n })) }],
    }, true);

    hbar('c-villes', [...RT.countBy(list, (t) => t.ville)].sort((a, c) => c[1] - a[1]).slice(0, 12), b, 'talents');
    hbar('c-dom', [...RT.countBy(list, (t) => RT.dom(t.domaine).libelle)].sort((a, c) => c[1] - a[1]), b, 'talents');
    hbar('c-sect', [...RT.countBy(list, (t) => t.secteur)].sort((a, c) => c[1] - a[1]), b, 'talents');
    const el = list.filter((t) => t.entreprise);
    hbar('c-stade', RT.state.ref.entrepreneuriat.stades.map((st) => [st, el.filter((t) => t.entreprise.stade === st).length]), b, 'entreprises et projets');
    hbar('c-besoins', [...RT.countBy(el, (t) => t.entreprise.besoins)].sort((a, c) => c[1] - a[1]), b, 'entrepreneurs');
    hbar('c-contrib', [...RT.countBy(list, (t) => t.contributions)].sort((a, c) => c[1] - a[1]), b, 'talents');

    // Expérience : histogramme
    const bins = [['0–4', 0, 4], ['5–9', 5, 9], ['10–14', 10, 14], ['15–19', 15, 19], ['20–24', 20, 24], ['25 +', 25, 99]];
    chart('c-exp').setOption({
      ...b.common,
      tooltip: { ...b.common.tooltip, trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(127,127,127,.08)' } }, formatter: (p) => `${p[0].name} ans<br><b>${p[0].value}</b> talents` },
      grid: { left: 8, right: 8, top: 16, bottom: 6, containLabel: true },
      xAxis: { type: 'category', data: bins.map((x) => x[0]), axisTick: { show: false }, axisLine: { lineStyle: { color: b.line } }, axisLabel: { color: b.muted, fontSize: 10 } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: b.line, opacity: 0.6 } }, axisLabel: { color: b.muted, fontSize: 10 } },
      series: [{ type: 'bar', barCategoryGap: '18%', itemStyle: { color: b.accent, borderRadius: [4, 4, 0, 0] }, data: bins.map(([, lo, hi]) => list.filter((t) => t.experience >= lo && t.experience <= hi).length) }],
    }, true);

    // Adhésions cumulées (par mois)
    const months = []; for (let y = 2022; y <= 2026; y++) for (let m = 1; m <= 12; m++) { const k = `${y}-${String(m).padStart(2, '0')}`; if (k >= '2022-03' && k <= '2026-10') months.push(k); }
    const byM = RT.countBy(list, (t) => t.adhesion.slice(0, 7));
    let acc = 0; const cum = months.map((m) => (acc += byM.get(m) || 0));
    chart('c-adh').setOption({
      ...b.common,
      tooltip: { ...b.common.tooltip, trigger: 'axis', axisPointer: { type: 'line', lineStyle: { color: b.muted, type: 'dashed' } },
        formatter: (p) => { const [y, m] = p[0].name.split('-'); return `${new Date(+y, +m - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}<br><b>${p[0].value}</b> talents cumulés`; } },
      grid: { left: 8, right: 18, top: 16, bottom: 6, containLabel: true },
      xAxis: { type: 'category', data: months, boundaryGap: false, axisTick: { show: false }, axisLine: { lineStyle: { color: b.line } },
        axisLabel: { color: b.muted, fontSize: 10, interval: (i, v) => v.endsWith('-01'), formatter: (v) => v.slice(0, 4) } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: b.line, opacity: 0.6 } }, axisLabel: { color: b.muted, fontSize: 10 } },
      series: [{ type: 'line', data: cum, smooth: 0.25, showSymbol: false, lineStyle: { width: 2, color: b.accent },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: b.accent + '40' }, { offset: 1, color: b.accent + '00' }]) },
        markPoint: { symbol: 'circle', symbolSize: 9, itemStyle: { color: b.accent, borderColor: b.surf, borderWidth: 2 }, label: { show: true, position: 'top', color: b.ink, fontSize: 11, fontWeight: 600, formatter: (p) => p.value }, data: [{ coord: [months.length - 1, cum[cum.length - 1]], value: cum[cum.length - 1] }] } }],
    }, true);
  }

  RT.initTableau = () => {
    const ref = RT.state.ref;
    RT.fillSelect(RT.$('#d-dom'), ref.domaines.map((d) => [d.code, d.libelle]), 'Tous les domaines', '');
    RT.fillSelect(RT.$('#d-zone'), Object.keys(RT.ZONES), 'Monde entier', '');
    RT.fillSelect(RT.$('#d-contrib'), ref.contributions, 'Toutes', '');
    ['dom', 'zone', 'contrib'].forEach((k) => RT.$('#d-' + k).addEventListener('change', (e) => { T[k] = e.target.value; render(); }));
    addEventListener('resize', () => Object.values(charts).forEach((c) => c.resize()));
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => ready && render());
    new MutationObserver(() => ready && render()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  };
  RT.showTableau = () => { ready = true; render(); Object.values(charts).forEach((c) => c.resize()); };
})();
