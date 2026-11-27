-- Review and deploy to the dedicated Testing Supabase project only.
-- Allows customers to hide their own order history entries and admins to archive
-- an order from the admin order list without deleting the underlying order.
BEGIN;
CREATE TABLE IF NOT EXISTS public.order_archives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  archived_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  archive_scope text NOT NULL CHECK (archive_scope IN ('customer','admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id, archived_by, archive_scope)
);
CREATE INDEX IF NOT EXISTS order_archives_actor_scope_idx
  ON public.order_archives (archived_by, archive_scope);
ALTER TABLE public.order_archives ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.order_archives TO authenticated;
DROP POLICY IF EXISTS gla_order_archives_read ON public.order_archives;
CREATE POLICY gla_order_archives_read ON public.order_archives
  FOR SELECT TO authenticated
  USING (archived_by = auth.uid() OR coalesce(public.is_admin(), false));
DROP POLICY IF EXISTS gla_order_archives_insert ON public.order_archives;
CREATE POLICY gla_order_archives_insert ON public.order_archives
  FOR INSERT TO authenticated
  WITH CHECK (
    archived_by = auth.uid()
    AND (
      (archive_scope = 'admin' AND coalesce(public.is_admin(), false))
      OR (
        archive_scope = 'customer'
        AND EXISTS (
          SELECT 1 FROM public.orders AS o
          WHERE o.id::text = order_archives.order_id
            AND coalesce(
              to_jsonb(o)->>'user_id',
              to_jsonb(o)->>'customer_id',
              to_jsonb(o)->>'profile_id'
            ) = auth.uid()::text
        )
      )
    )
  );
DROP POLICY IF EXISTS gla_order_archives_delete ON public.order_archives;
CREATE POLICY gla_order_archives_delete ON public.order_archives
  FOR DELETE TO authenticated
  USING (archived_by = auth.uid() OR coalesce(public.is_admin(), false));
COMMIT;
