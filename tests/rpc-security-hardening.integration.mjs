import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migrationPath = 'supabase/migrations/20260223093000_harden_sensitive_rpcs.sql';
const sql = readFileSync(migrationPath, 'utf8');

assert.match(sql, /CREATE OR REPLACE FUNCTION public\.get_user_profile_stats\(\)/i);
assert.match(sql, /v_user_id uuid := auth\.uid\(\);/i);
assert.match(sql, /IF v_user_id IS NULL THEN\s*RAISE EXCEPTION 'Authentication required';/is);

assert.match(sql, /CREATE OR REPLACE FUNCTION public\.check_answer\(/i);
assert.match(sql, /IF v_user_id IS NULL THEN\s*RAISE EXCEPTION 'Authentication required';/is);
assert.match(sql, /v_recent_attempts >= 60/i, 'check_answer should include an anti-abuse threshold');
assert.match(sql, /REVOKE EXECUTE ON FUNCTION public\.check_answer\(uuid, integer\) FROM anon;/i);
assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.check_answer\(uuid, integer\) TO authenticated;/i);

assert.match(sql, /CREATE OR REPLACE FUNCTION public\.get_user_weekly_rank\(p_week_start date DEFAULT NULL\)/i);
assert.match(sql, /WHERE r\.user_id = auth\.uid\(\)/i);
assert.match(sql, /CREATE OR REPLACE FUNCTION public\.get_user_monthly_rank\(p_month_start date DEFAULT NULL\)/i);

assert.match(sql, /CREATE OR REPLACE FUNCTION public\.get_subject_progress\(\)/i);
assert.doesNotMatch(sql, /get_subject_progress\(_user_id uuid\)/i);

console.log('RPC security hardening checks passed.');
