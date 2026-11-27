-- =====================================================================
-- 새 계정이 생기면 profiles 행을 자동으로 만들어 줍니다.
-- 기본 역할은 dealer_engineer + 대리점 미지정 = 아무 데이터도 보이지 않는 안전한 상태.
-- 본사 관리자가 역할/대리점을 지정해야 데이터가 보입니다.
-- =====================================================================

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'dealer_engineer')
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 이미 만들어졌는데 profiles 가 없는 계정 보충
insert into public.profiles (user_id, email, full_name, role)
select u.id, u.email, u.raw_user_meta_data->>'full_name', 'dealer_engineer'
from auth.users u
where not exists (select 1 from public.profiles p where p.user_id = u.id)
  and u.banned_until is null
on conflict (user_id) do nothing;

select email, role, dealer_code from public.profiles order by role, email;
