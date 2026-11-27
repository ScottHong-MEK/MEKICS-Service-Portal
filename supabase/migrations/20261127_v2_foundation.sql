-- =====================================================================
-- MEKICS Global Service Portal v2 - 기반 구조 (대리점 / 권한 / 구성품 / 수정이력)
-- 실행: Supabase > SQL Editor 에 전체 붙여넣고 Run (한 번만 실행)
--
-- 원칙
--  * 기존 테이블과 데이터는 지우지 않습니다. 칸(column)과 테이블을 "추가"만 합니다.
--  * 여러 번 실행해도 안전하도록 if not exists / on conflict 를 사용합니다.
--  * 권한은 user_metadata(사용자가 바꿀 수 있음)가 아니라 profiles 테이블로 판단합니다.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. 대리점 (출고거래처 코드 기준)
-- ---------------------------------------------------------------------
create table if not exists public.dealers (
  code        varchar primary key,            -- 예: BA3TR4 (OMEGA 출고거래처코드)
  name        varchar not null,               -- 예: MEK TURKEY
  country     varchar,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. 사용자 프로필 / 역할
--    hq_admin        : 본사 관리자 (전체 + 사용자/권한 관리)
--    hq_engineer     : 본사 엔지니어 (전체 조회/입력)
--    dealer_admin    : 대리점 관리자 (자기 대리점 장비/서비스)
--    dealer_engineer : 대리점 엔지니어 (자기 대리점 장비/서비스)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  email       varchar,
  full_name   varchar,
  role        varchar not null default 'dealer_engineer'
              check (role in ('hq_admin','hq_engineer','dealer_admin','dealer_engineer')),
  dealer_code varchar references public.dealers(code),
  created_at  timestamptz not null default now()
);

-- 기존 계정 이관: internal → 본사 엔지니어, partner → 대리점 엔지니어(대리점 지정 전까지 아무것도 안 보임)
insert into public.profiles (user_id, email, full_name, role)
select u.id, u.email, u.raw_user_meta_data->>'full_name',
       case when coalesce(u.raw_user_meta_data->>'account_type','internal') = 'partner'
            then 'dealer_engineer' else 'hq_engineer' end
from auth.users u
on conflict (user_id) do nothing;

-- 고객서비스팀장 계정은 본사 관리자
update public.profiles set role = 'hq_admin' where email = 'hy90630@mek-ics.com';

-- 권한 판단용 함수 (RLS 정책 안에서 사용)
create or replace function public.my_role() returns varchar
language sql stable security definer set search_path = public as $$
  select role from public.profiles where user_id = auth.uid()
$$;

create or replace function public.my_dealer() returns varchar
language sql stable security definer set search_path = public as $$
  select dealer_code from public.profiles where user_id = auth.uid()
$$;

create or replace function public.is_hq() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('hq_admin','hq_engineer') from public.profiles where user_id = auth.uid()), false)
$$;

-- ---------------------------------------------------------------------
-- 3. 장비 마스터 확장 (OMEGA 생산이력 항목 추가)
-- ---------------------------------------------------------------------
alter table public.equipments
  add column if not exists item_code           varchar,   -- 품목코드 (MH0015_09)
  add column if not exists item_name           varchar,   -- 품목명
  add column if not exists spec                text,      -- 규격
  add column if not exists option_spec         varchar,   -- 사양
  add column if not exists receipt_type        varchar,   -- 입고유형 (생산 / 재작업)
  add column if not exists udi                 varchar,   -- UDI (GS1)
  add column if not exists dealer_code         varchar references public.dealers(code),
  add column if not exists return_dealer_code  varchar,
  add column if not exists return_date         date,
  add column if not exists in_stock            boolean,
  add column if not exists installed_date      date,
  add column if not exists source              varchar default 'omega',  -- omega / sales(매출기반 자동등록)
  add column if not exists updated_at          timestamptz default now();

-- 예전 매출 업로드가 만든 장비(부품 LOT 포함 가능)를 구분 표시. 삭제하지 않습니다.
update public.equipments set source = 'sales' where board_info = '매출 내역 기반 등록' and (source is null or source = 'omega');

create index if not exists equipments_dealer_idx on public.equipments(dealer_code);

