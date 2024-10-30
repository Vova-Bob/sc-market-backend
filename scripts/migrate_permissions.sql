CREATE TABLE IF NOT EXISTS contractor_roles
(
    contractor_id      UUID REFERENCES contractors (contractor_id) NOT NULL,
    role_id            UUID PRIMARY KEY                            NOT NULL DEFAULT gen_random_uuid(),

    position           INT                                         NOT NULL,
    name               VARCHAR(40)                                 NOT NULL,

    manage_roles       BOOLEAN                                     NOT NULL default FALSE,
    manage_orders      BOOLEAN                                     NOT NULL default FALSE,
    kick_members       BOOLEAN                                     NOT NULL default FALSE,
    manage_invites     BOOLEAN                                     NOT NULL default FALSE,
    manage_org_details BOOLEAN                                     NOT NULL default FALSE,
    manage_stock       BOOLEAN                                     NOT NULL default FALSE,
    manage_market      BOOLEAN                                     NOT NULL default FALSE,
    manage_recruiting  BOOLEAN                                     NOT NULL default FALSE,
    manage_webhooks    BOOLEAN                                     NOT NULL default FALSE
);

create unique index contractor_members_contractor_id_position_uindex
    on contractor_roles (contractor_id, position);

CREATE TABLE IF NOT EXISTS contractor_member_roles
(
    user_id UUID REFERENCES accounts (user_id)         NOT NULL,
    role_id UUID REFERENCES contractor_roles (role_id) NOT NULL
);

create unique index contractor_members_roles_user_id_role_id_uindex
    on contractor_member_roles (user_id, role_id);

INSERT INTO contractor_roles(contractor_id,
                             position,
                             manage_roles,
                             manage_orders,
                             kick_members,
                             manage_invites,
                             manage_org_details,
                             manage_stock,
                             manage_market,
                             manage_recruiting,
                             manage_webhooks,
                             name)
SELECT contractor_id,
       0,
       true,
       true,
       true,
       true,
       true,
       true,
       true,
       true,
       true,
       'Owner'
FROM contractors;

INSERT INTO contractor_roles(contractor_id,
                             position,
                             manage_roles,
                             manage_orders,
                             kick_members,
                             manage_invites,
                             manage_org_details,
                             manage_stock,
                             manage_market,
                             manage_recruiting,
                             manage_webhooks,
                             name)
SELECT contractor_id,
       1,
       true,
       true,
       true,
       true,
       true,
       true,
       true,
       true,
       true,
       'Admin'
FROM contractors;

INSERT INTO contractor_roles(contractor_id,
                             position,
                             manage_roles,
                             manage_orders,
                             kick_members,
                             manage_invites,
                             manage_org_details,
                             manage_stock,
                             manage_market,
                             manage_recruiting,
                             manage_webhooks,
                             name)
SELECT contractor_id,
       10,
       false,
       false,
       false,
       false,
       false,
       false,
       false,
       false,
       false,
       'Member'

FROM contractors;

UPDATE
    contractors
SET default_role = contractor_roles.role_id
FROM contractor_roles
WHERE contractor_roles.contractor_id = contractors.contractor_id
  AND contractor_roles.position = 10;

UPDATE
    contractors
SET owner_role = contractor_roles.role_id
FROM contractor_roles
WHERE contractor_roles.contractor_id = contractors.contractor_id
  AND contractor_roles.position = 0;

INSERT INTO contractor_member_roles (user_id, role_id)
SELECT user_id,
       (SELECT contractors.owner_role
        FROM contractors
        WHERE contractors.contractor_id = contractor_members.contractor_id)
FROM contractor_members
WHERE contractor_members.role = 'owner';

INSERT INTO contractor_member_roles (user_id, role_id)
SELECT user_id,
       (SELECT contractors.default_role
        FROM contractors
        WHERE contractors.contractor_id = contractor_members.contractor_id)
FROM contractor_members;

INSERT INTO contractor_member_roles (user_id, role_id)
SELECT user_id,
       (SELECT contractor_roles.role_id
        FROM contractor_roles
        WHERE contractor_roles.contractor_id = contractor_members.contractor_id
          AND position = 1)
FROM contractor_members
WHERE contractor_members.role = 'admin';