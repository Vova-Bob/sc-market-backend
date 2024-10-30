alter table orders
    add offer_session_id uuid REFERENCES offer_sessions(id);

alter table orders
    drop offer_id;