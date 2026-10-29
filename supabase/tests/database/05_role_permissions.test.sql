-- Core permission matrix. Projects may add rows; core rows must stay.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(3);

SELECT set_has(
  $$ SELECT role::text, permission FROM public.role_permissions $$,
  $$ VALUES
       ('owner', 'account.update'), ('owner', 'account.delete'), ('owner', 'members.view'),
       ('owner', 'members.invite'), ('owner', 'members.manage'),
       ('admin', 'account.update'), ('admin', 'members.view'), ('admin', 'members.invite'),
       ('admin', 'members.manage'),
       ('member', 'members.view') $$,
  'core permissions are granted'
);

SELECT set_hasnt(
  $$ SELECT role::text, permission FROM public.role_permissions $$,
  $$ VALUES ('admin', 'account.delete'), ('member', 'account.update'), ('member', 'members.invite'),
            ('member', 'members.manage'), ('member', 'account.delete') $$,
  'core permissions are not over-granted'
);

INSERT INTO auth.users (id, email) VALUES ('50000000-0000-4000-8000-000000000001', 'rp@test.local');

SELECT set_config('request.jwt.claims', '{"sub": "50000000-0000-4000-8000-000000000001", "role": "authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT isnt_empty(
  $$ SELECT 1 FROM public.role_permissions $$,
  'signed-in users can read the matrix (UI permission checks)'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
