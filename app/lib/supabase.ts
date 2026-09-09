import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

// 1. 유저 목록 조회 (try-catch 예외 처리 추가)
export async function getUserList() {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) {
      console.error("유저 목록 조회 에러:", error);
      return [];
    }
    return data.users || [];
  } catch (err) {
    console.error("빌드 시 Supabase 연동 스킵:", err);
    return [];
  }
}

// 2. 유저 계정 생성
export async function createUserAccount(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    console.error("계정 생성 에러:", error);
    return { success: false, error: error.message };
  }
  return { success: true, data };
}

// 3. 팀원 계정 삭제
export async function deleteTeamMember(userId: string) {
  const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    console.error("계정 삭제 에러:", error);
    return { success: false, error: error.message };
  }
  return { success: true, data };
}

// 4. 팀원 비밀번호 변경
export async function updateTeamMemberPassword(userId: string, newPassword: string) {
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });
  if (error) {
    console.error("비밀번호 변경 에러:", error);
    return { success: false, error: error.message };
  }
  return { success: true, data };
}