// Screenshot / smoke-test helper (headless Chrome via playwright-core).
// node tools/shot.mjs <file.html> <out.png> [options]
//   --w 390 --h 844        viewport (default: phone 390x844)   --desktop = 1280x900
//   --hash gym             open with #gym
//   --style arcade         sets settings.style before load   (studio | arcade | varsity)
//   --theme cobalt         sets settings.theme before load
//   --dark | --light       color scheme
//   --eval "js"            run JS in the page after load (may be async; runs before the screenshot)
//   --click "css"          click a selector after load (repeatable, runs in order, before --eval)
//   --wait 400             extra ms to wait before the shot (default 350)
//   --scale 2              device scale factor (default 2)
//   --fresh                do not reuse stored state (default: every run starts with empty storage anyway)
// Prints console errors and uncaught page errors; exits 2 if any occurred.
import { chromium } from 'playwright-core';
import { resolve } from 'node:path';

const a = process.argv.slice(2);
const [file, out] = a;
if (!file || !out) { console.error('usage: node tools/shot.mjs <file.html> <out.png> [options]'); process.exit(1); }
const opt = (n, d) => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : d; };
const all = (n) => a.flatMap((v, i) => (v === '--' + n ? [a[i + 1]] : []));
const has = (n) => a.includes('--' + n);
const desktop = has('desktop');
const w = +opt('w', desktop ? 1280 : 390), h = +opt('h', desktop ? 900 : 844);

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'] });
const ctx = await browser.newContext({
  viewport: { width: w, height: h }, deviceScaleFactor: +opt('scale', 2),
  colorScheme: has('dark') ? 'dark' : 'light', hasTouch: !desktop, isMobile: !desktop,
  reducedMotion: has('reduced') ? 'reduce' : 'no-preference',
});
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

const boot = { style: opt('style', null), theme: opt('theme', null), appearance: has('dark') ? 'dark' : has('light') ? 'light' : null };
await page.addInitScript((b) => { window.__GB_BOOT__ = b; }, boot);
const hash = opt('hash', '');
await page.goto('file://' + resolve(file) + (hash ? '#' + hash : ''));
await page.waitForTimeout(250);
for (const sel of all('click')) { await page.click(sel, { timeout: 4000 }).catch((e) => errors.push('click failed: ' + sel + ' ' + e.message.split('\n')[0])); await page.waitForTimeout(250); }
const ev = opt('eval', null);
if (ev) { try { const r = await page.evaluate(`(async()=>{ ${ev} })()`); if (r !== undefined) console.log('eval ->', JSON.stringify(r)); } catch (e) { errors.push('eval: ' + e.message); } }
await page.waitForTimeout(+opt('wait', 350));
await page.screenshot({ path: out, fullPage: has('full') });
await browser.close();
if (errors.length) { console.error(errors.join('\n')); process.exit(2); }
console.log('ok ' + out);
