ABORT;
BEGIN;

ALTER TABLE auction_details
    RENAME TO market_auction_details;

ALTER TABLE market_auction_details ADD COLUMN buyout_price int default null;

ALTER TABLE market_listings
    RENAME TO market_listings_legacy;

CREATE TABLE IF NOT EXISTS market_listings_new
(
    listing_id           UUID PRIMARY KEY UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    sale_type            VARCHAR(30)             NOT NULL,
    price                bigint                  NOT NULL, -- CHECK (price >= 0),
    quantity_available   int                     NOT NULL DEFAULT 1 CHECK (quantity_available >= 0),
    status               VARCHAR(30)             NOT NULL DEFAULT 'active',
    internal             BOOL                    NOT NULL DEFAULT false,
    user_seller_id       UUID REFERENCES accounts (user_id),
    contractor_seller_id UUID REFERENCES contractors (contractor_id),
    timestamp            TIMESTAMP               NOT NULL DEFAULT NOW()
);

-- ALTER TABLE market_listing_details
--     RENAME TO market_listing_details_legacy;
CREATE TABLE IF NOT EXISTS market_listing_details_new
(
    details_id  UUID PRIMARY KEY UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    item_type   VARCHAR(30)             NOT NULL,
    title       VARCHAR(100)            NOT NULL,
    description VARCHAR(2000)           NOT NULL
);

ALTER TABLE market_images
    RENAME TO market_images_legacy;

CREATE TABLE IF NOT EXISTS market_images_new
(
    resource_id UUID REFERENCES image_resources (resource_id),
    details_id  UUID REFERENCES market_listing_details_new (details_id)
);


CREATE TABLE IF NOT EXISTS market_unique_listings
(
    listing_id    UUID REFERENCES market_listings_new (listing_id),
    accept_offers boolean,
    details_id    UUID REFERENCES market_listing_details_new (details_id)
);

-- Insert all of the original listings and their details
WITH t1 as (SELECT *, gen_random_uuid() as details_id FROM market_listings_legacy),
     -- Insert the details
     t2 as (
         INSERT INTO market_listing_details_new (details_id, item_type, title, description) SELECT details_id, item_type, title, description FROM t1 RETURNING *),
     -- Insert the listing itself
     t3 AS (INSERT INTO market_listings_new (listing_id, sale_type, price,
                                             quantity_available, status, internal,
                                             user_seller_id,
                                             contractor_seller_id, timestamp)
         SELECT listing_id,
                sale_type,
                GREATEST(price, 0),
                GREATEST(quantity_available, 0),
                status,
                internal,
                user_seller_id,
                contractor_seller_id,
                timestamp
         FROM t1
         RETURNING *),

     -- Insert the images associated with the details
     t4 AS (INSERT INTO market_images_new (resource_id, details_id) SELECT (SELECT resource_id
                                                                            FROM market_images_legacy
                                                                            WHERE market_images_legacy.listing_id = t1.listing_id),
                                                                           t1.details_id
                                                                    FROM t1)
-- Insert the unique listing pointing to the list
INSERT
INTO market_unique_listings(listing_id, accept_offers, details_id)
SELECT t1.listing_id, true, t1.details_id
FROM t1;

SELECT *
FROM market_unique_listings;

ALTER TABLE market_aggregates
    RENAME TO market_aggregates_legacy;
CREATE TABLE IF NOT EXISTS market_aggregates_new
(
    aggregate_id UUID PRIMARY KEY UNIQUE                                 NOT NULL DEFAULT gen_random_uuid(),
    wiki_id      INT,
    details_id   UUID REFERENCES market_listing_details_new (details_id) NOT NULL
);

ALTER TABLE market_aggregate_listings
    RENAME TO market_aggregate_listings_legacy;
CREATE TABLE IF NOT EXISTS market_aggregate_listings_new
(
    aggregate_listing_id UUID PRIMARY KEY UNIQUE                              NOT NULL DEFAULT gen_random_uuid(),
    aggregate_id         UUID REFERENCES market_aggregates_new (aggregate_id) NOT NULL
);

CREATE INDEX market_aggregate_listings_aggregate_id ON market_aggregate_listings_new (aggregate_id);

-- Insert new aggregates and their details
WITH t1 as (SELECT *, gen_random_uuid() as details_id FROM market_aggregates_legacy),
     t2
         as (INSERT INTO market_listing_details_new SELECT details_id, item_type, title, description FROM t1 RETURNING details_id),
     t3 AS (INSERT INTO market_images_new (resource_id, details_id) SELECT (SELECT resource_id
                                                                            FROM market_images_legacy
                                                                            WHERE market_images_legacy.aggregate_id = t1.aggregate_id),
                                                                           t1.details_id
                                                                    FROM t1)

INSERT
INTO market_aggregates_new(wiki_id, details_id)
SELECT t1.aggregate_id,
--        t1.aggregate_id_legacy,
       t1.details_id
FROM t1;

-- Insert new aggregate listings
WITH t1 as (SELECT * FROM market_aggregate_listings_legacy),
     t2 AS (INSERT INTO market_listings_new
         (
          listing_id, sale_type, price, quantity_available, status, internal,
          user_seller_id,
          contractor_seller_id, timestamp
             )
         SELECT t1.listing_id,
                'aggregate',
                t1.price,
                t1.quantity_available,
                t1.status,
                t1.internal,
                t1.user_seller_id,
                t1.contractor_seller_id,
                t1.timestamp
         FROM t1
         RETURNING *)
INSERT
INTO market_aggregate_listings_new(aggregate_listing_id, aggregate_id)
SELECT t1.listing_id, (SELECT aggregate_id FROM market_aggregates_new WHERE wiki_id = t1.aggregate_id)
FROM t1;

alter table market_bids
    drop constraint market_bids_listing_id_fkey;
alter table market_bids
    add foreign key (listing_id) references market_auction_details (listing_id);

ALTER TABLE market_orders
    RENAME TO market_orders_legacy;

CREATE TABLE IF NOT EXISTS market_orders_new
(
    order_id   UUID REFERENCES orders (order_id),
    listing_id UUID REFERENCES market_listings_new (listing_id),
    quantity   integer default 1
);

INSERT INTO market_orders_new(order_id, listing_id, quantity)
SELECT order_id, COALESCE(listing_id, aggregate_listing_id), quantity
FROM market_orders_legacy;

DROP TABLE market_offer_listings;
DROP TABLE market_offers;
DROP TABLE market_rating;

ALTER TABLE market_aggregates_new
    RENAME TO market_aggregates;
ALTER TABLE market_listings_new
    RENAME TO market_listings;
ALTER TABLE market_aggregate_listings_new
    RENAME TO market_aggregate_listings;
ALTER TABLE market_orders_new
    RENAME TO market_orders;
ALTER TABLE market_listing_details_new
    RENAME TO market_listing_details;
ALTER TABLE market_images_new
    RENAME TO market_images;

COMMIT;