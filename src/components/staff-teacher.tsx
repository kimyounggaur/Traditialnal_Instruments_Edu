'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Check, Copy, Plus, Printer, Save, Search, Trash2 } from 'lucide-react';
import { useLibrary } from '@/components/provider';
import { instruments, type Activity, type Database, type Instrument, type LessonPlan } from '@/domain/types';
import { validateLessonPlan } from '@/domain/lesson-plan';
import { resourceForVersion, visibleResource } from '@/domain/visibility';

const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const instrumentName = (id: string) => instruments.find(item => item.id === id)?.name || id;
const lines = (value: string) => value.split('\n').map(item => item.trim()).filter(Boolean);
const phases: Record<Activity['phase'], string> = { intro: '도입', main: '전개', wrapup: '마무리' };
function blankPlan(instrument: Instrument): LessonPlan {
  return { id: uid('plan'), title: `${instrumentName(instrument)} 수업안`, instrument, targetLevel: 1, objectives: ['자료의 출처와 판본을 확인한다.'], durationMinutes: 40, materials: ['화면 또는 인쇄한 수업안'], activities: [
    { id: uid('activity'), phase: 'intro', title: '수업 소개', minutes: 5, teacherNotes: '', alternative: '', resources: [], appLinkIds: [] },
    { id: uid('activity'), phase: 'main', title: '자료 살펴보기', minutes: 10, teacherNotes: '', alternative: '', resources: [], appLinkIds: [] },
    { id: uid('activity'), phase: 'main', title: '자료를 활용한 활동', minutes: 15, teacherNotes: '', alternative: '', resources: [], appLinkIds: [] },
    { id: uid('activity'), phase: 'wrapup', title: '배운 내용 돌아보기', minutes: 10, teacherNotes: '', alternative: '', resources: [], appLinkIds: [] },
  ], isDemo: true, updatedAt: new Date().toISOString(), revision: 0, instrumentSystem: null };
}

