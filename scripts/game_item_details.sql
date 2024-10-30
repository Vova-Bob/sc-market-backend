ABORT;

BEGIN;

ALTER TABLE game_items
    ADD COLUMN details_id UUID REFERENCES market_listing_details (details_id);

INSERT INTO market_listing_details(item_type, title, description, game_item_id) SELECT type, name, description, id FROM game_items WHERE type = 'Full Set';


UPDATE game_items
SET details_id = (SELECT details_id
                  FROM market_listing_details
                  WHERE market_listing_details.game_item_id = game_items.id
                    AND NOT EXISTS(SELECT listing_id
                                   FROM market_unique_listings
                                   WHERE market_listing_details.details_id = market_unique_listings.details_id)
                  LIMIT 1)
WHERE details_id IS NULL;


SELECT * FROM game_items WHERE type = 'Full Set';

ALTER TABLE game_items
    ALTER COLUMN details_id SET NOT NULL;

COMMIT;