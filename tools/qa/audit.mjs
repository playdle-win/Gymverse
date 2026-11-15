import { open } from './lib.mjs';
import { tour, AUDIT } from './tour.mjs';
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i >= 0 ? process.argv[i + 1] : d; };
const has = (n) => process.argv.includes('--' + n);
const style = arg('style', 'studio'), theme = arg('theme', null), w = +arg('w', 390), dark = has('dark'), desktop = has('desktop'), reduced = has('reduced');
const shots = (arg('shots', '') || '').split(',').filter(Boolean), kinds = (arg('kinds', 'overflow,small,unlabeled,tiny,chars,contrast,outside')).split(',');
const q = await open({ style, theme, dark, w, desktop, reduced, scale: shots.length ? 2 : 1 });
const agg = {};
try { await tour(q, async (label) => {
  const r = await q.ev(AUDIT); if (has('v')) console.log('stop', label, Object.entries(r).map(([k, v]) => k + ':' + v.length).join(' '));
  for (const k of kinds) for (const item of r[k] || []) { const key = k + ' | ' + item; (agg[key] = agg[key] || []).push(label); }
  if (shots.includes(label) || shots.includes('all')) await q.shot(`${style}${dark ? '-dark' : ''}${theme ? '-' + theme : ''}-${label}`);
}); } catch (e) { console.log('TOUR CRASH', e.message.split('\n')[0]); await q.shot('crash'); }
const tag = `${style}${dark ? ' dark' : ''}${theme ? ' ' + theme : ''} w${w}${desktop ? ' desktop' : ''}${reduced ? ' reduced' : ''}`;
console.log(`=== ${tag}: ${Object.keys(agg).length} findings`);
for (const [k, labels] of Object.entries(agg).sort()) console.log(k + '  @ ' + [...new Set(labels)].slice(0, 4).join(',') + (labels.length > 4 ? ` +${labels.length - 4}` : ''));
await q.done(tag);