export function TeacherPlans() {
  const { db, repo, ready, run, notify } = useLibrary();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [instrument, setInstrument] = useState<Instrument>('gayageum');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const lock = useRef(false);
  const normalized = query.normalize('NFKC').trim().toLocaleLowerCase();
  const plans = [...db.plans].filter(plan => plan.title.normalize('NFKC').toLocaleLowerCase().includes(normalized)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  async function createPlan() {
    if (lock.current) return; lock.current = true; setBusy(true);
    const plan = await run(() => repo.saveLessonPlan(blankPlan(instrument), 0), '새 수업안을 만들었습니다.');
    lock.current = false; setBusy(false); if (plan) router.push(`/teacher/plans/${plan.id}`);
  }
  async function duplicate(id: string) {
    if (lock.current) return; lock.current = true; setBusy(true);
    const plan = await run(() => repo.duplicateLessonPlan(id), '판본 연결을 유지한 복사본을 만들었습니다.');
    lock.current = false; setBusy(false); if (plan) router.push(`/teacher/plans/${plan.id}`);
  }
  async function remove(plan: LessonPlan) {
    if (lock.current) return; lock.current = true; setBusy(true);
    try { await repo.deleteLessonPlan(plan.id, plan.revision); notify('수업안을 삭제했습니다.'); setConfirmDelete(null); }
    catch (error) { notify(error instanceof Error ? error.message : '삭제하지 못했습니다.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <><header className="page-heading"><div><p className="eyebrow">TEACHER’S DESK</p><h1>차근차근, 수업 준비</h1><p>자료를 고르고, 시간을 나누고, 나만의 수업안을 만들어 보세요.</p></div></header>
    <section className="panel stack"><div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}><div><h2>새로운 수업을 준비할까요?</h2><p className="muted">40분 기본 틀로 시작해 수업에 맞게 편집하세요.</p></div><div className="row" style={{ flexWrap: 'wrap' }}><label className="field"><span>새 수업안의 자료군</span><select value={instrument} onChange={event => setInstrument(event.target.value as Instrument)}>{instruments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button className="button" onClick={createPlan} disabled={busy || !ready}><Plus size={18} />새 수업안 만들기</button></div></div><p className="muted">수업안은 이 브라우저에만 저장됩니다. 기본 예시는 합성 시연이며 실제 학생 정보는 기록하지 않습니다.</p></section>
    <div className="toolbar" style={{ marginBlock: 24 }}><label className="field" style={{ flex: 1 }}><span className="sr-only">수업안 제목 검색</span><span className="row"><Search size={18} /><input placeholder="수업안 제목으로 찾기" value={query} onChange={event => setQuery(event.target.value)} /></span></label><span className="muted">{plans.length}개 수업안</span></div>
    {!ready ? <p role="status">저장한 수업안을 불러오고 있어요.</p> : plans.length === 0 ? <section className="empty panel"><BookOpen size={36} /><h2>{query ? '검색 결과가 없어요' : '첫 수업안을 준비해 보세요'}</h2><p>{query ? '다른 제목을 입력하거나 검색어를 지워 주세요.' : '자료군을 선택하고 새 수업안을 만들 수 있어요.'}</p>{query && <button className="button secondary" onClick={() => setQuery('')}>검색 초기화</button>}</section> : <div className="grid-3">{plans.map(plan => <article className="panel stack" key={plan.id}><div className="row" style={{ justifyContent: 'space-between' }}><span className="badge">{instrumentName(plan.instrument)}</span><span className="badge">{plan.isDemo ? '합성 시연' : '교사 작성'}</span></div><h2><Link href={`/teacher/plans/${plan.id}`}>{plan.title}</Link></h2><p className="muted">{plan.durationMinutes}분 · {plan.activities.length}개 활동 · 수준 {plan.targetLevel}</p><p>{plan.objectives[0] || '학습 목표를 입력해 주세요.'}</p><div className="row" style={{ flexWrap: 'wrap' }}><Link className="button secondary" href={`/teacher/plans/${plan.id}`}>수업안 열기<ArrowRight size={16} /></Link><button className="button ghost" onClick={() => duplicate(plan.id)} disabled={busy} aria-label={`${plan.title} 복제`}><Copy size={16} />복제</button><button className="button ghost" onClick={() => setConfirmDelete(plan.id)} disabled={busy} aria-label={`${plan.title} 삭제`}><Trash2 size={16} />삭제</button></div>{confirmDelete === plan.id && <div className="notice" role="alert"><p>이 수업안을 삭제할까요? 삭제한 수업안은 복구할 수 없습니다.</p><div className="row"><button className="button danger" onClick={() => remove(plan)} disabled={busy}>삭제 확인</button><button className="button secondary" onClick={() => setConfirmDelete(null)} disabled={busy}>취소</button></div></div>}</article>)}</div>}
  </>;
}

export function PlanEditor({ planId }: { planId: string }) {
  const { db, ready } = useLibrary();
  if (!ready) return <p className="panel" role="status">수업안을 불러오고 있어요.</p>;
  const plan = db.plans.find(item => item.id === planId);
  if (!plan) return <section className="panel empty"><h1>수업안을 찾을 수 없어요</h1><p>주소를 확인하거나 수업안 목록에서 다시 열어 주세요.</p><Link className="button" href="/teacher/plans">수업안 목록</Link></section>;
  return <PlanForm key={planId} initial={plan} />;
}

function PlanForm({ initial }: { initial: LessonPlan }) {
  const { db, repo, run, notify } = useLibrary();
  const [draft, setDraft] = useState<LessonPlan>(() => structuredClone(initial));
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [objectivesText, setObjectivesText] = useState(() => initial.objectives.join('\n'));
  const [materialsText, setMaterialsText] = useState(() => initial.materials.join('\n'));
  const [busy, setBusy] = useState(false);
  const [printable, setPrintable] = useState<{ plan: LessonPlan; excludedReferences: string[] } | null>(null);
  const [printRequested, setPrintRequested] = useState(false);
  const [chosenRefs, setChosenRefs] = useState<Record<string, string>>({});
  const [compare, setCompare] = useState<{ activityId: string; index: number } | null>(null);
  const lock = useRef(false);
  const dirty = JSON.stringify(draft) !== saved;
  const errors = validateLessonPlan(draft, db);
  const total = draft.activities.reduce((sum, activity) => sum + activity.minutes, 0);
  const latest = db.plans.find(item => item.id === draft.id);
  const conflict = latest && latest.revision !== draft.revision;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const guard = (event: MouseEvent) => { const link = (event.target as Element).closest?.('a[href]'); if (link && !(link as HTMLAnchorElement).target && !window.confirm('저장하지 않은 변경사항이 있습니다. 저장하지 않고 이동할까요?')) { event.preventDefault(); event.stopPropagation(); } };
    window.addEventListener('beforeunload', warn); document.addEventListener('click', guard, true);
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('click', guard, true); };
  }, [dirty]);
  useEffect(() => { if (printRequested && printable) { window.print(); setPrintRequested(false); } }, [printRequested, printable]);
  function update<K extends keyof LessonPlan>(key: K, value: LessonPlan[K]) { setDraft(previous => ({ ...previous, [key]: value })); setPrintable(null); }
  function updateActivity(id: string, patch: Partial<Activity>) { update('activities', draft.activities.map(activity => activity.id === id ? { ...activity, ...patch } : activity)); }
  function moveActivity(index: number, direction: -1 | 1) { const target = index + direction; if (target < 0 || target >= draft.activities.length) return; const moved = [...draft.activities]; [moved[index], moved[target]] = [moved[target], moved[index]]; update('activities', moved); }
  async function save() {
    if (lock.current) return; lock.current = true; setBusy(true);
    const result = await run(() => repo.saveLessonPlan(draft, draft.revision), '수업안을 저장했습니다.');
    if (result) { setDraft(result); setSaved(JSON.stringify(result)); }
    lock.current = false; setBusy(false);
    return result;
  }
  async function print() {
    if (lock.current || dirty) { notify('변경사항을 먼저 저장한 뒤 인쇄해 주세요.'); return; }
    lock.current = true; setBusy(true);
    const result = await run(() => repo.getPrintablePlan(draft.id));
    if (result) { setPrintable(result); setPrintRequested(true); }
    lock.current = false; setBusy(false);
  }
  async function keepCopy() {
    if (lock.current) return; lock.current = true; setBusy(true);
    const copy = { ...draft, id: uid('plan'), title: `${draft.title} (변경사항 복사)`, revision: 0 };
    const result = await run(() => repo.saveLessonPlan(copy, 0), '편집 중인 내용을 별도 수업안으로 저장했습니다.');
    if (result) notify(`복사본 “${result.title}”을 수업안 목록에 저장했습니다.`);
    lock.current = false; setBusy(false);
  }
  function addReference(activity: Activity) {
    const chosen = chosenRefs[activity.id]; if (!chosen) return;
    const [resourceId, versionId, unitId] = chosen.split('|');
    if (activity.resources.some(ref => ref.resourceId === resourceId && ref.versionId === versionId && ref.unitId === unitId)) { notify('같은 단원이 이미 이 활동에 포함되어 있습니다.'); return; }
    updateActivity(activity.id, { resources: [...activity.resources, { resourceId, versionId, unitId }] });
  }
  const options = db.resources.filter(resource => resource.instrument === draft.instrument && visibleResource(db, resource, draft.isDemo ? 'demo' : 'public')).flatMap(resource => {
    const version = db.versions.find(item => item.id === resource.publishedVersionId); if (!version) return [];
    const metadata = resourceForVersion(resource, version);
    return db.units.filter(unit => version.unitIds.includes(unit.id)).map(unit => ({ value: `${resource.id}|${version.id}|${unit.id}`, label: `${metadata.title} · ${unit.title} · ${version.version}` }));
  });
  return <div className="plan-editor"><div className="no-print"><Link className="button ghost" href="/teacher/plans"><ArrowLeft size={16} />수업안 목록</Link><header className="page-heading"><div><p className="eyebrow">LESSON PLANNER</p><h1>{draft.title}</h1><p>활동과 자료를 연결해 수업의 흐름을 정리하세요.</p></div><div className="row" style={{ flexWrap: 'wrap' }}><span className="badge">{draft.isDemo ? '합성 시연 수업안' : '교사 작성'}</span><button className="button secondary" onClick={print} disabled={busy || dirty}><Printer size={17} />인쇄</button><button className="button" onClick={save} disabled={busy || errors.length > 0}><Save size={17} />{busy ? '처리 중…' : '저장'}</button></div></header>
    <div className="toolbar"><span className="muted">{dirty ? '저장하지 않은 변경사항이 있어요.' : `저장됨 · 수정 ${draft.revision}`}</span><span className={`badge ${total === draft.durationMinutes ? '' : 'error'}`}>활동 합계 {total} / {draft.durationMinutes}분</span></div>
    {conflict && <div className="notice" role="alert"><p>다른 창에서 수정된 수업안이 있습니다. 현재 내용을 덮어쓰지 않습니다.</p><div className="row"><button className="button secondary" onClick={keepCopy} disabled={busy}>내 변경사항을 복사본으로 저장</button><button className="button ghost" onClick={() => { if (latest && window.confirm('편집 중인 내용을 버리고 최신 수업안을 불러올까요?')) { setDraft(structuredClone(latest)); setSaved(JSON.stringify(latest)); setObjectivesText(latest.objectives.join('\n')); setMaterialsText(latest.materials.join('\n')); } }}>최신 내용 다시 불러오기</button></div></div>}
    {errors.length > 0 && <div className="notice" role="alert"><strong>저장 전에 확인해 주세요</strong><ul>{errors.map(error => <li key={error}>{error}</li>)}</ul></div>}
    <section className="panel stack" style={{ marginBlock: 24 }}><h2>수업의 기본 정보</h2><div className="form-grid"><label className="field"><span>수업안 제목</span><input value={draft.title} maxLength={200} onChange={event => update('title', event.target.value)} /></label><label className="field"><span>자료군</span><select value={draft.instrument} onChange={event => update('instrument', event.target.value as Instrument)}>{instruments.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label className="field"><span>대상 수준</span><select value={draft.targetLevel} onChange={event => update('targetLevel', Number(event.target.value) as 1 | 2 | 3)}><option value="1">1 · 기초</option><option value="2">2 · 중급</option><option value="3">3 · 심화</option></select></label><label className="field"><span>전체 수업 시간 (분)</span><input type="number" min={1} max={480} value={draft.durationMinutes} onChange={event => update('durationMinutes', Number(event.target.value))} /></label><label className="field"><span>악기형 (미확인일 때 비워 두기)</span><input value={draft.instrumentSystem || ''} onChange={event => update('instrumentSystem', event.target.value || null)} placeholder="자료의 확인된 악기형만 입력" /></label></div><div className="grid-2"><label className="field"><span>학습 목표 (한 줄에 하나)</span><textarea rows={3} value={objectivesText} onChange={event => { setObjectivesText(event.target.value); update('objectives', lines(event.target.value)); }} /></label><label className="field"><span>준비물 (한 줄에 하나)</span><textarea rows={3} value={materialsText} onChange={event => { setMaterialsText(event.target.value); update('materials', lines(event.target.value)); }} /></label></div><p className="muted">수준은 자료 난이도이며 실제 학생 진단이 아닙니다. 학생 이름·학교·성적을 입력하지 마세요.</p></section>
    <div className="stack">{draft.activities.map((activity, index) => <section className="panel stack" key={activity.id}><div className="row" style={{ justifyContent: 'space-between' }}><h2>{String(index + 1).padStart(2, '0')}. {activity.title || '새 활동'}</h2><div className="row" style={{ flexWrap: 'wrap' }}><button className="button ghost" aria-label={`${index + 1}번 활동 위로 이동`} disabled={index === 0} onClick={() => moveActivity(index, -1)}><ArrowUp size={17} />위로</button><button className="button ghost" aria-label={`${index + 1}번 활동 아래로 이동`} disabled={index === draft.activities.length - 1} onClick={() => moveActivity(index, 1)}><ArrowDown size={17} />아래로</button><button className="button ghost" aria-label={`${index + 1}번 활동 삭제`} onClick={() => update('activities', draft.activities.filter(item => item.id !== activity.id))}><Trash2 size={17} />삭제</button></div></div><div className="form-grid"><label className="field"><span>단계</span><select value={activity.phase} onChange={event => updateActivity(activity.id, { phase: event.target.value as Activity['phase'] })}>{Object.entries(phases).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field"><span>활동명</span><input value={activity.title} onChange={event => updateActivity(activity.id, { title: event.target.value })} /></label><label className="field"><span>활동 시간 (분)</span><input type="number" min={1} max={480} value={activity.minutes} onChange={event => updateActivity(activity.id, { minutes: Number(event.target.value) })} /></label></div><div className="grid-2"><label className="field"><span>교사 진행 메모</span><textarea rows={3} value={activity.teacherNotes} onChange={event => updateActivity(activity.id, { teacherNotes: event.target.value })} /></label><label className="field"><span>대체 활동</span><textarea rows={3} value={activity.alternative} onChange={event => updateActivity(activity.id, { alternative: event.target.value })} /></label></div><div className="stack"><h3>이 활동에 담은 자료</h3>{activity.resources.length === 0 && <p className="muted">아직 담은 단원이 없습니다. 자료를 선택해 추가하세요.</p>}{activity.resources.map((ref, refIndex) => {
      const resource = db.resources.find(item => item.id === ref.resourceId); const version = db.versions.find(item => item.id === ref.versionId); const unit = db.units.find(item => item.id === ref.unitId); const allowed = resource && visibleResource(db, resource, draft.isDemo ? 'demo' : 'public', ref.versionId); const newer = resource?.publishedVersionId && resource.publishedVersionId !== ref.versionId; const metadata = resource && version ? resourceForVersion(resource, version) : resource;
      return <div className="notice" key={`${ref.resourceId}/${ref.versionId}/${ref.unitId}`}><div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}><div><strong>{metadata?.title || '찾을 수 없는 자료'}</strong><p>{unit?.title || '단원 미확인'} · 고정 판본 {version?.version || ref.versionId}</p>{!allowed && <p className="error">보류·비공개 또는 권리 제한 자료입니다. 저장 전에 제거하거나 판본을 비교하세요.</p>}</div><button className="button ghost" aria-label={`${unit?.title || '단원'} 연결 제거`} onClick={() => updateActivity(activity.id, { resources: activity.resources.filter((_, i) => i !== refIndex) })}>연결 제거</button></div>{allowed && <Link className="button ghost" href={`/library/${ref.resourceId}/units/${ref.unitId}?version=${encodeURIComponent(ref.versionId)}&audience=${draft.isDemo ? 'demo' : 'public'}`}>고정 판본 열기<ArrowRight size={15} /></Link>}{newer && <button className="button secondary" onClick={() => setCompare({ activityId: activity.id, index: refIndex })}>새 판본 비교 후 선택</button>}</div>;
    })}<div className="row" style={{ alignItems: 'end', flexWrap: 'wrap' }}><label className="field" style={{ flex: 1, minWidth: 0 }}><span>추가할 단원</span><select value={chosenRefs[activity.id] || ''} onChange={event => setChosenRefs(previous => ({ ...previous, [activity.id]: event.target.value }))}><option value="">자료와 단원을 선택하세요</option>{options.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label><button className="button secondary" onClick={() => addReference(activity)} disabled={!chosenRefs[activity.id]}><Plus size={16} />단원 담기</button></div>{activity.appLinkIds.length > 0 && <p className="muted">연결 앱: {activity.appLinkIds.map(id => db.apps.find(app => app.id === id)?.title || id).join(', ')}. 앱을 열었다는 사실을 학습 완료로 기록하지 않습니다.</p>}</div></section>)}</div>
    <button className="button secondary" style={{ marginBlock: 24 }} onClick={() => update('activities', [...draft.activities, { id: uid('activity'), phase: 'main', title: '새 활동', minutes: 5, teacherNotes: '', alternative: '', resources: [], appLinkIds: [] }])}><Plus size={17} />활동 추가</button>
    <div className="notice"><Check size={19} /><p>자료의 판본은 저장한 그대로 고정됩니다. 새 판본이 생겨도 자동 교체하지 않으며, 인쇄할 때 출처와 권한을 다시 확인합니다.</p></div>
    {compare && <VersionCompare db={db} draft={draft} activityId={compare.activityId} index={compare.index} onClose={() => setCompare(null)} onSelect={ref => { const activity = draft.activities.find(item => item.id === compare.activityId); if (activity) updateActivity(activity.id, { resources: activity.resources.map((item, index) => index === compare.index ? ref : item) }); setCompare(null); }} />}
  </div><PrintPlan data={printable} db={db} /></div>;
}

