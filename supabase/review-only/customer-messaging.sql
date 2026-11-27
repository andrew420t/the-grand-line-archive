-- Customer/admin messaging foundation for The Grand Line Archive.
-- REVIEW ONLY: do not run against Production. Review against the staging schema,
-- then apply to the dedicated Testing Supabase project only after approval.
-- This migration deliberately stores order_id as text because the live orders.id
-- type must be verified before adding a foreign key.

BEGIN;

DO $preflight$
BEGIN
  IF to_regprocedure('public.is_admin()') IS NULL THEN
    RAISE EXCEPTION 'Expected public.is_admin() was not found. Stop and review the live admin authorization function.';
  END IF;
  IF pg_get_function_result('public.is_admin()'::regprocedure) <> 'boolean' THEN
    RAISE EXCEPTION 'public.is_admin() must return boolean.';
  END IF;
  IF to_regclass('auth.users') IS NULL THEN
    RAISE EXCEPTION 'Supabase auth.users was not found.';
  END IF;
END
$preflight$;

CREATE TABLE IF NOT EXISTS public.message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL DEFAULT 'Customer support',
  order_id text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 10000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS message_threads_customer_last_message_idx
  ON public.message_threads (customer_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS message_threads_status_last_message_idx
  ON public.message_threads (status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS messages_thread_created_idx
  ON public.messages (thread_id, created_at ASC);

ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.message_threads TO authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;

-- Customers can see their own threads; admins can see every thread.
DROP POLICY IF EXISTS gla_message_threads_read ON public.message_threads;
CREATE POLICY gla_message_threads_read
  ON public.message_threads FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR coalesce(public.is_admin(), false));

-- A customer may open a thread only for themselves. Admins may open a thread
-- on behalf of a customer when starting an order-related conversation.
DROP POLICY IF EXISTS gla_message_threads_insert ON public.message_threads;
CREATE POLICY gla_message_threads_insert
  ON public.message_threads FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    OR coalesce(public.is_admin(), false)
  );

-- Only admins may change thread status or other thread-level metadata.
DROP POLICY IF EXISTS gla_message_threads_update ON public.message_threads;
CREATE POLICY gla_message_threads_update
  ON public.message_threads FOR UPDATE TO authenticated
  USING (coalesce(public.is_admin(), false))
  WITH CHECK (coalesce(public.is_admin(), false));

-- Messages are visible only to the thread's customer and administrators.
DROP POLICY IF EXISTS gla_messages_read ON public.messages;
CREATE POLICY gla_messages_read
  ON public.messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.message_threads AS thread
      WHERE thread.id = messages.thread_id
        AND (thread.customer_id = auth.uid() OR coalesce(public.is_admin(), false))
    )
  );

-- A customer may send as themselves only in their own thread. An admin may
-- reply as themselves in any thread. sender_id can never be spoofed.
DROP POLICY IF EXISTS gla_messages_insert ON public.messages;
CREATE POLICY gla_messages_insert
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.message_threads AS thread
      WHERE thread.id = messages.thread_id
        AND (thread.customer_id = auth.uid() OR coalesce(public.is_admin(), false))
    )
  );

CREATE OR REPLACE FUNCTION public.gla_touch_message_thread()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.message_threads
  SET updated_at = now(), last_message_at = NEW.created_at
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS gla_messages_touch_thread ON public.messages;
CREATE TRIGGER gla_messages_touch_thread
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.gla_touch_message_thread();

-- Prevent broad legacy permissive policies from bypassing the ownership rules.
DROP POLICY IF EXISTS gla_message_threads_read_guard ON public.message_threads;
CREATE POLICY gla_message_threads_read_guard
  ON public.message_threads AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR coalesce(public.is_admin(), false));

DROP POLICY IF EXISTS gla_message_threads_insert_guard ON public.message_threads;
CREATE POLICY gla_message_threads_insert_guard
  ON public.message_threads AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid() OR coalesce(public.is_admin(), false));

DROP POLICY IF EXISTS gla_message_threads_update_guard ON public.message_threads;
CREATE POLICY gla_message_threads_update_guard
  ON public.message_threads AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (coalesce(public.is_admin(), false))
  WITH CHECK (coalesce(public.is_admin(), false));

DROP POLICY IF EXISTS gla_messages_read_guard ON public.messages;
CREATE POLICY gla_messages_read_guard
  ON public.messages AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.message_threads AS thread
      WHERE thread.id = messages.thread_id
        AND (thread.customer_id = auth.uid() OR coalesce(public.is_admin(), false))
    )
  );

DROP POLICY IF EXISTS gla_messages_insert_guard ON public.messages;
CREATE POLICY gla_messages_insert_guard
  ON public.messages AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.message_threads AS thread
      WHERE thread.id = messages.thread_id
        AND (thread.customer_id = auth.uid() OR coalesce(public.is_admin(), false))
    )
  );

COMMIT;

-- After review and staging deployment:
-- 1. Add public.messages to the Supabase Realtime publication if live updates
--    are desired; otherwise the UI can refresh the open conversation.
-- 2. Confirm order_id's real type before adding an optional foreign key.
-- 3. Test customer A cannot read or write customer B's threads.
-- 4. Test non-admin users cannot view other customers' threads or change status.
-- 5. Never execute this review file automatically in CI or Cloudflare deploys.
