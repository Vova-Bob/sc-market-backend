ABORT;
BEGIN;

CREATE TABLE IF NOT EXISTS activity_history
(
    date    DATE NOT NULL DEFAULT CURRENT_DATE,
    user_id UUID NOT NULL REFERENCES accounts (user_id),
    PRIMARY KEY (user_id, date),
    UNIQUE (user_id, date)
);

CREATE OR REPLACE PROCEDURE upsert_daily_activity(UUID) AS
$$
BEGIN
    INSERT INTO activity_history(user_id) VALUES ($1) ON CONFLICT DO NOTHING;
END;
$$
    LANGUAGE plpgsql;

CREATE OR REPLACE VIEW daily_activity AS
SELECT date, COUNT(*)
FROM activity_history
GROUP BY date;

DROP VIEW weekly_activity;
CREATE OR REPLACE VIEW weekly_activity AS
SELECT date_trunc('week', date) AS date, COUNT(DISTINCT user_id)
FROM activity_history
GROUP BY date_trunc('week', date);

DROP VIEW monthly_activity;
CREATE OR REPLACE VIEW monthly_activity AS
SELECT date_trunc('month', date) AS date, COUNT(DISTINCT user_id)
FROM activity_history
GROUP BY date_trunc('month', date);

COMMIT;

ABORT;
BEGIN;

INSERT INTO activity_history(user_id, date)
SELECT customer_id as user_id, DATE(timestamp) as date
FROM orders
UNION
SELECT user_id, DATE(created_at) as date
FROM accounts
UNION
SELECT user_seller_id as user_id, DATE(timestamp) as date
FROM market_listings
WHERE user_seller_id IS NOT NULL;
COMMIT;