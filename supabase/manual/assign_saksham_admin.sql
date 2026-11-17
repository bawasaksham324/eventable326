do $$
declare
  v_user_id uuid;
  v_profile_role text;
begin
  select id
    into v_user_id
  from auth.users
  where lower(email) = lower('sakshamdalal74@gmail.com');

  if v_user_id is null then
    raise exception 'No auth.users account found for the requested email.';
  end if;

  select role
    into v_profile_role
  from public.profiles
  where id = v_user_id;

  if v_profile_role is null then
    raise exception 'The auth account exists, but its public.profiles row is missing.';
  end if;

  update public.profiles
  set role = 'admin'
  where id = v_user_id;

  select role
    into v_profile_role
  from public.profiles
  where id = v_user_id;

  if v_profile_role <> 'admin' then
    raise exception 'The profile role was not changed to admin.';
  end if;

  raise notice 'Administrator role confirmed for auth user %.', v_user_id;
end
$$;

select u.id, u.email, p.role
from auth.users u
join public.profiles p on p.id = u.id
where lower(u.email) = lower('sakshamdalal74@gmail.com');
