// Enrichit world-atlas (Natural Earth 1:50m, domaine public) avec ISO2 + nom français
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const countries = require('i18n-iso-countries');
countries.registerLocale(require('i18n-iso-countries/langs/fr.json'));
const topo = JSON.parse(fs.readFileSync(process.argv[2]||'node_modules/world-atlas/countries-50m.json'));
const g = topo.objects.countries.geometries;
let miss = [];
for (const geom of g) {
  const num = geom.id;
  const a2 = num ? countries.numericToAlpha2(num) : null;
  const fr = a2 ? countries.getName(a2, 'fr') : null;
  if (!a2) miss.push(geom.properties.name);
  geom.properties = { iso2: a2 || null, nom: fr || geom.properties.name };
}
// Kosovo, N. Chypre etc. sans code : on garde le nom anglais
delete topo.objects.land;
fs.writeFileSync(process.argv[3]||'data/pays-50m.topo.json', JSON.stringify(topo));
console.log('sans ISO:', miss.join(', '));
