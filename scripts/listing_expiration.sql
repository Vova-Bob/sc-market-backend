ABORT;
BEGIN;

ALTER TABLE IF EXISTS market_listings
    ADD COLUMN expiration TIMESTAMP NOT NULL DEFAULT NOW() + '1 month';

CREATE OR REPLACE FUNCTION update_listing_expiration()
    RETURNS TRIGGER AS
$$
BEGIN
    NEW.expiration = now() + '1 month';
    RETURN NEW;
END;
$$ language 'plpgsql';

-- CREATE  FUNCTION update_unique_listing_expiration()
--     RETURNS TRIGGER AS $$
-- BEGIN
--     UPDATE market_listings SET expiration = NOW() + '4 months' WHERE listing_id = NEW.listing_id;
--     RETURN NEW;
-- END;
-- $$ language 'plpgsql';

CREATE OR REPLACE TRIGGER extend_expiration
    BEFORE UPDATE
    ON market_listings
    FOR EACH ROW
EXECUTE PROCEDURE update_listing_expiration();

-- CREATE TRIGGER extend_expiration AFTER UPDATE ON market_unique_listings FOR EACH ROW EXECUTE PROCEDURE update_unique_listing_expiration();

COMMIT;