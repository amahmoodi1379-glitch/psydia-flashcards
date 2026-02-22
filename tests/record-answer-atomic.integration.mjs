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
  /IF p_client_request_id IS NOT NULL THEN[\s\S]*SELECT EXISTS \([\s\S]*SELECT 1[\s\S]*FROM public\.attempt_logs[\s\S]*user_id = v_user_id[\s\S]*client_request_id = p_client_request_id[\s\S]*\) INTO v_request_already_logged;[\s\S]*IF v_request_already_logged THEN[\s\S]*RETURN QUERY[\s\S]*SELECT true,\s*\n\s*true,/is,
  'RPC must check attempt_logs existence before any quota mutation and return already_processed=true when found',
);

assert.match(
  migrationSql,
  /IF p_client_request_id IS NOT NULL THEN[\s\S]*v_request_already_logged[\s\S]*END IF;[\s\S]*IF v_plan = 'free' THEN[\s\S]*WITH quota_upsert AS \([\s\S]*RETURNING question_count[\s\S]*\)[\s\S]*IF v_current_usage IS NULL THEN[\s\S]*RETURN;[\s\S]*END IF;[\s\S]*END IF;[\s\S]*IF p_client_request_id IS NULL THEN[\s\S]*INSERT INTO public\.attempt_logs[\s\S]*ELSE[\s\S]*INSERT INTO public\.attempt_logs[\s\S]*ON CONFLICT \(user_id, client_request_id\).*DO NOTHING[\s\S]*RETURNING id INTO v_attempt_id;[\s\S]*IF v_attempt_id IS NULL THEN[\s\S]*RETURN QUERY[\s\S]*SELECT true,\s*\n\s*true,[\s\S]*END IF;[\s\S]*END IF;[\s\S]*INSERT INTO public\.user_question_state[\s\S]*ON CONFLICT \(user_id, question_id\)\s*DO UPDATE/is,
  'RPC must run idempotency check, then atomic quota UPSERT, then attempt insert with race-safe already_processed return path',
);

assert.match(
  migrationSql,
  /IF v_current_usage IS NULL THEN[\s\S]*RETURN QUERY[\s\S]*false,\s*\n\s*false,[\s\S]*RETURN;/is,
  'RPC must return quota_allowed=false on quota exhaustion without deleting attempt_logs rows',
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
