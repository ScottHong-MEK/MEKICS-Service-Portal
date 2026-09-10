'use server';

import { createClient } from '@supabase/supabase-js';

// 관리자 권한용 Supabase 클라이언트 생성 (service_role_key 사용)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// 0️⃣ 사용자 목록 가져오기 (app/admin/page.tsx 오류 해결용)
export async function getUserList() {
  try {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;
    return users || [];
  } catch (error: any) {
    console.error('getUserList 에러:', error.message);
    return [];
  }
}

// 1️⃣ 신규 사용자 생성 (이메일 인증 자동 통과)
export async function createUserAccount(email: string, password: string, fullName: string, accountType: string) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        account_type: accountType,
      },
    });

    if (error) throw error;
    return { success: true, user: data.user, data: { user: data.user } };
  } catch (error: any) {
    return { success: false, message: error.message, error: error.message };
  }
}

// 2️⃣ 사용자 비밀번호 강제 변경
export async function updateTeamMemberPassword(uid: string, newPassword: string) {
  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(uid, {
      password: newPassword,
    });
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message, error: error.message };
  }
}

// 3️⃣ 사용자 이름(Display Name) 강제 변경
export async function updateTeamMemberName(uid: string, newName: string) {
  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(uid, {
      user_metadata: { full_name: newName }
    });
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message, error: error.message };
  }
}

// 4️⃣ 사용자 계정 영구 삭제
export async function deleteTeamMember(uid: string) {
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message, error: error.message };
  }
}