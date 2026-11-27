import { createClient } from '@supabase/supabase-js'
import { resolveSupabaseConfig } from './supabaseConfig.js'

const runtimeEnv = import.meta.env || {}
export const isPreviewBuild = runtimeEnv.VITE_PREVIEW_BUILD === true
const { url: supabaseUrl, key: supabaseKey } = resolveSupabaseConfig(runtimeEnv, isPreviewBuild)

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
