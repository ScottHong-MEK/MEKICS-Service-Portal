import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 재사용할 클라이언트 인스턴스 변수
let supabaseAdminInstance: SupabaseClient | null = null;

function getAdminClient() {
  if (supabaseAdminInstance) return supabaseAdminInstance;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = 
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    '';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY 키가 설정되지 않았습니다.');
  }

  // 단 한 번만 생성하여 메모리 재사용
  supabaseAdminInstance = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return supabaseAdminInstance;
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