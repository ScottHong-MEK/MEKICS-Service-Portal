'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLang } from '@/app/lib/i18n';
import { supabase } from '@/app/lib/supabase';
import {
  getUserList,
  createUserAccount,
  updateTeamMemberPassword,
  updateTeamMemberName,
  updateUserRole,
  setUserDisabled,
  ROLE_LABELS,
  type ManagedUser,
  type Role,
} from '@/app/actions';

const ROLES = Object.keys(ROLE_LABELS) as Role[];
const isDealerRole = (r: string | null) => !!r && r.startsWith('dealer_');

export default function AdminClient() {
  const { t } = useLang();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [dealers, setDealers] = useState<{ code: string; name: string }[]>([]);
  const [listError, setListError] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showDisabled, setShowDisabled] = useState(false);

  // 신규 계정 폼
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'hq_engineer' as Role, dealer_code: '' });
  const [createMsg, setCreateMsg] = useState('');

  // 권한 편집 중인 행
  const [editing, setEditing] = useState<{ id: string; role: Role; dealer_code: string } | null>(null);

  const loadUsers = async () => {
    setListLoading(true);
    setListError('');
    const res = await getUserList();
    if (res.success) setUsers(res.users);
    else setListError(res.message);
    setListLoading(false);
  };

  const loadDealers = async () => {
    const { data } = await supabase.from('dealers').select('code, name').order('name');
    setDealers(data || []);
  };

  useEffect(() => { loadUsers(); loadDealers(); }, []);

  const dealerName = (code: string | null) => (code ? dealers.find(d => d.code === code)?.name || code : '-');

  const run = async (fn: () => Promise<{ success: boolean; message?: string }>, okMsg?: string) => {
    setBusy(true);
    const res: any = await fn();
    setBusy(false);
    if (!res.success) { alert(`실패: ${res.message}`); return false; }
    if (okMsg) alert(okMsg);
    await loadUsers();
    return true;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDealerRole(form.role) && !form.dealer_code) return setCreateMsg(t("❌ 대리점 계정은 대리점을 선택하세요."));
    setBusy(true);
    setCreateMsg(t("계정 생성 중..."));
    const res: any = await createUserAccount({ ...form, dealer_code: isDealerRole(form.role) ? form.dealer_code : null });
    setBusy(false);
    if (res.success) {
      setCreateMsg(`✨ ${form.email} 계정이 생성되었습니다. 초기 비밀번호를 본인에게 따로 전달하세요.`);
      setForm({ email: '', password: '', full_name: '', role: form.role, dealer_code: form.dealer_code });
      loadUsers();
    } else {
      setCreateMsg(`❌ 계정 생성 실패: ${res.message}`);
    }
  };

  const handlePassword = (u: ManagedUser) => {
    const pwd = prompt(`[${u.email}] 새 비밀번호 (8자 이상)`);
    if (!pwd) return;
    if (pwd.length < 8) return alert(t("비밀번호는 8자 이상이어야 합니다."));
    run(() => updateTeamMemberPassword(u.id, pwd), '비밀번호가 변경되었습니다. 본인에게 따로 전달하세요.');
  };

  const handleName = (u: ManagedUser) => {
    const name = prompt(`[${u.email}] 이름`, u.full_name || '');
    if (!name || name === u.full_name) return;
    run(() => updateTeamMemberName(u.id, name));
  };

  const handleSaveRole = async () => {
    if (!editing) return;
    if (isDealerRole(editing.role) && !editing.dealer_code) return alert(t("대리점 계정은 대리점을 선택하세요."));
    const ok = await run(() => updateUserRole(editing.id, editing.role, isDealerRole(editing.role) ? editing.dealer_code : null));
    if (ok) setEditing(null);
  };

  const handleDisable = (u: ManagedUser) => {
    const msg = u.disabled
      ? `[${u.email}] 계정을 다시 활성화할까요?`
      : `[${u.email}] 계정을 비활성화할까요?\n로그인이 차단되며, 작성한 서비스 기록은 그대로 보존됩니다.`;
    if (!confirm(msg)) return;
    run(() => setUserDisabled(u.id, !u.disabled));
  };

  const visible = users.filter(u => showDisabled || !u.disabled);
  const input = 'w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500';

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">

        <div className="flex justify-between items-center border-b border-slate-800 pb-4 gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">{t("⚙️ MEKICS 계정 통합 관리 센터")}</h1>
            <p className="text-xs text-slate-400 mt-1">{t("본사 관리자만 사용할 수 있습니다. 계정은 삭제하지 않고 비활성화합니다 (서비스 기록 작성자 이력 보존).")}</p>
          </div>
          <Link href="/" className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-blue-400 text-sm font-bold transition whitespace-nowrap">
            
            {t("← 메인 포털로")}
          </Link>
        </div>

        {/* 신규 계정 */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-4 shadow-xl">
          <h2 className="text-lg font-bold text-white">{t("➕ 신규 계정 생성")}</h2>
          {/* autoComplete="off" / new-password: 브라우저가 관리자 본인 계정 정보를 자동으로 채우지 않도록 */}
          <form onSubmit={handleCreate} autoComplete="off" className="grid grid-cols-1 md:grid-cols-6 gap-4 text-sm">
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">{t("이메일 (ID)")}</label>
              <input type="email" required autoComplete="off" name="new-user-email" placeholder="user@company.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={input} />
            </div>
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">{t("초기 비밀번호")}</label>
              <input type="password" required autoComplete="new-password" placeholder={t("8자 이상")}
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className={input} />
            </div>
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">{t("이름")}</label>
              <input type="text" required autoComplete="off" name="new-user-name" placeholder={t("예: 홍길동 / Ahmet")}
                value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className={input} />
            </div>
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">{t("역할")}</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as Role })} className={input}>
                {ROLES.map(r => <option key={r} value={r}>{t(ROLE_LABELS[r])}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">{t("대리점")}</label>
              <select value={form.dealer_code} disabled={!isDealerRole(form.role)}
                onChange={e => setForm({ ...form, dealer_code: e.target.value })} className={`${input} disabled:opacity-40`}>
                <option value="">{isDealerRole(form.role) ? t("선택하세요") : t("(본사 계정)")}</option>
                {dealers.map(d => <option key={d.code} value={d.code}>{d.name} ({d.code})</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={busy} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition shadow">
                {busy ? t("처리 중...") : t("계정 생성")}
              </button>
            </div>
          </form>
          {createMsg && <p className="text-xs font-bold text-emerald-300 bg-slate-900/60 p-3 rounded-xl border border-slate-700">{createMsg}</p>}
        </section>

        {/* 계정 목록 */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-4 shadow-xl">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <h2 className="text-lg font-bold text-white">{t("👥 계정 목록")}{' '}<span className="text-sm text-slate-400 font-medium">({visible.length}{t("명)")}</span></h2>
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={showDisabled} onChange={e => setShowDisabled(e.target.checked)} /> {' '}{t("비활성 계정 포함")}
              </label>
              <button onClick={loadUsers} className="bg-slate-700 hover:bg-slate-600 text-xs px-3 py-1.5 rounded-lg text-slate-200 transition font-bold">{t("🔄 새로고침")}</button>
            </div>
          </div>

          {listError && (
            <div className="bg-rose-950/80 border border-rose-800 text-rose-300 p-4 rounded-xl text-xs font-bold">⚠️ {listError}</div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-900 text-slate-400 text-xs">
                <tr>
                  <th className="p-3">{t("이메일 (ID)")}</th>
                  <th className="p-3">{t("이름")}</th>
                  <th className="p-3">{t("역할")}</th>
                  <th className="p-3">{t("대리점")}</th>
                  <th className="p-3">{t("최근 로그인")}</th>
                  <th className="p-3 text-center">{t("관리")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {listLoading && <tr><td colSpan={6} className="p-6 text-center text-slate-400 text-xs">{t("불러오는 중...")}</td></tr>}
                {!listLoading && !listError && visible.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-400 text-xs">{t("계정이 없습니다.")}</td></tr>}
                {visible.map(u => {
                  const isEditing = editing?.id === u.id;
                  return (
                    <tr key={u.id} className={u.disabled ? 'opacity-50' : ''}>
                      <td className="p-3 font-mono font-bold text-blue-300">
                        {u.email}{u.disabled && <span className="ml-2 text-[10px] bg-rose-900 text-rose-200 px-1.5 py-0.5 rounded">{t("비활성")}</span>}
                      </td>
                      <td className="p-3 font-semibold">{u.full_name || '-'}</td>
                      <td className="p-3">
                        {isEditing ? (
                          <select value={editing.role} onChange={e => setEditing({ ...editing, role: e.target.value as Role })} className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-xs">
                            {ROLES.map(r => <option key={r} value={r}>{t(ROLE_LABELS[r])}</option>)}
                          </select>
                        ) : (
                          <span className={`text-xs px-2.5 py-0.5 rounded font-bold border ${isDealerRole(u.role) ? 'bg-amber-950 text-amber-300 border-amber-800' : 'bg-emerald-950 text-emerald-300 border-emerald-800'}`}>
                            {u.role ? t(ROLE_LABELS[u.role]) : t("권한 없음")}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-xs">
                        {isEditing ? (
                          <select value={editing.dealer_code} disabled={!isDealerRole(editing.role)} onChange={e => setEditing({ ...editing, dealer_code: e.target.value })} className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-xs disabled:opacity-40 max-w-[220px]">
                            <option value="">{isDealerRole(editing.role) ? t("선택") : '-'}</option>
                            {dealers.map(d => <option key={d.code} value={d.code}>{d.name} ({d.code})</option>)}
                          </select>
                        ) : (
                          <span className="text-slate-300">{isDealerRole(u.role) ? dealerName(u.dealer_code) : '-'}</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-400 text-xs font-mono">{u.last_sign_in_at?.slice(0, 10) || '-'}</td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1.5">
                          {isEditing ? (
                            <>
                              <button onClick={handleSaveRole} disabled={busy} className="bg-emerald-600 hover:bg-emerald-500 text-xs px-3 py-1.5 rounded-lg font-bold">{t("저장")}</button>
                              <button onClick={() => setEditing(null)} className="bg-slate-600 hover:bg-slate-500 text-xs px-3 py-1.5 rounded-lg font-bold">{t("취소")}</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => setEditing({ id: u.id, role: (u.role || 'hq_engineer') as Role, dealer_code: u.dealer_code || '' })} disabled={busy} className="bg-violet-600/80 hover:bg-violet-500 text-xs px-3 py-1.5 rounded-lg font-bold">{t("🛡️ 권한")}</button>
                              <button onClick={() => handlePassword(u)} disabled={busy} className="bg-blue-600/80 hover:bg-blue-500 text-xs px-3 py-1.5 rounded-lg font-bold">{t("🔑 비밀번호")}</button>
                              <button onClick={() => handleName(u)} disabled={busy} className="bg-amber-600/80 hover:bg-amber-500 text-xs px-3 py-1.5 rounded-lg font-bold">{t("✏️ 이름")}</button>
                              <button onClick={() => handleDisable(u)} disabled={busy} className={`${u.disabled ? 'bg-slate-600 hover:bg-slate-500' : 'bg-rose-600/80 hover:bg-rose-500'} text-xs px-3 py-1.5 rounded-lg font-bold`}>
                                {u.disabled ? t("♻️ 활성화") : t("⛔ 비활성화")}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
