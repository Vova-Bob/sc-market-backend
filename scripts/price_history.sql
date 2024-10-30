ABORT;
BEGIN;

DROP TABLE market_price_history;
CREATE TABLE market_price_history
(
    game_item_id       UUID   NOT NULL references game_items (id),
    date               DATE   NOT NULL DEFAULT CURRENT_DATE,
    price              BIGINT NOT NULL,
    quantity_available INT    NOT NULL,
    UNIQUE (game_item_id, date)
);

CREATE OR REPLACE PROCEDURE upsert_daily_price_history() AS
$$
BEGIN
    WITH item_prices as (SELECT market_listing_details.game_item_id as game_item_id,
                                COALESCE(MIN(price), 0)              AS price,
                                COALESCE(SUM(quantity_available), 0) as quantity_available
                         FROM market_listings
                                  INNER JOIN market_unique_listings
                                             ON market_listings.listing_id = market_unique_listings.listing_id
                                  INNER JOIN market_listing_details
                                             ON market_unique_listings.details_id =
                                                market_listing_details.details_id
                                  INNER JOIN game_items ON market_listing_details.game_item_id = game_items.id
                         WHERE market_listings.status = 'active'
                           AND quantity_available > 0
                         GROUP BY game_item_id)
    INSERT
    INTO market_price_history(game_item_id, price, quantity_available)
    SELECT *
    FROM item_prices
    WHERE price > 0

    ON CONFLICT DO NOTHING;
END;
$$
    LANGUAGE plpgsql;

CALL upsert_daily_price_history();

SELECT *
FROM market_price_history;
COMMIT;