ABORT;
BEGIN;

CREATE TABLE IF NOT EXISTS public_contracts
(
    id           UUID PRIMARY KEY UNIQUE            NOT NULL DEFAULT gen_random_uuid(),
--     rush         BOOLEAN                            NOT NULL DEFAULT false,
    departure    VARCHAR(30)                                 DEFAULT NULL,
    destination  VARCHAR(30)                                 DEFAULT NULL,
    kind         VARCHAR(30)                        NOT NULL,
    cost         bigint                             NOT NULL,
    payment_type VARCHAR(30)                        NOT NULL DEFAULT 'one-time',
    collateral   bigint                                      DEFAULT 0,
    title        VARCHAR(100)                       NOT NULL DEFAULT '{}',
    description  VARCHAR(2000)                      NOT NULL DEFAULT '{}',
    customer_id  UUID REFERENCES accounts (user_id) NOT NULL,
    timestamp    TIMESTAMP                          NOT NULL DEFAULT NOW(),
    status       VARCHAR(30)                        NOT NULL DEFAULT 'active',
    expiration   TIMESTAMP                          NOT NULL DEFAULT NOW() + '1 mons'
);

CREATE TABLE IF NOT EXISTS public_contract_offers
(
    contract_id UUID NOT NULL REFERENCES public_contracts (id),
    session_id  UUID NOT NULL REFERENCES offer_sessions (id)
);

CREATE OR REPLACE FUNCTION update_public_contract_expiration()
    RETURNS TRIGGER AS
$$
BEGIN
    NEW.expiration = now() + '1 month';
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER extend_expiration
    BEFORE UPDATE
    ON public_contracts
    FOR EACH ROW
EXECUTE PROCEDURE update_public_contract_expiration();

INSERT INTO public_contracts(departure, destination, kind, cost, payment_type,
                             collateral, title, description, customer_id, timestamp, status)
SELECT departure,
       destination,
       kind,
       cost,
       payment_type,
       collateral,
       title,
       description,
       customer_id,
       timestamp,
       'active'
FROM orders
WHERE contractor_id IS NULL
  AND assigned_id IS NULL AND status = 'not-started';

SELECT *
FROM public_contracts;


COMMIT;

