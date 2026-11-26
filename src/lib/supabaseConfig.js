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

/**
 * Cloudflare previews must use the dedicated staging project, never production.
 * This guard makes the preview warning conditional on the actual configured URL.
 */
export function isDedicatedPreviewSupabaseProject(url = '') {
  try {
    const parsed = new URL(String(url || ''))
    return parsed.protocol === 'https:' &&
      parsed.hostname === 'ehzqsnfkmwphyllhaqhe.supabase.co' &&
      parsed.pathname === '/' &&
      !parsed.username &&
      !parsed.password
  } catch {
    return false
  }
}