-- ---------------------------------------------------------------------
-- 4. 장비 구성품 이력 (보드/모듈별 LOT · HW · SW)
--    한 장비의 같은 구성품이 교체되면 새 행을 추가하고 이전 행은 is_current = false.
--    → 출고 당시 구성과 현재 구성을 모두 추적, LOT 역추적 가능.
-- ---------------------------------------------------------------------
create table if not exists public.equipment_components (
  id             bigint generated always as identity primary key,
  serial_number  varchar not null references public.equipments(serial_number) on delete cascade,
  component      varchar not null,      -- 예: MAIN B/D, PNEUMATIC B/D, BLOWER
  lot            varchar,
  hw_version     varchar,
  sw_version     varchar,
  dc_hw_version  varchar,
  dc_sw_version  varchar,
  remark         text,
  source         varchar not null default 'production',   -- production / service
  service_case_id uuid,                                    -- 서비스로 교체된 경우 해당 접수건
  is_current     boolean not null default true,
  created_at     timestamptz not null default now(),
  created_by     uuid default auth.uid()
);
create unique index if not exists equipment_components_current_uq
  on public.equipment_components(serial_number, component) where is_current;
create index if not exists equipment_components_lot_idx on public.equipment_components(component, lot);

-- ---------------------------------------------------------------------
-- 5. 서비스 접수 확장 (현재 화면이 쓰는데 DB에 없던 칸 포함)
-- ---------------------------------------------------------------------
alter table public.service_cases
  add column if not exists cause_code   varchar,
  add column if not exists action_code  varchar,
  add column if not exists file_urls    text[],
  add column if not exists dealer_code  varchar references public.dealers(code),
  add column if not exists created_by   uuid default auth.uid(),
  add column if not exists updated_at   timestamptz default now();

-- 서비스 시 교체 부품 (기존 LOT → 신규 LOT)
create table if not exists public.service_parts (
  id             bigint generated always as identity primary key,
  case_id        uuid not null references public.service_cases(id) on delete cascade,
  component      varchar not null,
  part_code      varchar,
  old_lot        varchar,
  new_lot        varchar,
  old_sw_version varchar,
  new_sw_version varchar,
  qty            integer not null default 1,
  created_at     timestamptz not null default now(),
  created_by     uuid default auth.uid()
);

-- 매출 업로드가 쓰는데 DB에 없던 칸
alter table public.sales_records add column if not exists manager varchar;

-- ---------------------------------------------------------------------
-- 6. 자료실 (매뉴얼 / SW) - 기존에 테이블이 없어서 저장이 안 되던 부분
-- ---------------------------------------------------------------------
create table if not exists public.download_files (
  id            bigint generated always as identity primary key,
  product       varchar not null,
  category      varchar not null check (category in ('sw','manual','bulletin')),
  type          varchar,
  version       varchar,
  file_name     varchar not null,
  file_url      text,              -- (구버전 호환) 공개 URL
  storage_path  text,              -- (v2) 비공개 저장소 경로 → 서명 URL로 다운로드
  release_date  date default current_date,
  description   text,
  visibility    varchar not null default 'all' check (visibility in ('all','hq','dealers')),
  dealer_codes  varchar[],         -- visibility = 'dealers' 일 때 공개 대상 대리점
  created_at    timestamptz not null default now(),
  created_by    uuid default auth.uid()
);

-- ---------------------------------------------------------------------
-- 7. 수정 이력 (누가 언제 무엇을 바꿨는지) - ISO 13485 기록 관리 대응
-- ---------------------------------------------------------------------
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  table_name  varchar not null,
  row_key     text,
  action      varchar not null,      -- INSERT / UPDATE / DELETE
  old_data    jsonb,
  new_data    jsonb,
  actor       uuid default auth.uid(),
  at          timestamptz not null default now()
);

