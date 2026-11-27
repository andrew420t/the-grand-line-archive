import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const migration = readFileSync(new URL('../supabase/review-only/account-settings-support-inbox.sql', import.meta.url), 'utf8')

test('account migration adds avatar selection and private support tables without destructive changes', () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS avatar_key text NOT NULL DEFAULT 'luffy'/)
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.support_conversations/)
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.support_messages/)
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.account_recovery_requests/)
  assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN|TRUNCATE TABLE/i)
})

test('support conversations and messages are private to the owner and administrators', () => {
  assert.match(migration, /ALTER TABLE public\.support_conversations ENABLE ROW LEVEL SECURITY/)
  assert.match(migration, /ALTER TABLE public\.support_messages ENABLE ROW LEVEL SECURITY/)
  assert.match(migration, /customer_id = \(SELECT auth\.uid\(\)\) OR public\.is_admin\(\)/)
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.get_or_create_support_conversation/)
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.send_support_message/)
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.mark_support_conversation_read/)
  assert.match(migration, /REVOKE ALL ON public\.support_messages FROM PUBLIC, anon, authenticated/)
})

test('forgot-email recovery is generic and rate limited', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.account_recovery_requests/)
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.submit_account_email_recovery/)
  assert.match(migration, /v_email !~ '\^\[a-z0-9/)
  assert.match(migration, /created_at > now\(\) - interval '24 hours'/)
  assert.match(migration, /IF v_recent >= 3 THEN/)
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.submit_account_email_recovery/)
})
