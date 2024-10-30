ABORT;
BEGIN;

CREATE TABLE IF NOT EXISTS order_status_update
(
    order_id UUID REFERENCES orders (order_id),
    new_status VARCHAR(20),
    timestamp  TIMESTAMP DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION order_log_status_change()
    RETURNS TRIGGER AS
$$
BEGIN
    IF (NEW.status != OLD.status) THEN
        INSERT INTO order_status_update VALUES (NEW.order_id, NEW.status);
    end if;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER log_status_change
    BEFORE UPDATE
    ON orders
    FOR EACH ROW
EXECUTE PROCEDURE log_status_change();

CREATE TABLE IF NOT EXISTS market_status_update
(
    listing_id UUID REFERENCES market_listings (listing_id),
    new_status VARCHAR(20),
    timestamp  TIMESTAMP DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION market_log_status_change()
    RETURNS TRIGGER AS
$$
BEGIN
    IF (NEW.status != OLD.status) THEN
        INSERT INTO market_status_update VALUES (NEW.listing_id, NEW.status);
    end if;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER log_status_change
    BEFORE UPDATE
    ON market_listings
    FOR EACH ROW
EXECUTE PROCEDURE market_log_status_change();

COMMIT;