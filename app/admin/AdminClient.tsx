// app/admin/AdminClient.tsx
'use client';

import { useState } from 'react';
import { createUserAccount, deleteTeamMember, updateTeamMemberPassword } from '@/app/actions';
import { User } from '@supabase/supabase-js';

// MEKICS 대표 모델 및 제공 메뉴 (필요시 추가)
const MEKICS_MODELS = ['HFT700', 'MTV1000', 'Pneuma', 'SU:M', 'OmniOx'];
const PORTAL_MENUS = [
  { id: 'dashboard', label: '대시보드 조회' },
  { id: 'service', label: '서비스/A/S 접수' },
  { id: 'parts', label: '부품 단가 조회 및 주문' },
  { id: 'manuals', label: '기술 매뉴얼 다운로드' }
];

export default function AdminClient({ users }: { users: User[] }) {
  const [activeTab, setActiveTab] = useState<'internal' | 'partner'>('internal');

  const internalUsers = users.filter(u => u.user_metadata?.account_type !== 'partner');
  const partnerUsers = users.filter(u => u.user_metadata?.account_type === 'partner');

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">계정 및 권한 관리</h1>
          <p className="text-sm text-slate-500 mt-1">본사 관리자 권한 부여 및 대리점별 모델/메뉴 접근 권한을 제어합니다.</p>
        </div>
        <a href="/" className="text-blue-600 hover:underline text-sm font-medium">← 메인 포털로 돌아가기</a>
      </div>

      {/* 탭 버튼 */}
      <div className="flex border-b border-slate-200 mb-8">
        <button onClick={() => setActiveTab('internal')} className={`py-3 px-6 font-semibold text-sm border-b-2 ${activeTab === 'internal' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>👨‍💼 본사 직원 관리 ({internalUsers.length})</button>
        <button onClick={() => setActiveTab('partner')} className={`py-3 px-6 font-semibold text-sm border-b-2 ${activeTab === 'partner' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>🏢 대리점/파트너 관리 ({partnerUsers.length})</button>
      </div>

      {/* ==================== TAB 1: 본사 직원 관리 ==================== */}
      {activeTab === 'internal' && (
        <>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
            <h2 className="text-lg font-semibold mb-4 text-blue-700">신규 본사 직원 등록</h2>
            <form action={createUserAccount} className="flex flex-wrap gap-4 items-end">
              <input type="hidden" name="accountType" value="internal" />
              
              <div className="w-40"><label className="block text-xs text-slate-600 mb-1">직원 성명</label><input name="name" type="text" required placeholder="예: 홍길동" className="w-full border p-2 text-sm rounded outline-none focus:border-blue-500"/></div>
              <div className="w-60"><label className="block text-xs text-slate-600 mb-1">이메일 (ID)</label><input name="email" type="email" required placeholder="email@mekics.com" className="w-full border p-2 text-sm rounded outline-none focus:border-blue-500"/></div>
              <div className="w-40"><label className="block text-xs text-slate-600 mb-1">초기 비밀번호</label><input name="password" type="text" required minLength={6} placeholder="6자 이상" className="w-full border p-2 text-sm rounded outline-none focus:border-blue-500"/></div>
              
              {/* 관리자 권한 부여 체크박스 */}
              <div className="w-auto flex items-center mb-2 px-2">
                <input type="checkbox" id="isSuperAdmin" name="isSuperAdmin" className="w-4 h-4 text-blue-600 rounded cursor-pointer" />
                <label htmlFor="isSuperAdmin" className="ml-2 text-sm font-semibold text-slate-800 cursor-pointer">최고 관리자 권한 부여 (계정 생성/삭제 허용)</label>
              </div>

              <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-blue-700 ml-auto">+ 직원 추가</button>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                <tr><th className="p-3">성명</th><th className="p-3">이메일</th><th className="p-3 text-center">권한 등급</th><th className="p-3">비밀번호 강제 변경</th><th className="p-3 text-center">삭제</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {internalUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="p-3 font-medium">{(u.user_metadata as any)?.display_name || '이름 미상'}</td>
                    <td className="p-3 text-slate-600 font-mono">{u.email}</td>
                    <td className="p-3 text-center">
                      {(u.user_metadata as any)?.role === 'super_admin' ? <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">최고 관리자</span> : <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">일반 직원</span>}
                    </td>
                    <td className="p-3">
                      <form action={updateTeamMemberPassword} className="flex gap-2"><input type="hidden" name="userId" value={u.id}/><input name="newPassword" type="text" required className="border p-1 text-xs w-28 rounded"/><button type="submit" className="text-blue-600 border border-blue-200 px-2 rounded text-xs">변경</button></form>
                    </td>
                    <td className="p-3 text-center"><form action={deleteTeamMember}><input type="hidden" name="userId" value={u.id}/><button type="submit" className="text-red-500 hover:text-red-700 text-xs">삭제</button></form></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ==================== TAB 2: 대리점 권한 관리 ==================== */}
      {activeTab === 'partner' && (
        <>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
            <h2 className="text-lg font-semibold mb-4 text-purple-700">신규 대리점 계정 및 권한 설정</h2>
            <form action={createUserAccount} className="space-y-5">
              <input type="hidden" name="accountType" value="partner" />
              
              <div className="flex gap-4">
                <div className="w-1/4"><label className="block text-xs text-slate-600 mb-1">대리점명</label><input name="name" type="text" required className="w-full border p-2 text-sm rounded outline-none"/></div>
                <div className="w-1/4"><label className="block text-xs text-slate-600 mb-1">등급 (단가결정)</label><select name="partnerType" className="w-full border p-2 text-sm rounded bg-white"><option value="exclusive">독점 (Exclusive)</option><option value="authorized">비독점 (Authorized)</option><option value="partner">일반 (Partner)</option></select></div>
                <div className="w-1/4"><label className="block text-xs text-slate-600 mb-1">이메일</label><input name="email" type="email" required className="w-full border p-2 text-sm rounded outline-none"/></div>
                <div className="w-1/4"><label className="block text-xs text-slate-600 mb-1">비밀번호</label><input name="password" type="text" required minLength={6} className="w-full border p-2 text-sm rounded outline-none"/></div>
              </div>

              {/* 접근 제어 박스 */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">🎯 취급 허용 모델 (체크)</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {MEKICS_MODELS.map(model => (
                      <label key={model} className="flex items-center text-sm text-slate-600 cursor-pointer">
                        <input type="checkbox" name="allowedModels" value={model} className="mr-2" defaultChecked /> {model}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">🔒 포털 메뉴 접근 권한 (체크)</h3>
                  <div className="flex flex-col gap-2">
                    {PORTAL_MENUS.map(menu => (
                      <label key={menu.id} className="flex items-center text-sm text-slate-600 cursor-pointer">
                        <input type="checkbox" name="allowedMenus" value={menu.id} className="mr-2" defaultChecked /> {menu.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end"><button type="submit" className="bg-purple-700 text-white px-6 py-2.5 rounded text-sm font-medium hover:bg-purple-800">+ 대리점 및 권한 등록</button></div>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                <tr><th className="p-3">대리점명</th><th className="p-3">등급</th><th className="p-3">허용 모델</th><th className="p-3">허용 메뉴</th><th className="p-3">비밀번호</th><th className="p-3 text-center">삭제</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {partnerUsers.map((u) => {
                  const meta = u.user_metadata as any;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="p-3 font-medium">{meta?.display_name || '이름 미상'}</td>
                      <td className="p-3 text-xs">{meta?.partner_type === 'exclusive' ? '🟣 독점' : meta?.partner_type === 'authorized' ? '🔵 비독점' : '⚪ 일반'}</td>
                      <td className="p-3 text-xs text-slate-500 max-w-[150px] truncate" title={meta?.allowed_models?.join(', ')}>{meta?.allowed_models?.length ? meta.allowed_models.join(', ') : '전체 제한됨'}</td>
                      <td className="p-3 text-xs text-slate-500 max-w-[150px] truncate" title={meta?.allowed_menus?.join(', ')}>{meta?.allowed_menus?.length ? `${meta.allowed_menus.length}개 메뉴 허용` : '전체 제한됨'}</td>
                      <td className="p-3"><form action={updateTeamMemberPassword} className="flex gap-1"><input type="hidden" name="userId" value={u.id}/><input name="newPassword" type="text" className="border p-1 w-20 text-xs rounded"/><button type="submit" className="text-purple-600 border border-purple-200 px-2 rounded text-xs">변경</button></form></td>
                      <td className="p-3 text-center"><form action={deleteTeamMember}><input type="hidden" name="userId" value={u.id}/><button type="submit" className="text-red-500 text-xs">삭제</button></form></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}