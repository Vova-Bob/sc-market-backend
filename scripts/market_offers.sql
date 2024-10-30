ABORT;
BEGIN;

CREATE TABLE IF NOT EXISTS offer_sessions
(
    id            UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    assigned_id   UUID REFERENCES accounts (user_id) ON DELETE CASCADE,
    customer_id   UUID        NOT NULL REFERENCES accounts (user_id) ON DELETE CASCADE,
    contractor_id UUID REFERENCES contractors (contractor_id) ON DELETE CASCADE,
    thread_id     BIGINT                           DEFAULT NULL,
    status        VARCHAR(30) NOT NULL             DEFAULT 'active',
    timestamp     TIMESTAMP   NOT NULL             DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_offers
(
    id           UUID          NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id   UUID          NOT NULL REFERENCES offer_sessions (id) ON DELETE CASCADE,
    kind         VARCHAR(30)   NOT NULL,
    cost         bigint        NOT NULL,
    payment_type VARCHAR(30)   NOT NULL             DEFAULT 'one-time',
    collateral   bigint                             DEFAULT 0,
    title        VARCHAR(100)  NOT NULL             DEFAULT '{}',
    description  VARCHAR(2000) NOT NULL             DEFAULT '{}',
    timestamp    TIMESTAMP     NOT NULL             DEFAULT NOW(),
    status       VARCHAR(30)   NOT NULL             DEFAULT 'active',
    template_id  UUID REFERENCES order_templates (template_id),
    actor_id     UUID          NOT NULL REFERENCES accounts (user_id)
);

create table offer_market_items
(
    offer_id   uuid    not null
        constraint market_orders_orders_order_id_fk references order_offers (id) ON DELETE CASCADE,
    listing_id uuid references market_listings (listing_id) ON DELETE CASCADE,
    quantity   INTEGER NOT NULL CHECK (quantity > 0) DEFAULT 1
);

alter table chats
    add column session_id UUID REFERENCES offer_sessions (id);

COMMIT;