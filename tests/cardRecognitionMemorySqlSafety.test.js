import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const proposal = readFileSync(new URL('../supabase/review-only/card-recognition-memory.sql', import.meta.url), 'utf8')
const remediation = readFileSync(new URL('../supabase/review-only/card-recognition-memory-privacy-remediation.sql', import.meta.url), 'utf8')

test('shared recognition image bucket is private, including an existing bucket', () => {
  assert.match(proposal, /VALUES \('card-recognition-references', 'card-recognition-references', false,/)
  assert.match(proposal, /UPDATE storage\.buckets\s+SET public = false\s+WHERE id = 'card-recognition-references'/)
  assert.doesNotMatch(proposal, /CREATE POLICY ["']Public can view card recognition reference images["']/)
})

test('recognition reference objects cannot be read by public or non-admin roles', () => {
  assert.match(proposal, /CREATE POLICY ["']Admins can view card recognition reference images["'][\s\S]*?FOR SELECT TO authenticated[\s\S]*?public\.is_admin\(\)/)
  assert.match(proposal, /CREATE POLICY ["']Only admins can view recognition reference images["']\s+ON storage\.objects AS RESTRICTIVE\s+FOR SELECT TO public[\s\S]*?coalesce\(public\.is_admin\(\), false\)/)
})

test('recognition metadata grants omit contributor identity and restrict direct writes', () => {
  assert.match(proposal, /REVOKE ALL ON public\.card_recognition_examples FROM PUBLIC, anon, authenticated/)
  assert.match(proposal, /GRANT SELECT \([^)]*image_hash[^)]*\)\s+ON public\.card_recognition_examples TO anon, authenticated/)
  assert.doesNotMatch(proposal.match(/GRANT SELECT \(([^)]*)\)/)?.[1] || '', /confirmed_by/)
  assert.match(proposal, /GRANT INSERT \([^)]*confirmed_by[^)]*\)\s+ON public\.card_recognition_examples TO authenticated/)
})


test('privacy remediation closes an already-created public recognition bucket', () => {
  assert.match(remediation, /UPDATE storage\.buckets\s+SET public = false\s+WHERE id = 'card-recognition-references'/)
  assert.match(remediation, /DROP POLICY IF EXISTS ["']Public can view card recognition reference images["'] ON storage\.objects/)
  assert.match(remediation, /CREATE POLICY ["']Only admins can view recognition reference images["'] ON storage\.objects AS RESTRICTIVE/)
  assert.match(remediation, /CREATE POLICY ["']Only admins can upload recognition reference images["'] ON storage\.objects AS RESTRICTIVE/)
})

test('privacy remediation removes broad table and column grants while preserving safe metadata reads', () => {
  assert.match(remediation, /REVOKE ALL ON public\.card_recognition_examples FROM PUBLIC, anon, authenticated/)
  assert.match(remediation, /REVOKE SELECT \(%I\) ON TABLE public\.card_recognition_examples/)
  assert.match(remediation, /GRANT SELECT \([^)]*image_hash[^)]*\)\s+ON public\.card_recognition_examples TO anon, authenticated/)
  const selectedColumns = remediation.match(/GRANT SELECT \(([^)]*)\)/)?.[1] || ''
  assert.doesNotMatch(selectedColumns, /confirmed_by/)
})