create or replace function public.write_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare k text;
begin
  k := coalesce(
         (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end)->>'id',
         (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end)->>'serial_number');
  insert into public.audit_log(table_name, row_key, action, old_data, new_data)
  values (tg_table_name, k, tg_op,
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

drop trigger if exists audit_service_cases on public.service_cases;
create trigger audit_service_cases after insert or update or delete on public.service_cases
  for each row execute function public.write_audit();

drop trigger if exists audit_service_parts on public.service_parts;
create trigger audit_service_parts after insert or update or delete on public.service_parts
  for each row execute function public.write_audit();

drop trigger if exists audit_equipment_components on public.equipment_components;
create trigger audit_equipment_components after insert or update or delete on public.equipment_components
  for each row execute function public.write_audit();

-- ---------------------------------------------------------------------
-- 8. 행 단위 접근 제한 (RLS)
--    본사(hq_*): 전체 / 대리점: 자기 대리점(dealer_code) 장비와 서비스만
--    매출·결재 문서: 본사만
-- ---------------------------------------------------------------------
alter table public.dealers               enable row level security;
alter table public.profiles              enable row level security;
alter table public.equipments            enable row level security;
alter table public.equipment_components  enable row level security;
alter table public.service_cases         enable row level security;
alter table public.service_parts         enable row level security;
alter table public.sales_records         enable row level security;
alter table public.download_files        enable row level security;
alter table public.audit_log             enable row level security;
alter table public.installations         enable row level security;
alter table public.warranties            enable row level security;
alter table public.approval_documents    enable row level security;
alter table public.approval_lines        enable row level security;

-- 정책 재실행 대비: 같은 이름 정책 삭제 후 생성
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies
           where schemaname = 'public' and policyname like 'v2_%' loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 대리점 목록: 본사 전체, 대리점은 자기 것만 조회
create policy v2_dealers_hq   on public.dealers for all    using (public.is_hq()) with check (public.is_hq());
create policy v2_dealers_self on public.dealers for select using (code = public.my_dealer());

-- 프로필: 본인 조회, 본사 관리자만 변경
create policy v2_profiles_self  on public.profiles for select using (user_id = auth.uid() or public.is_hq());
create policy v2_profiles_admin on public.profiles for all
  using (public.my_role() = 'hq_admin') with check (public.my_role() = 'hq_admin');

-- 장비
create policy v2_equipments_hq     on public.equipments for all    using (public.is_hq()) with check (public.is_hq());
create policy v2_equipments_dealer on public.equipments for select using (dealer_code is not null and dealer_code = public.my_dealer());

-- 구성품: 대리점은 자기 장비 구성품 조회 + 서비스 교체 등록
create policy v2_components_hq on public.equipment_components for all using (public.is_hq()) with check (public.is_hq());
create policy v2_components_dealer_read on public.equipment_components for select
  using (exists (select 1 from public.equipments e where e.serial_number = equipment_components.serial_number
                 and e.dealer_code = public.my_dealer()));
create policy v2_components_dealer_write on public.equipment_components for insert
  with check (source = 'service' and exists (select 1 from public.equipments e
              where e.serial_number = equipment_components.serial_number and e.dealer_code = public.my_dealer()));

-- 서비스 접수
create policy v2_cases_hq on public.service_cases for all using (public.is_hq()) with check (public.is_hq());
create policy v2_cases_dealer_read on public.service_cases for select
  using (dealer_code is not null and dealer_code = public.my_dealer());
create policy v2_cases_dealer_insert on public.service_cases for insert
  with check (dealer_code = public.my_dealer());
create policy v2_cases_dealer_update on public.service_cases for update
  using (dealer_code = public.my_dealer()) with check (dealer_code = public.my_dealer());

create policy v2_parts_hq on public.service_parts for all using (public.is_hq()) with check (public.is_hq());
create policy v2_parts_dealer on public.service_parts for all
  using (exists (select 1 from public.service_cases c where c.id = service_parts.case_id and c.dealer_code = public.my_dealer()))
  with check (exists (select 1 from public.service_cases c where c.id = service_parts.case_id and c.dealer_code = public.my_dealer()));

-- 매출 / 결재 / 수정이력: 본사만
create policy v2_sales_hq     on public.sales_records      for all    using (public.is_hq()) with check (public.is_hq());
create policy v2_appdoc_hq    on public.approval_documents for all    using (public.is_hq()) with check (public.is_hq());
create policy v2_appline_hq   on public.approval_lines     for all    using (public.is_hq()) with check (public.is_hq());
create policy v2_audit_hq     on public.audit_log          for select using (public.is_hq());

-- 설치 / 보증: 본사 전체, 대리점은 자기 장비만 조회
create policy v2_install_hq on public.installations for all using (public.is_hq()) with check (public.is_hq());
create policy v2_install_dealer on public.installations for select
  using (exists (select 1 from public.equipments e where e.serial_number = installations.serial_number and e.dealer_code = public.my_dealer()));
create policy v2_warranty_hq on public.warranties for all using (public.is_hq()) with check (public.is_hq());
create policy v2_warranty_dealer on public.warranties for select
  using (exists (select 1 from public.equipments e where e.serial_number = warranties.serial_number and e.dealer_code = public.my_dealer()));

-- 자료실: 본사 전체, 대리점은 공개 범위에 맞는 것만
create policy v2_downloads_hq on public.download_files for all using (public.is_hq()) with check (public.is_hq());
create policy v2_downloads_dealer on public.download_files for select
  using (visibility = 'all' or (visibility = 'dealers' and public.my_dealer() = any(dealer_codes)));

commit;

-- 실행 후 확인용 (결과에 본인 계정이 hq_admin 으로 보여야 합니다)
select email, role, dealer_code from public.profiles order by role, email;
