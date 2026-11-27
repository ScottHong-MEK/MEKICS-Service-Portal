// 계정 관리 기능 → Supabase Edge Function 'admin-users' 호출
//
// 예전에는 브라우저에서 service role(마스터) 키로 직접 처리했는데,
// 그러면 키가 웹페이지에 노출됩니다. 이제는 Supabase 서버 안의 함수가 처리하고,
// 함수는 호출한 사람이 본사 관리자(hq_admin)인지 확인한 뒤에만 동작합니다.
// 함수 코드: supabase/functions/admin-users/index.ts

import { supabase } from './lib/supabase'

export type Role = 'hq_admin' | 'hq_engineer' | 'dealer_admin' | 'dealer_engineer'

export const ROLE_LABELS: Record<Role, string> = {
  hq_admin: '본사 관리자',
  hq_engineer: '본사 엔지니어',
  dealer_admin: '대리점 관리자',
  dealer_engineer: '대리점 엔지니어',
}

export type ManagedUser = {
  id: string
  email: string
  full_name: string | null
  role: Role | null
  dealer_code: string | null
  disabled: boolean
  created_at: string
  last_sign_in_at: string | null
}

type Result<T = {}> = ({ success: true } & T) | { success: false; message: string }

async function call<T = {}>(action: string, payload: Record<string, unknown> = {}): Promise<Result<T>> {
  const { data, error } = await supabase.functions.invoke('admin-users', { body: { action, ...payload } })
  if (error) {
    const hint = /not found|404|Failed to send/i.test(error.message)
      ? ' (Supabase에 admin-users 함수가 배포되어 있는지 확인하세요)'
      : ''
    return { success: false, message: `${error.message}${hint}` }
  }
  return data as Result<T>
}

export const getUserList = () => call<{ users: ManagedUser[] }>('list')

export const createUserAccount = (p: { email: string; password: string; full_name: string; role: Role; dealer_code?: string | null }) =>
  call('create', p)

export const updateTeamMemberPassword = (user_id: string, password: string) => call('set_password', { user_id, password })

export const updateTeamMemberName = (user_id: string, full_name: string) => call('set_name', { user_id, full_name })

export const updateUserRole = (user_id: string, role: Role, dealer_code: string | null) => call('set_role', { user_id, role, dealer_code })

export const setUserDisabled = (user_id: string, disabled: boolean) => call(disabled ? 'disable' : 'enable', { user_id })
