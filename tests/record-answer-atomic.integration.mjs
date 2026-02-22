import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migrationPath = 'supabase/migrations/20260222170000_record_answer_atomic_rpc.sql';
const migrationSql = readFileSync(migrationPath, 'utf8');

assert.match(
  migrationSql,
  /v_user_id\s*:=\s*auth\.uid\(\);/i,
  'RPC must resolve the authenticated user id at the beginning of the function',
);

assert.match(
  migrationSql,
  /WITH quota_upsert AS \([\s\S]*INSERT INTO public\.daily_usage[\s\S]*ON CONFLICT \(user_id, usage_date\)[\s\S]*DO UPDATE SET question_count = public\.daily_usage\.question_count \+ 1[\s\S]*WHERE public\.daily_usage\.question_count < v_daily_limit[\s\S]*RETURNING question_count[\s\S]*\)[\s\S]*SELECT question_count INTO v_current_usage[\s\S]*FROM quota_upsert;/i,
  'RPC must use a single atomic UPSERT+RETURNING statement to enforce free-plan quota',
);

assert.match(
  migrationSql,
  /IF v_current_usage IS NULL THEN[\s\S]*RETURN QUERY[\s\S]*false,\s*\n\s*false,[\s\S]*RETURN;/i,
  'RPC must return quota_allowed=false when atomic quota UPSERT returns no rows',
);

assert.match(
  migrationSql,
  /IF p_client_request_id IS NOT NULL THEN[\s\S]*INSERT INTO public\.attempt_logs[\s\S]*ON CONFLICT \(user_id, client_request_id\).*DO NOTHING[\s\S]*RETURNING id INTO v_attempt_id;[\s\S]*IF v_attempt_id IS NULL THEN[\s\S]*RETURN QUERY[\s\S]*SELECT true,\s*\n\s*true,/is,
  'RPC must enforce idempotency by attempting attempt_logs insert first and returning already_processed=true on conflicts',
);

assert.match(
  migrationSql,
  /IF v_plan = 'free' THEN[\s\S]*WITH quota_upsert AS \([\s\S]*RETURNING question_count[\s\S]*\)[\s\S]*IF v_current_usage IS NULL THEN[\s\S]*RETURN;[\s\S]*END IF;[\s\S]*END IF;[\s\S]*IF p_client_request_id IS NULL THEN[\s\S]*INSERT INTO public\.attempt_logs[\s\S]*INSERT INTO public\.user_question_state[\s\S]*ON CONFLICT \(user_id, question_id\)\s*DO UPDATE/is,
  'RPC must run atomic quota UPSERT after idempotency gate, then continue with attempt/state writes',
);

assert.match(
  migrationSql,
  /IF v_current_usage IS NULL THEN[\s\S]*IF v_attempt_id IS NOT NULL THEN[\s\S]*DELETE FROM public\.attempt_logs[\s\S]*RETURN QUERY[\s\S]*false,\s*\n\s*false,/is,
  'RPC must rollback the optimistic attempt insert when atomic quota UPSERT indicates exhaustion',
);

const recordAnswerSource = readFileSync('src/lib/recordAnswer.ts', 'utf8');
assert.match(
  recordAnswerSource,
  /const inFlightRequests = new Map<string, Promise<RecordAnswerResult>>\(\);/,
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
