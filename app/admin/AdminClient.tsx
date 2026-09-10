'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { 
  createUserAccount, 
  updateTeamMemberPassword, 
  updateTeamMemberName,
  deleteTeamMember 
} from '@/app/actions';

export default function AdminClient({ users }: { users: User[] }) {
  const [userList, setUserList] = useState<User[]>(users || []);
  
  // 신규 계정 생성 폼 상태
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newAccountType, setNewAccountType] = useState<'internal' | 'partner'>('internal');
  const [createMsg, setCreateMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // 1️⃣ 신규 계정 생성 처리
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setCreateMsg('계정 생성 중...');

    const res = await createUserAccount(newEmail, newPassword, newName, newAccountType);
    
    if (res.success && res.user) {
      setCreateMsg('✨ 계정이 성공적으로 생성되었습니다! (즉시 로그인 가능)');
      setUserList([res.user, ...userList]);
      setNewEmail(''); setNewPassword(''); setNewName('');
    } else {
      setCreateMsg(`❌ 계정 생성 실패: ${res.message || '오류 발생'}`);
    }
    setLoading(false);
  };

  // 2️⃣ 팀원 비밀번호 강제 변경 처리
  const handleChangePassword = async (userId: string, email: string) => {
    const newPwd = prompt(`[${email}] 계정의 새로운 비밀번호를 입력하세요 (최소 6자 이상)`);
    if (!newPwd) return;
    if (newPwd.length < 6) return alert('비밀번호는 최소 6자 이상이어야 합니다.');

    setLoading(true);
    const res = await updateTeamMemberPassword(userId, newPwd);
    if (res.success) {
      alert(`[${email}] 계정의 비밀번호가 성공적으로 변경되었습니다!`);
    } else {
      alert(`비밀번호 변경 실패: ${res.message}`);
    }
    setLoading(false);
  };

  // 3️⃣ 팀원 이름(Display Name) 강제 변경 처리
  const handleChangeName = async (userId: string, email: string, currentName: string) => {
    const newName = prompt(`[${email}] 계정의 새로운 이름을 입력하세요`, currentName || '');
    if (!newName || newName === currentName) return;

    setLoading(true);
    const res = await updateTeamMemberName(userId, newName);
    if (res.success) {
      alert('이름이 성공적으로 변경되었습니다!');
      // 화면에 즉시 반영 (새로고침 없이)
      setUserList(userList.map(u => 
        u.id === userId ? { ...u, user_metadata: { ...u.user_metadata, full_name: newName } } : u
      ));
    } else {
      alert(`이름 변경 실패: ${res.message}`);
    }
    setLoading(false);
  };

  // 4️⃣ 팀원 계정 삭제 처리
  const handleDeleteAccount = async (userId: string, email: string) => {
    if (!confirm(`정말로 [${email}] 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;

    setLoading(true);
    const res = await deleteTeamMember(userId);
    if (res.success) {
      alert('계정이 삭제되었습니다.');
      setUserList(userList.filter(u => u.id !== userId));
    } else {
      alert(`삭제 실패: ${res.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* 상단 헤더 */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-black text-white">⚙️ MEKICS 계정 통합 관리 센터</h1>
            <p className="text-xs text-emerald-400 mt-1">※ 이 페이지에서 생성/수정한 계정은 이메일 인증 없이 즉시 반영됩니다.</p>
          </div>
          <Link href="/" className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-blue-400 text-sm font-bold transition">
            ← 메인 포털로 돌아가기
          </Link>
        </div>

        {/* ➕ 1. 신규 계정 즉시 발급 */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-4 shadow-xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            ➕ 신규 계정 직접 생성 (즉시 로그인 가능)
          </h2>
          <form onSubmit={handleCreateAccount} className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">이메일 (ID)</label>
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
                placeholder="6자 이상" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500" 
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">사용자 이름</label>
              <input 
                type="text" 
                required 
                placeholder="예: 홍길동" 
                value={newName} 
                onChange={e => setNewName(e.target.value)} 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500" 
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">계정 권한 구분</label>
              <select 
                value={newAccountType} 
                onChange={e => setNewAccountType(e.target.value as any)} 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500"
              >
                <option value="internal">내부 직원 (Internal)</option>
                <option value="partner">외부 대리점 (Partner)</option>
              </select>
            </div>
            <div className="flex items-end">
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl transition shadow"
              >
                {loading ? '생성 중...' : '계정 강제 발급'}
              </button>
            </div>
          </form>
          {createMsg && <p className="text-xs font-bold text-emerald-300 bg-slate-900/60 p-3 rounded-xl border border-slate-700">{createMsg}</p>}
        </section>

        {/* 👥 2. 전체 계정 목록 및 제어 버튼 */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-4 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4">👥 가입자 계정 직접 제어 패널</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
                <tr>
                  <th className="p-3">이메일 (ID)</th>
                  <th className="p-3">이름 (Display Name)</th>
                  <th className="p-3">구분</th>
                  <th className="p-3">가입일</th>
                  <th className="p-3 text-center">관리자 권한 액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {userList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-750 transition">
                    <td className="p-3 font-mono font-bold text-blue-300">{u.email}</td>
                    <td className="p-3 font-semibold text-white">{u.user_metadata?.full_name || '-'}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2.5 py-0.5 rounded font-bold border ${u.user_metadata?.account_type === 'partner' ? 'bg-amber-950 text-amber-300 border-amber-800' : 'bg-emerald-950 text-emerald-300 border-emerald-800'}`}>
                        {u.user_metadata?.account_type === 'partner' ? 'Partner' : 'Internal'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 text-xs font-mono">{u.created_at?.slice(0, 10)}</td>
                    <td className="p-3">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => handleChangePassword(u.id, u.email!)} 
                          disabled={loading} 
                          className="bg-blue-600/80 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg transition font-bold shadow"
                        >
                          🔑 비밀번호 변경
                        </button>
                        <button 
                          onClick={() => handleChangeName(u.id, u.email!, u.user_metadata?.full_name)} 
                          disabled={loading} 
                          className="bg-amber-600/80 hover:bg-amber-500 text-white text-xs px-3 py-1.5 rounded-lg transition font-bold shadow"
                        >
                          ✏️ 이름 수정
                        </button>
                        <button 
                          onClick={() => handleDeleteAccount(u.id, u.email!)} 
                          disabled={loading} 
                          className="bg-rose-600/80 hover:bg-rose-500 text-white text-xs px-3 py-1.5 rounded-lg transition font-bold shadow"
                        >
                          🗑️ 계정 삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}