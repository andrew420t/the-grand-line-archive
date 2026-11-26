export function resolveSupabaseConfig(env = {}, previewBuild = false) {
  if (previewBuild) {
    return {
      url: env.VITE_PREVIEW_SUPABASE_URL || '',
      key: env.VITE_PREVIEW_SUPABASE_ANON_KEY || '',
    }
  }

  return {
    url: env.VITE_SUPABASE_URL || '',
    key: env.VITE_SUPABASE_ANON_KEY || '',
  }
}
