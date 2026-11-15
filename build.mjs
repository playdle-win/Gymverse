// GymBros build: bundles src/ into ONE self-contained HTML file (dist/index.html).
// Usage:
//   node build.mjs                 build the app            -> dist/index.html
//   node build.mjs --dev gym       build a dev harness      -> dist/dev-gym.html   (entry: dev/gym.jsx)
//   node build.mjs --all           app + every dev harness
// CSS: every file in src/styles/ is concatenated in filename order (00-..., 10-..., ...).
// JS:  esbuild bundles the entry (Preact, automatic JSX) into one IIFE.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const minify = !args.includes('--no-minify');

function css() {
  const dir = join(root, 'src/styles');
  return readdirSync(dir).filter((f) => f.endsWith('.css')).sort()
    .map((f) => `/* ${f} */\n` + readFileSync(join(dir, f), 'utf8')).join('\n');
}

async function bundle(entry) {
  const res = await build({
    entryPoints: [join(root, entry)],
    bundle: true, write: false, format: 'iife', target: 'es2020',
    jsx: 'automatic', jsxImportSource: 'preact',
    loader: { '.svg': 'text' },
    minify, legalComments: 'none', logLevel: 'warning',
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  return res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
}

async function emit(entry, out, title) {
  const tpl = readFileSync(join(root, 'src/index.html'), 'utf8');
  const js = await bundle(entry);
  const html = tpl
    .replace('<!--__TITLE__-->', title)
    .replace('/*__CSS__*/', () => css())
    .replace('/*__JS__*/', () => js);
  mkdirSync(join(root, 'dist'), { recursive: true });
  writeFileSync(join(root, out), html);
  console.log(`built ${out}  ${(html.length / 1024).toFixed(0)} KB`);
}

const devs = () => (existsSync(join(root, 'dev')) ? readdirSync(join(root, 'dev')) : [])
  .filter((f) => f.endsWith('.jsx')).map((f) => f.replace(/\.jsx$/, ''));

try {
  const dev = flag('--dev');
  if (dev) {
    await emit(`dev/${dev}.jsx`, `dist/dev-${dev}.html`, `GymBros dev: ${dev}`);
  } else {
    await emit('src/main.jsx', 'dist/index.html', 'GymBros');
    if (args.includes('--all')) for (const d of devs()) await emit(`dev/${d}.jsx`, `dist/dev-${d}.html`, `GymBros dev: ${d}`);
  }
} catch (e) {
  console.error('BUILD FAILED\n' + (e.message || e));
  process.exit(1);
}
