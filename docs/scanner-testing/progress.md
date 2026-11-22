# Grand Line Archive scanner test — progress and reference matrix

Updated: 22 November 2026

## Scope
Requested 100 sample cases: 25 set/product targets × 2 English + 2 Japanese = 100. Sets: OP-01–OP-18, EB-01–EB-05, PRB-01/02.

## Current findings
- **Synthetic OCR using local Tesseract 5.5.0:** 100 text-crop fixtures. Raw OCR was exact for **57/100**. After the merged set-code correction from PR #20 and the OP-prefix correction from PR #21, normalized card numbers were exact **100/100**. Fixtures used OP/EB/PRB/ST-style codes with mild rotations, blur and JPEG compression. This is synthetic printed-number OCR only, not card-photo OCR.
- **Parser fixes merged:** PR #20 commit ec4f2b244731dacaedcbe18b57ef25e3b7877a10 (O/0 confusion in set-code digits); PR #21 commit f2c865320bb1583aa687a927f34b81ca6f2d6eb1 (extra O in OP prefix such as OPO09). Both merged; regression tests added. Project test/build/lint CI not independently confirmed.
- **Reference data locators:** 92/100 requested sample slots in the current Koala Kollect product-linked locator data, 8 slots unmatched by the exact product-code query. The combined English OP14-EB04 and OP15-EB04 product-code mappings were included in this refreshed extraction. This does **not** mean cards are missing from official lists: English OP-14 and OP-15 products use combined product codes OP14-EB04 / OP15-EB04; EB-04 is not a separate English booster product. OP-18 and EB-05 official card lists are now published, but the current downloaded locator dataset appears not to have incorporated those recent releases.
- **Official image visual check:** 4 images opened successfully and visually checked for card number/name: English OP01-001 Roronoa Zoro, Japanese OP01-001 Zoro, English OP01-002 Trafalgar Law, Japanese OP01-002 Law. This confirms those URLs load; it does not constitute OCR engine testing of those image files.
- **Real card-photo OCR:** 0/100. Network/DNS in the execution environment blocks downloading source images to local disk for Tesseract. The web image viewer can display images but cannot provide a file to the local OCR process.
- **Production/live UI:** not tested. Production URL open attempt failed through web browser tool; container DNS/network cannot reach the Worker. So scanner popup, candidate choice, remembered choice, manual fallback, and deployment status remain code-review-only/unverified in live UI.
- **Code review:** candidate ranking order is remembered choice → exact OCR name → language. Popup displays image/name/number/language/set/rarity, lets the user select a candidate, has a remember checkbox using local browser storage keyed by detected card number, and “not sure/manual” closes without applying. Confirmation fills the form only; it does not save inventory.
- **8 unmatched locator rows:** OP18 EN/JP (4) and EB05 EN/JP (4). The current locator dataset is lagging; both sets have card lists now. The English EB-04 set is not a separate product—its cards are associated with combined OP14-EB04 and OP15-EB04 products.

## Reference matrix
Sampling method: first two unique card numbers (sorted) with product-linked image locators for each exact set/product code and language. For OP14/OP15, combined English product codes were not reliably linked in the source data during this extraction; EB04 is included in Japanese product associations. Some samples are reprints and retain their original card number. URLs are official card-image path candidates; only the four OP01 URLs above were image-loaded/visually verified.

