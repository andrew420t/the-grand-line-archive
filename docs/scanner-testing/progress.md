# Grand Line Archive scanner test — progress and reference matrix

Updated: 23 November 2026

## Scope
Requested 100 sample cases: 25 set/product targets × 2 English + 2 Japanese = 100. Sets: OP-01–OP-18, EB-01–EB-05, PRB-01/02.

## Current findings
- **Synthetic OCR using local Tesseract 5.5.0:** 100 text-crop fixtures. Raw OCR was exact for **57/100**. After the merged set-code correction from PR #20 and the OP-prefix correction from PR #21, normalized card numbers were exact **100/100**. Fixtures used OP/EB/PRB/ST-style codes with mild rotations, blur and JPEG compression. This is synthetic printed-number OCR only, not card-photo OCR.
- **Parser fixes merged:** PR #20 commit ec4f2b244731dacaedcbe18b57ef25e3b7877a10 (O/0 confusion in set-code digits); PR #21 commit f2c865320bb1583aa687a927f34b81ca6f2d6eb1 (extra O in OP prefix such as OPO09). Both merged; regression tests added. **CI verified:** GitHub Actions runs #87 (PR #20), #88 (PR #21), and #89 (PR #22) each passed all steps: dependency install, `npm test`, lint, and production build. Run #86 and #84 were failed attempts before fixes; subsequent corrected runs passed.
- **Reference data locators:** 92/100 requested sample slots in the current Koala Kollect product-linked locator data, 8 slots unmatched by the exact product-code query. The combined English OP14-EB04 and OP15-EB04 product-code mappings were included in this refreshed extraction. This does **not** mean cards are missing from official lists: English OP-14 and OP-15 products use combined product codes OP14-EB04 / OP15-EB04; EB-04 is not a separate English booster product. OP-18 and EB-05 official card lists are now published, but the current downloaded locator dataset appears not to have incorporated those recent releases.
- **Official image visual check:** 94/100 sample image slots opened and visually checked via official Bandai card-list pages. OP01–OP16: 64/64; OP18: 4/4; EB01: 3/4; EB02: 3/4; EB03: 4/4; EB04: 4/4; EB05: 4/4; PRB01: 4/4; PRB02: 4/4. OP17: 0/4 unverified; two Japanese EB01/EB02 image retrievals failed. The original four OP01 English/Japanese Zoro/Law images were among the first checks. Browser-rendered images are visual-load checks, not OCR engine tests.
- **Real card-photo OCR:** 1/100. The user's physical English Saint Shamrock OP18-119 photo was run through local Tesseract 5.5.0 and multiple crops/preprocessing variants. Automatic name/number identification failed; rules text was partial. This is a real-photo failure sample, not a synthetic test. The other 99 requested real-photo slots have no physical photos supplied.
- **Production/live UI:** not tested. Production URL open attempt failed through web browser tool; container DNS/network cannot reach the Worker. So scanner popup, candidate choice, remembered choice, manual fallback, and deployment status remain code-review-only/unverified in live UI.
- **Code review:** candidate ranking order is remembered choice → exact OCR name → language. Popup displays image/name/number/language/set/rarity, lets the user select a candidate, has a remember checkbox using local browser storage keyed by detected card number, and “not sure/manual” closes without applying. Confirmation fills the form only; it does not save inventory.
- **Current catalogue locator gap:** the Koala Kollect product-linked locator dataset itself still has 92/100 rows and omits the eight OP18/EB05 sample slots. Those eight were supplemented from official Bandai card-list pages and all eight official images were subsequently visually loaded. The English EB-04 set is not a separate product—its cards are associated with combined OP14-EB04 and OP15-EB04 products.

## Reference matrix
Sampling method: first two unique card numbers (sorted) with product-linked image locators for each exact set/product code and language. For OP14/OP15, combined English product codes were not reliably linked in the source data during this extraction; EB04 is included in Japanese product associations. Some samples are reprints and retain their original card number. **Image verification status is updated in the summary above:** 94/100 sample slots were visually loaded via official Bandai card-list pages; 6 remain unverified (4 OP17 slots and 1 Japanese slot each for EB01/EB02). Visual loading is not OCR-engine testing.

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
| OP18 | English | 1 | OP18-001 | Karoo | https://en.onepiece-cardgame.com/images/cardlist/card/OP18-001.png (official image visually loaded via Bandai card-list page; cache-busted URL) |
| OP18 | English | 2 | OP18-002 | Igaram | https://en.onepiece-cardgame.com/images/cardlist/card/OP18-002.png (official image visually loaded via Bandai card-list page; cache-busted URL) |
| OP18 | Japanese | 1 | OP18-001 | カルー (Karoo) | https://www.onepiece-cardgame.com/images/cardlist/card/OP18-001.png (official image visually loaded via Bandai card-list page; cache-busted URL) |
| OP18 | Japanese | 2 | OP18-002 | イガラム (Igaram) | https://www.onepiece-cardgame.com/images/cardlist/card/OP18-002.png (official image visually loaded via Bandai card-list page; cache-busted URL) |
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
| EB05 | English | 1 | EB05-001 | Jewelry Bonney | https://en.onepiece-cardgame.com/images/cardlist/card/EB05-001.png (official image visually loaded via Bandai card-list page; cache-busted URL) |
| EB05 | English | 2 | EB05-002 | Doll | https://en.onepiece-cardgame.com/images/cardlist/card/EB05-002.png (official image visually loaded via Bandai card-list page; cache-busted URL) |
| EB05 | Japanese | 1 | EB05-001 | ジュエリー・ボニー (Jewelry Bonney) | https://www.onepiece-cardgame.com/images/cardlist/card/EB05-001.png (official image visually loaded via Bandai card-list page; cache-busted URL) |
| EB05 | Japanese | 2 | EB05-002 | ドール (Doll) | https://www.onepiece-cardgame.com/images/cardlist/card/EB05-002.png (official image visually loaded via Bandai card-list page; cache-busted URL) |
| PRB01 | English | 1 | EB01-006 | Tony Tony.Chopper | https://en.onepiece-cardgame.com/images/cardlist/card/EB01-006_r1.png?261016= |
| PRB01 | English | 2 | OP01-006 | Otama | https://en.onepiece-cardgame.com/images/cardlist/card/OP01-006_r1.png?261016= |
| PRB01 | Japanese | 1 | EB01-006 | トニートニー・チョッパー | https://www.onepiece-cardgame.com/images/cardlist/card/EB01-006_r1.png?261113= |
| PRB01 | Japanese | 2 | OP01-006 | お玉 | https://www.onepiece-cardgame.com/images/cardlist/card/OP01-006_p1.png?261113= |
| PRB02 | English | 1 | EB01-009 | Just Shut Up and Come with Us!!!! | https://en.onepiece-cardgame.com/images/cardlist/card/EB01-009_r1.png?261016= |
| PRB02 | English | 2 | EB01-012 | Cavendish | https://en.onepiece-cardgame.com/images/cardlist/card/EB01-012_r1.png?261016= |
| PRB02 | Japanese | 1 | EB01-009 | うるせェ!!!いこう!!!! | https://www.onepiece-cardgame.com/images/cardlist/card/EB01-009_p1.png?261113= |
| PRB02 | Japanese | 2 | EB01-012 | キャベンディッシュ | https://www.onepiece-cardgame.com/images/cardlist/card/EB01-012_r1.png?261113= |

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
2. Complete the 8 unmatched source locator cases (OP18 and EB05, both languages) using current official lists; dataset refresh is still needed.
3. Run repository npm test/lint/build with dependencies available.
4. Browser-test the popup, alternate candidate selection, remembered match, manual fallback, and auto-match on production.
5. Verify deployment of PR #20 and PR #21 merges on the live Worker.

**Verdict: partial test. The scanner is not yet fully tested.**


## Continuation update — 22 November 2026 (late check)
- GitHub Actions verified successful end-to-end workflow runs: #87 for the OCR set-code normalization change (PR #20), #88 for the OP-prefix normalization change (PR #21), and #89 for this reference-matrix report (PR #22). Each passed dependency installation, `npm test`, lint, and `vite build`. Two earlier OCR-fix attempts (#84/#86) failed, then corrected runs #85/#87 passed.
- Re-attempted production Worker open: browser fetch returned DisabledError; production remains **unverifiable** in this environment. A local shallow Git clone also failed because DNS cannot resolve github.com. GitHub repository connector access remains available.
- Code review identified an additional language-ranking weakness: the scanner's OCR-selected language was not passed to the parser. Without a language label in OCR, English cards can leave the language field blank, weakening candidate ranking. PR #23 adds a selected-language fallback and regression tests; its CI is pending at time of writing.
- Source/image and real card-photo OCR blocker persists: external image hosts cannot be reached/downloaded from the runtime. No real-card OCR results are claimed.


## OP18 / EB05 reference supplement — 22 November 2026
- Replaced the 8 `MISSING` placeholders with named card-number samples and official-image URL candidates. These 8 references were checked against the current set lists: OP18-001 Karoo / カルー; OP18-002 Igaram / イガラム; EB05-001 Jewelry Bonney / ジュエリー・ボニー; EB05-002 Doll / ドール.
- Secondary card-list verification: OP18 list references <https://www.shonentcg.com/blog/op-18-revealed-cards-tracker> and <https://opchase.gg/sets/op18/>; EB05 references <https://portaltcg.co.uk/blogs/news/one-piece-heroines-edition-vol-2-release-date-card-list> and <https://opchase.gg/guides/eb05-card-list-pitfalls/>.
- Attempted all 8 official image candidates directly through the browser tool (EN and JP URLs for OP18-001/002 and EB05-001/002). All returned inaccessible via the tool. Therefore: **source names/numbers verified; image load failed/unverifiable; no OCR output; catalogue matches/ranking not exercised.** The candidate URLs remain unverified and are not counted as loaded.
- Dataset inspection through GitHub connector: the current Koala Kollect data files contain 99 English and 92 Japanese product entries, but OP18/EB05 codes are not yet in those product lists; `cards.jsonl` also has zero OP18/EB05 rows. Large printing/observation files were not fetchable through the connector. Thus catalogue freshness gap is confirmed at source-dataset level.
- PR #23 language-fallback fix first CI run #90 exposed a regression: parser calls without a selected-language argument now defaulted to English. The fix preserves a blank parser default and passes the selected OCR language from the scanner both on initial scan and re-extract. CI run #91 passed all tests, lint, and build; PR #23 was squash-merged to master as 0af959d87852956fbc65937ad24bfb01adda3cc1.

- **PR #23 merged and verified:** scanner now uses selected `eng`/`jpn` as language fallback; Japanese/Korean script and explicit language labels take precedence. Regression coverage was added. CI #91 passed tests, lint and production build. The first CI run #90 failed, correctly catching that parser default had unintentionally changed; the fix was made before merge.

