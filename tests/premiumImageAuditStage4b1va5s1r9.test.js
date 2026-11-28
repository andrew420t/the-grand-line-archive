import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectPremiumImageItems,
  reconcilePremiumImageAudit
} from '../scripts/auditPremiumCollectionImagesStage4b1va5s1r9.mjs';

function fixture() {
  const cards = [
    {
      language: 'en', productKey: 'en:premium:one', productName: 'Premium One', printingKey: 'en|premium|one',
      cardNumber: 'P-001', imageId: 'P-001', officialImageUrl: 'https://en.onepiece-cardgame.com/images/cardlist/card/P-001.png',
      exactIdentityMatch: true
    },
    {
      language: 'jp', productKey: 'jp:premium:two', productName: 'Premium Two', printingKey: 'jp|premium|two',
      cardNumber: 'P-002', imageId: 'P-002', officialImageUrl: 'https://www.onepiece-cardgame.com/images/cardlist/card/P-002.png',
      exactIdentityMatch: true
    }
  ];
  const manifest = { premiumCollections: { cards } };
  const results = cards.map(card => ({
    url: card.officialImageUrl,
    associations: [{
      language: card.language === 'en' ? 'English' : 'Japanese',
      image_id: card.imageId,
      product_key: card.productKey,
      printing_key: card.printingKey
    }],
    status: 'LOADED', status_code: 200, content_type: 'image/png'
  }));
  return { manifest, results };
}

test('re-audits each language-scoped Premium assignment using its official image URL', () => {
  const { manifest, results } = fixture();
  const items = collectPremiumImageItems(manifest, { expectedCount: 2 });
  assert.equal(items.length, 2);
  assert.equal(items[0].associations[0].language, 'English');
  assert.equal(items[1].associations[0].language, 'Japanese');

  const report = reconcilePremiumImageAudit(manifest, results, { expectedCount: 2 });
  assert.equal(report.status, 'VERIFIED_2_PREMIUM_IMAGES');
  assert.equal(report.summary.assignmentRows, 2);
  assert.equal(report.summary.loaded, 2);
  assert.equal(report.summary.failedOrUnmatched, 0);
});

test('fails closed for missing, duplicate, cross-language or unsuccessful Premium image evidence', () => {
  const { manifest } = fixture();
  assert.throws(() => collectPremiumImageItems(manifest), /Expected 231 Premium card identities, got 2/);

  const duplicate = fixture();
  duplicate.manifest.premiumCollections.cards[1].officialImageUrl = duplicate.manifest.premiumCollections.cards[0].officialImageUrl;
  assert.throws(() => collectPremiumImageItems(duplicate.manifest, { expectedCount: 2 }), /not one-to-one/);

  const mismatched = fixture();
  mismatched.results[0].associations[0].language = 'Japanese';
  mismatched.results[1].status = 'MISSING';
  mismatched.results[1].status_code = 404;
  const report = reconcilePremiumImageAudit(mismatched.manifest, mismatched.results, { expectedCount: 2 });
  assert.equal(report.status, 'BLOCKED_PREMIUM_IMAGE_RECONCILIATION');
  assert.equal(report.summary.loaded, 1);
  assert.equal(report.summary.failedOrUnmatched, 2);
});
