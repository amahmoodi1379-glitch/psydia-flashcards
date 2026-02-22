import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/hooks/useReviewQuestions.ts', 'utf8');

assert.match(
  source,
  /useEffect\(\(\) => \{\s*let active = true;[\s\S]*?const rows = await fetchReviewQuestionsRpc\(limit, \{ type: filterType, id: filterId \}\);\s*\n\s*if \(!active\) \{\s*\n\s*return;\s*\n\s*\}/s,
  'useReviewQuestions must ignore stale async responses during rapid filter switches',
);

assert.match(
  source,
  /useEffect\(\(\) => \{[\s\S]*?return \(\) => \{\s*active = false;\s*\};\s*\n\s*\}, \[limit, filterType, filterId\]\);/s,
  'useReviewQuestions must disable previous requests on dependency changes/unmount',
);

assert.match(
  source,
  /useEffect\(\(\) => \{\s*let active = true;[\s\S]*?const rows = await fetchReviewQuestionsRpc\(1, filterType \? \{ type: filterType, id: filterId \} : undefined\);\s*\n\s*if \(!active\) \{\s*\n\s*return;\s*\n\s*\}/s,
  'useDueCount must ignore stale async responses during rapid filter switches',
);

assert.match(
  source,
  /useEffect\(\(\) => \{[\s\S]*?return \(\) => \{\s*active = false;\s*\};\s*\n\s*\}, \[filterType, filterId\]\);/s,
  'useDueCount must disable previous requests on dependency changes/unmount',
);

console.log('review questions cancellation checks passed.');
