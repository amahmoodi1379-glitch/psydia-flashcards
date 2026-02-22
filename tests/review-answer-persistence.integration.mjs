import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const reviewPageSource = readFileSync('src/pages/ReviewPage.tsx', 'utf8');

assert.match(
  reviewPageSource,
  /await recordAnswer\(currentQuestion\.id, selectedIndex, correct(?:, \{[\s\S]*?\})?\);\s*\n\s*setHasAnswered\(true\);/s,
  'ReviewPage must mark question as answered only after recordAnswer succeeds',
);

assert.match(
  reviewPageSource,
  /await recordAnswer\(currentQuestion\.id, selectedIndex, correct(?:, \{[\s\S]*?\})?\);[\s\S]*if \(correct\) \{\s*setCorrectCount\(\(prev\) => prev \+ 1\);\s*\}/s,
  'correctCount must increase only after successful persistence',
);

assert.match(
  reviewPageSource,
  /catch \(recordError\) \{[\s\S]*toast\.error\(`\$\{message\} شما می‌توانید همین سوال را دوباره پاسخ دهید\.`\);[\s\S]*setHasAnswered\(false\);/s,
  'Failed saves must show clear retry message and keep question retryable',
);

const recordAnswerSource = readFileSync('src/lib/recordAnswer.ts', 'utf8');
assert.match(
  recordAnswerSource,
  /combinedErrorText\.includes\("failed to fetch"\)[\s\S]*combinedErrorText\.includes\("network"\)[\s\S]*combinedErrorText\.includes\("timeout"\)/s,
  'recordAnswer must map intermittent/offline network failures to an explicit retryable message',
);

console.log('review answer persistence checks passed.');
