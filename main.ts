// Driver for this entry. The harness runs `node main.ts` on node22: it
// loads the cases, answers each one with the parser in solve.js, and writes
// the answers out. The input directory defaults to /input and the output
// directory to /output; MAKEFUN_INPUT_DIR and MAKEFUN_OUTPUT_DIR override
// them when the harness runs outside a container.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setFlagsFromString } from 'node:v8';

// Switch V8's incremental marking off before solve.js is loaded, so the
// parsing work runs without it — the same flag the house baseline runs with,
// which an entry is allowed to set for itself.
setFlagsFromString('--no-incremental-marking');

const solver = await import(new URL('./solve.js', import.meta.url).href);
const run = solver.run as (input: unknown) => unknown;

const inputDir = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const raw = readFileSync(join(inputDir, 'cases.json'), 'utf8');
const loaded = JSON.parse(raw) as { id: string; input: unknown }[];

const results: unknown[] = [];
for (let i = 0; i < loaded.length; i++) {
  results.push(run(loaded[i].input));
}

writeFileSync(join(outputDir, 'answers.json'), JSON.stringify(results));