function VersionCompare({ db, draft, activityId, index, onClose, onSelect }: { db: Database; draft: LessonPlan; activityId: string; index: number; onClose: () => void; onSelect: (ref: Activity['resources'][number]) => void }) {
  const ref = draft.activities.find(item => item.id === activityId)?.resources[index];
  const resource = db.resources.find(item => item.id === ref?.resourceId);
  const previous = db.versions.find(item => item.id === ref?.versionId);
  const current = db.versions.find(item => item.id === resource?.publishedVersionId);
  const [unitId, setUnitId] = useState('');
  if (!resource || !current || !previous) return <section className="panel"><p>비교할 판본을 찾을 수 없습니다.</p><button className="button" onClick={onClose}>닫기</button></section>;
  const available = visibleResource(db, resource, draft.isDemo ? 'demo' : 'public', current.id);
  return <section className="panel stack" aria-label="새 판본 비교"><h2>저장 판본과 새 판본 비교</h2><div className="grid-2">{[previous, current].map(version => <div className="panel" key={version.id}><span className="badge">{version.id === previous.id ? '기존 연결' : '현재 공개'}</span><h3>{resourceForVersion(resource, version).title}</h3><p>판본 {version.version}</p><p>{version.changeSummary}</p><p className="muted">인쇄: {version.rights.allowPrint ? '허용' : '제한'} · 검수: {version.reviewState}</p></div>)}</div><label className="field"><span>교체할 새 판본의 단원</span><select value={unitId} onChange={event => setUnitId(event.target.value)}><option value="">단원을 직접 선택하세요</option>{db.units.filter(unit => current.unitIds.includes(unit.id)).map(unit => <option value={unit.id} key={unit.id}>{unit.title}</option>)}</select></label><p className="muted">원래 단원 번호를 새 판본의 단원에 자동 대응하지 않습니다.</p><div className="row"><button className="button" disabled={!available || !unitId} onClick={() => onSelect({ resourceId: resource.id, versionId: current.id, unitId })}>선택한 판본으로 교체</button><button className="button secondary" onClick={onClose}>기존 판본 유지</button></div></section>;
}

