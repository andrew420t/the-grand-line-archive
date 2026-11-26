# Official Bandai card-list image references

Checked against the English Bandai card-list page on 26 November 2026:
https://en.onepiece-cardgame.com/cardlist/

The official Booster selector exposes these 62 lists (excluding No filter):

- Premium Boosters: PRB-02 (569302), PRB-01 (569301).
- Stand-alone Extra Boosters: EB-05 (569205), EB-03 (569203), EB-02 (569202), EB-01 (569201).
- Main boosters: OP-18 through OP-01 (569118 down to 569101).
- Combined booster products: OP15-EB04 (569115), OP14-EB04 (569114).
- Starter / Ultra decks: ST-36 through ST-01 (569036 down to 569001).
- Promotion card list (569901).
- Other Product Card list (569801).

English EB-04 is not a separate selector entry. EB04-numbered cards are grouped in the OP14-EB04 and OP15-EB04 lists. The application routes the official list link using the card number instead of inventing a standalone EB-04 filter.

## Official image URL pattern

The live Bandai card-list page returns official image IDs such as OP18-001.png and OP18-001_p1.png for alternate artwork. The English image folder is:

https://en.onepiece-cardgame.com/images/cardlist/card/{official-image-id}.png

Japanese references use:

https://www.onepiece-cardgame.com/images/cardlist/card/{official-image-id}.png

The suffix matters: a card number alone identifies the base card but does not identify every parallel, SP or special printing. The exact image ID should come from the selected official printing/variant entry. A generated base-card URL is only a fallback.

## Grand Line Archive fallback behaviour

- Seller-uploaded product photograph remains first priority.
- The local exact Bandai/catalogue printing reference is used next.
- A same-card alternate official image is next.
- A standard Bandai base-card image may be used when no printing image is indexed.
- The image-only fallback does not invent card name, rarity, effect, exact set, printing or parallel suffix. Administrators must verify the physical card and official list before saving card details.
- DON!! cards without a standard card number do not get fabricated URLs.

## Rights and handling

Bandai's site footer states: All images, text and data on this website may not be reproduced without permission. This implementation references image files on Bandai's own host; it does not bulk-download, copy into Supabase Storage, or re-host card artwork. Obtain Bandai's permission before using official images in a public/commercial storefront if the use is not already authorised.

## Source of truth

Bandai official English card list:
https://en.onepiece-cardgame.com/cardlist/

Current OP-18 example filter:
https://en.onepiece-cardgame.com/cardlist/?series=569118

The official page is the authority for card entries and variants. The Koala Kollect snapshot used by the app is a separate metadata feed and can lag behind Bandai releases; the image-only fallback avoids a blank image without claiming metadata coverage is complete.