| Set | Language | Slot | Card number | Name | Image URL |
|---|---|---:|---|---|---|
| OP01 | English | 1 | OP01-001 | — | https://en.onepiece-cardgame.com/images/cardlist/card/OP01-001.png |
| OP01 | English | 2 | OP01-002 | — | https://en.onepiece-cardgame.com/images/cardlist/card/OP01-002.png |
| OP01 | Japanese | 1 | OP01-001 | — | https://www.onepiece-cardgame.com/images/cardlist/card/OP01-001.png |
| OP01 | Japanese | 2 | OP01-002 | — | https://www.onepiece-cardgame.com/images/cardlist/card/OP01-002.png |
| OP02 | English | 1 | OP02-001 | — | https://en.onepiece-cardgame.com/images/cardlist/card/OP02-001.png |
| OP02 | English | 2 | OP02-002 | — | https://en.onepiece-cardgame.com/images/cardlist/card/OP02-002.png |
| OP02 | Japanese | 1 | OP02-001 | — | https://www.onepiece-cardgame.com/images/cardlist/card/OP02-001.png |
| OP02 | Japanese | 2 | OP02-002 | — | https://www.onepiece-cardgame.com/images/cardlist/card/OP02-002.png |
| OP03 | English | 1 | OP01-051 | — | https://en.onepiece-cardgame.com/images/cardlist/card/OP01-051_p2.png |
| OP03 | English | 2 | OP03-001 | — | https://en.onepiece-cardgame.com/images/cardlist/card/OP03-001.png |
| OP03 | Japanese | 1 | OP01-051 | — | https://www.onepiece-cardgame.com/images/cardlist/card/OP01-051_p2.png |
| OP03 | Japanese | 2 | OP03-001 | — | https://www.onepiece-cardgame.com/images/cardlist/card/OP03-001.png |
| OP04 | English | 1 | OP01-047 | — | https://en.onepiece-cardgame.com/images/cardlist/card/OP01-047_p2.png |
| OP04 | English | 2 | OP01-078 | — | https://en.onepiece-cardgame.com/images/cardlist/card/OP01-078_p2.png |
| OP04 | Japanese | 1 | OP01-047 | — | https://www.onepiece-cardgame.com/images/cardlist/card/OP01-047_p2.png |
| OP04 | Japanese | 2 | OP01-078 | — | https://www.onepiece-cardgame.com/images/cardlist/card/OP01-078_p2.png |
| OP05 | English | 1 | OP01-016 | — | https://en.onepiece-cardgame.com/images/cardlist/card/OP01-016_p4.png |
| OP05 | English | 2 | OP01-121 | — | https://en.onepiece-cardgame.com/images/cardlist/card/OP01-121_p2.png |
| OP05 | Japanese | 1 | OP01-016 | — | https://www.onepiece-cardgame.com/images/cardlist/card/OP01-016_p4.png |
| OP05 | Japanese | 2 | OP01-121 | — | https://www.onepiece-cardgame.com/images/cardlist/card/OP01-121_p2.png |
| OP06 | English | 1 | OP03-008 | — | https://en.onepiece-cardgame.com/images/cardlist/card/OP03-008_p1.png |
| OP06 | English | 2 | OP03-114 | — | https://en.onepiece-cardgame.com/images/cardlist/card/OP03-114_p2.png |
| OP06 | Japanese | 1 | OP03-008 | — | https://www.onepiece-cardgame.com/images/cardlist/card/OP03-008_p1.png |
| OP06 | Japanese | 2 | OP03-114 | — | https://www.onepiece-cardgame.com/images/cardlist/card/OP03-114_p2.png |
| OP07 | English | 1 | OP01-035 | — | https://en.onepiece-cardgame.com/images/cardlist/card/OP01-035_p2.png |
| OP07 | English | 2 | OP01-073 | — | https://en.onepiece-cardgame.com/images/cardlist/card/OP01-073_p2.png |
| OP07 | Japanese | 1 | OP01-035 | — | https://www.onepiece-cardgame.com/images/cardlist/card/OP01-035_p2.png |
| OP07 | Japanese | 2 | OP01-073 | — | https://www.onepiece-cardgame.com/images/cardlist/card/OP01-073_p2.png |
| OP08 | English | 1 | OP02-013 | — | https://en.onepiece-cardgame.com/images/cardlist/card/OP02-013_p3.png |
| OP08 | English | 2 | OP03-112 | — | https://en.onepiece-cardgame.com/images/cardlist/card/OP03-112_p4.png |
| OP08 | Japanese | 1 | OP02-013 | — | https://www.onepiece-cardgame.com/images/cardlist/card/OP02-013_p3.png |
| OP08 | Japanese | 2 | OP03-112 | — | https://www.onepiece-cardgame.com/images/cardlist/card/OP03-112_p4.png |
| OP09 | English | 1 | OP04-119 | — | https://en.onepiece-cardgame.com/images/cardlist/card/OP04-119_p2.png |
| OP09 | English | 2 | OP05-067 | — | https://en.onepiece-cardgame.com/images/cardlist/card/OP05-067_p4.png |
| OP09 | Japanese | 1 | OP04-119 | — | https://www.onepiece-cardgame.com/images/cardlist/card/OP04-119_p2.png |
| OP09 | Japanese | 2 | OP05-067 | — | https://www.onepiece-cardgame.com/images/cardlist/card/OP05-067_p4.png |
| OP10 | English | 1 | EB01-056 | — | https://en.onepiece-cardgame.com/images/cardlist/card/EB01-056_p2.png |
| OP10 | English | 2 | OP07-021 | — | https://en.onepiece-cardgame.com/images/cardlist/card/OP07-021_p2.png |
| OP10 | Japanese | 1 | EB01-056 | — | https://www.onepiece-cardgame.com/images/cardlist/card/EB01-056_p2.png |
| OP10 | Japanese | 2 | OP07-021 | — | https://www.onepiece-cardgame.com/images/cardlist/card/OP07-021_p1.png |
| OP11 | English | 1 | EB01-057 | — | https://en.onepiece-cardgame.com/images/cardlist/card/EB01-057_p2.png |
| OP11 | English | 2 | OP05-119 | — | https://en.onepiece-cardgame.com/images/cardlist/card/OP05-119_p7.png |
| OP11 | Japanese | 1 | EB01-057 | — | https://www.onepiece-cardgame.com/images/cardlist/card/EB01-057_p2.png |
| OP11 | Japanese | 2 | OP05-119 | — | https://www.onepiece-cardgame.com/images/cardlist/card/OP05-119_p6.png |
| OP12 | English | 1 | OP06-050 | — | https://en.onepiece-cardgame.com/images/cardlist/card/OP06-050_p2.png |
| OP12 | English | 2 | OP09-013 | — | https://en.onepiece-cardgame.com/images/cardlist/card/OP09-013_p2.png |
| OP12 | Japanese | 1 | OP06-050 | — | https://www.onepiece-cardgame.com/images/cardlist/card/OP06-050_p2.png |
| OP12 | Japanese | 2 | OP09-013 | — | https://www.onepiece-cardgame.com/images/cardlist/card/OP09-013_p1.png |
| OP13 | English | 1 | EB02-028 | — | https://en.onepiece-cardgame.com/images/cardlist/card/EB02-028_p1.png |
| OP13 | English | 2 | OP07-111 | — | https://en.onepiece-cardgame.com/images/cardlist/card/OP07-111_p2.png |
| OP13 | Japanese | 1 | EB02-028 | — | https://www.onepiece-cardgame.com/images/cardlist/card/EB02-028_p1.png |
| OP13 | Japanese | 2 | OP07-111 | — | https://www.onepiece-cardgame.com/images/cardlist/card/OP07-111_p2.png |
| OP14 | English | 1 | EB01-003 | — | https://en.onepiece-cardgame.com/images/cardlist/card/EB01-003_p5.png |
| OP14 | English | 2 | EB01-023 | — | https://en.onepiece-cardgame.com/images/cardlist/card/EB01-023_p1.png |
| OP14 | Japanese | 1 | EB01-003 | — | https://www.onepiece-cardgame.com/images/cardlist/card/EB01-003_p3.png |
| OP14 | Japanese | 2 | OP06-093 | — | https://www.onepiece-cardgame.com/images/cardlist/card/OP06-093_p3.png |
| OP15 | English | 1 | EB02-052 | — | https://en.onepiece-cardgame.com/images/cardlist/card/EB02-052_p2.png |
| OP15 | English | 2 | EB04-001 | — | https://en.onepiece-cardgame.com/images/cardlist/card/EB04-001.png |
| OP15 | Japanese | 1 | EB02-052 | — | https://www.onepiece-cardgame.com/images/cardlist/card/EB02-052_p2.png |
| OP15 | Japanese | 2 | OP12-014 | — | https://www.onepiece-cardgame.com/images/cardlist/card/OP12-014_p2.png |
| OP16 | English | 1 | EB04-054 | — | https://en.onepiece-cardgame.com/images/cardlist/card/EB04-054_p1.png |
| OP16 | English | 2 | OP10-045 | — | https://en.onepiece-cardgame.com/images/cardlist/card/OP10-045_p2.png |
| OP16 | Japanese | 1 | EB04-054 | — | https://www.onepiece-cardgame.com/images/cardlist/card/EB04-054_p1.png |
| OP16 | Japanese | 2 | OP10-045 | — | https://www.onepiece-cardgame.com/images/cardlist/card/OP10-045_p2.png |
| OP17 | English | 1 | EB04-007 | — | https://en.onepiece-cardgame.com/images/cardlist/card/EB04-007_p2.png |
| OP17 | English | 2 | EB04-061 | — | https://en.onepiece-cardgame.com/images/cardlist/card/EB04-061_p2.png |
| OP17 | Japanese | 1 | EB04-007 | — | https://www.onepiece-cardgame.com/images/cardlist/card/EB04-007_p2.png |
| OP17 | Japanese | 2 | EB04-061 | — | https://www.onepiece-cardgame.com/images/cardlist/card/EB04-061_p3.png |
| OP18 | English | 1 | MISSING | — | — |
| OP18 | English | 2 | MISSING | — | — |
| OP18 | Japanese | 1 | MISSING | — | — |
| OP18 | Japanese | 2 | MISSING | — | — |
| EB01 | English | 1 | EB01-001 | — | https://en.onepiece-cardgame.com/images/cardlist/card/EB01-001.png |
| EB01 | English | 2 | EB01-002 | — | https://en.onepiece-cardgame.com/images/cardlist/card/EB01-002.png |
| EB01 | Japanese | 1 | EB01-001 | — | https://www.onepiece-cardgame.com/images/cardlist/card/EB01-001.png |
| EB01 | Japanese | 2 | EB01-002 | — | https://www.onepiece-cardgame.com/images/cardlist/card/EB01-002.png |
| EB02 | English | 1 | EB01-001 | — | https://en.onepiece-cardgame.com/images/cardlist/card/EB01-001_p2.png |
| EB02 | English | 2 | EB01-021 | — | https://en.onepiece-cardgame.com/images/cardlist/card/EB01-021_p2.png |
| EB02 | Japanese | 1 | EB01-001 | — | https://www.onepiece-cardgame.com/images/cardlist/card/EB01-001_p2.png |
| EB02 | Japanese | 2 | EB01-021 | — | https://www.onepiece-cardgame.com/images/cardlist/card/EB01-021_p2.png |
| EB03 | English | 1 | EB03-001 | — | https://en.onepiece-cardgame.com/images/cardlist/card/EB03-001.png |
| EB03 | English | 2 | EB03-002 | — | https://en.onepiece-cardgame.com/images/cardlist/card/EB03-002.png |
| EB03 | Japanese | 1 | EB03-001 | — | https://www.onepiece-cardgame.com/images/cardlist/card/EB03-001.png |
| EB03 | Japanese | 2 | EB03-002 | — | https://www.onepiece-cardgame.com/images/cardlist/card/EB03-002.png |
| EB04 | English | 1 | EB01-003 | — | https://en.onepiece-cardgame.com/images/cardlist/card/EB01-003_p5.png |
| EB04 | English | 2 | EB01-023 | — | https://en.onepiece-cardgame.com/images/cardlist/card/EB01-023_p1.png |
| EB04 | Japanese | 1 | EB01-023 | — | https://www.onepiece-cardgame.com/images/cardlist/card/EB01-023_p2.png |
| EB04 | Japanese | 2 | EB04-001 | — | https://www.onepiece-cardgame.com/images/cardlist/card/EB04-001.png |
| EB05 | English | 1 | MISSING | — | — |
| EB05 | English | 2 | MISSING | — | — |
| EB05 | Japanese | 1 | MISSING | — | — |
| EB05 | Japanese | 2 | MISSING | — | — |
| PRB01 | English | 1 | EB01-006 | — | https://en.onepiece-cardgame.com/images/cardlist/card/EB01-006_r1.png |
| PRB01 | English | 2 | OP01-006 | — | https://en.onepiece-cardgame.com/images/cardlist/card/OP01-006_p3.png |
| PRB01 | Japanese | 1 | EB01-006 | — | https://www.onepiece-cardgame.com/images/cardlist/card/EB01-006_r1.png |
| PRB01 | Japanese | 2 | OP01-006 | — | https://www.onepiece-cardgame.com/images/cardlist/card/OP01-006_p1.png |
| PRB02 | English | 1 | EB01-009 | — | https://en.onepiece-cardgame.com/images/cardlist/card/EB01-009_p1.png |
| PRB02 | English | 2 | EB01-012 | — | https://en.onepiece-cardgame.com/images/cardlist/card/EB01-012_r1.png |
| PRB02 | Japanese | 1 | EB01-009 | — | https://www.onepiece-cardgame.com/images/cardlist/card/EB01-009_p1.png |
| PRB02 | Japanese | 2 | EB01-012 | — | https://www.onepiece-cardgame.com/images/cardlist/card/EB01-012_r1.png |

