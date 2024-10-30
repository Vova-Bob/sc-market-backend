ABORT;
BEGIN;

CREATE TABLE IF NOT EXISTS service_images
(
    template_id   UUID REFERENCES order_templates (template_id) ON DELETE CASCADE,
    resource_id  UUID REFERENCES image_resources (resource_id) ON DELETE CASCADE DEFAULT '5226c767-0599-419b-ae71-a7303c441db0'
);

alter table order_templates
    rename to services;


alter table service_images RENAME COLUMN template_id TO service_id;
alter table services RENAME COLUMN template_id  TO service_id;
alter table services RENAME COLUMN template_description  TO service_description;
alter table services RENAME COLUMN template_name  TO service_name;
alter table order_offers RENAME COLUMN template_id  TO service_id;
alter table orders RENAME COLUMN template_id  TO service_id;

ABORT;
COMMIT;