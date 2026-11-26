# Grand Line Archive card image sources and handling

Checked 26 November 2026. These are the source roles used in the Testing Preview and the main-bound scanner PR.

## 1. Bandai official English and Japanese card artwork

The official Bandai card list is the source of truth for numbered English and Japanese cards and printing IDs:
- English: https://en.onepiece-cardgame.com/cardlist/
- Japanese: https://www.onepiece-cardgame.com/cardlist/

Official image IDs such as OP12-002.png and OP12-002_p1.png are requested directly from the matching Bandai image host. The resolver tries the exact printing first, then an alternate printing for the same card and language, then the numbered base-card image. Base/alternate artwork is labelled because it may not represent the exact finish.

## 2. Chinese (CN) catalogue images

The Koala Kollect data contract includes a separate cn data source with its own printing records and image URLs (for example, URLs on source.windoent.com). These are treated as Chinese (CN) catalogue images and are not replaced with English or Japanese artwork when absent. Same-card retries stay within the CN source. The CN filter appears when the source supplies CN records.

## 3. Promo, stamped and DON!! images

The Koala feed includes tcgcsv printing records with TCGPlayer product image URLs where available. These remain ahead of a generic Bandai base-card fallback, especially for stamped/foil versions and DON!! cards. If that exact image is missing, the archive may show a same-card alternate or base-card reference with a clear finish warning. Numberless DON!! cards are never assigned a fabricated card-number image.

## 4. Structured card metadata

Koala Kollect provides card, printing and product metadata under the Creative Commons Attribution 4.0 licence (CC BY 4.0). The last checked manifest timestamp is 22 October 2026; the feed may be stale. Metadata is used with source attribution; that licence does not grant rights to Bandai card artwork.

## 5. Other catalogue sources checked

- arjunkai/optcg-api publishes an image-only /images/{id} endpoint. Its code is MIT-licensed, but its published deployment documentation says browser image requests are restricted to opbindr.com and opcanvs.com. Grand Line Archive is not on that published allowlist, so this endpoint is not used. Reconsider only after the owner grants access or the project deploys its own proxy.
- hugoprudente/optcgjson publishes a useful scraper output with OP-01–OP-18, EB-01–EB-05, PRB-01/02, ST-01–ST-36 and promo data. The repository did not expose a clear content licence when checked, so its card JSON/artwork has not been imported into Grand Line Archive. It is a candidate source to request permission from, not an active app dependency.
- michalkiral/optcg-data was archived in August 2026; it is not used as a current feed.

## Rights, storage and display

Bandai's official site footer states that images, text and data may not be reproduced without permission. The archive references external image URLs; it does not bulk-download or mirror Bandai artwork into Supabase Storage. Seller-uploaded photographs remain the first-choice public product image and are never overwritten by a catalogue reference.

Before using third-party or official artwork as public/commercial storefront imagery, confirm the applicable permissions and provider terms. A catalogue image is an identification aid and must not be described as the seller's own photograph.
