-- Core permission matrix (data, so it lives in a migration rather than in
-- supabase/schemas). Projects grant their own permissions in their own
-- migrations; change core rows only through a template update.

INSERT INTO public.role_permissions (role, permission)
VALUES
  ('owner', 'account.update'),
  ('owner', 'account.delete'),
  ('owner', 'members.view'),
  ('owner', 'members.invite'),
  ('owner', 'members.manage'),

  ('admin', 'account.update'),
  ('admin', 'members.view'),
  ('admin', 'members.invite'),
  ('admin', 'members.manage'),

  ('member', 'members.view')
ON CONFLICT DO NOTHING;
