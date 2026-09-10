'use client';

import { useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';

export default function AdminClient({ users }: { users: User[] }) {
  const [userList, setUserList] = useState<User[]>(users || []);
  const [activeTab, setActiveTab] = useState<'internal' | 'partner'>('internal');

  // 본인 정보 변경 폼
  const [myFullName, setMyFullName] = useState('');
  const [myNewPassword, setMyPassword] = useState('');
  const [myUpdateMsg, setMyUpdateMsg] = useState('');

  // 신규 팀원 추가 폼
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newAccountType, setNewAccountType] = useState<'internal' | 'partner'>('internal');
  const [createMsg, setCreateMsg] = useState('');

  // 1. [본인] 이름 및 비밀번호 변경 함수
  const handleUpdateMyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMyUpdateMsg('처리 중...');

    const updateData: any = {};
    if (myFullName.trim()) {
      updateData.data = { full_name: myFullName.trim() };
    }
    if (myNewPassword.trim()) {
      updateData.password = myNewPassword.trim();
    }

    if (!updateData.data && !updateData.password) {
      setMyUpdateMsg('❌ 변경할 이름이나 비밀번호를 입력해 주세요.');
      return;
    }

    const { error } = await supabase.auth.updateUser(updateData);

    if (error) {
      setMyUpdateMsg(`❌ 수정 실패: ${error.message}`);
    } else {
      setMyUpdateMsg('✨ 내 정보가 성공적으로 변경되었습니다!');
      setMyFullName('');
      setMyPassword('');
    }
  };

  // 2. [팀원] 신규 계정 생성 안내 및 등록
  const handleCreateTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMsg('계정 생성 중...');

    // Supabase Auth 신규 가입
    const { data, error } = await supabase.auth.signUp({
      email: newEmail.trim(),
      password: newPassword.trim(),
      options: {
        data: {
          full_name: newName.trim(),
          account_type: newAccountType,
        },
      },
    });

    if (error) {
      setCreateMsg(`❌ 계정 생성 실패: ${error.message}`);
    } else {
      setCreateMsg('✨ 계정이 생성되었습니다! (팀원이 이메일 확인 후 로그인 가능합니다)');
      setNewEmail('');
      setNewPassword('');
      setNewName('');
    }
  };

  const internalUsers = userList.filter(u => u.user_metadata?.account_type !== 'partner');
  const partnerUsers = userList.filter(u => u.user_metadata?.account_type === 'partner');

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* 상단 헤더 */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-black text-white">⚙️ MEKICS 포털 관리자 설정</h1>
            <p className="text-xs text-slate-400 mt-1">계정 관리, 권한 설정 및 내 프로필 수정</p>
          </div>
          <Link href="/" className="text-blue-400 hover:underline text-sm font-bold">
            ← 메인 포털로 돌아가기
          </Link>
        </div>

        {/* 👤 1. 내 정보 변경 (이름 & 비밀번호) */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            👤 내 계정 정보 수정 (이름 / 비밀번호)
          </h2>
          <form onSubmit={handleUpdateMyProfile} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">새 이름 (Display Name)</label>
              <input 
                type="text" 
                placeholder="예: 홍길동"
                value={myFullName}
                onChange={e => setMyFullName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">새 비밀번호</label>
              <input 
                type="password" 
                placeholder="••••••••"
                value={myNewPassword}
                onChange={e => setMyPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl transition shadow"
              >
                내 정보 변경 저장
              </button>
            </div>
          </form>
          {myUpdateMsg && (
            <p className="text-xs font-bold text-blue-300 bg-slate-900/80 p-3 rounded-lg border border-slate-700">{myUpdateMsg}</p>
          )}
        </section>

        {/* ➕ 2. 신규 팀원 계정 추가 */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            ➕ 신규 팀원/대리점 계정 생성
          </h2>
          <form onSubmit={handleCreateTeamMember} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">이메일 주소</label>
              <input 
                type="email" 
                required
                placeholder="user@mek-ics.com"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">초기 비밀번호</label>
              <input 
                type="password" 
                required
                placeholder="••••••••"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">이름 (담당자명)</label>
              <input 
                type="text" 
                required
                placeholder="예: Scott Hong"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl transition shadow"
              >
                계정 등록
              </button>
            </div>
          </form>
          {createMsg && (
            <p className="text-xs font-bold text-emerald-300 bg-slate-900/80 p-3 rounded-lg border border-slate-700">{createMsg}</p>
          )}
        </section>

        {/* 👥 3. 등록된 계정 목록 */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-700 pb-3">
            <h2 className="text-lg font-bold text-white">👥 등록된 사용자 계정 목록</h2>
            <div className="text-xs bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400">
              💡 팀원 타인 비밀번호 재설정은 보안상 <strong className="text-blue-400">Supabase Dashboard</strong>에서 가능합니다.
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
                <tr>
                  <th className="p-3">이메일</th>
                  <th className="p-3">이름</th>
                  <th className="p-3">가입일</th>
                  <th className="p-3">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {userList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-500">등록된 유저 정보가 없습니다.</td>
                  </tr>
                ) : (
                  userList.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-750">
                      <td className="p-3 font-mono font-bold text-blue-300">{u.email}</td>
                      <td className="p-3 font-semibold text-white">{u.user_metadata?.full_name || '-'}</td>
                      <td className="p-3 text-slate-400 text-xs font-mono">{u.created_at?.slice(0, 10)}</td>
                      <td className="p-3">
                        <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs px-2.5 py-0.5 rounded font-bold">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}