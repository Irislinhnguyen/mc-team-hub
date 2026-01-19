-- =====================================================
-- UNIFIED PERMISSIONS SYSTEM
-- =====================================================
-- This creates a flexible RBAC system that can be extended
-- for multiple features (Focus of the Month, Pipelines, etc.)
-- =====================================================

-- =====================================================
-- 1. Permissions table - defines all granular permissions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  resource TEXT NOT NULL,        -- e.g., 'focus_of_month', 'pipelines', 'business_health'
  action TEXT NOT NULL,          -- e.g., 'create', 'read', 'update', 'delete', 'publish'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON public.permissions(resource, action);

-- =====================================================
-- 2. Role permissions - links roles to default permissions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'leader', 'user')),
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role);

-- =====================================================
-- 3. User permission overrides - for user-specific grants/revokes
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true,  -- true = grant, false = revoke
  granted_by UUID REFERENCES public.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,  -- Optional expiration for temporary access
  UNIQUE(user_id, permission_id)
);

-- Index for user permission lookups
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON public.user_permissions(user_id);

-- =====================================================
-- SEED DEFAULT PERMISSIONS
-- =====================================================

-- Focus of the Month permissions
INSERT INTO public.permissions (name, resource, action, description) VALUES
  ('focus.view', 'focus_of_month', 'view', 'View published focuses'),
  ('focus.view_draft', 'focus_of_month', 'view_draft', 'View draft/archived focuses'),
  ('focus.create', 'focus_of_month', 'create', 'Create new focus'),
  ('focus.update', 'focus_of_month', 'update', 'Edit existing focuses'),
  ('focus.publish', 'focus_of_month', 'publish', 'Publish focus'),
  ('focus.delete', 'focus_of_month', 'delete', 'Delete focus')
ON CONFLICT (name) DO NOTHING;

-- Pipelines permissions (for future use)
INSERT INTO public.permissions (name, resource, action, description) VALUES
  ('pipelines.view', 'pipelines', 'view', 'View pipeline data'),
  ('pipelines.update', 'pipelines', 'update', 'Edit pipeline data'),
  ('pipelines.delete', 'pipelines', 'delete', 'Delete pipelines')
ON CONFLICT (name) DO NOTHING;

-- Business Health permissions (for future use)
INSERT INTO public.permissions (name, resource, action, description) VALUES
  ('business_health.view', 'business_health', 'view', 'View business health dashboard'),
  ('business_health.export', 'business_health', 'export', 'Export business health reports')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- SEED DEFAULT ROLE PERMISSIONS
-- =====================================================

-- Admin: ALL permissions
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin', id FROM public.permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- Manager: All focus permissions except delete, can view/update pipelines
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'manager', id FROM public.permissions
WHERE name IN (
  'focus.view', 'focus.view_draft', 'focus.create', 'focus.update', 'focus.publish',
  'pipelines.view', 'pipelines.update',
  'business_health.view', 'business_health.export'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Leader: Full focus permissions (create, read, update, publish) - no delete
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'leader', id FROM public.permissions
WHERE name IN ('focus.view', 'focus.view_draft', 'focus.create', 'focus.update', 'focus.publish')
ON CONFLICT (role, permission_id) DO NOTHING;

-- User: Read-only for published focuses
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'user', id FROM public.permissions
WHERE name = 'focus.view'
ON CONFLICT (role, permission_id) DO NOTHING;

-- =====================================================
-- HELPER FUNCTION: Check if user has permission
-- =====================================================
CREATE OR REPLACE FUNCTION has_permission(
  p_user_id UUID,
  p_resource TEXT,
  p_action TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
  v_has_role_perm BOOLEAN := FALSE;
  v_override_granted BOOLEAN := NULL;
  v_override_expired BOOLEAN := FALSE;
BEGIN
  -- Get user's role
  SELECT role INTO v_user_role
  FROM public.users
  WHERE id = p_user_id;

  IF v_user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Admins always have all permissions
  IF v_user_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Check role-based permission
  SELECT EXISTS(
    SELECT 1 FROM public.role_permissions rp
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE rp.role = v_user_role
      AND p.resource = p_resource
      AND p.action = p_action
  ) INTO v_has_role_perm;

  -- Check for user-specific override
  SELECT
    up.granted,
    up.expires_at < NOW() AS expired
  INTO v_override_granted, v_override_expired
  FROM public.user_permissions up
  JOIN public.permissions p ON up.permission_id = p.id
  WHERE up.user_id = p_user_id
    AND p.resource = p_resource
    AND p.action = p_action
  ORDER BY up.granted_at DESC
  LIMIT 1;

  -- If override exists and not expired, use it
  IF v_override_granted IS NOT NULL AND NOT v_override_expired THEN
    RETURN v_override_granted;
  END IF;

  -- Otherwise use role permission
  RETURN v_has_role_perm;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION has_permission(UUID, TEXT, TEXT) TO authenticated;

-- =====================================================
-- HELPER FUNCTION: Check if user can manage Focus
-- =====================================================
CREATE OR REPLACE FUNCTION can_manage_focus(p_user_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN has_permission(p_user_id, 'focus_of_month', 'create');
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION can_manage_focus(UUID) TO authenticated;

-- =====================================================
-- HELPER FUNCTION: Get user permissions list
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE (
  permission_name TEXT,
  resource TEXT,
  action TEXT,
  description TEXT
) AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  -- Get user's role
  SELECT role INTO v_user_role
  FROM public.users
  WHERE id = p_user_id;

  IF v_user_role IS NULL THEN
    RETURN;
  END IF;

  -- If admin, return all permissions
  IF v_user_role = 'admin' THEN
    RETURN QUERY
    SELECT p.name, p.resource, p.action, p.description
    FROM public.permissions p;
    RETURN;
  END IF;

  -- Return role permissions minus any user revokes
  -- plus any user grants
  RETURN QUERY
  SELECT DISTINCT p.name, p.resource, p.action, p.description
  FROM public.permissions p
  WHERE EXISTS (
    -- Has role permission
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role = v_user_role AND rp.permission_id = p.id
  ) OR EXISTS (
    -- Has user grant
    SELECT 1 FROM public.user_permissions up
    WHERE up.user_id = p_user_id
      AND up.permission_id = p.id
      AND up.granted = TRUE
      AND (up.expires_at IS NULL OR up.expires_at > NOW())
  )
  AND NOT EXISTS (
    -- Has user revoke (takes precedence)
    SELECT 1 FROM public.user_permissions up
    WHERE up.user_id = p_user_id
      AND up.permission_id = p.id
      AND up.granted = FALSE
      AND (up.expires_at IS NULL OR up.expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_permissions(UUID) TO authenticated;
