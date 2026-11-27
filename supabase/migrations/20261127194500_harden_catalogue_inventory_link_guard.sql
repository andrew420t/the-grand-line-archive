-- Harden the Testing-only catalogue inventory language guard.
-- Keep the trigger function out of the exposed client RPC surface and pin search_path.
ALTER FUNCTION public.guard_catalogue_inventory_link_language() SET search_path = '';
REVOKE ALL PRIVILEGES ON FUNCTION public.guard_catalogue_inventory_link_language()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_catalogue_inventory_link_language()
  TO postgres, service_role;
