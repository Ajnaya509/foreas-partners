-- Sharing starts after the user's recorded agreement; Stripe still controls payouts.
-- These routines do not initiate transfers or accept agreements.
CREATE OR REPLACE FUNCTION public.partner_enrollment_activate(p_user uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare e public.partner_enrollments%rowtype; p public.partners%rowtype; v_code text;begin
  select * into e from public.partner_enrollments where user_id=p_user for update;
  if not found or e.accepted_at is null or e.status='paused' then raise exception 'CONDITIONS_REQUIRED';end if;
  select * into p from public.partners where id=e.partner_id and user_id=p_user for update;
  if not found or p.status not in ('pending','active') or p.stripe_account_id is distinct from e.stripe_account_id then raise exception 'IDENTITY_CONFLICT';end if;
  if e.status='ready' and p.status='active' and p.referral_code is not null then return;end if;
  v_code=coalesce(p.referral_code,'FE'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,24)));
  update public.partners set status='active',approved_at=coalesce(approved_at,now()),referral_code=v_code,commission_rate=10,is_promo_active=true,discount_percent_for_recruits=10 where id=e.partner_id;
  update public.partner_enrollments set status='ready',updated_at=now() where user_id=p_user;
  insert into public.partner_enrollment_mail(user_id,kind,business_key) values(p_user,'welcome','partner-welcome/'||e.partner_id) on conflict(business_key) do nothing;
end$function$;


CREATE OR REPLACE FUNCTION public.partner_enrollment_checkout_prepare(p_user uuid, p_code text, p_checkout text, p_customer text, p_price text, p_interval text, p_unit integer, p_live boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare e public.partner_enrollments%rowtype; v public.partner_enrollment_checkouts%rowtype; d public.drivers%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,925));
  select e0.* into e from public.partner_enrollments e0 join public.partners p on p.id=e0.partner_id
    where p.referral_code=p_code and p.status='active' and e0.status='ready' and e0.accepted_at is not null;
  if not found or (e.mode='live')<>p_live then raise exception 'CODE_UNAVAILABLE';end if;
  if e.user_id=p_user then raise exception 'SELF_REFERRAL';end if;
  if p_checkout !~ '^cs_' or p_price !~ '^price_' or p_interval not in ('month','year') or p_unit<=0 then raise exception 'INVALID_CHECKOUT';end if;
  select * into v from public.partner_enrollment_checkouts where checkout_id=p_checkout;
  if found then
    if v.user_id<>p_user or v.partner_id<>e.partner_id or v.price_id<>p_price or v.unit_amount<>p_unit or v.interval<>p_interval or v.live<>p_live then raise exception 'IDENTITY_CONFLICT';end if;
    return jsonb_build_object('status','prepared');
  end if;
  select * into d from public.drivers where auth_user_id=p_user;
  if found and (d.partner_id is not null or d.referred_by is not null or exists(select 1 from public.partner_referrals r where r.driver_id=d.id)) and not exists(select 1 from public.partner_enrollment_referrals r where r.user_id=p_user and r.partner_id=e.partner_id) then raise exception 'LEGACY_ATTRIBUTION_PRESERVED';end if;
  if exists(select 1 from public.partner_enrollment_referrals where user_id=p_user and partner_id<>e.partner_id) then raise exception 'ATTRIBUTION_LOCKED';end if;
  if exists(select 1 from public.subscriptions where user_id=p_user and (first_payment_at is not null or status in ('active','past_due','canceled'))) then raise exception 'ATTRIBUTION_AFTER_PAYMENT';end if;
  insert into public.partner_enrollment_checkouts(checkout_id,user_id,partner_id,customer_id,price_id,interval,unit_amount,live)
    values(p_checkout,p_user,e.partner_id,p_customer,p_price,p_interval,p_unit,p_live);
  return jsonb_build_object('status','prepared');
end$function$;


CREATE OR REPLACE FUNCTION public.partner_enrollment_claim(p_user uuid, p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare sponsor public.partners%rowtype;
  existing public.partner_enrollment_intents%rowtype;
  driver public.drivers%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 925));
  select p.* into sponsor from public.partners p
    join public.partner_enrollments e on e.partner_id = p.id
    where p.referral_code = upper(trim(p_code)) and p.status = 'active'
      and e.status = 'ready' and e.accepted_at is not null;
  if not found then raise exception 'CODE_UNAVAILABLE'; end if;
  if sponsor.user_id = p_user then raise exception 'SELF_REFERRAL'; end if;
  if exists (select 1 from public.subscriptions s where s.user_id = p_user
    and (s.first_payment_at is not null or s.status in ('active', 'past_due', 'canceled')))
    then raise exception 'ATTRIBUTION_AFTER_PAYMENT'; end if;
  select * into driver from public.drivers where auth_user_id = p_user;
  if driver.id is null then raise exception 'IDENTITY_CONFLICT'; end if;
  if exists (select 1 from public.partner_enrollment_referrals r where r.user_id = p_user and r.partner_id = sponsor.id)
    then return jsonb_build_object('status', 'already_attached'); end if;
  if driver.partner_id is not null or driver.referred_by is not null
    or exists (select 1 from public.partner_referrals r where r.driver_id = driver.id)
    or exists (select 1 from public.partner_enrollment_referrals r where r.user_id = p_user)
    then raise exception 'ATTRIBUTION_LOCKED'; end if;
  select * into existing from public.partner_enrollment_intents where user_id = p_user;
  if found then
    if existing.partner_id <> sponsor.id then raise exception 'ATTRIBUTION_LOCKED'; end if;
    return jsonb_build_object('status', 'already_attached');
  end if;
  insert into public.partner_enrollment_intents(user_id, partner_id, source)
    values(p_user, sponsor.id, 'app');
  return jsonb_build_object('status', 'attached');
end $function$;


CREATE OR REPLACE FUNCTION public.partner_enrollment_intent_offer(p_user uuid)
 RETURNS text
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select p.referral_code from public.partner_enrollment_intents i
    join public.partners p on p.id = i.partner_id
    join public.partner_enrollments e on e.partner_id = p.id
    where i.user_id = p_user and p.status = 'active' and e.status = 'ready'
      and e.accepted_at is not null
$function$;


CREATE OR REPLACE FUNCTION public.partner_enrollment_offer(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare p public.partners%rowtype;begin
  select p0.* into p from public.partners p0 join public.partner_enrollments e on e.partner_id=p0.id
    where p0.referral_code=upper(trim(p_code)) and p0.status='active' and e.status='ready' and e.accepted_at is not null;
  if not found then raise exception 'CODE_UNAVAILABLE';end if;
  return jsonb_build_object('code',p.referral_code,'sponsor_type','partner','discount_pct',10,'duration_months',null,'duration_type','forever','active',true);
end$function$;
