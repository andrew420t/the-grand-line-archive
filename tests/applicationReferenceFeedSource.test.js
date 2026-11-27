import assert from 'node:assert/strict'
import test from 'node:test'
import { APPLICATION_REFERENCE_FEED_COMMIT } from '../src/admin/cardCatalogue.js'

test('application reference catalogue uses the exact audited immutable upstream snapshot', () => {
  assert.equal(APPLICATION_REFERENCE_FEED_COMMIT, '619965ec198047de519dc6eb098c7a56aed9bd58')
  assert.match(APPLICATION_REFERENCE_FEED_COMMIT, /^[a-f0-9]{40}$/)
})
