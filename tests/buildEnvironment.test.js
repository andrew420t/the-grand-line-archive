import assert from 'node:assert/strict'
import test from 'node:test'
import { isPreviewBuildEnvironment } from '../src/lib/buildEnvironment.js'

test('master and main are production build branches', () => {
  assert.equal(isPreviewBuildEnvironment({ WORKERS_CI: '1', WORKERS_CI_BRANCH: 'master' }), false)
  assert.equal(isPreviewBuildEnvironment({ CF_PAGES: '1', CF_PAGES_BRANCH: 'main' }), false)
})

test('Cloudflare feature branches are preview builds', () => {
  assert.equal(isPreviewBuildEnvironment({ WORKERS_CI: '1', WORKERS_CI_BRANCH: 'feature/scanner' }), true)
  assert.equal(isPreviewBuildEnvironment({ CF_PAGES: '1', CF_PAGES_BRANCH: 'feature/scanner' }), true)
})

test('Cloudflare builds with missing branch metadata fail closed as preview', () => {
  assert.equal(isPreviewBuildEnvironment({ WORKERS_CI: '1' }), true)
  assert.equal(isPreviewBuildEnvironment({ CF_PAGES: '1' }), true)
})

test('GitHub pull request builds use the head branch and preview mode', () => {
  assert.equal(isPreviewBuildEnvironment({ GITHUB_HEAD_REF: 'feature/scanner', GITHUB_REF_NAME: '26/merge' }), true)
})

test('local builds without branch metadata retain local environment mode', () => {
  assert.equal(isPreviewBuildEnvironment({}), false)
})
