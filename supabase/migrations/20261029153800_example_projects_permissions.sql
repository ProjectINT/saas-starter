-- Example module permissions (data, so a hand-written migration). A product
-- grants its own permissions the same way; `npm run db:types` then adds them
-- to the Permission type.

INSERT INTO public.role_permissions (role, permission)
VALUES
  ('owner', 'projects.view'),
  ('owner', 'projects.manage'),
  ('admin', 'projects.view'),
  ('admin', 'projects.manage'),
  ('member', 'projects.view')
ON CONFLICT DO NOTHING;
