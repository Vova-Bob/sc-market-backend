CREATE OR REPLACE VIEW order_week_stats AS
SELECT COUNT(*)                                        as week_orders,
       (SELECT COALESCE(SUM(orders.cost), 0)
        FROM orders
        WHERE status = 'cancelled'
          AND timestamp > (NOW() - INTERVAL '1 week')) as week_order_value
FROM orders t
WHERE timestamp > (NOW() - INTERVAL '1 week');

CREATE OR REPLACE VIEW order_stats AS
SELECT COUNT(*)                                                         as total_orders,
       (SELECT COALESCE(SUM(orders.cost), 0) FROM orders WHERE status = 'fulfilled') as total_order_value
FROM orders as t;