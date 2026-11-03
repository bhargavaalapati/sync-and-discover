CREATE OR REPLACE FUNCTION public.reset_syncexec_demo()
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE first_meeting uuid; second_meeting uuid;
BEGIN
  LOCK TABLE public.meetings, public.decisions, public.action_items IN EXCLUSIVE MODE;
  DELETE FROM public.action_items WHERE id IS NOT NULL;
  DELETE FROM public.decisions WHERE id IS NOT NULL;
  DELETE FROM public.meetings WHERE id IS NOT NULL;
  INSERT INTO public.meetings(title,date,raw_transcript) VALUES ('Q4 Architecture & Beta Timeline Sync','2026-10-10','') RETURNING id INTO first_meeting;
  INSERT INTO public.meetings(title,date,raw_transcript) VALUES ('Sprint 4 API & GTM Budget Review','2026-10-20','') RETURNING id INTO second_meeting;
  INSERT INTO public.decisions(meeting_id,speaker,decision_text,created_at) VALUES
  (first_meeting,'Priya (PM)','[2026-10-10] Public beta launch date is locked for November 15, 2026.','2026-10-10T10:00:00Z'),
  (first_meeting,'Rahul (Eng)','[2026-10-10] Exclusively use PostgreSQL as primary production database; no NoSQL.','2026-10-10T10:00:00Z'),
  (second_meeting,'Priya (PM)','[2026-10-20] Total Q4 beta marketing budget is strictly capped at $5,000.','2026-10-20T10:00:00Z'),
  (second_meeting,'Rahul (Eng)','[2026-10-20] Use JWT-based OAuth2 with Google and GitHub for authentication.','2026-10-20T10:00:00Z');
  INSERT INTO public.action_items(meeting_id,owner,task,deadline,status,synced_to_tracker) VALUES
  (first_meeting,'Rahul (Eng)','Provision production PostgreSQL schema and staging environment','2026-10-25','completed',true),
  (first_meeting,'Priya (PM)','Finalize beta waitlist onboarding email sequence','2026-11-01','open',true),
  (second_meeting,'Rahul (Eng)','Finish JWT authentication API and rate-limiting middleware','2026-11-02','open',true),
  (second_meeting,'Priya (PM)','Publish paid social ad creatives and UTM tracking links','2026-11-01','open',true);
END;
$$;
REVOKE ALL ON FUNCTION public.reset_syncexec_demo() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_syncexec_demo() TO service_role;