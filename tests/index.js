// Entry for `node --test tests/`: Node 22 resolves a directory argument to its index.js instead of
// scanning it, so this loads every *.test.mjs next to it. `node --test` without arguments finds them too.
import { readdirSync } from 'node:fs';

const dir = new URL('.', import.meta.url);
for (const file of readdirSync(dir).filter((name) => name.endsWith('.test.mjs')).sort()) {
  await import(new URL(file, dir).href);
}