- **PR #24 merged:** extracted candidate-ranking priority into pure `rankCatalogueMatches` helper and added four unit tests covering remembered choice, OCR-name priority, language priority, and empty results. CI run #92 passed `npm test`, lint, and production build. This gives automated coverage for the ranking logic but still does not exercise the live Supabase catalogue dataset or UI popup.
- Current automated parser/ranking test suite: **12 tests passing** (CI run #92).


## User-provided scanner comparison evidence — 23 November 2026
The user supplied screenshots from a separate card-scanning app showing two real-card examples and its manual confirmation workflow. These are **user-provided screenshots of another app**, not images run through our own OCR engine; they do not count toward real-card OCR testing.

1. **Japanese Trafalgar Law, EB04-005:** The app identifies Trafalgar Law, EB04-005, and displays a price (£1.91). A scan-details panel compares the user's photo against the catalogue match, displays the matched-result card, and shows the full card/set (Egghead Crisis) with owned quantity. This is evidence that image-side comparison + card result + price display can make a useful scan flow.
2. **Kaido, OP17-062:** A blurry card scan first surfaced “Kaido (Parallel)” / OP17-062 with £7.50. The match details displayed several candidate thumbnails. The user then selected the ordinary Kaido / The World's Strongest Warriors / OP17-062 candidate priced £2.45. This demonstrates a real ambiguity where the first match is the wrong printing/variant and manual candidate selection is important. The screenshots show both parallel and ordinary printings with the same card number and different prices.

### Design implications for Grand Line Archive scanner
- Show the scan photo and chosen catalogue image side-by-side for visual verification.
- Show several candidate cards as image thumbnails with clearly distinguishable set, language, rarity, and variant labels; do not treat OCR card number as sufficient to auto-confirm.
- Keep the current “choose candidate / confirm / manual fallback” path. The screenshots validate the need for it, especially with blurry images and same-number variants.
- Provide a manual price input or editable price override on the chosen card, so a user can enter their own valuation rather than being forced to accept a market/catalogue value. Keep source/market price and user-entered value distinct if both exist; avoid silently replacing the user's override.
- Add regression/manual test scenarios: (a) clear Japanese EB04-005 Law photo; (b) blurry OP17-062 Kaido where Parallel is incorrectly top-ranked; (c) select regular printing from candidate list; (d) verify variant-specific price values remain attached to the selected printing; (e) manually enter/edit price; (f) close/choose “not sure” and manual search.
- No price override implementation has been made yet. These screenshots are evidence to guide implementation and testing only.


## Real card-photo OCR test — user supplied Saint Shamrock (23 Nov 2026)
**Sample 1 of real-card OCR tests.** Original user photo file (JPEG, 1152 × 2048) is accessible and was run through local Tesseract 5.5.0. The physical card appears to be English Saint Shamrock, OP18-119, cost 8, power 9000, foil/parallel-style art, inside a transparent holder. Online card-reference search independently confirmed Saint Shamrock OP18-119, The Dominance of God, English, Secret Rare, cost 8, power 9000, Holy Knights of God. Source: https://onepiecedb.io/card/saint-shamrock-op18-119 and https://www.optcg.gg/products/cards/OP18-119_p2. This external reference corroborates the card identification, not scanner catalogue matching.

### Image and OCR observations
- Image loaded locally: **PASS** (1152 × 2048 original JPEG; one actual physical card photograph).
- Card/name/number visual and reference identification: **Saint Shamrock, OP18-119, English**. Name is visible on the photo; number is confirmed from the online reference, but the collector number is too tiny/blurred in this photo to read reliably from pixels.
- OCR run on whole-card crop: text OCR is noisy and partial; title and card code were not reliably extracted.
- OCR on enlarged rules-text region captured fragments and some correct words/phrases, but not a reliable complete transcription. Example output included fragments like “You may trash … card from your hand … Play this Character card from your trash” and parts of “Holy Knights of God”, with multiple substitutions/omissions. **Rules-text OCR: partial / low accuracy.**
- OCR title crop: **FAIL** to produce reliable “Saint Shamrock”.
- OCR card-number crop: **FAIL / unreadable**, no reliable OP18-119 output.
- OCR language: card is visibly English, but the OCR result itself does not reliably classify language.
- Catalogue matching/ranking: **not tested against the live app/catalogue**; web reference was manually used to confirm identity.
- Real photo test status: **FAIL for automatic ID OCR in this photo; partial rules OCR**. Image is oblique, has reflective glare/holder, small code/name print, and low contrast near the bottom. This is a valuable real-photo failure sample for preprocessing/ROI/camera quality handling, not a synthetic test.


### Additional preprocessing attempt on Test #1
Applied manual card-face perspective rectification (approximate 4-corner homography), 3× upscaling, grayscale and CLAHE contrast enhancement, and Tesseract PSM variants (6, 7, 11, 13) to the title, rules and card-number edge regions. This is offline preprocessing experimentation, not an app implementation.
- Rectified card title: still failed exact OCR. OCR variants produced noisy approximations such as `Bainigsinamrock` and `Saihimsmamrock`, not reliable enough to accept.
- Rules region: slightly more legible fragments after rectification/upscale, but remains incomplete and substituted; no full correct transcription.
- Collector-number region: no reliable code output; tiny vertical/edge print and glare made OCR unsuccessful.
- Best result: image crop/rectification improved visibility for human review and partial rules-text extraction, but did not achieve reliable automatic card identification. This photo remains an automatic OCR failure. The next implementation direction is automatic card-border detection/rectification, region-specific OCR, and confidence-based candidate search rather than title/number hard-fail.


### Follow-up OCR variants on Test #1 (23 Nov)
Re-ran rectified card regions using Tesseract PSM 6/7/11/13 with grayscale, CLAHE, and sharpening, all upscaled 4×. OCR still did not recover the card title or card code. The best partial rules-text variants recognized fragments including “On K.O.”, “You may trash 1 card from your hand”, and “Character card from your trash”, but still missed/garbled other text. **No auto-identification pass**. This confirms ROI processing helps recover some key text but title/code remain the hardest, likely because of foil reflections, tiny vertical code print, and perspective/holder obstruction.


## Catalogue freshness and OP18 / EB05 gap investigation — 23 November 2026

- **Primary source freshness verified:** the upstream Koala Kollect `manifest.json` reports `generated_at: 2026-10-22T04:46:19Z`. Its English/Japanese product indexes contain 99 / 92 products and do not include OP18 or EB05. The cached product-page state lists the English and Japanese OP18 and EB05 product pages, but each was captured on 2026-10-08 with an empty series list. The source manifest and card catalogue therefore lag the current official card list.
- **Official OP18 pages confirmed:** English Bandai card list `series=569118` returns 159 results; Japanese Bandai card list `series=550118` returns 159 results. The Japanese page shows OP18-001 Karoo and OP18-002 Igaram with official Bandai image links. This confirms OP18 exists in both languages and is not a genuinely empty set.
- **Independent recent data comparison:** `hugoprudente/optcgjson` has OP18 and EB05 files with metadata date 2026-11-22: OP18 has 159 printing entries / 125 unique card numbers; EB05 has 96 printing entries / 72 unique card numbers. Its sample image links use Bandai's Asia-English host. It is currently English-focused; Japanese variants and image IDs still need independent validation. No artwork has been downloaded or copied.
- **Integration decision:** use the recent files as a comparison/test source, not as the primary production catalogue yet. Confirm provenance/licensing and validate Japanese printing identities and variant suffixes before wiring the feed into scanner results. Keep official Bandai URLs as image references and keep seller uploads separate.
- **Admin diagnostics improvement:** the Image Library now reports source manifest date/age, flags source feeds older than 7 days, identifies OP18/EB05 coverage gaps, and lists missing-image printings across assigned and unassigned sets (previously only unassigned missing-image rows were shown). It also reports actual load/failure counts for reference images currently rendered in the browser; this is not a whole-catalogue URL crawl.
- **Scanner improvements in the current PR branch:** lookup now checks up to six OCR number candidates instead of only the top candidate; card-number OCR uses an alphanumeric whitelist; name matching normalizes punctuation and partial OCR text; recognition language aliases `eng`/`jpn` are understood; local remembered-match keys use the selected catalogue card number. Regression tests were added for OCR substitutions, OP/EB/ST/PRB/promo number formats, language aliases, and partial-name ranking.
- **Still unverified:** no 100-card physical-photo OCR run has been completed. The current runtime cannot download source images to the local Tesseract process. The new browser gallery load counter can verify visible image loads/failures when an administrator opens the preview, but it is not a substitute for running OCR on the 100 physical/photo cases.


## Catalogue image fallback hardening — 23 November 2026

- Added a shared image resolver used by scanner matching, coverage diagnostics, and the reference gallery. A TCGCSV printing with no native image can now use official Bandai artwork for the same card key and language as an explicitly labelled base-image fallback.
- The coverage report now counts printing-specific official images, fallback images, and truly missing image references separately. Fallbacks are not counted as printing-specific images.
- The reference gallery can retry a failed primary image using an alternate official image reference for the same card key. The UI labels alternate/base artwork so it is not mistaken for the exact stamped or parallel finish.
- The 100-image smoke test now times out individual image requests after 12 seconds instead of hanging indefinitely, reports loaded/failed/timed-out counts, and displays sample coverage per target set. A complete matrix must show four samples for each of the 25 target sets, including OP-18 and EB-05.
- Added unit tests for printing-specific image selection, safe same-card fallback, refusing cross-card fallbacks, and preserving direct third-party references.
- Verification for commit `b769444b3c556cb49e54ba02fa146fb3a3321853`: GitHub Actions `build-and-test` passed tests, lint, and production build. Cloudflare preview deployment is queued/pending at the time of this note. Production has not been changed.
- Still required: browser-load test of the newly deployed preview, check the three EB04-005 references, run all 100 smoke-test images, and verify real-card scans. Base/alternate image fallback is a visual identification aid, not proof of the special printing's artwork.


## Official Bandai source links in scanner — 23 November 2026

- Scanner catalogue matches now expose an official Bandai card-list link when the printing's linked set code can be resolved. The reference image gallery already carries official source links; this adds the same source affordance directly to scanner candidate cards.
- Link resolver covers standard OP, EB, ST, PRB, and promo-list URL patterns in English and Japanese. Combined product identifiers such as OP14-EB04 intentionally remain unmapped until their series URL is independently verified.
- Live official page checks (browser inspection): OP18 English `series=569118` returned 159 results; EB05 English `series=569205` returned 96; PRB01 English `series=569301` returned 319; ST10 English `series=569010` returned 19; the English promo list `series=569901` returned 375. Official card-list pages may include reprints/other product-linked printings and the page's displayed results are not a guaranteed unique-card count.
- The official pages expose card number, rarity, card name, card attributes/effect, set association and card images. This is the primary verification source; the archive links to the official source rather than bulk-hosting Bandai artwork.
- Tests now cover English and Japanese URLs, promo links, DON!! separate source, and deliberately unmapped combined products.


## Combined OP14/OP15 and EB-04 official source routing — 23 November 2026
- Verified Bandai's English official series **569114** (OP14-EB04, 199 results) and **569115** (OP15-EB04, 196 results), plus Japanese series **550114**, **550115**, and standalone **550204** (Japanese EB04).
- English EB04-numbered cards route by printed card number: **EB04-011–041 → OP14-EB04 / 569114**; **EB04-001–010 and EB04-042–061 → OP15-EB04 / 569115**. This keeps the same EB04 prefix from linking to the wrong official list.
- Scanner matches and Image Library rows now pass the card number to the official-list resolver. Combined product codes also link directly to their Bandai series pages.
- Added regression tests for both combined product pages, Japanese EB04, English EB04 range boundaries and invalid numbers. No card data or artwork is copied; this change adds verified source links only.

## Rotation-aware card-number OCR — 23 November 2026
- Scanner number preprocessing retains the four focused upright lower-edge crops and adds three lower-footer crops after rotating the full photograph 90°, 180° and 270°.
- This covers cards photographed sideways and upside-down without multiplying the focused crop OCR calls by four. All seven number-area reads feed the existing candidate deduplication, catalogue lookup and human confirmation flow.
- Scanner status now explains that it is checking multiple orientations. A regression test confirms the supported rotation set.
- OCR crop enlargement is bounded to avoid creating oversized canvases from high-resolution phone photos; smaller focused crops can still be enlarged for readability.
- This is an OCR robustness improvement, not a verified photo benchmark; physical card testing across orientations is still needed.

## Adaptive contrast for card-number OCR — 23 November 2026
- Number-area crops now calculate a grayscale histogram and stretch the central 4th–96th percentile range when the crop has enough tonal spread. This adapts to darker/brightly lit photos and suppresses a small number of glare/shadow outliers.
- Flat/low-spread crops retain the conservative previous contrast curve instead of amplifying noise.
- Added pure-function regression tests for outlier handling, range stretching, monotonicity, and fallback. This is preprocessing only; it does not remove glare or detect card boundaries, and it has not yet been validated on a real-photo benchmark.

## Background-aware card photo crop — 23 November 2026
- When an administrator chooses **Crop to card**, photo preparation now attempts to detect a foreground card against a consistent background using corner-color consistency and foreground bounds. It centers the crop around the detected object (not the photo center) and adds padding.
- The crop only activates when detection confidence and aspect checks pass. Busy/uneven backgrounds, uncertain results, or crops that cannot fit safely fall back to the previous centered aspect crop.
- Added tests for offset-card detection, inconsistent-background rejection, aspect framing, and safe fallback. This is a simple background heuristic, not full perspective correction; physical photo testing remains needed.


## Foreground crop noise rejection — 23 November 2026
- Improved background-aware crop detection to use a coarse foreground mask and retain the largest 8-connected foreground component, instead of letting every thresholded pixel contribute to the crop's global bounds.
- This is intended to reject isolated dust, background specks, and disconnected shadows that previously could widen the auto-crop.
- The existing safe-fallback behavior is unchanged: inconsistent corner colors, unsuitable card geometry, or low confidence still use the centered aspect crop.
- Added a regression test with isolated foreground specks outside the card, verifying the detected bounds remain centered on the card component.
- This reduces sensitivity to disconnected noise; it does not solve cards on busy backgrounds or detect perspective corners.


## Noise-aware edge sharpening for card-number OCR — 23 November 2026
- Number-area crops now apply a mild 3×3 unsharp mask after grayscale contrast normalization. This is intended to recover small printed character edges softened by camera focus and enlargement.
- A contrast threshold leaves low-detail pixels unchanged so mild foil grain and sensor noise are less likely to be amplified. Sharpening is bounded and does not alter the original uploaded photograph.
- Added pure-function regression tests for edge strengthening and low-contrast noise preservation.
- This is a preprocessing enhancement, not a measured OCR-accuracy claim. It still needs browser/physical-card evaluation, especially on foil, glare, and already-sharp images; perspective correction remains outstanding.


## Scanner variant-choice clarity — 23 November 2026
- Reviewed the existing scanner confirmation flow before changing it. It already retained distinct catalogue printing IDs, showed the uploaded photo beside the selected catalogue reference, offered candidate thumbnails, and required an explicit confirmation; it did not auto-save stock.
- Improved the candidate picker so each option now exposes set name, rarity, and printing variant as well as card number, language, and set code. The selected candidate summary also shows the set name.
- When multiple catalogue printings share a card number, the confirmation dialog explicitly warns that OCR cannot determine the finish by itself and asks the user to compare the artwork and variant.
- Added focused regression fixtures for the OP17-062 Kaido normal/parallel pair and Japanese EB04-005 Trafalgar Law. These test candidate retention and identity metadata, not live catalogue completeness or OCR accuracy.
- Variant selection still requires human confirmation. Price editing/overrides are not implemented in this increment, and no prices are sourced or changed by this UI.


## Prevent stale card-number-only variant memory — 23 November 2026
- Found a subtle variant-selection risk during review: a browser preference keyed only by card number could promote a previously chosen Parallel printing when the next physical card with that same number was the Normal version (or vice versa).
- Removed that card-number-only preference from scanner ranking and removed its misleading checkbox. A prior choice can influence ranking only when the current uploaded photograph produces a match in the local/shared image-recognition memory; that remains a suggestion and still requires the user to confirm the candidate.
- Added/retained regression coverage for the ranking signal: verified image-memory matches can help ranking, but OCR name and language signals remain available when no image-memory match exists.
- This avoids treating a card number as a unique printing identity. It does not claim that image similarity can always distinguish foil/parallel finishes; human comparison and confirmation remain required.


## Preserve exact selected printing in inventory — 23 November 2026
- Traced the scanner-to-inventory handoff and found that the scanner's selected catalogue printing ID and reference image were not included in the Quick Add form's initial scan-field mapping or product insert payload. The descriptive variant label could also be dropped on this handoff.
- The selected catalogue match now carries its composite match ID, source printing key, reference image URL and image source into the scanner's confirmed fields and Quick Add form. The normal uploaded front/back/detail photographs remain separate and continue to be the product's own photos.
- Product creation now includes these four catalogue-reference fields alongside the existing variant label, but only when the extended product columns are confirmed available. The schema preflight checks all required columns before insert, so a missing migration stops the save rather than silently dropping the exact printing reference.
- Added those columns to the existing review-only admin feature migration. No SQL was executed and no live database was changed. The migration remains subject to review/approval before anyone applies it.
- Regression tests verify the reference metadata is included only with the extended schema and that Normal and Parallel OP17-062 records retain different match IDs, printing keys and image URLs despite sharing the same card number.
- This persists the exact catalogue reference with the inventory record; it does not replace seller-uploaded photographs, infer the finish from OCR, or make the scanner's candidate confirmation automatic.


## Inventory printing identity and edit safety — 23 November 2026

- Inventory rows now show the set code alongside the set name, plus the recorded language and variant label. When available, the exact catalogue printing key is shown as a separate identifier.
- The existing product edit workflow remains a partial update: catalogue match ID, printing key, reference image URL/source and legacy reference aliases are not part of the editable field list, so ordinary edits do not replace or clear them.
- Catalogue lookup from an existing product now also fills those catalogue identity/reference fields when the corresponding product columns exist and are blank, using the selected printing. Existing values remain untouched.
- Added a regression test asserting ordinary card edits cannot overwrite exact catalogue printing identity.
- This is an inventory UI/edit-flow safeguard, not a database migration or live deployment. The full variant-aware duplicate review and live schema compatibility review remain outstanding.


## Variant-aware inventory duplicate protection and schema preflight — 23 November 2026

- Quick Add now compares the selected catalogue match ID first, then printing key plus language, before deciding whether an existing card number/set is the same printing.
- Exact catalogue-printing matches are blocked with instructions to update the existing inventory record instead of creating a second product.
- Different confirmed catalogue printing IDs/keys are treated as distinct, so Normal and Parallel versions sharing a card number can be stored separately. Different language printings are also distinct.
- Older inventory rows without enough printing metadata are treated as possible duplicates. The administrator must inspect the existing row and explicitly confirm a separate printing; a variant label is required. This avoids silently assuming legacy rows are different.
- Duplicate lookup checks up to 50 rows for the same card number and set. This is a defensive application check, not a database uniqueness constraint.
- Added unit coverage for exact duplicates, Normal vs Parallel, English vs Japanese, and ambiguous legacy records.
- Added review-only SQL preflight checks that public.products exists with a UUID id, and that any existing public.product_images table has the required columns and UUID product_id before the migration attempts DDL.
- The migration remains review-only and has not been run. No database, production site or live inventory was changed.

## Inventory duplicate protection — 23 November 2026
- Duplicate classification now normalizes common language labels and abbreviations (English/EN, Japanese/JP, Chinese/ZH, Korean/KR) before comparing otherwise identical catalogue printing keys.
- A shared catalogue printing key is treated as an exact duplicate only when both entries have a known, matching language. If either language is missing, it is surfaced as a possible duplicate for administrator review rather than automatically blocking a potentially distinct language printing.
- Different stable printing keys remain distinct, preserving Normal/Parallel and other separate catalogue printings that share a card number. Different known languages remain distinct.
- Regression tests cover language aliases and missing-language ambiguity. This is code/test coverage only; no live inventory records or production database were changed.

- Migration review now includes a read-only audit query for repeated stable printing keys grouped by set, card number and normalized language. This surfaces pre-existing collisions (including blank-language legacy rows) before anyone considers a database uniqueness rule. The migration remains review-only and has not been executed.


## Scanner/inventory safety review — 23 November 2026
- Reset possible-duplicate confirmation whenever candidate card fields change, or when a different catalogue match or set is selected. A prior confirmation cannot be reused for a changed card.
- Catalogue match selection no longer carries a stale previous set ID when the new match has a different or unrecognised set code. The set must resolve from the selected match's code or remain unset for verification.
- Duplicate checks now paginate matching inventory rows rather than stopping at 50, and sort by product ID for stable pagination. This prevents large inventories from hiding an existing duplicate.
- These are defensive application changes on the PR branch. They do not change production or live database records. CI for the latest commit is pending.


## Stale scanner results cleared on rescan — 23 November 2026
- Starting a new OCR scan now immediately clears prior catalogue/manual match panels, selection, confirmation state, previous OCR readings/candidates, and lookup errors. This prevents a previous card's candidate from remaining visible if the new photograph fails OCR or lookup.
- Change is on PR #26 branch only; awaiting CI.


## Progress-log correction — 23 November 2026
- An earlier inventory-safety entry described duplicate lookup as checking up to 50 rows. That was superseded by the pagination work: duplicate lookup now retrieves matching rows in pages of 1,000 with stable ID ordering and continues until the final page. The earlier note is historical, not the current limit.
- The rescan reset improvement passed CI on commit `db679d6bfdc4b420b6e7fcfd710ff5bb72e0d4c8` (tests, lint, build).


## Shared recognition-memory coverage — 23 November 2026
- The shared-photo lookup previously capped reads at the first 5,000 examples without a deterministic order, meaning later confirmed examples could be ignored. It now reads ordered pages of 1,000 records until the final page, then compares the query hash against the complete returned set.
- This removes the silent 5,000-example coverage ceiling. Query volume/performance with a very large shared library still needs real database benchmarking; the migration remains review-only and has not been applied.


### Recognition-memory ranking safety
- Adjusted catalogue ranking so OCR name agreement and detected language agreement take precedence over a remembered image. Recognition memory now breaks ties only after these textual signals; it can no longer force a conflicting language/identity to the top of the list. Added tests for conflicting OCR signals and tie-break behavior. This remains a suggested ranking and requires user confirmation.


## Scanner-to-inventory catalogue handoff audit — 23 November 2026
- Confirmed scanner candidate selection maps printing identity (catalogue match ID, stable printing key, reference image URL/source, language, set code, variant label) into scan-field state; QuickAdd receives these values and resolves the selected set code to an existing set ID before saving.
- Found a detail handoff gap: choosing a catalogue printing from the scanner filled the primary fields and identity but did not refresh **counter, trigger text, or attributes** from that selected catalogue candidate. Those fields could remain OCR/previous scan values rather than candidate-associated details.
- Added a shared, testable buildCatalogueScannerFields mapping and used it for the scanner's selected-match application. It now carries all catalogue-derived card details and identity aliases, including counter, trigger, attributes, and reference aliases, consistently into QuickAdd.
- Added a regression test for Japanese EB04-005 Parallel printing handoff and verifies missing fields safely default to blank. The review remains code/test-only; live admin UI and database insert are not verified.

- Follow-up discovered those three fields were not part of the inventory product schema/payload, so merely mapping them into scanner state would not persist them. Added Counter, Trigger, and Attributes to QuickAdd, product insert payload, product edit fields, and the review-only migration (`counter integer`, `trigger_text text`, `attributes text`). Regression assertions now verify all three survive payload construction. Migration remains unexecuted; database persistence is not live-verified.


## Inventory inline-edit safety audit — 23 November 2026
- Reviewed inline stock/price updates and product-edit payload mapping. Existing edit payload remains restricted to editable fields and does not write catalogue printing identity/reference metadata.
- Found inline price and quantity inputs used `||` fallbacks, making blank values revert visually to stored values and obscuring validation; switched to nullish fallbacks so explicit zero and blank edits are represented correctly.
- Extracted `parseInventoryStockUpdate` to validate the stock/price pair consistently: whole-number non-negative stock, finite non-negative price, and no blank values. Explicit zero is supported.
- Added tests for zero price/quantity and invalid/blank input. No live database writes performed.


## DON!! set-attribution audit — 23 November 2026
- Identified that the catalogue loader was not consuming the source dataset's dedicated `don_sets.jsonl`, despite it containing source-set assignments keyed to printing IDs. This left gallery cards showing `Unassigned` when product links were absent.
- Verified the current source file contains **165 DON!! records and 308 unique printing keys**, with no conflicting duplicate printing-key assignments. The source manifest timestamp is **22 October 2026**; freshness is separately tracked in the catalogue coverage report.
- Added source slug normalization (OP/EB/ST/PRB, combined OP14-EB04/OP15-EB04, Double Pack DP-xx, and Promo) and loaded the DON!! set mapping into the catalogue cache.
- Gallery and coverage now prioritize a manually saved admin assignment, then the source DON!! set attribution, then linked product data. Gallery entries identify source-data attribution instead of implying a manually assigned set.
- Follow-up UI audit found the manual DON!! assignment dropdown omitted Double Pack sets even though the source data includes DP-02 through DP-12. Added DP-01–DP-12 options and standardized the Promo option value to `PROMO`, matching the normalized source-set code.
- DON!! entries continue linking to Bandai's DON!! PDF regardless of their mapped source set. Regression tests added for slug mapping, key attribution, and official DON!! link routing.
- This is source-data/code-level verification, not a live catalogue UI or database test. No live DB changes, production deployment, or migration execution.


## DON!! category-label consistency audit — 23 November 2026
- Found a detection edge case: category labels such as `DON card` and `DON cards` were normalized to `doncard`/`doncards` but did not count as DON!! printings. They could therefore bypass DON set attribution and show an incorrect `Unassigned` label.
- Expanded exact category recognition for DON, DON card, and DON cards while deliberately not matching unrelated names such as `Donquixote`.
- Added regression coverage for spaced/punctuated DON labels and a non-DON category false-positive guard. CI verification is pending; no live catalogue/database change was made.


## Bulk import safety and card-detail preservation audit — 23 November 2026
- Found that the CSV bulk-import template and field mapping omitted Counter, Trigger Text and Attributes. These values could be lost when importing catalogue-reviewed card details, and the extended-schema preflight did not consider them.
- Added the three columns to the template, parser aliases, catalogue-match application, insert form payload and extended-column preflight, so the fields are checked before any import attempts to write them.
- Extracted CSV parsing into a testable module, added unmatched-quote and duplicate-header errors, and made blank rows safe to ignore while rejecting text after closing quotes and accepting multiline quoted cells.
- Added duplicate detection within the uploaded CSV as well as existing inventory. Identity matching normalizes set-code formatting and treats known different languages or variants as distinct; blank/Normal/Base variant labels are treated consistently, while ambiguous missing-language records remain flagged for review.
- Numeric preflight also validates non-negative integer Power/Cost/Counter, non-negative price, and whole-number stock; a dash is treated as a blank numeric value rather than producing NaN. Regression tests cover field mapping, quoted commas/quotes, multiline cells, CRLF and blank rows, malformed CSV, duplicate identity, and numeric edge cases. Import was not executed; no live inventory was changed. CI passed on commit `76e72efd` (tests, lint, build).


## Checkout stock/price revalidation audit — 23 November 2026
- Found that checkout previously trusted the basket's cached price and stock values without a fresh product query immediately before order creation.
- Added a pre-check against current product records: only active products, valid prices, and sufficient stock are accepted. Changed prices or availability stop checkout and refresh basket values so the customer can review them. Order totals and order-item unit prices are derived from the refreshed product rows.
- If order-item insertion fails, checkout now attempts to delete the empty pending order and reports if cleanup is denied/failed.
- Added unit tests for fresh totals, unavailable/draft items, stock shortage, price changes, and invalid values. This is still a client-side check and does not prevent simultaneous checkouts from overselling; server-side atomic stock reservation and database policies remain necessary for production order safety. No orders, stock, or live database data were changed. CI passed on commit `b04472d8` (tests, lint, build).


## Duplicate cart quantity audit — 23 November 2026
- Checkout validation previously checked each basket line against stock independently. A malformed/restored basket containing repeated product IDs could request more total copies than stock while each individual line passed.
- Added aggregate requested quantities per product and one consolidated insufficient-stock issue per product. Regression test covers duplicate lines whose combined quantity exceeds stock.
- CI verification pending. This is still not atomic stock reservation; concurrent customers can race, so a server-side transaction/RPC remains required before live sales.


## Storefront publication visibility audit — 23 November 2026
- The public shop and product detail pages already use a strict active-status filter, but it was inline in the application and lacked isolated regression coverage.
- Extracted a shared helper that permits only explicitly active products (case/whitespace normalized); draft, archived, blank and unknown statuses remain private. Added tests for status edge cases and null inputs.
- This client-side visibility filter is supplementary; the actual public database access must be restricted by RLS policies. Existing RLS is not verified against the live database, and no policy or database changes were made. CI passed on commit `652d80c5` (tests, lint, build).

- Added a read-only product visibility/RLS audit SQL file for the authorised live-schema review: reports RLS flags, existing product policies and expressions, API-role grants, effective privileges, and status counts. It contains SELECT statements only. Crucial caveat: permissive RLS policies combine with OR, so an existing broad public policy must be reviewed/revised rather than assuming a new active-only policy would restrict it. No live DB access or changes.


## Checkout double-submit and thrown-error recovery audit — 23 November 2026
- Added a synchronous ref guard so rapid repeated checkout clicks cannot launch multiple order-creation attempts before React state updates.
- Wrapped checkout in try/catch/finally so unexpected exceptions report an error and always release the busy state. If an order was created but item insertion did not finish, it attempts to clean up the pending order and reports cleanup failures.
- The safeguard is client-side only and cannot replace server-side idempotency/transaction protection. CI passed on commit `b7001543` (tests, lint, build).


## Order-status validation audit — 23 November 2026
- Admin order status changes now validate against the supported lifecycle values (pending, processing, shipped, completed, cancelled) before issuing an update. UI dropdown values were already restricted; this adds a guard at the action boundary.
- Added regression tests for accepted values, normalization, and invalid/empty inputs. Database constraints and live RLS remain unverified. CI passed on commit `30f3a5c3` (tests, lint, build).

- Admin order-status updates also use per-order in-flight guards, try/catch/finally error recovery, and reliably release busy state. This prevents rapid repeated status-change requests and stuck UI after unexpected errors. CI pending.


## Order-history loading recovery audit — 23 November 2026
- The customer/admin order-history loader previously handled returned Supabase errors but could remain in a loading state if a query unexpectedly threw.
- Added catch/finally recovery: surfaced the error and clears stale order/order-item state; the loading flag is always released. No live orders were accessed or modified. CI pending.


## Catalogue loading recovery audit — 23 November 2026
- Product/category/set catalogue loading handled Supabase returned errors but unexpected exceptions could leave the loading indicator stuck.
- Wrapped the loader in catch/finally, reports the failure and clears stale catalogue/category/set state, and guarantees loading state resets. CI pending.

- Order-status controls now serialize updates globally and disable all status dropdowns while one update is in flight, keeping the shared busy indicator accurate. CI pending.


## Homepage settings load recovery audit — 23 November 2026
- Website settings loading now catches unexpected Supabase/network exceptions and exposes a recoverable error instead of allowing the async callback to reject silently. CI pending.


## Admin sign-in security cleanup — 23 November 2026
- Removed the hardcoded four-digit frontend access code from the administrator sign-in screen. It was shipped in the client bundle and therefore offered no real security, while adding an unnecessary gate for legitimate admins.
- Admin sign-in continues to require Supabase authentication and a verified `profiles.role = admin`; an already authenticated admin can proceed directly. UI role checks are not a substitute for database RLS policies, which remain a separate review requirement.
- No database, account, or production changes made. CI pending.


## Admin product publication error recovery — 23 November 2026
- Publishing/unpublishing an inventory product now catches unexpected Supabase/network exceptions, reports a clear error, and always releases the row's busy state via `finally`. Previously a thrown request could leave the action stuck.
- Existing confirmation and returned-error handling retained. CI pending.


## Admin inventory save error recovery — 23 November 2026
- Inventory stock/price save now catches thrown Supabase/network errors and always clears its busy state. Previously a thrown request could leave the row's save action stuck; returned database errors remain surfaced as before.
- Validation still requires a non-negative integer stock count and valid non-negative price. CI pending.


## Admin catalogue fill and product edit recovery — 23 November 2026
- Catalogue-fill updates and product-edit saves now catch unexpected request exceptions, show an actionable error, and release their saving state in `finally`. Returned Supabase errors remain handled. This prevents stuck save buttons during network failures.
- Catalogue-fill still only applies missing catalogue details and leaves inventory, price, and uploaded photos untouched. CI pending.


## Bulk-import duplicate-submit guard — 23 November 2026
- Added a synchronous ref lock to bulk CSV import so rapid repeated clicks cannot start concurrent imports before React updates the busy state. Lock is always released in `finally`, including failures.
- Unexpected bulk-import errors now use a safe fallback message if the thrown value has no message. Partial row failures continue to be reported individually. CI pending.


## Quick-add duplicate-submit guard — 23 November 2026
- Quick Add now has a synchronous submission lock, preventing rapid double taps/clicks from creating duplicate product records while the asynchronous save or photo-link workflow is in progress. The lock resets in `finally` on all outcomes.
- The existing photo-upload partial-save recovery remains in place, directing the user to retry photos on the saved product rather than re-create it. CI pending.


## Photo-upload duplicate-submit safeguards — 23 November 2026
- Added synchronous upload locks to both Image Library batch uploads and Stock Photography product-photo uploads. Rapid taps cannot start concurrent upload batches before the React busy state renders.
- Locks are released in `finally` on success or failure; existing partial-upload rollback/recovery paths remain in place. These are UI reliability safeguards, not storage/database changes. CI pending.


## Photo-upload queue preservation — 23 November 2026
- Image Library now rejects file-selection additions while an upload batch is in progress and removes only the batch that actually uploaded, rather than clearing the entire queue.
- Stock Photography now removes only the photo IDs in the successful upload snapshot. Photos added during the upload remain queued for the next batch.
- This prevents new photos from being silently discarded when an upload is already running. CI pending; no storage or product data changed.


## Camera capture reliability review — 23 November 2026
- Added a synchronous capture lock so rapid taps cannot initiate overlapping camera captures before React updates the disabled state.
- If camera startup/preview playback fails, the acquired stream is now stopped and the video element detached, preventing an error path from leaving camera tracks active.
- Code-only safeguard; browser/device camera testing remains outstanding. No production or database changes. CI pending.


## Admin photo-preview cleanup on workspace exit — 23 November 2026
- AdminDashboard now revokes all remaining queued-photo preview object URLs when the workspace unmounts. Previously previews were revoked when individual photos were removed or after a successful save, but leaving the admin workspace with an unsaved queue could retain browser object URLs.
- The cleanup uses a ref to the latest photo queue so it does not revoke retained previews during normal queue updates. No photo files or storage records are changed. CI pending.


## Photo queue limit feedback — 23 November 2026
- Photo Studio now explicitly reports when selected images exceed the 12-photo batch limit, in addition to reporting non-image files skipped. A cancelled file picker no longer displays a misleading queue-limit message.
- Accepted files remain queued and capped as before; this is feedback only and does not alter uploads. CI pending.


## Stock-photo preview cleanup after successful upload — 23 November 2026
- Stock Photography now revokes queued preview object URLs after a successful upload and removes the matching uploaded queue entries. This closes a lifecycle gap where uploaded previews were removed from state without releasing their browser object URLs.
- Failed uploads still retain the queue and previews for retry. No storage/database/production changes. CI pending.


## Image Library gallery request ordering — 23 November 2026
- Added a request sequence guard to the catalogue-reference image gallery. If searches, language filters, or pagination overlap, only the latest request can update gallery state; earlier results/errors/loading completions are ignored.
- The request sequence is invalidated when the gallery effect is cleaned up, so responses from an obsolete filter or unmounted panel cannot overwrite the current view. No catalogue data or DB changes. CI pending.


## Image Library saved-image refresh ordering — 23 November 2026
- Added a request sequence guard to the saved-image listing. Rapid refreshes or refreshes overlapping with upload/delete operations cannot let an older response overwrite the newest image list or error/loading state.
- The current request is invalidated on panel cleanup. No storage/database changes. CI pending.


## Image reference matrix duplicate-run lock — 23 November 2026
- Added a synchronous lock around the catalogue image reference matrix check so rapid clicks cannot launch overlapping 100-reference checks before the disabled state renders.
- Lock is released in `finally` on completion or failure. This avoids duplicate browser image-check traffic; it does not change the test set or catalogue data. CI pending.


## Image Library selection feedback — 23 November 2026
- Image Library selection now reports non-image files rejected and images skipped when the 30-file batch limit is reached, instead of silently filtering/truncating those selections.
- Accepted files stay queued; upload locking and queue preservation remain unchanged. CI pending.


## Image Library delete lock — 23 November 2026
- Added a synchronous delete lock and disabled all image delete buttons while one deletion is in progress, preventing rapid duplicate deletion requests or overlapping delete operations.
- Lock releases in `finally` after success/failure; confirmation remains required. No storage/database changes beyond the existing user-requested deletion action. CI pending.


## DON!! source-set save concurrency audit — 23 November 2026
- Found that DON!! source-set assignment buttons only disabled the row currently saving. Two rapid clicks, or saves on different DON!! rows, could start overlapping writes while the single saving-state value was overwritten.
- Added a synchronous save lock and disabled all assignment save buttons while a save is active. The lock releases in `finally`; unexpected errors now receive a safe fallback message.
- Code-level safeguard only. No live catalogue/database records were changed; CI verification is pending.


## DON!! override language isolation — 23 November 2026
- Found a schema/keying weakness in the manual DON!! source-set override path: the table's primary key and upsert conflict target used only `printing_key`, while each override also carries a language and the catalogue is indexed independently for English and Japanese.
- Updated the review-only SQL definition to use the composite primary key `(printing_key, language)`; updated reads, catalogue matching, and upserts to use the same composite identity.
- This prevents an English override from replacing or being applied to a Japanese printing if the upstream key is shared. The migration remains review-only and has not been applied. CI is pending.

## Product front-image rollback hardening — 23 November 2026

- Product photo linking now reads and retains the previous `products.image_url` before changing it to the newly uploaded front photograph.
- The front-image update verifies that the target product row was actually returned, rather than treating a zero-row update as success.
- If the front-image update fails or its response is ambiguous, the upload recovery path attempts to restore the previous image URL before removing the new image metadata and uploaded storage files. Any rollback failure is included in the surfaced error.
- This remains best-effort recovery across separate Supabase Storage and database operations, not a single atomic transaction. No live database changes or migrations were performed.
- Follow-up concurrency safeguard: rollback now restores the previous product image only when the row still contains the exact front-image URL written by this upload. This avoids overwriting a newer image selected by another administrator during recovery.
## Quick Add photo queue preservation — 23 November 2026

- Quick Add now reports the exact photo IDs included in the successful save (including the retry path for a product whose photo upload previously failed).
- The admin parent revokes preview URLs and removes only those uploaded IDs from the current queue. Photos added while the asynchronous save is running remain queued instead of being cleared by a stale render snapshot.
- This mirrors the snapshot-based queue preservation already used by the stock photography and image-library upload flows.


## Quick Add set-code reassignment safety — 23 November 2026
- Found that changing the Set code after applying a catalogue match could leave the previous `set_id` selected in form state. Saving could therefore associate the card with the old set even though the visible set code had changed.
- Added shared punctuation-insensitive set-code normalization/resolution. Initial scanner values, catalogue matches, manual set-code edits, and final save resolution now use the same lookup; editing the set code clears or replaces the selected set ID instead of retaining a stale association.
- Added regression coverage for OP/EB codes with and without hyphens and unknown set codes. CI verification pending. No live inventory/database changes.


## Quick Add stale catalogue-identity invalidation — 23 November 2026
- Extended the set reassignment fix: editing the card number, set code, language, or variant now invalidates the previously selected catalogue printing identity and its reference-image provenance. This prevents an old printing key/image from silently travelling with manually changed card identity fields.
- Centralized the form update in a pure helper and added regression coverage for all four identity dimensions, including normalized set resolution after a set-code change. CI verification pending. No live inventory/database changes.

- The Collection / set dropdown uses the same identity-aware update path as manual set-code edits, so changing the set through either control cannot retain an obsolete catalogue printing identity.


## Admin product deletion confirmation — 23 November 2026
- Found that the product delete action treated a successful Supabase response with zero affected rows as a completed deletion. Under row-level security or a stale product list, the UI could report success even though no product row was deleted.
- The delete now requests the deleted row ID and confirms that a row was actually returned before refreshing the inventory or removing its Storage photographs. Added regression tests for confirmed deletion, zero-row/no-error responses, and database/RLS errors.
- No product rows, Storage objects, or live database policies were changed. CI verification pending.

- The set dropdown also retains the exact selected set row ID (rather than re-resolving a potentially duplicated set code), while still invalidating stale catalogue identity fields.


## Bulk-import set-code normalization — 23 November 2026
- Aligned CSV bulk-import set matching with Quick Add by using the shared punctuation-insensitive set-code resolver. Equivalent values such as `OP17` and `OP-17`, or `EB04` and `EB-04`, now resolve to the existing set row rather than producing a false unmatched-set warning and importing without a set link.
- The bulk import still uses the exact resolved set row ID for the product payload. No CSV was imported and no live inventory/database records were changed. CI verification pending.


### Bulk-import catalogue identity preservation — 23 November 2026
- Selecting a catalogue match in Bulk Import now carries its catalogue match ID, stable printing key, reference image URL, and source through to the imported product payload.
- The extended-schema preflight includes those identity columns, so imports fail safely before inserting any rows if the approved columns are not present.
- Regression coverage verifies that Japanese/parallel catalogue identity survives product payload construction. CI verification passed for the import identity mapping and duplicate-key checks.

- Follow-up: Bulk Import duplicate detection now prefers the stable catalogue printing key when both records have one. Distinct printing keys are not treated as duplicates even when card number, set, language, and display variant label match; legacy rows retain the conservative fallback. Regression tests cover distinct and identical printing keys.


### Ambiguous normalized set-code safeguard — 23 November 2026
- Set-code normalization now links a set only when exactly one site set matches the normalized code. If legacy data contains both OP17 and OP-17 as separate set rows, Quick Add and Bulk Import leave the relationship unresolved rather than selecting an arbitrary row. An exact set selected from the dropdown still preserves its exact ID.
- Added regression coverage for ambiguous normalized set codes. Quick Add's displayed set selection now uses the same normalized resolver as save-time matching. CI verification pending.

- The Collections and Sets admin flow now also blocks creating a set whose code collides after punctuation normalization, preventing new ambiguous set records from being introduced. Regression coverage added; CI verification pending.


### Collections admin network recovery — 23 November 2026
- Category and set creation now catch unexpected request failures and always release the shared busy state in finally. Duplicate-name/code checks and existing success feedback remain intact. CI verification pending.

- Set creation now checks a fresh read of existing set IDs, names, and codes rather than relying only on the admin screen's potentially stale set list. The name check is case-insensitive; the normalized code check still rejects punctuation-equivalent collisions. CI verification pending.


### Bulk Import zero-value preservation — 23 November 2026
- Applying a catalogue match now preserves legitimate numeric zero values for power, cost, and counter fields instead of falling back to the original CSV values. Empty/null catalogue fields still retain the CSV value. Regression tests cover zero, string-zero, and blank fallback cases. CI tests, lint, and production build passed in run 45154091787.

- The bulk-import extended-schema preflight now treats numeric zero as a populated card detail, ensuring zero-only power/cost/counter data still triggers the required column check. Regression tests cover numeric and string zero values. CI tests, lint, and production build passed in run 45154282261.


## Confirmed admin product-update results — 23 November 2026
- Inventory stock/price saves, publication toggles, and catalogue-fill updates now request the affected product ID and treat a zero-row/no-error response as a failure. This matches the existing confirmed-delete safeguard and avoids reporting success when a stale product row or RLS policy prevented the update.
- Added unit coverage for successful, zero-row, and database-error update responses. No live inventory, product, or database records were changed.

- Follow-up audit also applied the confirmed-row check to the full product-edit form save, so every product update path in the admin inventory now distinguishes a successful affected-row update from a zero-row/RLS-denied response. CI verification pending.

- Order-status updates now also verify the affected order ID and report zero-row/RLS-denied responses as failures rather than success. Added regression coverage for confirmed, missing-row and database-error outcomes. No live orders were changed; CI pending.


## Checkout order-save and cleanup verification — 23 November 2026
- The checkout path now marks order items as saved immediately after the item insert succeeds. Unexpected errors after that point no longer trigger cleanup that could delete an otherwise valid order.
- If saving order items fails, the compensating order deletion now requests the deleted order ID and verifies an affected row before claiming the empty pending order was removed. The exception-recovery cleanup uses the same confirmation check.
- Added regression coverage for confirmed deletion, zero-row/no-error responses, and database/RLS errors. This is still best-effort client-side compensation, not an atomic checkout transaction or stock reservation. Concurrent checkout stock protection remains a server-side requirement.
- No live orders, stock, database policies, or migrations were changed.


## Bulk Import template download correction — 23 November 2026
- A review of the actual download path found that the generated CSV template appended an unrelated code fragment to the header row instead of a newline. This would make the downloaded template's final header invalid.
- Moved the supported template header list and CSV generation into a pure helper and added regression coverage for the exact header row and newline. The downloadable template now matches the parser's supported columns.
- No CSV was imported and no live inventory or database records were changed.


## Physical-photo validation of PR #26 number-region OCR — 23 November 2026

**Sample:** the user's real English Saint Shamrock photo (OP18-119), original JPEG 1152 × 2048. The card is inside a rigid holder with substantial tabletop/background margins; it does not fill the frame.

- Reproduced the PR #26 number-region crop geometry locally with Tesseract 5.5.0: bottom-left, bottom-right, full bottom edge, lower-centre, plus footer bands after 90°, 180°, and 270° rotations.
- Ran the same alphanumeric OCR whitelist (A-Z, 0-9, hyphen) and comparable contrast enhancement/upscaling/sharpening. **None of the seven region outputs produced a valid OP/EB/ST/PRB/P- card number.**
- Also manually rectified the card face to a 600 × 1160 crop and reran the four bottom-region crops. No valid card number was recovered.
- This is a genuine physical-photo negative result for the new region approach on a photo with large surrounding margins. It is not a CI failure and does not prove every close-cropped card will fail.

### Code-review finding / next correction
The prepareCardNumberRegions() function currently computes footer zones as percentages of the entire uploaded photograph. It does not first detect/trim the physical card boundary. On this 1152 × 2048 scene, the card ends well above the photo's bottom 28% band, so the two bottom-corner crops mostly contain background. The lower-centre/rotated crops contain portions of the card but still do not reliably isolate the tiny footer number. Add card-boundary detection or a robust card-crop step before number-region generation; alternatively expose a manual crop step and clearly state when the footer is outside the scan region. Preserve the original photo for evidence.

The current scanner also only performs catalogue lookup when at least one card-number candidate is extracted (or a remembered image supplies a number). This sample produced no valid number, so no catalogue candidate lookup can occur. A future name/visual fallback would help, but it must remain explicitly unconfirmed until the user chooses a candidate.

## Official OP18 image loading update — 23 November 2026
The Bandai English card-list page (series=569118) and Japanese card-list page (series=550118) were opened successfully. Their official image links were followed and rendered for all four OP18 sample slots:
- English OP18-001 Karoo — image loaded and visually inspected.
- English OP18-002 Igaram — image loaded and visually inspected.
- Japanese OP18-001 カルー (Karoo) — image loaded and visually inspected.
- Japanese OP18-002 イガラム (Igaram) — image loaded and visually inspected.

These four OP18 image cases are now **visual-load PASS** (4/4), and the official page confirms their names/numbers/languages. They were not passed through local OCR; browser-rendered image inspection does not count as OCR testing. The exact image URLs include Bandai's cache-busting query strings in the page links.

EB05-001/002 English and Japanese direct Bandai image-path attempts were still inaccessible through the browser tool. Those four image slots remain **candidate URL / load unverified**, with no OCR result. This does not imply the official cards do not exist.

## PR #26 verification snapshot — 23 November 2026
- PR #26 head c6af838a67717d41ff74b4e11bf20d4f3683e567 passed GitHub Actions run #411: dependency install, npm test, lint, and production build.
- This verifies code/test/build only. The physical-photo number-region attempt above failed to identify OP18-119. No browser preview or live Worker deployment was available; production status remains unverified.
- PR #26 is still open and unmerged. No production deployment or inventory/database mutation was performed.


## EB05 official image-load recovery — 23 November 2026

Correction to the earlier direct-path attempt: the four EB05 base-image URLs initially failed when opened without the Bandai card-list page's cache-busting query string. Opening the official Bandai series pages and following their own image links worked. English series 569205 returned 96 results; Japanese series 550205 returned 96 results. Official images loaded and were visually inspected for:
- English EB05-001 Jewelry Bonney — PASS.
- English EB05-002 Doll — PASS.
- Japanese EB05-001 ジュエリー・ボニー (Jewelry Bonney) — PASS.
- Japanese EB05-002 ドール (Doll) — PASS.

Together with the four OP18 images above, all **8/8 previously unmatched OP18/EB05 sample image slots are now visually load-verified**. Official Bandai page associations confirm the card numbers, names, set and language. No local OCR was run on these browser-rendered images, and no real-photo OCR count changes. For future reference, use the official card-list links (including their generated query parameters) rather than testing only the bare image path.


## Official Bandai image-load run — 23 November 2026

A manual browser-rendering check was completed for the 100-row language/set sample matrix. Each successful result below came from following the image link on the official Bandai card-list page and visually seeing the card image render. These are **image-load checks only**; none of these browser images was passed to local OCR.

| Target set | Official image loads | Status |
|---|---:|---|
| OP01–OP16 (each) | 4/4 each | PASS — 64/64 |
| OP17 | 0/4 | Unverified — official series pages 569117/550117 inaccessible through browser tool |
| OP18 | 4/4 | PASS |
| EB01 | 3/4 | 1 Japanese image retrieval failed |
| EB02 | 3/4 | 1 Japanese image retrieval failed |
| EB03 | 4/4 | PASS |
| EB04 | 4/4 | PASS; English samples loaded from combined OP14/OP15-EB04 pages, Japanese samples from standalone EB04 page |
| EB05 | 4/4 | PASS |
| PRB01 | 4/4 | PASS |
| PRB02 | 4/4 | PASS |

**Total: 94/100 image-load PASS, 2/100 official image retrieval errors, 4/100 unverified.** The two retrieval errors are Japanese EB01-001 (EB01 sample) and Japanese EB01-001_p2 (EB02 sample). The official Bandai page itself lists both cards, but clicking the corresponding image links and retrying their direct image URLs returned Internal Error; do not treat this as proof the source files are absent. The four unverified cases are OP17 English/Japanese sample 1 and sample 2; both official OP17 series page requests (569117 and 550117) returned inaccessible errors. Third-party references corroborate the OP17 sample identities (EB04-007 Roronoa Zoro and EB04-061 Monkey.D.Luffy), but those are not counted as official image loads.

### Exact official page series checked
- OP01–OP18 English: 569101–569118; Japanese: 550101–550118 (OP17 page inaccessible; OP18 passed).
- EB01–EB05 English: 569201–569205; Japanese: 550201–550205 (EB04 English uses the combined OP14/OP15-EB04 product pages; standalone English 569204 was inaccessible).
- PRB01/02 English: 569301/569302; Japanese: 550301/550302.

### Sample URL corrections discovered
The official Bandai PRB pages showed the English PRB01 OP01-006 sample as OP01-006_r1.png (not the earlier guessed _p3 filename), and the English PRB02 EB01-009 sample as EB01-009_r1.png (not the earlier guessed _p1 filename). The matrix URLs above have been corrected to the exact image-link destinations returned by Bandai. Japanese PRB01/02 image paths matched the selected variants.


### Latest CI and production access check — 23 November 2026
- After the 94/100 official image-load report update, PR #26 head `6394868e73055e29d23ecbb6747ffb970756f12d` passed GitHub Actions run #414. The `build-and-test` job completed dependency installation, `npm test`, lint, and production build successfully.
- PR #26 remains open and unmerged. This run did not merge or deploy it.
- Rechecked the production Worker root and `/shop`; both remain inaccessible through the browser tool, with `/shop` returning DisabledError. Live UI behaviour and deployed code version remain unverified.
- Tried downloading an official Bandai card image directly into the local OCR runtime; download failed. Therefore official browser-rendered images remain visual-load checks only, not OCR test inputs.


## Reproduction of PR #26 card-boundary failure on Saint Shamrock photo — 23 November 2026

The user's original 1152 × 2048 photo was re-tested against the current PR #26 crop geometry and detectForegroundCardBounds() implementation.

### Exact number-region geometry
The four upright crops in prepareCardNumberRegions() are calculated against the entire camera frame, not a detected card rectangle:
- Bottom-left: x=0–829, y=1475–2048.
- Bottom-right: x=323–1152, y=1475–2048.
- Full bottom edge: x=0–1152, y=1352–2048.
- Lower-centre: x=138–1014, y=1270–2048.

The physical card face in this photograph is approximately x=103–738, y=334–1178. Therefore all four upright number crops begin below the card face and have zero card-face overlap. The rotated footer bands do not recover the lower-right number area either: 90° maps the footer band to source x>749 (outside the card's right edge); 180° maps it to source y<717 (upper portion, not the footer); 270° maps it to source x<403 (left portion, not the lower-right footer). Re-running Tesseract 5.5.0 on the seven PR-style crops produced noisy background/card fragments only; none contained a valid OP/EB/ST/PRB/P- number candidate.

### Existing foreground detector also rejects this photograph
Reproduced the current detectForegroundCardBounds() corner sampling on the original pixels:
- Top-left corner mean RGB: (219.8, 211.0, 197.2)
- Top-right: (208.6, 201.3, 186.1)
- Bottom-left: (172.7, 109.9, 81.5) — hand/fingers enter this corner
- Bottom-right: (182.4, 173.0, 164.0)
- Current average background estimate: (195.9, 173.8, 157.2)
- Maximum corner deviation: 101.7, exceeding the hard rejection threshold of 42.

So detectForegroundCardBounds() returns null on this exact user photo before connected-component bounds are considered. A median/three-corner background estimate avoids that first rejection, but the hand and card/holder form a large connected foreground region extending to the bottom of the frame; the largest-component bounding box is still not a card-only rectangle. This is a confirmed limitation of the current simple foreground detector on a card held in-hand.

### Corrective requirement
The scanner must first obtain a trustworthy card rectangle before computing footer OCR regions. Recommended safe behaviour:
1. Try automatic card-boundary/quad detection and validate aspect ratio and confidence.
2. If the detector cannot isolate the card (for example, a hand touches the card), show a simple manual crop/align step rather than running footer OCR against the whole scene.
3. Generate number/title/detail OCR regions only inside the validated card crop.
4. If the crop still cannot expose a readable number, keep OCR uncertain and use manual number search/candidate confirmation; never auto-confirm from a weak match.

This is a reproduced physical-photo failure, not a CI failure. It does not imply all close-cropped card photos fail.

### Latest repository / CI state
- master currently points to 70029519438f2a15e6030523104325552d60674a (shared card-recognition memory commit).
- PR #26 (feature/scanner-number-first-verification) is open and unmerged; current head e77d953603e1b78d9e851badbaa6c800d9b84a17.
- GitHub Actions run #415 (45172660447) on that exact PR head completed successfully on 23 November 2026: dependency install, tests, lint, and production build all passed.
- Passing CI does not change the physical-photo failure above. The production Worker still cannot be fetched by the available browser route, so deployed version and live scanner UI remain unverified.


### Scanner UI code review after PR #26 number-first changes — 23 November 2026
- The scanner now exposes a number-reading diagnostics panel with each crop label, OCR confidence and raw text; when no valid number is read it explicitly says so and advises manual entry.
- Manual card-number search is available without scanning first.
- The confirmation dialog compares the original user photo with the catalogue reference, shows name/number/language/set/rarity/variant, and warns when several printings share a card number.
- Catalogue matching still depends on a valid number candidate (or a remembered image supplying a number). If the number crop misses the card, there is no automatic name/visual candidate fallback; manual number search is the recovery path. There is not yet an interactive manual crop/align step.
- These are source-code observations only. Browser UI and production deployment remain unverified.

### Latest repository / CI state — 23 November 2026 (refreshed)
- master: 70029519438f2a15e6030523104325552d60674a.
- PR #26 remains open and unmerged; feature branch head after report updates: 086ac3dfaed047ea6020e995a98744100441f689.
- GitHub Actions run #417 (45174932236) passed on that exact branch head: dependency install, tests, lint and production build all succeeded.
- The CI pass does not validate physical-card OCR, browser camera behaviour, Supabase policies or live Worker deployment. Production Worker fetch remains DisabledError through the browser route.


### Scanner crop-boundary audit and latest CI refresh — 23 November 2026

- Re-fetched PR #26 metadata rather than relying on the older report snapshot. PR is open, unmerged, base `master`; head is `79f90358082bc3f37ba12d34eda78f6fdf792b50`.
- GitHub Actions run #418 (ID 45175439325) is confirmed successful on that exact head. CI checks dependency installation, tests, lint and production build only.
- Source audit of `src/admin/CardScanner.jsx` and `src/admin/cardNumberRegion.js` confirms the number OCR regions are still fixed normalized bands of the full source photo (four bottom zones plus three rotated footer bands). They are not bounded by a detected card rectangle. This matches the Saint Shamrock photo's reproduced zero-overlap failure.
- `src/admin/imageTools.js` has a conservative foreground-card detector, but it estimates background from all four corners and rejects high corner spread. It is not currently integrated into the number-first OCR preparation. On an in-hand photo with fingers touching a frame edge, a background detector alone is insufficient to guarantee a card-only rectangle.
- **Regression-safety decision:** do not replace the detector with a more permissive corner threshold or force a crop from a connected foreground component; that risks cropping hands/holder/background as the card and producing confidently wrong OCR. Safe next implementation is a validated card quadrilateral/crop with confidence plus explicit manual crop fallback; OCR should run only inside the user-confirmed crop when auto-boundary confidence is inadequate.
- Current real-photo evidence remains 1 physical sample tested (Saint Shamrock OP18-119), automatic card number/title failed; partial rules OCR only. No new photo or image-file access was available in this pass, so the real-photo count does not increase.
- Production Worker and camera/live UI remain unverified; no deployment or production data changes were made.


### Follow-up scheduled check — 23 November 2026

- Verified current PR #26 head is `c48221d8b3534b05a138c88d65cc8738cd4a6c46`; the previous subsection's head value was a stale snapshot. PR remains open/unmerged and base is `master`.
- CI run #419 (ID 45188699888) completed successfully for the exact current head. The run covers dependency install, tests, lint and production build; no physical OCR or browser/deployment checks are implied.
- Re-review confirms the existing detector/crop helper has no validated four-corner card quadrilateral or manual interactive crop. It uses coarse connected-component bounds and global corner-background consistency; crop confidence can fail on scenes with hands/background intrusions. Number OCR is still applied to fixed full-image footer bands. A manual crop step remains the appropriate fallback, but implementation and browser verification are outstanding.
- PR changed-file inventory includes the scanner, OCR region logic, image tools, catalogue logic and test files. No additional genuine user photo was accessible in this check, so real-photo OCR stays at 1 physical sample (Saint Shamrock OP18-119); no image load/retrieval statuses were promoted based on inference.
- No live UI or production Worker access was achieved; no production deployment, database or inventory changes made.
- Next actions: implement crop-confirmation fallback on the feature branch only with focused tests for hand/edge occlusion, perspective, orientation and uncertain detection; then exact-head CI and browser staging test before any claim of working UI.


### Latest exact-head verification and OCR candidate audit — 23 November 2026

- Rechecked PR #26: open, unmerged, base `master`. Current feature-branch head at this review was `49066d06b8b4dbac285c1b45998c2d33f874a1f7`.
- GitHub Actions verification run #420 (ID 45189031677) completed successfully for that exact head: dependency install, tests, lint and production build. The combined commit-status endpoint returned no status entries; the workflow run is the available confirmation.
- Reviewed `cardNumberCandidates.js` and its tests. The extractor supports OP/EB/ST/PRB and promo P-### patterns and normalizes common O/0, E/8, S/5 substitutions. Its current confidence/occurrence ranking is heuristic; repeat OCR readings do not establish card identity. Confirmation remains manual, which is appropriate.
- Reviewed the scanner lookup flow: it deduplicates up to six detected number candidates and merges catalogue results; a candidate mismatch/recovery message is shown when the selected match differs from the leading OCR number. The user must compare the original photo, official reference, number, language, set and variant before applying.
- **Remaining scanner limitation unchanged:** number-region crops are still fixed relative to the whole photo, not a validated card boundary. The Saint Shamrock OP18-119 real-photo failure remains reproducible. There is no interactive crop/align fallback yet. This pass did not alter scanner code and did not add new real-photo results.
- Production Worker, live camera/UI and Supabase staging remain unverified. No production deployment, database, inventory or order mutation was performed.


### OCR cross-candidate ranking review — 23 November 2026

- Exact latest-head CI run #421 succeeded for commit `e3ae039c1d82f74f02faea2772d6a11d46e6de23` (tests, lint and build workflow).
- Re-reviewed the scanner's cross-number catalogue lookup: up to six unique OCR, parsed, or remembered card-number readings are looked up, then results are merged before ranking. The current ranking considers detected name, recognition language, and image-memory tie-break; it does not explicitly carry each OCR number candidate's occurrence/confidence support into the merged candidate ranking.
- This is a review finding, not a demonstrated wrong-card result. Because candidates from different card numbers can be merged, this should be tested with deliberate competing valid numbers before changing ranking. Keep confirmation mandatory; do not auto-select/confirm based on OCR score.
- Suggested next engineering task: add focused unit cases for competing OCR-number candidates and mismatched name/language evidence; decide a conservative evidence display/ranking policy, then implement only if tests show it improves correctness without hiding alternatives.
- PR #26 remains open and unmerged. No production changes; no live browser/camera or staging data test performed.


## 23 November 2026 — OCR candidate evidence transparency

- Added a non-ranking evidence annotation to catalogue candidates: each candidate printing now carries the OCR number evidence for its exact card number (number of readings, average OCR confidence, and source regions). The candidate UI displays that evidence, or explicitly says that the number was not independently corroborated.
- **Ranking behaviour intentionally unchanged:** name/language/remembered-image signals continue to order the options; number evidence is shown for human review rather than being used to auto-select or override other signals. This avoids treating OCR confidence as calibrated proof or allowing a competing number reading to silently win.
- Added focused ranking-helper tests for evidence attached to matching card numbers and absent evidence, including a competing-number scenario. The tests were committed, but have not been executed locally because this environment has no repository checkout/test runner. Exact-head GitHub Actions is pending/unavailable at this time.
- Commits: `5fe1d79` (helper), `cfbb67b` (tests), `e3054b7` (scanner UI). PR #26 head: `e3054b70f35bc207a5a1d45b4701bdcdb955a730`.


### Latest CI verification — 23 November 2026

- Latest PR #26 head `198dbfa08f5c6cbdd21c6622cf2c644bac5b1e5a` passed GitHub Actions run #424 (ID 45196766947): dependency install, tests, lint, and production build completed successfully.
- This exact-head CI pass covers the OCR evidence annotations and tests added in the preceding subsection. It does not substitute for local/physical-photo OCR, live browser camera/UI, staging, or deployment verification.
- PR #26 remains open and unmerged. No production deployment or production database/inventory/order changes.


### Manual crop geometry foundation — 23 November 2026

- Added a validated normalized manual-crop geometry helper to the number-region OCR preparation module. It converts a rectangle (normalized relative to the original image) to pixel bounds, and rejects invalid, out-of-frame, or very small selections rather than silently clipping them.
- `prepareCardNumberRegions(file, manualCrop)` now supports an optional crop rectangle; when supplied, the four number zones and rotated-footer zones are generated from the cropped image instead of the full scene. Existing no-crop behaviour remains unchanged.
- Added unit coverage for normalized-to-pixel mapping and invalid/tiny/out-of-bounds rectangles. **This is only the crop-processing foundation; no manual crop-selection UI is implemented yet and it is not integrated into CardScanner.** Do not claim this fixes the Saint Shamrock photo until a user-selectable crop flow and physical-photo OCR test are completed.
- Commits: `3cbea63` crop API/helper, `1ae3027` tests. CI for these changes is pending.


### Optional manual crop controls integrated — 23 November 2026

- Integrated the manual crop-processing helper into the CardScanner flow: users can enable a crop and enter left/top/width/height as percentages, then scan the cropped photo; a reset returns to the full image.
- The crop is optional and off by default. The original uploaded photo remains unchanged. Invalid or too-small rectangles are rejected by the crop validator.
- Added responsive controls styling for desktop and narrow screens.
- **Important UX limitation:** this first control is percentage-based rather than a drag-to-select overlay, so users must estimate coordinates. It is a usable recovery control but needs a visual crop-selection/preview improvement and a real photo test before calling it complete.
- Code commits: scanner controls `74e6eda`; CSS `19eff00`. CI has not yet reported for the exact latest head at the time of this note.
- PR #26 remains open/unmerged; no production deployment or production data changes.


### Visual drag-to-select crop added — 23 November 2026

- Replaced the percentage-only crop workflow's main interaction with a visual preview: when enabled, users can drag a rectangle directly over the uploaded card photograph to define the OCR crop.
- The selected region is outlined and remains visually bright while the surrounding area is dimmed. Percentage fields remain available for precise adjustment, and the full-photo reset remains available.
- Selection uses normalized coordinates relative to the displayed photo and passes through the existing validation before OCR. This is a UI implementation review only; it has not yet been exercised in a real browser or on the Saint Shamrock test photo.
- Commits: `760edd6` (drag selection), `b1c8fc9` (preview styling), `dddaecd` (selected-area highlighting).
- CI is awaiting exact-head verification. PR #26 remains open/unmerged; no deployment or production changes.


### DON!! Image Library label correction — 23 November 2026

- Removed the standard card-number suffix from DON!! gallery cards. Their display title now uses the DON!! source text/name without appending the pseudo-number `DON!!`; non-DON cards retain their normal number label.
- Updated image alt text so DON!! entries do not announce a card number that does not exist.
- Existing DON!! source-set attribution remains in the set line; source dataset and admin-verified override are used, with the manual set assignment control retained for entries that cannot be attributed safely.
- Commit: `6a25130`. Automated CI for this latest change is pending. No production database/migration/deployment changes.


### DON!! source-data slug audit — 23 November 2026

- Read the current upstream `don_sets.jsonl` source dataset and checked every distinct set-slug format against the local normalizer: **165 source rows, 308 unique printing keys, 35 distinct slugs; all 35 slug formats normalize without an unknown format**.
- Slugs include OP/EB/ST/PRB sets, OP14-EB04 / OP15-EB04 crossover sets, Double Pack DP-02 through DP-12, and the generic Promo group.
- The upstream source has 53 rows labelled `promo`; those remain generically attributed to PROMO rather than guessing a more specific product/set. Some printing-level cross-check files returned empty through the GitHub file connector, so printing-key coverage against the full EN/JP printing tables is not verified by this audit.
- This is a source-data audit only; no external source was edited and no production data was changed.


### DON!! slug-normalization regression tests — 23 November 2026

- Added a regression test covering all 35 slug formats observed in the upstream DON!! set-source file, including Double Pack, OP/EB crossover, PRB, promo, ST and OP formats.
- The test asserts the exact normalized code expected for every observed slug. Automated CI is pending for this test commit.


### Crop-control robustness review — 23 November 2026

- Reviewed the visual crop overlay for numeric-state edge cases. Percentage-field input had string values, which could concatenate when computing the selection's right/bottom edges; these calculations now explicitly coerce to numbers.
- Crop percentage controls now clamp to the image bounds and adjust width/height when the left/top values move. Pointer coordinate handling guards against zero-sized preview bounds.
- Commits: `fd9f402` (numeric overlay calculations), `20af5ab` (bounds clamp and pointer guards). Exact-head CI is pending.


### CI follow-up — 23 November 2026

- Run #437 passed on `8f0f1f6a250e741a6128027f90e885503759be44`, covering the visual crop-selection implementation and DON!! label correction plus the updated manual test checklist at that point.
- Run #439 passed on `da9817ec3d571d69af64ca7564806bed00a07c20`, including the new 35-format DON!! source-slug regression test.
- Run #443 passed on `ed686e6a65baae9e4824c9c5d6cf5f56fb00628c`, including the crop numeric-state and bounds fixes.
- The latest PR head subsequently received a documentation-only staging-checklist addition for testing DON!! override persistence/RLS. This final docs commit is awaiting its own exact-head workflow check.


### Crop validation feedback — 23 November 2026

- Added live crop validity feedback and disabled Scan/Rescan while a manual crop is too small or exceeds the photo bounds. The message explains the minimum 12% width/height and full-image-bound requirements; invalid state styling is differentiated.
- Commits: `6752b46` (live validation and scan guard), `37ac9fd` (invalid state style). Exact-head CI is pending.


### Manual-crop boundary regression test — 23 November 2026

- Added a unit test for the 12% minimum crop dimension: exactly 12% is accepted, while 11.9% width or height is rejected.
- Run #448 passed on `dfc321123cc79cc5744b58e1713db34fcd3de125`, covering live validation feedback and Scan button guard. Run #449 was running for the subsequent Rescan-button guard when checked.
- Added the minimum-size regression test in commit `7f7fe3e`; exact-head CI pending.


### Manual crop applied to full-card text OCR — 23 November 2026

- Found during review that the selected crop was used for number-area scans but supporting full-card text OCR still used the original full-scene image. That made the crop less complete than its UI implied.
- Added `prepareManualCardCropFile` and now use the selected crop for both focused number-region OCR and supporting full-card OCR. The original photo remains used for recognition-memory matching and saving the verified reference image.
- Added a staging checklist item to verify this behavior.
- Commits: `9581237` (crop file preparation), `0a981be` (scanner integration), `57aa39c` (manual checklist). Exact-head CI pending.


### Exact-head CI verification — manual-crop full OCR integration

- GitHub Actions run #455 (ID `45204683070`) **passed** for commit `db159bbebc4eabf4b366a5f3a04a395fe05469e0`.
- All workflow steps passed: dependency installation, test suite, lint, and production build.
- This verifies the selected crop-file preparation and its scanner integration compile and pass automated tests. It does **not** prove real-photo OCR improvement; the Saint Shamrock photo is not available in the current file set and the browser/staging UI remains untested.


### Manual-crop workflow review — 23 November 2026

- Reviewed crop overlay implementation and coordinate mapping. The preview preserves the image aspect ratio (`width: 100%; height: auto`), and drag coordinates are normalized against the preview bounds; the same normalized crop is passed into the OCR crop preparation, so the UI selection and source crop are aligned in code review.
- The crop is validated before scanning, selection minimums are enforced, and both focused number OCR and supporting full-card OCR use the selected crop. The original image remains unchanged for recognition memory/reference-photo purposes.
- No new code issue found in this pass. **Still unverified:** touch/pointer behaviour on iOS/Safari and desktop browsers, reverse-direction drag, edge-touching selection, preview scaling, and a real physical-card OCR result. Added these as explicit staging checklist tests; CI cannot cover these browser/device behaviours.
- Current PR #26 head: `7cfb7b3f67fa645bef28f551ca6294731be1d681`. Exact-head GitHub Actions run #456 (ID `45204894944`) passed tests, lint, and production build. PR remains open/unmerged; no deployment or production data change.


### Crop pixel-boundary rounding fix — 23 November 2026

- Code review found a rounding edge case: rounding normalized crop origin and size independently could extend the source rectangle one pixel past an image edge. The crop helper now clamps rounded origins and dimensions to the source image bounds, including tiny image dimensions.
- Added regression tests for the 10×10 edge crop that previously rounded to an 11-pixel extent and for a 1×1 source image. These tests have been committed; exact-head CI is pending.

- Follow-up review extended the same rounding protection to OCR's built-in footer/number-zone crops: crop origins and dimensions are clamped against the source image, preventing region scans from reading outside bounds on small or odd-sized photos. Exact-head CI for this follow-up is pending.


### Confirmed crop gate added — 23 November 2026

- Identified a safety gap in the existing manual-crop fallback: it was optional, and the scanner's number regions could still be derived from the full camera frame when it was off. This reproduced the earlier card-boundary risk in the default path.
- On PR #26 only, changed scanner OCR to require the user to enable crop, make a drag or numeric selection, and explicitly confirm that the full card is inside the selection. Scan and Rescan remain disabled until that gate is satisfied. The confirmation is cleared when the photo changes, crop changes, or the crop toggle is switched.
- Both number-region OCR and supporting full-card OCR now always use the confirmed crop. The crop helper rejects unconfirmed, out-of-bounds, normalized-small, and under-64-pixel source crops. Manual card-number lookup remains available without OCR. This is a human-confirmed crop workflow—not automatic card-edge detection, perspective correction, or proof that the selected rectangle contains a card.
- Added unit coverage for the confirmation guard and source-pixel minimum; updated manual staging checklist for crop locking, reset/reconfirmation, reverse-direction/touch/edge selection, and both OCR paths.
- First exact-head CI run #472 (ID `45211378371`) on `743954f9627fe74b6d182a2ca0f655002240a624` failed tests (99/100 passed). The single failure was an outdated test assertion still comparing the corrected crop to 10-pixel image bounds after the test dimensions had changed; implementation tests passed. Corrected the assertion in commit `80417c2d77f44b3b0b9325bd3ede877c1d757082`. Exact-head CI is pending; do not mark this change passed until it completes.
- No deployment, production database/inventory/customer/order changes, or merge.

### Official image direct-load retries — 23 November 2026

- Retried direct official Bandai image paths through the browser-rendering route. OP17 sample images (EN/JP EB04-007_p2 and EB04-061_p2/p3) all returned inaccessible errors; no change to OP17's 0/4 official image-load status.
- Japanese EB01-002 rendered successfully; Japanese EB01-001 still returned an Internal Error. Japanese EB02 sample paths EB01-001_p2 and EB01-021_p2 both remained inaccessible. English EB01-001 rendered successfully. These retries corroborate the earlier 94/100 image-load count; they do not raise the count because the already-successful paths were previously recorded.
- Image-load status remains 94/100 PASS, 2/100 retrieval errors (Japanese EB01-001 and EB02's Japanese EB01-001_p2), 4/100 unverified (OP17). Official cardlist/image routes remain partially blocked by the browser tool. No images were sent to OCR.
- Re-attempted the Wrangler-name-derived Worker root and `/shop`; both were inaccessible through the browser tool. Treat production/live UI as unverified, not a deployment failure.


### Crop-boundary correction and exact-head CI — 23 November 2026

- Corrected the crop-boundary regression assertion after the earlier test failure; the failure was a stale expected bound, not a crop implementation defect.
- Follow-up review also clamped the automatic OCR footer-zone crop geometry to source image dimensions, preventing rounded coordinates from exceeding the image on tiny/odd-sized inputs.
- GitHub Actions run #474 (ID `45211676697`) passed on PR head `a840ae544de57a031e352d3872bdf64f4a4c6f13`: install, tests, lint, and production build all succeeded. This exact-head CI is now verified.
- Remaining validation is still physical-card OCR and browser/mobile interaction, especially iOS Safari, crop selection, camera flow, and staging integration. No production deployment, merge, or production-data change.


### Follow-up exact-head verification — 23 November 2026

- PR head advanced to `5d641f76945c9424a801c49f2fbdc3398a2d8b53`; GitHub Actions run #477 (ID `45211850487`) passed install, tests, lint, and production build. This is the latest exact-head verification checked during this pass.


### Exact-head crop-gate verification and data-refresh recheck — 23 November 2026

- Corrected the stale crop-bound assertion that caused CI #472 to fail. The test now uses 100×100 source dimensions, consistent with the expected 75×75 crop; separate tests cover the 64-pixel floor.
- Added a final safety guard tying crop confirmation to the exact selected photo file. A photo change resets crop selection and confirmation, and a stale confirmation cannot unlock Scan/Rescan for a different file. Crop-input state updates were also moved out of React state-updater callbacks.
- Exact PR #26 head `5d641f76945c9424a801c49f2fbdc3398a2d8b53` passed GitHub Actions run #477 (ID `45211850487`): **100/100 tests passed, lint passed, production build passed**. This exact-head pass covers the crop gate, confirmation/photo identity guard, source pixel floor, tests, and the checklist/progress updates present on that commit. It still does not verify browser/device behaviour or real OCR.
- Rechecked upstream Koala Kollect manifest: generated `2026-10-22T04:46:19Z`, `cards.jsonl` declares 3,003 rows; English products 99 rows and Japanese products 92 rows. Both product lists contain OP-17, but neither contains OP-18 nor EB-05. Product records are therefore demonstrably stale for those sets; full OP18/EB05 card-row retrieval was not independently completed this pass.
- PR #26 remains open/unmerged. No merge/deploy or production data changes.


### Documentation-head verification and genuine-photo availability — 23 November 2026

- The documentation update itself is included in exact PR #26 head `2ee14cb015255cc4d19d5be2538375de9fbc5a5d`. GitHub Actions run #479 (ID `45212103431`) passed tests, lint, and production build on this exact head.
- Re-searched the current conversation and Library for genuine scanner photos, including the Saint Shamrock OP18-119 source. No accessible image file was returned, so no new physical-photo OCR was run or claimed.
- No staging/browser deployment is accessible; production/live UI remains unverified.


### Exact CI confirmation for the latest progress record — 23 November 2026

- PR #26 head `1b26d34f6a7c12c1db0bea382c63c61a3be9e46e` passed GitHub Actions run #480 (ID `45212247254`): dependency installation, all tests, lint, and production build succeeded. This exact-head run includes the genuine-photo availability note and previous exact-head verification record.


### Latest scanner candidate-parser review and CI — 23 November 2026

- Reviewed the OCR card-number candidate parser's prefix normalization and promo handling. It normalizes common OCR confusions (`0P`, `E8`, `5T`, `PR8`) and deduplicates repeated candidate numbers across readings; candidate occurrence/confidence is advisory and does not auto-confirm a match.
- Current PR head `6d4d52f3e7133d7462c79021e4e6e60b2230e886` verified by GitHub Actions run #481 (ID `45212349383`): tests, lint, and production build all passed.
- Attempted to open the Cloudflare branch preview through the browser tool; it was inaccessible in this environment. This is a tooling limitation, not evidence that the preview is down. Browser/mobile manual verification remains outstanding.


### Additional boundary tests and rollback exception handling — 23 November 2026

- Added image-tools regression coverage for malformed/empty pixel buffers, uniform-background/no-foreground inputs, and aspect-crop bounds near the photo's right/bottom edges. These remain conservative detector tests; they do not establish reliable detection on arbitrary card photos.
- Reviewed product-photo upload rollback. Supabase normally reports cleanup failures as result errors, but thrown network/runtime exceptions during rollback could previously mask the original upload error and skip subsequent cleanup steps. Added independent try/catch guards for image URL rollback, metadata cleanup, and Storage cleanup so each failure is surfaced in the final error and later cleanup attempts continue.
- New commits on the scanner branch: image boundary tests `2cce7df38da03461f6409569f91c633c694911ea`; rollback cleanup exception handling `2c33ba11b56a94cacc3f82d95f770888128dead0`. Exact-head CI is pending; do not mark these as verified until CI completes.
- No deployment, merge, or production-data changes.


### Verification of additional boundary/rollback work — 23 November 2026

- GitHub Actions run #482 (ID `45216437678`) passed on exact PR head `748f48b0b83c7d290060035ec8180c7fba2ba2e7`: dependency installation, tests, lint, and production build succeeded. This includes the image-boundary tests and thrown-cleanup-exception handling.
- Re-reviewed Quick Add duplicate protection: duplicate lookup paginates rather than inspecting only the first page; exact catalogue printing duplicates are blocked, legacy uncertain matches require explicit review and a variant label, and catalogue identity fields are cleared when card number/set/language/variant changes. Set-code resolution rejects normalized ambiguity instead of silently choosing a set.
- Re-reviewed review-only SQL proposals. They have not been applied. Live policies/grants must be audited because permissive RLS policies combine with OR and can undermine a newly added policy; production schema and bucket settings remain unverified.
- PR #26 remains open. No merge, deployment, or production changes.


### Latest PR verification and rollback-result check — 23 November 2026

- GitHub Actions run for the progress-doc commit `0305184778a65d9ecf665dc8b8f1a34afbbb6143` completed successfully (`Verify application`).
- A further rollback correctness gap was found during review: product-image rollback used a conditional update to protect concurrent admin edits, but it did not verify whether that condition matched a row. It could silently report no cleanup issue even if rollback was skipped. The rollback now requests the affected row and reports when it was not applied (e.g. the product was removed or the image changed concurrently). Commit `a088ad37d873dbc162eaa58b3b420258b11a825e`; exact-head CI is pending.
- PR mergeability was refreshed and currently reports `false` for this latest commit; this may be GitHub's transient recalculation or a conflict and needs another check. No merge or deployment has been attempted.


### Image Library upload rollback exception audit — 23 November 2026

- Reviewed the separate Image Library batch upload rollback path and found it still awaited Storage removal without guarding thrown exceptions. A cleanup runtime/network exception could replace the original upload failure and obscure which uploads were completed.
- Added an independent cleanup exception guard so the original upload failure is preserved and any rollback failure is appended to the error message. Commit `36e53ca9ea1e0567f5c1c3002a62f99094407048`; exact-head CI pending.
- Exact-head CI for preceding code commit `a088ad37d873dbc162eaa58b3b420258b11a825e` passed; CI for progress-doc commit `120bfdeaa604f027afb19ec61bcde7fc1e60e2d8` also passed. This new change is not yet verified.


### Upload cleanup audit across image-library and recognition-memory storage — 23 November 2026

- Image Library rollback guard commit `36e53ca9ea1e0567f5c1c3002a62f99094407048` passed GitHub Actions run `45218158238` (tests, lint, build).
- Audited the shared recognition-memory upload path and found a third cleanup path where a thrown Storage removal could obscure the original database insertion error. Added guarded cleanup and a combined error message. Code commit `dd79953bd7cd630aa5fa11270b033d9a61462c5b`; exact-head CI pending.
- These changes only improve error reporting and cleanup resilience. They do not modify storage policies, delete production data, or deploy anything.

## Latest PR-head automated verification
- PR #26 head `6f859959c9b4c64b6e3e984797de54e1bb12d86c` verified by GitHub Actions run **45218303830** (`build-and-test`): dependency install, test suite, lint, and production build all completed successfully. This is code CI only; no live Supabase or physical-card/browser testing was performed.

## Number-first ranking review (latest code change; CI pending)
- Review found that aggregated OCR candidate matches were annotated with printed-number evidence but sorted primarily by supporting name/language OCR. This could let a name match outrank a repeated, higher-confidence card-number reading.
- Ranking now prioritizes whether number evidence exists, then occurrence count and confidence, with name/language and remembered-image signals used as supporting tie-breakers. Added regression tests for contradictory name/language signals and evidence-strength ordering.
- The code change and tests are committed; automated CI must complete on the exact new head before considering this correction verified.

## Bulk-import safety review and verified head
- Bulk import now refreshes the live products table at import time (paginated) before inserting, rather than relying only on the catalogue snapshot loaded earlier in the admin UI. Newly found duplicates are skipped and their CSV row numbers are reported. Successfully inserted rows are added to the in-memory duplicate set for the remainder of that batch.
- Duplicate-override copy now explicitly warns that it creates separate records and should only be used intentionally; it no longer suggests the override is for different variants, which are normally already distinguished.
- Scanner crop-toggle wording clarified to `Enable manual crop selection`.
- Exact PR head `a55eb159927aa800bf99572cde72cc6a81709cd6` CI run **45220180779** passed tests, lint, and production build. PR #26 remains open and mergeable at this check. This still does not prove live staging RLS, browser/device OCR, or atomic checkout stock reservation.

## Expanded read-only security audit
- Extended `product-visibility-rls-audit.sql` to report RLS enabled/forced state for product images, site settings, catalogue overrides, and DON!! overrides; existing policies and grants across these feature tables; and Storage object policies plus the `product-card-images` bucket configuration.
- This is still read-only and is intended to expose existing permissive-policy conflicts before any proposal is applied. No live database changes were made.
- The same read-only audit now includes `orders`, `order_items`, and `profiles` RLS state, existing policies, and direct grants so account and checkout permissions can be reviewed before staging tests.

## Storefront reference-image identity safeguard (CI pending)
- Review found that catalogue fallback images were selected by card number/language only, which could display a different set or variant for a product lacking a seller photograph.
- Storefront fallback now prefers an exact catalogue match ID or printing key; when set/variant identity is available it filters to that identity and returns no fallback if none matches. Only legacy products without printing identity use generic number/language fallback.
- Added unit tests for exact match IDs, printing-key/language, set+variant filtering, normal/base aliases, and no cross-variant fallback. CI must verify this exact head.
- The first CI attempt for storefront-reference selection failed only because the new unit test imported the large catalogue module, whose Supabase import path is Vite-resolved but not Node-test-resolved. The pure selector was extracted to `cataloguePrimaryMatch.js`; the test now imports that dependency-free helper. This is a test-isolation fix; the next exact-head CI run is pending.
- Storefront fallback matching now defaults set-only identity to the normal/base printing and resets image error state when product identity changes, so a previous image failure cannot suppress the next product's image. The matcher unit fixture's promo set code was corrected after its initial test assertion exposed the fixture mismatch. Exact code head `b2e16bb97d85af32bb5ddf732a9ef278d8d5f25c` CI run **45221189480** passed tests, lint, and production build.

## Quick Add photo-retry duplicate safeguard (CI pending)
- Review found that after a product was saved but its photograph upload failed, the retry path could link the photos successfully yet leave the original card form populated after clearing the partial-save state. A second submit could then create a duplicate.
- The successful photo-retry path now resets the product form and duplicate-review state after linking the photos, and its success message explains why. Verify exact latest-head CI before marking this fix complete.
- Exact PR head `f80d53e0ee249750339742ef598455c4ce344029` CI run **45221407333** passed all **111 tests**, lint, and production build. This verifies the Quick Add photo-retry reset and the preceding storefront, bulk-import, scanner, and cleanup code changes at that head.
- A follow-up compatibility correction also handles catalogue records whose set/variant identity fields use alternate property names (`set_code`, `sourceSetCode`, `rarityLabel`). Latest code commit `014c0378150ac8c44eeb6203d1a96439a2da71c1` passed exact CI run **45221555422** (tests, lint, production build).

## Atomic checkout stock-reservation proposal
- Checkout review confirmed the current client flow inserts `orders` and `order_items` separately and does not atomically reserve/decrement product stock. The existing client-side refresh and lock cannot prevent two users purchasing the last copy concurrently or stock remaining unchanged after order creation.
- Added `supabase/review-only/atomic-checkout-rpc.sql`: proposed authenticated RPC locks distinct product rows in deterministic order, validates status/price/stock, combines duplicate product lines, creates order + item snapshots, decrements stock, and returns order ID inside one transaction. It is **review-only and not applied**.
- Required before integration: inspect live order/product schemas, existing triggers and order lifecycle, staging RLS/grants, confirm whether any current trigger already adjusts stock (avoid double-decrement), apply and test in staging, then switch client checkout to the RPC and remove/deny bypass direct insert paths if approved. This remains a pre-production blocker.

## Atomic checkout and order-status client integration (CI/staging pending)
- Client checkout now calls `create_order_atomic` with aggregated product IDs, quantities, and expected unit prices; it no longer creates order/order-item rows through separate client inserts. Missing RPC reports a clear fail-closed message and does not place an order.
- The review-only SQL now rejects stale/conflicting expected prices under product row locks, atomically reserves stock, creates the order and items, and returns the order ID. Added atomic admin status RPC with a restricted lifecycle and idempotent cancellation restock for pending/processing orders; cancelled orders cannot reopen and shipped/completed orders cannot be cancelled/restocked.
- Admin order-status UI now calls the atomic RPC and verifies the returned order ID. Unit tests cover RPC payload validation and expected order ID verification. Manual staging checklist covers simultaneous checkout, stale-price race, exactly-once restock, and lifecycle transitions.
- This coordinated code+SQL requires staging schema/trigger/RLS review and applying the proposal before checkout/status controls work. Do not deploy this PR without the reviewed RPCs installed. SQL remains unapplied.
- RPC proposal now also preflights required schema columns and lists existing order/product triggers for review. Admin checks fail closed if `is_admin()` returns NULL. Cancellation is idempotent and restores stock only for pending/processing orders; cancelled orders cannot reopen, and shipped/completed orders cannot be cancelled/restocked.
- Exact PR head `b249469ebb8975537d63bfb974d5a63be5b494fc` CI run **45224268276** passed tests, lint, and production build. This run includes the atomic checkout client/RPC proposal, order-status lifecycle/restock safeguards, direct-write revoke proposal, catalogue selector and bulk-import/scanner changes. CI does not cover SQL execution against staging, RLS, browser/device, or physical-card testing.
- Added client-side order-transition helper and guard mirroring the RPC lifecycle (`pending→processing/cancelled`, `processing→shipped/cancelled`, `shipped→completed`, same-state retry). Server remains authoritative; regression tests and manual checks were added.
- Added an explicit `orders.stock_reserved` marker (default false for existing rows, true for orders created through the atomic checkout RPC). Cancellation only restores inventory for marked reservations and clears the marker, preventing accidental restock of legacy orders that predate the stock-decrement workflow.
- The review-only atomic RPC proposal now includes explicit revokes for direct authenticated order/order-item INSERTs and order status/data UPDATEs, so the RPC is intended to be the only client write path once staged and reviewed. Added a read-only audit for column-level order grants because table-grant reports alone can miss those bypasses. Do not apply until current grants and any other workflows are reviewed.

## RLS hardening review (review-only migration updated; staging pending)
- Review of `admin-feature-migration.sql` found that its product-image and site-settings policies were permissive additions; existing broad permissive policies could OR around them. Added restrictive SELECT/INSERT/UPDATE/DELETE guards for product_images and restrictive homepage/admin guards for site_settings. Storage already has restrictive bucket-specific guards.
- These guards are still proposals and require staging review against existing policies, RLS/grants, and `public.is_admin()` before applying. No database was changed.
- Extended admin-feature migration preflight to reject missing `products.status` and incompatible existing `site_settings` column shapes (text ID/jsonb settings) instead of allowing `CREATE TABLE IF NOT EXISTS` to mask an incompatible table. SQL remains review-only.
- Expanded the read-only grant audit again to include column-level grants for product_images, site_settings, catalogue override tables, and DON!! overrides, complementing the order/order_items audit.
