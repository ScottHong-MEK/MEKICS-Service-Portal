// =====================================================================
// Supabase Edge Function: admin-users
// 포털 "관리자 설정" 화면의 계정 관리(목록/생성/비밀번호/이름/권한/비활성화)를 처리합니다.
//
// * service role(마스터) 키는 Supabase 서버 안에서만 사용 → 브라우저에 노출되지 않음
// * 호출한 사람이 profiles.role = 'hq_admin' 인 경우에만 동작
// * 계정 "삭제"는 하지 않고 "비활성화"만 합니다 (서비스 기록의 작성자 이력 보존 - ISO 기록관리)
//
// 배포: Supabase 대시보드 > Edge Functions > Deploy a new function > Via Editor
//       함수 이름 admin-users, 이 파일 내용을 붙여넣고 Deploy
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const ROLES = ['hq_admin', 'hq_engineer', 'dealer_admin', 'dealer_engineer']
const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { ...cors, 'Content-Type': 'application/json' } })
const fail = (message: string) => json({ success: false, message })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // 1) 호출한 사람 확인
    const authHeader = req.headers.get('Authorization') ?? ''
    const asCaller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await asCaller.auth.getUser()
    if (!user) return fail('로그인이 필요합니다.')

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: me } = await admin.from('profiles').select('role').eq('user_id', user.id).maybeSingle()
    if (me?.role !== 'hq_admin') return fail('본사 관리자(hq_admin)만 사용할 수 있습니다.')

    const body = await req.json().catch(() => ({}))
    const action = String(body.action || '')

    const checkRole = async (role: string, dealerCode: string | null) => {
      if (!ROLES.includes(role)) throw new Error('알 수 없는 역할입니다.')
      if (role.startsWith('dealer_')) {
        if (!dealerCode) throw new Error('대리점 계정은 대리점(출고처 코드)을 지정해야 합니다.')
        const { data } = await admin.from('dealers').select('code').eq('code', dealerCode).maybeSingle()
        if (!data) throw new Error(`등록되지 않은 대리점 코드입니다: ${dealerCode}`)
      }
    }
    const notSelf = (uid: string) => { if (uid === user.id) throw new Error('본인 계정에는 사용할 수 없습니다.') }

    switch (action) {
      case 'list': {
        const users: any[] = []
        for (let page = 1; ; page++) {
          const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
          if (error) throw error
          users.push(...data.users)
          if (data.users.length < 1000) break
        }
        const { data: profiles } = await admin.from('profiles').select('user_id, full_name, role, dealer_code')
        const byId = new Map((profiles ?? []).map((p: any) => [p.user_id, p]))
        return json({
          success: true,
          users: users.map(u => {
            const p: any = byId.get(u.id) ?? {}
            return {
              id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at,
              full_name: p.full_name ?? u.user_metadata?.full_name ?? null,
              role: p.role ?? null, dealer_code: p.dealer_code ?? null,
              disabled: !!u.banned_until && new Date(u.banned_until) > new Date(),
            }
          }).sort((a, b) => String(a.email).localeCompare(String(b.email))),
        })
      }

      case 'create': {
        const email = String(body.email || '').trim().toLowerCase()
        const password = String(body.password || '')
        const fullName = String(body.full_name || '').trim()
        const role = String(body.role || '')
        const dealerCode = body.dealer_code ? String(body.dealer_code) : null
        if (!email || password.length < 8) return fail('이메일과 8자 이상의 비밀번호를 입력하세요.')
        await checkRole(role, dealerCode)
        const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } })
        if (error) throw error
        const { error: pErr } = await admin.from('profiles').upsert({
          user_id: data.user.id, email, full_name: fullName, role,
          dealer_code: role.startsWith('dealer_') ? dealerCode : null,
        })
        if (pErr) throw pErr
        return json({ success: true })
      }

      case 'set_password': {
        const password = String(body.password || '')
        if (password.length < 8) return fail('비밀번호는 8자 이상이어야 합니다.')
        const { error } = await admin.auth.admin.updateUserById(String(body.user_id), { password })
        if (error) throw error
        return json({ success: true })
      }

      case 'set_name': {
        const fullName = String(body.full_name || '').trim()
        const uid = String(body.user_id)
        const { error } = await admin.auth.admin.updateUserById(uid, { user_metadata: { full_name: fullName } })
        if (error) throw error
        await admin.from('profiles').update({ full_name: fullName }).eq('user_id', uid)
        return json({ success: true })
      }

      case 'set_role': {
        const uid = String(body.user_id)
        notSelf(uid)
        const role = String(body.role || '')
        const dealerCode = body.dealer_code ? String(body.dealer_code) : null
        await checkRole(role, dealerCode)
        const { error } = await admin.from('profiles')
          .update({ role, dealer_code: role.startsWith('dealer_') ? dealerCode : null }).eq('user_id', uid)
        if (error) throw error
        return json({ success: true })
      }

      case 'disable':
      case 'enable': {
        const uid = String(body.user_id)
        notSelf(uid)
        const { error } = await admin.auth.admin.updateUserById(uid, { ban_duration: action === 'disable' ? '876000h' : 'none' })
        if (error) throw error
        return json({ success: true })
      }

      default:
        return fail(`지원하지 않는 작업입니다: ${action}`)
    }
  } catch (err: any) {
    return fail(err?.message ?? String(err))
  }
})