## Sources
- Project scanner: https://github.com/andrew420t/the-grand-line-archive/blob/master/src/admin/CardScanner.jsx
- Parser: https://github.com/andrew420t/the-grand-line-archive/blob/master/src/admin/cardParser.js
- Tests: https://github.com/andrew420t/the-grand-line-archive/blob/master/tests/cardParser.test.js
- Reference-data README: https://github.com/hotavocado/koala-kollect-data/blob/main/README.md
- Official English card list: https://en.onepiece-cardgame.com/cardlist/
- Official Japanese card list: https://www.onepiece-cardgame.com/cardlist/
- Official English image base: https://en.onepiece-cardgame.com/images/cardlist/card/
- Official Japanese image base: https://www.onepiece-cardgame.com/images/cardlist/card/
- OP-18 current card list corroboration: https://www.shonentcg.com/blog/op-18-revealed-cards-tracker
- EB-05 current card list corroboration: https://portaltcg.co.uk/blogs/news/one-piece-heroines-edition-vol-2-release-date-card-list

## Still needed for completion
1. Download/load 100 source images, run Tesseract against the real card photos, and record OCR text/number/name/language accuracy. (Image-file transfer/network restriction.)
2. Complete the 14 unmatched source locator cases using current official lists and resolve English combined OP14-EB04/OP15-EB04 product-code associations.
3. Run repository npm test/lint/build with dependencies available.
4. Browser-test the popup, alternate candidate selection, remembered match, manual fallback, and auto-match on production.
5. Verify deployment of PR #20 and PR #21 merges on the live Worker.

**Verdict: partial test. The scanner is not yet fully tested.**
