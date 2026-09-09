// app/actions.ts
'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);  

export async function getUserList() {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.error("유저 목록 조회 에러:", error);
    return [];
  }
  return data.users;
}

export async function createUserAccount(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const name = formData.get('name') as string;
  const accountType = (formData.get('accountType') as string) || 'internal';
  
  // 메타데이터 객체 초기화
  let metadata: any = {
    display_name: name,
    account_type: accountType,
  };

  // 본사 직원인 경우: 관리자 권한 여부 확인
  if (accountType === 'internal') {
    const isSuperAdmin = formData.get('isSuperAdmin') === 'on'; // 체크박스 값 확인
    metadata.role = isSuperAdmin ? 'super_admin' : 'engineer';
  } 
  // 대리점인 경우: 파트너 등급, 취급 모델, 허용 메뉴 수집
  else if (accountType === 'partner') {
    const partnerType = formData.get('partnerType') as string;
    
    // 다중 선택된 체크박스 값 가져오기
    const allowedModels = formData.getAll('allowedModels');
    const allowedMenus = formData.getAll('allowedMenus');

    metadata.partner_type = partnerType;
    metadata.allowed_models = allowedModels;
    metadata.allowed_menus = allowedMenus;
  }

  const { error } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (error) console.error("계정 생성 에러:", error);
  revalidatePath('/admin');
}

export async function deleteTeamMember(formData: FormData) {
  const userId = formData.get('userId') as string;
  if (!userId) return;

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) console.error("유저 삭제 에러:", error);
  revalidatePath('/admin');
}

export async function updateTeamMemberPassword(formData: FormData) {
  const userId = formData.get('userId') as string;
  const newPassword = formData.get('newPassword') as string;

  if (!userId || !newPassword) return;

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) console.error("비밀번호 변경 에러:", error);
  revalidatePath('/admin');
}