import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveSupabaseConfig } from '../src/lib/supabaseConfig.js'

test('production builds use the existing production Supabase variables', () => {
  assert.deepEqual(resolveSupabaseConfig({
    VITE_SUPABASE_URL: 'https://production.example.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'production-public-key',
    VITE_PREVIEW_SUPABASE_URL: 'https://staging.example.supabase.co',
    VITE_PREVIEW_SUPABASE_ANON_KEY: 'staging-public-key',
  }), {
    url: 'https://production.example.supabase.co',
    key: 'production-public-key',
  })
})

test('preview builds use only the preview-specific Supabase variables', () => {
  assert.deepEqual(resolveSupabaseConfig({
    VITE_SUPABASE_URL: 'https://production.example.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'production-public-key',
    VITE_PREVIEW_SUPABASE_URL: 'https://staging.example.supabase.co',
    VITE_PREVIEW_SUPABASE_ANON_KEY: 'staging-public-key',
  }, true), {
    url: 'https://staging.example.supabase.co',
    key: 'staging-public-key',
  })
})

test('preview builds do not fall back to production variables', () => {
  assert.deepEqual(resolveSupabaseConfig({
    VITE_SUPABASE_URL: 'https://production.example.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'production-public-key',
  }, true), {
    url: '',
    key: '',
  })
})

test('missing or partial preview config leaves Supabase unconfigured', () => {
  assert.deepEqual(resolveSupabaseConfig({
    VITE_PREVIEW_SUPABASE_URL: 'https://staging.example.supabase.co',
  }, true), {
    url: 'https://staging.example.supabase.co',
    key: '',
  })
})

test('recognises only the dedicated Grand Line Archive Testing project as safe for previews', async () => {
  const { isDedicatedPreviewSupabaseProject } = await import('../src/lib/supabaseConfig.js')
  assert.equal(isDedicatedPreviewSupabaseProject('https://ehzqsnfkmwphyllhaqhe.supabase.co'), true)
  assert.equal(isDedicatedPreviewSupabaseProject('https://aknokkfeufkfsggdfsyi.supabase.co'), false)
  assert.equal(isDedicatedPreviewSupabaseProject('http://ehzqsnfkmwphyllhaqhe.supabase.co'), false)
  assert.equal(isDedicatedPreviewSupabaseProject('https://other-project.supabase.co'), false)
  assert.equal(isDedicatedPreviewSupabaseProject(''), false)
})
