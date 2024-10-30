ABORT;
BEGIN;

CREATE TABLE IF NOT EXISTS market_buy_orders
(
    created_timestamp   TIMESTAMP        NOT NULL DEFAULT NOW(),
    buy_order_id        UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    aggregate_id        UUID             NOT NULL REFERENCES market_aggregates (aggregate_id),
    quantity            INT              NOT NULL,
    price               INT              NOT NULL,
    buyer_id            UUID             NOT NULL REFERENCES accounts (user_id),
    expiry              TIMESTAMP        NOT NULL,
    fulfilled_timestamp TIMESTAMP
);

-- CANCEL ORDER RECREATES THE BUY ORDER?
CREATE INDEX market_buy_orders_aggregate_id_idx ON market_buy_orders (aggregate_id);

COMMIT;