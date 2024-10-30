ABORT;
BEGIN;

DROP TABLE IF EXISTS market_multiple_listings CASCADE;
DROP TABLE IF EXISTS market_multiples;

CREATE TABLE IF NOT EXISTS market_multiples
(
    multiple_id          UUID PRIMARY KEY UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    user_seller_id       UUID REFERENCES accounts (user_id),
    contractor_seller_id UUID REFERENCES contractors (contractor_id),
    details_id           UUID REFERENCES market_listing_details (details_id),
    default_listing_id UUID REFERENCES market_listings (listing_id)
);

CREATE TABLE IF NOT EXISTS market_multiple_listings
(
    multiple_listing_id UUID PRIMARY KEY UNIQUE                             NOT NULL DEFAULT gen_random_uuid(),
    multiple_id         UUID REFERENCES market_multiples (multiple_id)       NOT NULL,
    details_id          UUID REFERENCES market_listing_details (details_id) NOT NULL
);
        ;

COMMIT;