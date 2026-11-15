// A tour through every main screen and overlay; calls visit(label) at each stop.
export async function tour(q, visit, { only = null } = {}) {
  const want = (l) => !only || only.includes(l);
  const stop = async (label) => { if (want(label)) await visit(label); };
  const tab = (t) => q.click(`a.gb-tab:has-text("${t}") >> visible=true`, { wait: 450 });
  const fab = async (name) => { await q.click('button.gb-fab >> visible=true'); await q.click(`.gb-fabaction:has-text("${name}")`, { wait: 700 }); };
  const esc = async () => { await q.page.keyboard.press('Escape'); await q.wait(650); };
  const back = async () => { await q.page.locator('button[aria-label="Back"] >> visible=true').last().click({ timeout: 3000 }).catch((e) => q.errors.push('back failed')); await q.wait(600); };
  const scrollEnd = () => q.ev(() => { const pg = [...document.querySelectorAll('.gb-screen, .gb-page, .gb-cover, .gb-sheet')].filter((e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden').pop(); const sc = [pg, ...pg.querySelectorAll('*')].find((e) => e.scrollHeight > e.clientHeight + 20 && /auto|scroll/.test(getComputedStyle(e).overflowY)); if (sc) sc.scrollTop = 99999; });
  await q.core();
  // HOME
  await stop('home');
  await q.click('.wk-post__tap >> visible=true >> nth=0', { wait: 650 }); await stop('feed-detail'); await back();
  await q.click('[data-testid="start-routine"] >> visible=true', { wait: 650 }); await stop('routine-sheet'); await esc();
  await q.click('[data-testid="start-friends"] >> visible=true', { wait: 650 }); await stop('friends-sheet'); await esc();
  await q.click('.gb-profilebtn >> visible=true', { wait: 650 }); await stop('controls-sheet'); await esc();
  // TRAIN
  await tab('Train'); await stop('train');
  await q.click('[data-testid="routine-card"] >> visible=true >> nth=0', { wait: 650 }); await stop('routine-page');
  await q.click('[data-testid="routine-menu"] >> visible=true', { wait: 500 }).catch(() => {}); await stop('routine-menu'); await esc();
  await back();
  await q.click('.gb-section__action:has-text("New routine") >> visible=true', { wait: 650 }); await stop('routine-new'); await back();
  if (await q.text('.gb-dialog')) { await stop('routine-discard-dialog'); await q.click('.gb-dialog button >> nth=-1', { wait: 600 }); }
  // SESSION
  await q.click('[data-testid="routine-card"] >> visible=true >> nth=2', { wait: 650 }); await q.click('[data-testid="routine-start"] >> visible=true', { wait: 800 });
  for (const i of [0, 1, 2, 3]) await q.click(`[data-testid="set-done"] >> nth=${i}`, { wait: 40 });
  await stop('session');
  await q.click('[data-testid="set-type"] >> nth=1', { wait: 600 }); await stop('settype-sheet'); await esc();
  await q.ev(() => document.querySelector('[data-testid="add-exercise"]').scrollIntoView()); await q.tap('add-exercise', { wait: 600 }); await stop('picker'); await esc();
  if (await q.ev(() => !!document.querySelector('.wk-picker')?.getClientRects().length)) await q.click('.wk-picker button[aria-label="Close"], .wk-picker button[aria-label="Cancel"], .wk-picker button:has-text("Cancel")', { wait: 600 });
  await q.tap('session-finish', { wait: 900 }); if (await q.text('.gb-dialog')) { if (!tour.said) { tour.said = 1; console.log('finish dialog:', await q.text('.gb-dialog')); } await stop('finish-dialog'); await q.click('.gb-dialog button >> nth=-1', { wait: 900 }); } await stop('summary'); await scrollEnd(); await q.wait(200); await stop('summary-end');
  await q.tap('summary-gym', { wait: 900 });
  // GYM
  await stop('gym');
  await q.click('[data-testid="hud-multiplier"]', { wait: 650 }); await stop('multipliers'); await esc();
  await fab('Shop'); await stop('shop-equipment');
  for (const c of ['Decor', 'Floors', 'Walls', 'Space', 'Clothes', 'Hair and beard', 'Accessories']) { await q.click(`[data-testid="shop"] .gb-chip:has-text("${c}") >> visible=true`, { wait: 350 }); await stop('shop-' + c.toLowerCase().replace(/ /g, '-')); }
  await q.click('[data-testid="shop"] .gb-chip:has-text("Equipment") >> visible=true', { wait: 350 });
  await q.tap('shop-item-machine-cable', { wait: 600 }); await stop('shop-detail'); await q.tap('shop-buy-place', { wait: 800 });
  await stop('build-ghost'); await q.tap('build-place', { wait: 600 }); await stop('build');
  await q.click('.gy-tray .gb-seg__opt:has-text("Floors")', { wait: 300 }); await stop('build-floors');
  await q.tap('build-done', { wait: 650 });
  await fab('Character'); await stop('character'); await q.tap('character-done', { wait: 650 });
  await fab('Rooms'); await stop('rooms'); await q.tap('room-matteo', { wait: 900 }); await stop('visit'); await q.tap('visit-leave', { wait: 700 });
  // PROGRESS
  await tab('Progress'); await stop('progress'); await scrollEnd(); await q.wait(200); await stop('progress-end');
  await q.ev(() => [...document.querySelectorAll('[data-testid^="exercise-progress-"]')].find((e) => e.getClientRects().length).scrollIntoView({ block: 'center' }));
  await q.click('[data-testid="exercise-progress-deadlift"] >> visible=true', { wait: 650 }); await stop('exercise-progress'); await back();
  await q.ev(() => [...document.querySelectorAll('[data-testid^="history-"]')].find((e) => e.getClientRects().length).scrollIntoView({ block: 'center' }));
  await q.click('[data-testid^="history-"] >> visible=true >> nth=0', { wait: 650 }); await stop('workout-detail'); await scrollEnd(); await q.wait(200); await stop('workout-detail-end'); await back();
  await q.ev(() => [...document.querySelectorAll('.gb-section__action')].find((b) => /See all/.test(b.innerText) && b.getClientRects().length).scrollIntoView({ block: 'center' }));
  await q.click('.gb-section__action:has-text("See all") >> visible=true', { wait: 650 }); await stop('records'); await back();
  // EXERCISES
  await tab('Exercises'); await stop('exercises');
  await q.click('[data-testid="exercise-pull-up"] >> visible=true', { wait: 650 }); await stop('exercise-detail'); await scrollEnd(); await q.wait(200); await stop('exercise-detail-end'); await back();
  await tab('Home');
}

// In-page audit of whatever is on screen now.
export const AUDIT = () => {
  const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
  const stage = document.querySelector('.gb-stage, .gb-phone, #app') || document.body;
  const sr = (document.querySelector('.gb-stage') || document.documentElement).getBoundingClientRect();
  const visible = (e) => { if (!e.getClientRects().length) return false; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || +cs.opacity === 0) return false; const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.bottom > sr.top && b.top < sr.bottom && b.right > sr.left && b.left < sr.right; };
  const topmost = (e) => { const b = e.getBoundingClientRect(); const x = Math.min(Math.max(b.left + b.width / 2, 0), vw - 1), y = Math.min(Math.max(b.top + b.height / 2, 0), vh - 1); const hit = document.elementFromPoint(x, y); return hit && (e.contains(hit) || hit.contains(e)); };
  const name = (e) => (e.dataset.testid ? '#' + e.dataset.testid : '') + '.' + (typeof e.className === 'string' ? e.className.split(' ').slice(0, 2).join('.') : e.tagName) + ' "' + (e.getAttribute('aria-label') || e.innerText || '').replace(/\s+/g, ' ').slice(0, 30) + '"';
  const out = { overflow: [], small: [], unlabeled: [], tiny: [], chars: [], contrast: [], outside: [] };
  // overflow
  if (document.documentElement.scrollWidth > vw + 1) out.overflow.push('document scrollWidth ' + document.documentElement.scrollWidth);
  // interactive
  for (const e of document.querySelectorAll('button, a[href], input, [role=button], [role=radio], [role=slider], [role=switch], [role=tab]')) {
    if (!visible(e) || !topmost(e)) continue;
    const b = e.getBoundingClientRect();
    let w = b.width, h = b.height;
    for (const p of ['::before', '::after']) { const ps = getComputedStyle(e, p); if (ps.content !== 'none' && ps.position === 'absolute') { const t = parseFloat(ps.top), bt = parseFloat(ps.bottom), l = parseFloat(ps.left), r = parseFloat(ps.right); if (t < 0 || bt < 0) h = Math.max(h, b.height - (t || 0) - (bt || 0)); if (l < 0 || r < 0) w = Math.max(w, b.width - (l || 0) - (r || 0)); } }
    const lab = e.closest('label'); if (lab) { const lb = lab.getBoundingClientRect(); w = Math.max(w, lb.width); h = Math.max(h, lb.height); }
    if ((w < 43.5 || h < 43.5) && e.type !== 'hidden') out.small.push(name(e) + ` ${Math.round(w)}x${Math.round(h)}`);
    const txt = (e.innerText || '').trim();
    if (!txt && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby') && !e.title && e.tagName !== 'INPUT') out.unlabeled.push(name(e));
    if (e.tagName === 'INPUT' && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby') && !(e.id && document.querySelector(`label[for="${e.id}"]`)) && !e.closest('label')) out.unlabeled.push('input ' + name(e));
    if (b.right > sr.right + 1 || b.left < sr.left - 1) { let p = e.parentElement, clipped = false; while (p) { if (/(auto|scroll)/.test(getComputedStyle(p).overflowX)) { clipped = true; break; } p = p.parentElement; } if (!clipped) out.overflow.push(name(e) + ` x ${Math.round(b.left - sr.left)}..${Math.round(b.right - sr.left)}`); }
  }
  // text
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[, /]+/).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const over = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const bgOf = (e) => { const layers = []; let n = e, img = false; while (n && n.nodeType === 1) { const cs = getComputedStyle(n); if (cs.backgroundImage !== 'none') img = true; const c = parse(cs.backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 0.999) break; } n = n.parentElement; } let base = { r: 255, g: 255, b: 255, a: 1 }; const rootBg = parse(getComputedStyle(document.body).backgroundColor); if (rootBg && rootBg.a > 0) base = rootBg; let acc = layers.length && layers[layers.length - 1].a >= 0.999 ? layers.pop() : base; for (let i = layers.length - 1; i >= 0; i--) acc = over(layers[i], acc); return { c: acc, img, translucent: layers.length > 0 }; };
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const t = node.nodeValue.trim(); if (!t) continue;
    const e = node.parentElement; if (!e || !visible(e) || e.closest('svg') || e.closest('.gb-sr')) continue;
    const bad = t.match(/[–—]|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u); if (bad) out.chars.push(JSON.stringify(t.slice(0, 40)));
    const cs = getComputedStyle(e); const size = parseFloat(cs.fontSize);
    const key = name(e); if (seen.has(key)) continue; seen.add(key);
    if (!topmost(e)) continue;
    if (cs.clip === 'rect(0px, 0px, 0px, 0px)' || (parseFloat(cs.width) <= 1 && cs.overflow === 'hidden')) continue;
    if (size < 11) out.tiny.push(key + ' ' + size + 'px');
    const fg = parse(cs.color); if (!fg) continue;
    let dis = false, op = 1; for (let n = e; n; n = n.parentElement) { if (n.disabled || n.getAttribute('aria-disabled') === 'true') dis = true; op *= +getComputedStyle(n).opacity; }
    if (dis) continue;
    const bg = bgOf(e); const col = over({ ...fg, a: fg.a * op }, bg.c);
    const l1 = lum(col), l2 = lum(bg.c); const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const large = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700);
    if (ratio < (large ? 3 : 4.5)) out.contrast.push(`${key} ${ratio.toFixed(2)} (${size}px/${cs.fontWeight}) fg=${cs.color} bg=${Math.round(bg.c.r)},${Math.round(bg.c.g)},${Math.round(bg.c.b)}${bg.img ? ' IMG' : ''}${op < 1 ? ' op=' + op.toFixed(2) : ''}`);
  }
  // overlays inside the stage
  for (const e of document.querySelectorAll('.gb-sheet, .gb-dialog, .gb-toast, .gb-fabmenu, .gb-sheetlayer')) { if (!visible(e)) continue; const b = e.getBoundingClientRect(); if (b.left < sr.left - 1 || b.right > sr.right + 1 || b.top < sr.top - 1 || b.bottom > sr.bottom + 1) out.outside.push(name(e) + ` ${Math.round(b.left)},${Math.round(b.top)}..${Math.round(b.right)},${Math.round(b.bottom)} stage ${Math.round(sr.left)},${Math.round(sr.top)}..${Math.round(sr.right)},${Math.round(sr.bottom)}`); }
  return out;
};
