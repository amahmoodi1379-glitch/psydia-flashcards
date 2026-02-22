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
  /FROM public\.daily_usage[\s\S]*FOR UPDATE;/i,
  'RPC must lock free-plan daily_usage rows before quota checks',
);

assert.match(
  migrationSql,
  /IF v_plan = 'free' AND v_current_usage >= v_daily_limit THEN[\s\S]*RETURN QUERY[\s\S]*false,\s*\n\s*false,[\s\S]*RETURN;/i,
  'RPC must return quota_allowed=false before any attempt log insert when quota is exhausted',
);

assert.match(
  migrationSql,
  /INSERT INTO public\.daily_usage[\s\S]*ON CONFLICT \(user_id, usage_date\)[\s\S]*INSERT INTO public\.attempt_logs[\s\S]*ON CONFLICT \(user_id, client_request_id\).*DO NOTHING[\s\S]*INSERT INTO public\.user_question_state[\s\S]*ON CONFLICT \(user_id, question_id\)\s*DO UPDATE/is,
  'RPC must update usage, then idempotent attempt_logs, then upsert user_question_state in one flow',
);

assert.match(
  migrationSql,
  /IF p_client_request_id IS NOT NULL THEN[\s\S]*FROM public\.attempt_logs[\s\S]*IF FOUND THEN[\s\S]*RETURN QUERY[\s\S]*SELECT true,\s*\n\s*true,/is,
  'RPC must preserve idempotent already_processed path by returning current state for previously successful request ids',
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
