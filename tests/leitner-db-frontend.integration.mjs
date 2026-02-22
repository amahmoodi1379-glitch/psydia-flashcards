import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migrationPath = 'supabase/migrations/20260222090000_align_leitner_box_model_to_7.sql';
const migrationSql = readFileSync(migrationPath, 'utf8');

assert.match(
  migrationSql,
  /CHECK\s*\(box_number\s*>=\s*1\s*AND\s*box_number\s*<=\s*7\)/i,
  'DB constraint must cap box_number at 7',
);
assert.match(
  migrationSql,
  /LEAST\(uqs\.box_number,\s*7\)::float\s*\/\s*7/,
  'Mastery functions must normalize by final max box (7)',
);

const leitnerSource = readFileSync('src/lib/leitner.ts', 'utf8');
assert.match(
  leitnerSource,
  /export const MAX_LEITNER_BOX\s*=\s*7/,
  'Frontend Leitner max box constant must be 7',
);
assert.match(
  leitnerSource,
  /Math\.min\(currentBox \+ 1, MAX_LEITNER_BOX\)/,
  'Frontend SM2 progression must never exceed MAX_LEITNER_BOX',
);

console.log('Leitner DB+frontend integration checks passed.');
