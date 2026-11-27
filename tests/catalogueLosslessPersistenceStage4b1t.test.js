import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migration = await readFile(new URL('../supabase/migrations/20261127195100_catalogue_lossless_source_persistence_stage4b1t.sql', import.meta.url), 'utf8')
const locatorMigration = await readFile(new URL('../supabase/migrations/20261127195212_catalogue_locator_suffix_provenance_stage4b1t.sql', import.meta.url), 'utf8')

test('Stage 4B-1T migration is Testing-scoped and additive only', () => {
  assert.match(migration, /ehzqsnfkmwphyllhaqhe/)
  assert.match(migration, /current_setting\('app\.settings\.project_ref'/)
  assert.match(migration, /ADD COLUMN IF NOT EXISTS/)
  assert.doesNotMatch(migration, /\b(DROP TABLE|TRUNCATE|DELETE FROM|INSERT INTO|UPDATE public\.(products|cards|sets))\b/i)
  assert.doesNotMatch(migration, /ALTER TABLE public\.(products|cards|sets)\b/i)
})

test('source printing persistence retains the upstream printing contract losslessly', () => {
  for (const field of ['source_namespace','source_site','source_text','block_icon','provenance_url','number_token','image_token','image_hash','first_seen_at','source_record']) {
    assert.match(migration, new RegExp('ADD COLUMN IF NOT EXISTS ' + field + '\\b'), field)
  }
  assert.match(migration, /source_record jsonb NOT NULL DEFAULT '\{\}'::jsonb/)
  assert.match(migration, /printing_key ~ '\^prt_\[0-9a-z\]\{12\}\$'/)
  assert.match(migration, /source_namespace = 'local_official'/)
})

test('versioned card observations preserve language, site and historical text independently', () => {
  for (const field of ['source_observation_key','source_site','source_language','observation_hash','original_name','category','colors','attributes','types','effect','trigger_text','first_seen_at','superseded_at','source_record']) {
    assert.match(migration, new RegExp('\\b' + field + '\\b'), field)
  }
  assert.match(migration, /FOREIGN KEY \(card_id,language\)/)
  assert.match(migration, /UNIQUE \(source_observation_key\)/)
  assert.match(migration, /superseded_at IS NULL OR superseded_at >= first_seen_at/)
})

test('official URLs and application proxy paths are separate and cannot be aliased', () => {
  assert.match(migration, /ALTER COLUMN exact_image_url DROP NOT NULL/)
  assert.match(migration, /application_image_path text/)
  assert.match(migration, /exact_image_url IS NOT NULL AND exact_image_url ~ '\^https:\/\//)
  assert.match(migration, /application_image_path IS NOT NULL AND application_image_path ~ '\^\/_card-image\//)
  assert.match(migration, /exact_image_url <> application_image_path/)
  assert.match(locatorMigration, /suffix_family text/)
  assert.match(locatorMigration, /suffix_n integer/)
  assert.match(locatorMigration, /source_image_url text/)
  assert.match(locatorMigration, /suffix_family IN \\('p','r'\\)/)
})

test('product and set relationship lifecycle metadata is preserved', () => {
  assert.match(migration, /product_kind text/)
  assert.match(migration, /is_bucket boolean/)
  assert.match(migration, /name_en text/)
  assert.match(migration, /release_date_source text/)
  assert.match(migration, /ADD COLUMN IF NOT EXISTS removed_at timestamptz/)
  assert.match(migration, /source_first_seen_at timestamptz/)
  assert.match(migration, /source_record jsonb NOT NULL DEFAULT '\\{\\}'::jsonb/)
})

test('client roles receive read-only observation access; importer uses service role', () => {
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/)
  assert.match(migration, /REVOKE ALL PRIVILEGES ON public\.catalogue_card_observations FROM PUBLIC, anon, authenticated/)
  assert.match(migration, /GRANT SELECT ON public\.catalogue_card_observations TO anon, authenticated/)
  assert.match(migration, /GRANT ALL PRIVILEGES ON public\.catalogue_card_observations TO service_role/)
})
