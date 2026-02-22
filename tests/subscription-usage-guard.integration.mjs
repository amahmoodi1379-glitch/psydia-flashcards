import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const reviewPageSource = readFileSync('src/pages/ReviewPage.tsx', 'utf8');

assert.match(
  reviewPageSource,
  /const canProceed = await canUseQuestion\(requestId\);\s*if \(!canProceed\) \{[\s\S]*navigate\("\/subscription"\);/s,
  'ReviewPage must block answer flow and redirect to subscription when daily quota is exhausted',
);

assert.match(
  reviewPageSource,
  /await recordAnswer\(currentQuestion\.id, selectedIndex, correct, \{\s*clientRequestId: requestId,\s*\}\);/s,
  'ReviewPage must pass stable request ids into recordAnswer for idempotent retries',
);

assert.match(
  reviewPageSource,
  /setAnsweredQuestions\(\(prev\) => new Set\(prev\)\.add\(currentQuestion\.id\)\);\s*await refetchSubscription\(\);/s,
  'ReviewPage must refetch subscription usage counter after each successful answer',
);

const subscriptionSource = readFileSync('src/hooks/useSubscription.ts', 'utf8');

assert.match(
  subscriptionSource,
  /const canUseQuestion = async \(requestId\?: string\): Promise<boolean> => \{/,
  'useSubscription canUseQuestion must accept request ids to support idempotent retries',
);

assert.match(
  subscriptionSource,
  /const existingResult = usageCheckResultsRef\.current\.get\(requestId\);\s*if \(existingResult !== undefined\) \{\s*return existingResult;/s,
  'useSubscription must reuse prior canUseQuestion results for same request id',
);

assert.match(
  subscriptionSource,
  /await refetch\(\);\s*return canProceed;/s,
  'useSubscription must refetch subscription data after usage checks so free vs paid counters stay fresh',
);

console.log('subscription usage guard checks passed.');
