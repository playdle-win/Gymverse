// QA harness: shared launch + helpers for scripted journeys (same launch options as tools/shot.mjs).
import { chromium } from 'playwright-core';
import { resolve } from 'node:path';

export async function open({ w = 390, h = 844, desktop = false, dark = false, style = null, theme = null, hash = '', reduced = false, scale = 1, file = 'dist/index.html', keep = false } = {}) {
  if (desktop) { w = 1280; h = 900; }
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: scale, colorScheme: dark ? 'dark' : 'light', hasTouch: !desktop, isMobile: !desktop, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  const boot = { style, theme, appearance: dark ? 'dark' : null };
  if (!keep) await page.addInitScript((b) => { window.__GB_BOOT__ = b; }, boot);
  const url = 'file://' + resolve(file);
  await page.goto(url + (hash ? '#' + hash : ''));
  await page.waitForTimeout(300);
  const t = (id) => `[data-testid="${id}"]`;
  const q = {
    browser, ctx, page, errors, url, t,
    wait: (ms = 250) => page.waitForTimeout(ms),
    async click(sel, o = {}) { try { await page.click(sel, { timeout: 3000, ...o }); } catch (e) { errors.push('CLICK FAIL ' + sel + ' :: ' + e.message.split('\n')[0]); return false; } await page.waitForTimeout(o.wait ?? 280); return true; },
    async tap(id, o) { return q.click(t(id), o); },
    async text(sel) { return page.evaluate((s) => { const e = [...document.querySelectorAll(s.replace(/:visible/g, ''))].find((n) => n.getClientRects().length > 0); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; }, sel); },
    async byText(txt, o = {}) { try { await page.getByText(txt, { exact: o.exact ?? false }).first().click({ timeout: 3000 }); } catch (e) { errors.push('CLICK FAIL text=' + txt + ' :: ' + e.message.split('\n')[0]); return false; } await page.waitForTimeout(o.wait ?? 280); return true; },
    async role(role, name, o = {}) { try { await page.getByRole(role, { name, exact: o.exact ?? false }).first().click({ timeout: 3000 }); } catch (e) { errors.push('CLICK FAIL role=' + role + ' name=' + name + ' :: ' + e.message.split('\n')[0]); return false; } await page.waitForTimeout(o.wait ?? 280); return true; },
    ev: (fn, arg) => page.evaluate(fn, arg),
    // Grab the core API once (the gym tab exposes it) and keep it on window.__core for any tab.
    async core() { await page.evaluate(async () => { if (window.__core) return; const h = location.hash; location.hash = '#gym'; for (let i = 0; i < 40 && !window.gymtab; i++) await new Promise((r) => setTimeout(r, 50)); window.__core = window.gymtab.core; location.hash = h || '#home'; await new Promise((r) => setTimeout(r, 150)); }); },
    state: (fn) => page.evaluate(`(${fn})(window.__core.getState(), window.__core)`),
    shot: (name) => page.screenshot({ path: '/tmp/qa/' + name + '.png' }),
    // Visible interactive elements with text/aria/size: a cheap textual "look" at the screen.
    async outline(root = 'body', max = 80) {
      return page.evaluate(({ root, max }) => {
        const r = document.querySelector(root); if (!r) return 'NO ROOT ' + root;
        const out = [];
        for (const e of r.querySelectorAll('button,a,input,select,textarea,[role=button],[role=tab],[role=switch],h1,h2,h3')) {
          const b = e.getBoundingClientRect(); if (b.width === 0 || b.height === 0) continue;
          const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
          out.push(`${e.tagName.toLowerCase()}${e.dataset.testid ? '#' + e.dataset.testid : ''}${e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : ''} [${Math.round(b.width)}x${Math.round(b.height)}@${Math.round(b.x)},${Math.round(b.y)}] "${(e.getAttribute('aria-label') ? 'aria:' + e.getAttribute('aria-label') + ' | ' : '') + (e.innerText || e.value || e.placeholder || '').replace(/\s+/g, ' ').trim().slice(0, 70)}"${e.disabled ? ' DISABLED' : ''}`);
          if (out.length >= max) break;
        }
        return out.join('\n');
      }, { root, max });
    },
    async overflow() { return page.evaluate(() => { const de = document.documentElement; const vw = de.clientWidth; const bad = []; for (const e of document.querySelectorAll('body *')) { const b = e.getBoundingClientRect(); if (b.width && (b.right > vw + 1 || b.left < -1)) { const cs = getComputedStyle(e); let p = e.parentElement, clipped = false; while (p && p !== document.body) { const pc = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(pc.overflowX)) { const pb = p.getBoundingClientRect(); if (pb.right <= vw + 1 && pb.left >= -1) { clipped = true; break; } } p = p.parentElement; } if (!clipped && cs.position !== 'fixed') bad.push((e.dataset.testid || e.className || e.tagName) + ' ' + Math.round(b.left) + '..' + Math.round(b.right)); } } return { scrollW: de.scrollWidth, vw, bad: bad.slice(0, 8) }; }); },
    async done(label = '') { await browser.close(); if (errors.length) { console.log(`--- ${label} ERRORS (${errors.length}) ---\n` + [...new Set(errors)].join('\n')); } else console.log(`--- ${label} no console errors/warnings ---`); },
  };
  return q;
}
