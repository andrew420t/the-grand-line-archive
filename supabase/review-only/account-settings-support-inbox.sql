-- Account settings, avatar selection, support inbox and email-recovery requests.
-- Additive migration; existing profiles, messages, orders and auth identities are retained.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_key text NOT NULL DEFAULT 'luffy';

COMMENT ON COLUMN public.profiles.avatar_key
  IS 'Key for a curated One Piece wanted-poster avatar displayed in the customer account.';

CREATE TABLE IF NOT EXISTS public.support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_display_name text,
  customer_email text,
  subject text NOT NULL DEFAULT 'Message to the Archive',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_conversations_customer_latest_idx
  ON public.support_conversations (customer_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS support_conversations_order_idx
  ON public.support_conversations (order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS support_conversations_status_latest_idx
  ON public.support_conversations (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  sender_role text NOT NULL CHECK (sender_role IN ('customer', 'admin')),
  message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 3000),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS support_messages_conversation_created_idx
  ON public.support_messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS support_messages_unread_idx
  ON public.support_messages (conversation_id, sender_id, read_at)
  WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS public.account_recovery_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  contact_email text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'closed')),
  admin_response text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS account_recovery_requests_latest_idx
  ON public.account_recovery_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS account_recovery_requests_contact_idx
  ON public.account_recovery_requests (lower(contact_email), created_at DESC);

ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_recovery_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Support participants read conversations" ON public.support_conversations;
CREATE POLICY "Support participants read conversations"
ON public.support_conversations
FOR SELECT
TO authenticated
USING (customer_id = (SELECT auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "Support participants read messages" ON public.support_messages;
CREATE POLICY "Support participants read messages"
ON public.support_messages
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.support_conversations AS c
    WHERE c.id = support_messages.conversation_id
      AND c.customer_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Administrators read account recovery requests" ON public.account_recovery_requests;
CREATE POLICY "Administrators read account recovery requests"
ON public.account_recovery_requests
FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Administrators update account recovery requests" ON public.account_recovery_requests;
CREATE POLICY "Administrators update account recovery requests"
ON public.account_recovery_requests
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

REVOKE ALL ON public.support_conversations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.support_messages FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.account_recovery_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.support_conversations, public.support_messages TO authenticated;
GRANT SELECT, UPDATE ON public.account_recovery_requests TO authenticated;

-- An authenticated customer may get their own open thread. An administrator
-- may open or resume a thread for the customer attached to an order.
CREATE OR REPLACE FUNCTION public.get_or_create_support_conversation(
  p_customer_id uuid DEFAULT NULL,
  p_order_id uuid DEFAULT NULL,
  p_subject text DEFAULT 'Message to the Archive'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_customer uuid;
  v_email text;
  v_display_name text;
  v_subject text := left(coalesce(nullif(btrim(p_subject), ''), 'Message to the Archive'), 120);
  v_conversation uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Sign in to message the Archive.';
  END IF;

  IF coalesce(public.is_admin(), false) THEN
    v_customer := p_customer_id;
    IF v_customer IS NULL THEN
      RAISE EXCEPTION 'Choose a customer for this conversation.';
    END IF;
  ELSE
    v_customer := v_actor;
    IF p_customer_id IS NOT NULL AND p_customer_id <> v_actor THEN
      RAISE EXCEPTION 'You can only open your own customer conversation.';
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_customer) THEN
    RAISE EXCEPTION 'Customer account was not found.';
  END IF;

  IF p_order_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = p_order_id AND user_id = v_customer
  ) THEN
    RAISE EXCEPTION 'That order does not belong to this customer.';
  END IF;

  SELECT u.email,
         coalesce(nullif(btrim(p.display_name), ''),
                  nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
                  nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
                  'Archive customer')
  INTO v_email, v_display_name
  FROM auth.users AS u
  LEFT JOIN public.profiles AS p ON p.id = u.id
  WHERE u.id = v_customer;

  SELECT id INTO v_conversation
  FROM public.support_conversations
  WHERE customer_id = v_customer
    AND order_id IS NOT DISTINCT FROM p_order_id
    AND status = 'open'
  ORDER BY updated_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_conversation IS NULL THEN
    INSERT INTO public.support_conversations (
      customer_id, order_id, customer_display_name, customer_email, subject
    )
    VALUES (v_customer, p_order_id, v_display_name, v_email, v_subject)
    RETURNING id INTO v_conversation;
  END IF;

  RETURN v_conversation;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_or_create_support_conversation(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_or_create_support_conversation(uuid, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_support_conversation(uuid, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.send_support_message(
  p_conversation_id uuid,
  p_message text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_customer uuid;
  v_status text;
  v_sender_role text;
  v_message text := btrim(coalesce(p_message, ''));
  v_message_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Sign in to send a message.';
  END IF;
  IF char_length(v_message) < 1 OR char_length(v_message) > 3000 THEN
    RAISE EXCEPTION 'Messages must contain between 1 and 3000 characters.';
  END IF;

  SELECT customer_id, status
  INTO v_customer, v_status
  FROM public.support_conversations
  WHERE id = p_conversation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation was not found.';
  END IF;

  IF coalesce(public.is_admin(), false) THEN
    v_sender_role := 'admin';
  ELSIF v_customer = v_actor THEN
    v_sender_role := 'customer';
  ELSE
    RAISE EXCEPTION 'You are not permitted to reply to this conversation.';
  END IF;

  IF v_status <> 'open' THEN
    RAISE EXCEPTION 'This conversation is closed.';
  END IF;

  INSERT INTO public.support_messages (conversation_id, sender_id, sender_role, message)
  VALUES (p_conversation_id, v_actor, v_sender_role, v_message)
  RETURNING id INTO v_message_id;

  UPDATE public.support_conversations
  SET updated_at = now(), last_message_at = now()
  WHERE id = p_conversation_id;

  RETURN v_message_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.send_support_message(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.send_support_message(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.send_support_message(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_support_conversation_read(p_conversation_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_updated integer;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Sign in to read messages.';
  END IF;

  IF NOT coalesce(public.is_admin(), false) AND NOT EXISTS (
    SELECT 1 FROM public.support_conversations
    WHERE id = p_conversation_id AND customer_id = v_actor
  ) THEN
    RAISE EXCEPTION 'You are not permitted to mark this conversation as read.';
  END IF;

  UPDATE public.support_messages
  SET read_at = now()
  WHERE conversation_id = p_conversation_id
    AND sender_id <> v_actor
    AND read_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$function$;

REVOKE ALL ON FUNCTION public.mark_support_conversation_read(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_support_conversation_read(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_support_conversation_read(uuid) TO authenticated;

-- Email recovery requests are intentionally generic: this function never
-- reveals whether a supplied display name/contact address matches an account.
CREATE OR REPLACE FUNCTION public.submit_account_email_recovery(
  p_display_name text,
  p_contact_email text,
  p_details text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_name text := left(btrim(coalesce(p_display_name, '')), 80);
  v_email text := lower(btrim(coalesce(p_contact_email, '')));
  v_details text := left(btrim(coalesce(p_details, '')), 1000);
  v_id uuid;
  v_recent integer;
BEGIN
  IF char_length(v_name) < 2 THEN
    RAISE EXCEPTION 'Enter the name shown on your account.';
  END IF;
  IF v_email !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}
    RAISE EXCEPTION 'Enter a valid contact email address.';
  END IF;

  SELECT count(*) INTO v_recent
  FROM public.account_recovery_requests
  WHERE lower(contact_email) = v_email
    AND created_at > now() - interval '24 hours';

  IF v_recent >= 3 THEN
    RAISE EXCEPTION 'Too many requests have been sent for this contact address. Please try again later.';
  END IF;

  INSERT INTO public.account_recovery_requests (display_name, contact_email, details)
  VALUES (v_name, v_email, nullif(v_details, ''))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_account_email_recovery(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_account_email_recovery(text, text, text) TO anon, authenticated;

GRANT SELECT ON public.support_conversations, public.support_messages, public.account_recovery_requests TO authenticated;

COMMIT;
 THEN
    RAISE EXCEPTION 'Enter a valid contact email address.';
  END IF;

  SELECT count(*) INTO v_recent
  FROM public.account_recovery_requests
  WHERE lower(contact_email) = v_email
    AND created_at > now() - interval '24 hours';

  IF v_recent >= 3 THEN
    RAISE EXCEPTION 'Too many requests have been sent for this contact address. Please try again later.';
  END IF;

  INSERT INTO public.account_recovery_requests (display_name, contact_email, details)
  VALUES (v_name, v_email, nullif(v_details, ''))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_account_email_recovery(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_account_email_recovery(text, text, text) TO anon, authenticated;

GRANT SELECT ON public.support_conversations, public.support_messages, public.account_recovery_requests TO authenticated;

COMMIT;
