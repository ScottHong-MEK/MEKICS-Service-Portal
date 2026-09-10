'use server';

import { createClient } from '@supabase/supabase-js';

// 빌드 타임(GitHub Actions)에 환경변수가 없어 터지는 현상 방지 처리
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// 0️⃣ 사용자 목록 가져오기
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

// 1️⃣ 신규 사용자 생성
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

// 3️⃣ 사용자 이름 강제 변경
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