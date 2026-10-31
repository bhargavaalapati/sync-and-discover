DROP POLICY IF EXISTS "demo open access" ON public.meetings;
DROP POLICY IF EXISTS "demo open access" ON public.decisions;
DROP POLICY IF EXISTS "demo open access" ON public.action_items;
REVOKE ALL ON public.meetings, public.decisions, public.action_items FROM anon, authenticated;
GRANT ALL ON public.meetings, public.decisions, public.action_items TO service_role;