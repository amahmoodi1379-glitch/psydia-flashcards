import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migrationPath = 'supabase/migrations/20260222170000_record_answer_atomic_rpc.sql';
const migrationSql = readFileSync(migrationPath, 'utf8');

assert.match(
  migrationSql,
  /CREATE UNIQUE INDEX IF NOT EXISTS attempt_logs_user_request_id_key/i,
  'Attempt logs must have idempotency unique index for retries/double-clicks',
);
assert.match(
  migrationSql,
  /ON CONFLICT \(user_id, client_request_id\).*DO NOTHING/is,
  'RPC must de-duplicate repeated request ids on attempt_logs',
);
assert.match(
  migrationSql,
  /ON CONFLICT \(user_id, question_id\)\s*DO UPDATE/is,
  'RPC must upsert user_question_state atomically',
);

const recordAnswerSource = readFileSync('src/lib/recordAnswer.ts', 'utf8');
assert.match(
  recordAnswerSource,
  /const inFlightRequests = new Map<string, Promise<void>>\(\);/,
  'Client logic must keep in-flight requests map for same request de-duplication',
);
assert.match(
  recordAnswerSource,
  /const existingRequest = inFlightRequests\.get\(requestKey\);\s*if \(existingRequest\) \{\s*return existingRequest;/s,
  'Client logic must avoid duplicate concurrent RPC calls for same request key',
);
assert.match(
  recordAnswerSource,
  /client\.rpc\("record_answer_and_update_state"/,
  'Client must call single atomic RPC instead of multi-query flow',
);

console.log('record_answer_and_update_state integration checks passed.');
