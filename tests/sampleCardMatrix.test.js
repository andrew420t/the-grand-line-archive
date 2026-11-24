import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

function parseCsvLine(line) {
  const values = []
  let value = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (quoted && character === '"' && line[index + 1] === '"') {
      value += '"'
      index += 1
    } else if (character === '"') {
      quoted = !quoted
    } else if (character === ',' && !quoted) {
      values.push(value)
      value = ''
    } else {
      value += character
    }
  }
  values.push(value)
  return values
}

const manifest = readFileSync(new URL('../docs/scanner-testing/sample-card-matrix.csv', import.meta.url), 'utf8')
const [header, ...lines] = manifest.trim().split(/\r?\n/)
const rows = lines.map((line) => Object.fromEntries(header.split(',').map((key, index) => [key, parseCsvLine(line)[index]])))

test('sample-card matrix contains exactly 100 cases across all 25 target sets', () => {
  assert.equal(rows.length, 100)
  assert.equal(new Set(rows.map((row) => row.set)).size, 25)
  assert.equal(new Set(rows.map((row) => `${row.set}:${row.language}:${row.slot}`)).size, 100)
})

test('each target set has two English and two Japanese samples', () => {
  const sets = [...new Set(rows.map((row) => row.set))]
  for (const set of sets) {
    assert.equal(rows.filter((row) => row.set === set && row.language === 'English').length, 2, `${set} English`)
    assert.equal(rows.filter((row) => row.set === set && row.language === 'Japanese').length, 2, `${set} Japanese`)
  }
})

test('all sample cases have a card number and HTTPS image reference', () => {
  assert.ok(rows.every((row) => row.card_number && /^https:\/\//.test(row.image_url)))
})

test('the prior image audit statuses are preserved without overstating verification', () => {
  const statusCounts = Object.fromEntries(['verified-load', 'retry-pending', 'candidate-unverified'].map((status) => [
    status,
    rows.filter((row) => row.status === status).length,
  ]))
  assert.deepEqual(statusCounts, {
    'verified-load': 100,
    'retry-pending': 0,
    'candidate-unverified': 0,
  })
})
