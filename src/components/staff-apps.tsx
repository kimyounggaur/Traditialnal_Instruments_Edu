'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AudioLines, FileCheck2, Pencil, X } from 'lucide-react';
import { instruments, type AppLink, type NotationKind } from '@/domain/types';
import { ALLOWED_APP_HOSTS, validateAppUrl } from '@/domain/url-policy';
import { useLibrary } from './provider';

const statuses: Record<AppLink['status'], string> = { todo: '연결 준비 중', unchecked: '점검 전 후보', available: '접근 확인', broken: '연결 오류', restricted: '사용 제한' };
const notationOptions: Array<{ value: NotationKind; label: string }> = [{ value: 'jeongganbo', label: '정간보' }, { value: 'staff', label: '오선보' }, { value: 'yulja', label: '율자' }, { value: 'gueum', label: '구음' }, { value: 'mixed', label: '혼합' }, { value: 'other', label: '기타' }, { value: 'unknown', label: '미확인' }];
const emptyToNull = (text: string) => text.trim() ? text : null;
const list = (text: string) => text.split('\n').map(item => item.trim()).filter(Boolean);

export function AdminApps() {
  const { db, repo, ready, role, notify } = useLibrary();
  const [draft, setDraft] = useState<AppLink | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [changed, setChanged] = useState(false);
  const [objectivesText, setObjectivesText] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const canEdit = role === 'editor';

  useEffect(() => {
    if (draft && !dialog.current?.open) dialog.current?.showModal();
  }, [draft]);

  function edit(app: AppLink, button: HTMLButtonElement) {
    opener.current = button;
    setDraft(structuredClone(app));
    setObjectivesText(app.objectives.join('\n'));
    setChanged(false);
    setError('');
  }
  function close() {
    if (busy) return;
    if (changed && !window.confirm('저장하지 않은 앱 후보 변경을 취소할까요?')) return;
    dialog.current?.close();
    setDraft(null);
    setError('');
    setChanged(false);
    opener.current?.focus();
  }
  function patch(update: Partial<AppLink>) {
    setDraft(current => current ? { ...current, ...update } : current);
    setChanged(true);
    setError('');
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || busy || !canEdit) return;
    setBusy(true);
    setError('');
    try {
      if (!draft.title.trim() || !draft.purpose.trim()) throw new Error('앱 이름과 학습 목적을 입력해 주세요.');
      if (draft.checkedAt && Number.isNaN(Date.parse(draft.checkedAt))) throw new Error('점검 시각을 ISO 형식으로 입력해 주세요.');
      const app = { ...draft, title: draft.title.trim(), purpose: draft.purpose.trim() };
      await repo.updateApp(app, draft.revision);
      dialog.current?.close();
      setDraft(null);
      setChanged(false);
      notify('앱 후보를 저장했습니다. 점검 기록은 교육 내용의 전문가 승인을 대신하지 않습니다.');
      opener.current?.focus();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : '저장하지 못했습니다. 입력 내용은 유지됩니다.');
    } finally { setBusy(false); }
  }

  if (!ready) return <div className="loading" role="status">앱 후보를 불러오는 중입니다.</div>;
  const checkedUrl = draft ? validateAppUrl(draft.url) : null;
  const activationReady = Boolean(draft && checkedUrl?.valid && draft.status === 'available' && draft.sourceEvidence?.trim() && draft.checkEvidence?.trim() && draft.checkedAt && !Number.isNaN(Date.parse(draft.checkedAt)) && draft.availabilityCheck && draft.contentCompatibilityCheck && draft.privacyPermissionCheck && draft.contentAccuracyChecked && draft.requiresCamera === 'no' && draft.requiresMicrophone === 'no' && draft.requiresLogin === 'no' && draft.instrumentSystem && draft.instrumentSystem !== 'unknown' && draft.notationKinds.length && !draft.notationKinds.includes('unknown') && draft.objectives.length && draft.scope !== 'excluded_mismatch');

  return <>
    <div className="page-heading"><div><span className="eyebrow">PRACTICE REGISTRY</span><h1>연습 앱 관리</h1><p>주소의 존재와 실제 학습 연결의 적합성을 나누어 기록합니다.</p></div></div>
    <nav className="row" aria-label="관리 메뉴" style={{ marginBottom: 24 }}><Link className="button secondary" href="/admin/resources">자료 편집</Link><Link className="button secondary" href="/admin/sources">원자료 인벤토리</Link><Link className="button" href="/admin/apps" aria-current="page">연습 앱</Link><Link className="button secondary" href="/admin/issues">오류 신고</Link></nav>
    <div className="notice" style={{ marginBottom: 22 }}>등록 항목 {db.apps.length}개 · 주소가 확인된 후보 {db.apps.filter(app => app.url !== null).length}개 · 준비 항목 {db.apps.filter(app => app.url === null).length}개 · 활성 설정 {db.apps.filter(app => app.enabled).length}개. 단원에서 실행하려면 자료군·악기형·기보·학습 목표가 추가로 일치해야 합니다. 현재 단계에서는 실제 앱을 자동으로 열거나 검사하지 않습니다.</div>
    {!canEdit && <p className="muted" style={{ marginBottom: 20 }}>메타데이터를 편집하려면 상단 시연 모드를 ‘편집 관리자’로 바꾸세요. 이 역할은 실제 인증이나 보안 권한이 아닙니다.</p>}
    <div className="grid-3">{db.apps.map(app => <article className="panel practice-card" key={app.id}>
      <div className="row"><span className="practice-icon"><AudioLines size={22} /></span><span className="badge">{statuses[app.status]}</span><span className="badge outline">{app.enabled ? '활성 설정' : '비활성'}</span></div>
      <h2>{app.title}</h2><p className="muted">{app.instruments.map(id => instruments.find(item => item.id === id)?.name ?? id).join(' · ')} · {app.instrumentSystem ?? '악기형 미확인'}</p>
      <p className="muted">{app.purpose}</p><p className="muted" style={{ overflowWrap: 'anywhere' }}>{app.url ?? '확인된 주소 없음'}</p>
      <dl className="muted"><dt>점검 범위</dt><dd style={{ margin: 0 }}>실행 {app.availabilityCheck ? '기록 있음' : '미점검'} · 내용/모델 {app.contentCompatibilityCheck ? '기록 있음' : '미점검'} · 개인정보 {app.privacyPermissionCheck ? '기록 있음' : '미점검'}</dd><dt style={{ marginTop: 10 }}>최근 점검</dt><dd style={{ margin: 0 }}>{app.checkedAt ?? '점검 기록 없음'}</dd></dl>
      <button type="button" className="button secondary" disabled={!canEdit} onClick={event => edit(app, event.currentTarget)}><Pencil size={17} /> 후보 편집</button>
    </article>)}</div>
    <dialog ref={dialog} className="modal" aria-labelledby="app-editor-title" onCancel={event => { event.preventDefault(); close(); }} style={{ width: 'min(860px, calc(100vw - 32px))', maxHeight: '90vh', overflowY: 'auto' }}>
      {draft && <form onSubmit={save}>
        <div className="row" style={{ justifyContent: 'space-between' }}><h2 id="app-editor-title">연습 앱 후보 편집</h2><button type="button" className="icon-button" aria-label="앱 편집 닫기" onClick={close} disabled={busy}><X size={20} /></button></div>
        <p className="muted">원본 revision {draft.revision} · 실제로 관찰한 근거만 입력하세요. 체크 항목을 선택해도 자동 승인되거나 단원 연결이 확정되지 않습니다.</p>
        {error && <div className="error" role="alert">{error}<p>입력 내용은 그대로 유지됩니다. 충돌이면 내용을 복사해 둔 후 닫고 최신 후보를 다시 열어 비교해 주세요.</p></div>}
        <fieldset disabled={busy || !canEdit} style={{ border: 0, padding: 0, margin: 0 }} className="stack">
          <div className="form-grid"><label>앱 이름<input style={{ display: 'block', width: '100%' }} required maxLength={160} value={draft.title} onChange={event => patch({ title: event.target.value })} /></label><label>상태<select style={{ display: 'block', width: '100%' }} value={draft.status} onChange={event => patch({ status: event.target.value as AppLink['status'] })}>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
          <label>확인된 HTTPS 주소<input style={{ display: 'block', width: '100%' }} type="url" maxLength={2048} value={draft.url ?? ''} onChange={event => patch({ url: emptyToNull(event.target.value) })} placeholder="주소가 없으면 비워 둡니다" /><small className="muted">허용 호스트: {ALLOWED_APP_HOSTS.join(', ')}. 주소를 새로 채웠다면 상태를 ‘점검 전 후보’로 변경해 주세요.</small></label>
          {draft.url && !checkedUrl?.valid && <p className="error" role="status">{checkedUrl?.reason}</p>}
          <label>학습 목적<textarea required maxLength={1500} value={draft.purpose} onChange={event => patch({ purpose: event.target.value })} /></label>
          <div className="form-grid"><label>악기형·모델<input style={{ display: 'block', width: '100%' }} maxLength={160} value={draft.instrumentSystem ?? ''} onChange={event => patch({ instrumentSystem: emptyToNull(event.target.value) })} placeholder="미확인이면 비워 둡니다" /></label><label>대상 수준<select style={{ display: 'block', width: '100%' }} value={draft.level ?? ''} onChange={event => patch({ level: event.target.value ? Number(event.target.value) : null })}><option value="">미확인</option><option value="1">1 · 입문</option><option value="2">2 · 기초</option><option value="3">3 · 심화</option></select></label></div>
          <fieldset><legend>기보 방식</legend><div className="row">{notationOptions.map(option => <label className="row" key={option.value}><input type="checkbox" checked={draft.notationKinds.includes(option.value)} onChange={event => patch({ notationKinds: event.target.checked ? [...draft.notationKinds.filter(value => option.value === 'unknown' ? false : value !== 'unknown'), option.value] : draft.notationKinds.filter(value => value !== option.value) })} />{option.label}</label>)}</div></fieldset>
          <label>학습 목표 · 한 줄에 하나<textarea value={objectivesText} onChange={event => { setObjectivesText(event.target.value); patch({ objectives: list(event.target.value) }); }} /></label>
          <label>후보를 확인한 문서 주소<input style={{ display: 'block', width: '100%' }} type="url" value={draft.sourceDocumentUrl} onChange={event => patch({ sourceDocumentUrl: event.target.value })} /></label>
          <label>출처 근거<textarea maxLength={4000} value={draft.sourceEvidence ?? ''} onChange={event => patch({ sourceEvidence: emptyToNull(event.target.value) })} placeholder="문서명, 위치, 실제 관찰한 내용을 기록합니다" /></label>
          <label>점검 근거·범위·제한사항<textarea maxLength={6000} value={draft.checkEvidence ?? ''} onChange={event => patch({ checkEvidence: emptyToNull(event.target.value) })} placeholder="브라우저/화면 크기, 실행 범위, 모델·목표 일치 여부, 권한·개인정보 고지 관찰" /></label>
          <label>실제 점검 시각 · ISO 8601<input style={{ display: 'block', width: '100%' }} value={draft.checkedAt ?? ''} onChange={event => patch({ checkedAt: emptyToNull(event.target.value) })} placeholder="예: 2026-10-14T12:00:00Z" /></label>
          <fieldset><legend>기록한 점검 결과</legend><div className="stack">{([{ key: 'availabilityCheck', label: '실제 실행/접근 점검 근거 있음' }, { key: 'contentCompatibilityCheck', label: '자료군·모델·기보·목표 호환성 근거 있음' }, { key: 'privacyPermissionCheck', label: '권한·개인정보 처리 점검 근거 있음' }, { key: 'contentAccuracyChecked', label: '교육 내용 정확성 검토 근거 있음' }] as const).map(item => <label className="row" key={item.key}><input type="checkbox" checked={draft[item.key]} onChange={event => patch({ [item.key]: event.target.checked })} />{item.label}</label>)}</div></fieldset>
          <div className="form-grid">{([{ key: 'requiresCamera', label: '카메라 필요' }, { key: 'requiresMicrophone', label: '마이크 필요' }, { key: 'requiresLogin', label: '로그인 필요' }] as const).map(item => <label key={item.key}>{item.label}<select style={{ display: 'block', width: '100%' }} value={draft[item.key]} onChange={event => patch({ [item.key]: event.target.value as 'yes' | 'no' | 'unknown' })}><option value="unknown">미확인</option><option value="no">필요 없음</option><option value="yes">필요함</option></select></label>)}</div>
          <div className="notice"><label className="row"><input type="checkbox" checked={draft.enabled} disabled={!draft.enabled && !activationReady} onChange={event => patch({ enabled: event.target.checked })} /><FileCheck2 size={18} /> 점검 근거를 갖춘 후보를 명시적으로 활성화</label><p>{activationReady ? '저장 시 repository의 URL·중복·점검 조건을 다시 검사합니다. 단원 호환성은 각 연결에서 별도 검사합니다.' : '출처·점검 시각/근거·실행·내용·개인정보·악기형·기보·목표가 확인되고 카메라/마이크/로그인이 모두 필요 없어야 선택할 수 있습니다.'}</p></div>
        </fieldset>
        <div className="row" style={{ justifyContent: 'flex-end' }}><button type="button" className="button secondary" onClick={close} disabled={busy}>취소</button><button type="submit" className="button" disabled={busy || !canEdit}>{busy ? '저장 중…' : '후보 저장'}</button></div>
      </form>}
    </dialog>
  </>;
}
