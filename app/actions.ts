import { createClient } from '@supabase/supabase-js';

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
  // ... 기존 유저 생성 로직
}