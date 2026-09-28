-- A rejected capability request creates no connected account. Allow the user
-- to resume after Stripe approves the platform, without redoing enrollment.
-- Unknown outcomes remain blocked so an uncertain creation cannot be repeated.
create or replace function public.partner_enrollment_connect_start(p_user uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  e public.partner_enrollments%rowtype;
begin
  select * into e from public.partner_enrollments
  where user_id = p_user for update;

  if not found or e.accepted_at is null or e.status = 'paused' then
    raise exception 'CONDITIONS_REQUIRED';
  end if;
  if e.stripe_account_id is not null then
    return to_jsonb(e) || jsonb_build_object('create', false);
  end if;

  if e.connect_state = 'unavailable'
     and e.connect_error = 'STRIPE_APPROVAL_REQUIRED' then
    -- A new key avoids replaying Stripe's previous definitive refusal.
    update public.partner_enrollments
    set connect_operation = pg_catalog.gen_random_uuid(),
        connect_error = null,
        connect_started_at = now(),
        updated_at = now()
    where user_id = p_user
    returning * into e;
    return to_jsonb(e) || jsonb_build_object('create', true);
  end if;

  if e.connect_error is not null then
    raise exception '%', e.connect_error;
  end if;
  if e.connect_started_at is not null then
    raise exception 'CONNECT_UNCERTAIN';
  end if;
  update public.partner_enrollments
  set connect_started_at = now(), updated_at = now()
  where user_id = p_user returning * into e;
  return to_jsonb(e) || jsonb_build_object('create', true);
end;
$function$;

revoke all on function public.partner_enrollment_connect_start(uuid)
from public, anon, authenticated;
grant execute on function public.partner_enrollment_connect_start(uuid)
to service_role;
