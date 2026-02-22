import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const reviewPageSource = readFileSync('src/pages/ReviewPage.tsx', 'utf8');

assert.match(
  reviewPageSource,
  /const result = await recordAnswer\(currentQuestion\.id, selectedIndex, correct, \{\s*clientRequestId: requestId,\s*\}\);/s,
  'ReviewPage must submit a stable clientRequestId to the atomic RPC wrapper',
);

assert.match(
  reviewPageSource,
  /if \(!result\.quotaAllowed\) \{[\s\S]*navigate\("\/subscription"\);[\s\S]*return;\s*\}/s,
  'ReviewPage must redirect to subscription when RPC reports quota exhaustion',
);

assert.match(
  reviewPageSource,
  /setAnsweredQuestions\(\(prev\) => new Set\(prev\)\.add\(currentQuestion\.id\)\);\s*await refetchSubscription\(\);/s,
  'ReviewPage must refetch subscription usage counter after each successful answer',
);

assert.match(
  reviewPageSource,
  /const existingRequestId = answerRequestIdsRef\.current\.get\(currentQuestion\.id\);\s*const requestId = existingRequestId \?\? crypto\.randomUUID\(\);/s,
  'ReviewPage must reuse the same request id for retries of the same question',
);

const subscriptionSource = readFileSync('src/hooks/useSubscription.ts', 'utf8');

assert.doesNotMatch(
  subscriptionSource,
  /canUseQuestion\s*=\s*async/i,
  'useSubscription should not rely on pre-check canUseQuestion flow after adopting atomic RPC quota enforcement',
);

console.log('subscription usage guard checks passed.');
