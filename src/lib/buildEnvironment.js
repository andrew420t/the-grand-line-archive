const PRODUCTION_BRANCHES = new Set(['master', 'main'])

export function isPreviewBuildEnvironment(env = {}) {
  const branch =
    env.WORKERS_CI_BRANCH ||
    env.CF_PAGES_BRANCH ||
    env.GITHUB_HEAD_REF ||
    env.GITHUB_REF_NAME

  // Fail closed for Cloudflare builds if branch metadata is missing: a build
  // with unknown provenance must not receive production Supabase variables.
  if ((env.WORKERS_CI === '1' || env.CF_PAGES === '1') && !branch) return true

  // Local builds without CI branch metadata retain the normal developer setup.
  if (!branch) return false

  return !PRODUCTION_BRANCHES.has(branch)
}
