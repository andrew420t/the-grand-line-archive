import { createClient } from '@supabase/supabase-js'
import { resolveSupabaseConfig } from './supabaseConfig.js'

export const isPreviewBuild = import.meta.env.VITE_PREVIEW_BUILD === true
const { url: supabaseUrl, key: supabaseKey } = resolveSupabaseConfig(import.meta.env, isPreviewBuild)

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey)

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null
