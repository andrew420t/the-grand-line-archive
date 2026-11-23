# Grand Line Archive scanner test — progress and reference matrix

Updated: 22 November 2026

## Scope
Requested 100 sample cases: 25 set/product targets × 2 English + 2 Japanese = 100. Sets: OP-01–OP-18, EB-01–EB-05, PRB-01/02.

## Current findings
- **Synthetic OCR using local Tesseract 5.5.0:** 100 text-crop fixtures. Raw OCR was exact for **57/100**. After the merged set-code correction from PR #20 and the OP-prefix correction from PR #21, normalized card numbers were exact **100/100**. Fixtures used OP/EB/PRB/ST-style codes with mild rotations, blur and JPEG compression. This is synthetic printed-number OCR only, not card-photo OCR.
- **Parser fixes merged:** PR #20 commit ec4f2b244731dacaedcbe18b57ef25e3b7877a10 (O/0 confusion in set-code digits); PR #21 commit f2c865320bb1583aa687a927f34b81ca6f2d6eb1 (extra O in OP prefix such as OPO09). Both merged; regression tests added. **CI verified:** GitHub Actions runs #87 (PR #20), #88 (PR #21), and #89 (PR #22) each passed all steps: dependency install, `npm test`, lint, and production build. Run #86 and #84 were failed attempts before fixes; subsequent corrected runs passed.
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
| OP18 | English | 1 | OP18-001 | Karoo | https://en.onepiece-cardgame.com/images/cardlist/card/OP18-001.png (candidate; not load-verified) |
| OP18 | English | 2 | OP18-002 | Igaram | https://en.onepiece-cardgame.com/images/cardlist/card/OP18-002.png (candidate; not load-verified) |
| OP18 | Japanese | 1 | OP18-001 | カルー (Karoo) | https://www.onepiece-cardgame.com/images/cardlist/card/OP18-001.png (candidate; not load-verified) |
| OP18 | Japanese | 2 | OP18-002 | イガラム (Igaram) | https://www.onepiece-cardgame.com/images/cardlist/card/OP18-002.png (candidate; not load-verified) |
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
| EB05 | English | 1 | EB05-001 | Jewelry Bonney | https://en.onepiece-cardgame.com/images/cardlist/card/EB05-001.png (candidate; not load-verified) |
| EB05 | English | 2 | EB05-002 | Doll | https://en.onepiece-cardgame.com/images/cardlist/card/EB05-002.png (candidate; not load-verified) |
| EB05 | Japanese | 1 | EB05-001 | ジュエリー・ボニー (Jewelry Bonney) | https://www.onepiece-cardgame.com/images/cardlist/card/EB05-001.png (candidate; not load-verified) |
| EB05 | Japanese | 2 | EB05-002 | ドール (Doll) | https://www.onepiece-cardgame.com/images/cardlist/card/EB05-002.png (candidate; not load-verified) |
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
