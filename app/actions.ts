import { createClient } from '@supabase/supabase-js';

// Supabase Admin 클라이언트를 동적으로 생성하는 함수
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = 
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    '';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY 키가 로드되지 않았습니다.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// 0️⃣ 사용자 목록 가져오기
export async function getUserList() {
  try {
    const supabaseAdmin = getAdminClient();
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;
    return { success: true, users: data?.users || [], message: '' };
  } catch (error: any) {
    return { success: false, users: [], message: error?.message || '사용자 목록을 불러올 수 없습니다.' };
  }
}

// 1️⃣ 신규 사용자 생성
export async function createUserAccount(email: string, password: string, fullName: string, accountType: string) {
  try {
    const supabaseAdmin = getAdminClient();
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
    return { success: true, user: data.user };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// 2️⃣ 사용자 비밀번호 강제 변경
export async function updateTeamMemberPassword(uid: string, newPassword: string) {
  try {
    const supabaseAdmin = getAdminClient();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(uid, {
      password: newPassword,
    });
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// 3️⃣ 사용자 이름 강제 변경
export async function updateTeamMemberName(uid: string, newName: string) {
  try {
    const supabaseAdmin = getAdminClient();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(uid, {
      user_metadata: { full_name: newName }
    });
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// 4️⃣ 사용자 계정 영구 삭제
export async function deleteTeamMember(uid: string) {
  try {
    const supabaseAdmin = getAdminClient();
    const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}