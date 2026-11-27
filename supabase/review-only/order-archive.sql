-- Dedicated Testing Supabase project migration.
-- Stores per-customer and global admin order-history archive markers.
-- Original orders are never deleted or modified.
CREATE TABLE IF NOT EXISTS public.order_archives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  archived_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  archive_scope text NOT NULL CHECK (archive_scope IN ('customer', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_archives_actor_scope_unique UNIQUE (order_id, archived_by, archive_scope)
);

CREATE INDEX IF NOT EXISTS order_archives_order_id_idx ON public.order_archives(order_id);
CREATE INDEX IF NOT EXISTS order_archives_archived_by_scope_idx ON public.order_archives(archived_by, archive_scope);

ALTER TABLE public.order_archives ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.order_archives TO authenticated;

DROP POLICY IF EXISTS order_archives_select_access ON public.order_archives;
CREATE POLICY order_archives_select_access
ON public.order_archives FOR SELECT TO authenticated
USING (
  archived_by = (SELECT auth.uid())
  OR archive_scope = 'admin'
  OR (SELECT public.is_admin())
);

DROP POLICY IF EXISTS order_archives_insert_access ON public.order_archives;
CREATE POLICY order_archives_insert_access
ON public.order_archives FOR INSERT TO authenticated
WITH CHECK (
  archived_by = (SELECT auth.uid())
  AND (
    (archive_scope = 'admin' AND (SELECT public.is_admin()))
    OR (
      archive_scope = 'customer'
      AND EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_archives.order_id
          AND o.user_id = (SELECT auth.uid())
      )
    )
  )
);

DROP POLICY IF EXISTS order_archives_delete_access ON public.order_archives;
CREATE POLICY order_archives_delete_access
ON public.order_archives FOR DELETE TO authenticated
USING (
  archived_by = (SELECT auth.uid())
  OR (SELECT public.is_admin())
);
