import assert from 'node:assert/strict'
import test from 'node:test'
import { getWantedPosterAvatar, WANTED_POSTER_AVATARS, WANTED_POSTER_GROUPS } from '../src/account/wantedPosterAvatars.js'

test('wanted poster avatar catalogue has unique named keys and working fallbacks', () => {
  const keys = WANTED_POSTER_AVATARS.map((avatar) => avatar.key)
  assert.ok(WANTED_POSTER_AVATARS.length >= 25)
  assert.equal(new Set(keys).size, keys.length)
  for (const avatar of WANTED_POSTER_AVATARS) {
    assert.ok(avatar.name.length > 1)
    assert.ok(avatar.group.length > 1)
    assert.ok(avatar.sourceUrl.startsWith('https://'))
  }
  assert.equal(getWantedPosterAvatar('law').name, 'Trafalgar D. Water Law')
  assert.equal(getWantedPosterAvatar('not-a-real-avatar').key, 'luffy')
})

test('wanted poster avatar groups cover the main crew, warlords, yonko and marines', () => {
  assert.ok(WANTED_POSTER_GROUPS.includes('Straw Hat Crew'))
  assert.ok(WANTED_POSTER_GROUPS.includes('Warlords & rivals'))
  assert.ok(WANTED_POSTER_GROUPS.includes('Yonko & legends'))
  assert.ok(WANTED_POSTER_GROUPS.includes('Marines & admirals'))
  assert.ok(WANTED_POSTER_AVATARS.some((avatar) => avatar.key === 'law'))
  assert.ok(WANTED_POSTER_AVATARS.some((avatar) => avatar.key === 'akainu'))
  assert.ok(WANTED_POSTER_AVATARS.some((avatar) => avatar.key === 'shanks'))
})