function PrintPlan({ data, db }: { data: { plan: LessonPlan; excludedReferences: string[] } | null; db: Database }) {
  if (!data) return <div className="print-only"><p>인쇄 버튼에서 자료의 권리를 확인한 후 출력해 주세요.</p></div>;
  const { plan, excludedReferences } = data;
  return <article className="print-only print-plan"><p>레슨 디자이너 · 국악기 교육 전자도서관</p><h1>{plan.title}</h1><p>{plan.isDemo ? '합성 시연 수업안 · 실제 음악 교육 내용 승인 아님' : '교사 작성 수업안'} · {instrumentName(plan.instrument)} · 수준 {plan.targetLevel} · {plan.durationMinutes}분</p><p>수업안 수정 {plan.revision} · 저장일 {plan.updatedAt.slice(0, 10)}</p><h2>학습 목표</h2><ul>{plan.objectives.map((goal, i) => <li key={i}>{goal}</li>)}</ul><h2>준비물</h2><p>{plan.materials.join(' / ')}</p>{plan.activities.map((activity, index) => <section key={activity.id}><h2>{index + 1}. {phases[activity.phase]} · {activity.title} ({activity.minutes}분)</h2><p style={{ whiteSpace: 'pre-wrap' }}>{activity.teacherNotes || '진행 메모 없음'}</p><p style={{ whiteSpace: 'pre-wrap' }}>대체 활동: {activity.alternative || '미기재'}</p>{activity.resources.map(ref => { const resource = db.resources.find(item => item.id === ref.resourceId); const version = db.versions.find(item => item.id === ref.versionId); if (!resource || !version || !version.rights.allowPrint || !visibleResource(db, resource, plan.isDemo ? 'demo' : 'public', ref.versionId)) return null; const metadata = resourceForVersion(resource, version); const unit = db.units.find(item => item.id === ref.unitId); return <div key={`${ref.resourceId}/${ref.versionId}/${ref.unitId}`}><p><strong>{metadata.title}</strong> · {unit?.title} · 판본 {version.version} ({version.id})</p><p>{resource.datasetKind === 'synthetic_demo' ? '합성 시연 자료' : '실제 자료'} · 출처: {metadata.sourceRefs.map(source => `${source.title}${source.url ? ` (${source.url})` : ''}${source.pageRange ? ` / ${source.pageRange}` : ''}`).join('; ')}</p><p>원본 위치: {resource.datasetKind === 'synthetic_demo' ? '합성 자료 · 원본 슬라이드 미연결' : metadata.sourceRefs.map(source => source.pageRange || '원본 슬라이드 미확인').join('; ')}</p><p>출력 권리: {version.rights.license || '기록 참조'} · 근거: {version.rights.evidenceRef || '미기재'}</p></div>; })}</section>)}{excludedReferences.length > 0 && <section><h2>출력 제외 자료</h2><p>권리·보류 상태로 인해 다음 자료 참조를 제외했습니다.</p><ul>{excludedReferences.map(ref => <li key={ref}>{ref}</li>)}</ul></section>}<p>이 브라우저에서 작성한 로컬 시연용 출력물입니다. 원본 PPTX·악보·음원은 포함하지 않습니다.</p></article>;
}
