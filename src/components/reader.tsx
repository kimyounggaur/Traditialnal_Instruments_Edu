'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Bookmark, BookOpen, Check, ChevronRight, Clock3, ExternalLink, FileClock, Flag, Library, Plus, Printer, Search, ShieldCheck, SlidersHorizontal, X } from 'lucide-react';
import { useLibrary } from './provider';
import { BookCover } from './bookshelf';
import { instruments, type Audience, type ContentBlock, type LessonPlan, type Resource, type ResourceVersion, type ReviewIssue, type Unit } from '@/domain/types';
import type { ResourceDetail as Detail } from '@/repositories/contracts';
import { visibleResource } from '@/domain/visibility';
import { canUseApp, validateAppUrl } from '@/domain/url-policy';

const notationLabels: Record<string, string> = { jeongganbo: '정간보', staff: '오선보', yulja: '율자', gueum: '구음', mixed: '혼합', other: '기타', unknown: '미확인' };
const reviewLabels: Record<string, string> = { draft: '초안 · 미검수', in_review: '검수 중', changes_requested: '수정 요청', re_review: '재검수', approved: '승인', rejected: '반려' };
const rightsLabels: Record<string, string> = { unknown: '권리 미확인', pending: '권리 확인 중', cleared: '권리 확인', restricted: '이용 제한' };
const instrumentName = (id: string) => instruments.find(item => item.id === id)?.name ?? '자료';
const uid = (prefix: string) => `${prefix}-${globalThis.crypto.randomUUID()}`;
const unitHref = (resourceId: string, versionId: string, unitId: string, audience: Audience = 'demo', returnPath = '/library') => `/library/${encodeURIComponent(resourceId)}/units/${encodeURIComponent(unitId)}?version=${encodeURIComponent(versionId)}${audience === 'public' ? '&audience=public' : ''}&return=${encodeURIComponent(returnPath)}`;
const detailHref = (resourceId: string, versionId?: string, audience: Audience = 'demo', returnPath = '/library') => `/library/${encodeURIComponent(resourceId)}?${versionId ? `version=${encodeURIComponent(versionId)}&` : ''}audience=${audience}&return=${encodeURIComponent(returnPath)}`;
function sourceUrl(value: string | null): string | null {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && ['drive.google.com', 'docs.google.com'].includes(url.hostname) ? url.href : null; } catch { return null; }
}
function localMedia(value?: string): string | undefined {
  return value && /^\/demo\/[a-zA-Z0-9_./-]+$/.test(value) && !value.includes('..') ? value : undefined;
}

function useDetail(resourceId: string) {
  const { db, repo, ready } = useLibrary();
  const searchParams = useSearchParams();
  const audience: Audience = searchParams.get('audience') === 'public' ? 'public' : 'demo';
  const versionId = searchParams.get('version') || undefined;
  const rawReturn = searchParams.get('return');
  const returnPath = rawReturn && /^(?:\/library(?:\?|$)|\/bookmarks(?:\?|$)|\/(?:\?|$))/.test(rawReturn) && !rawReturn.includes('//') ? rawReturn : '/library';
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    void repo.getResource(resourceId, versionId, audience).then(result => {
      if (active) { setDetail(result); setError(''); setLoading(false); }
    }).catch((cause: unknown) => {
      if (active) { setDetail(null); setError(cause instanceof Error ? cause.message : '자료를 열 수 없습니다.'); setLoading(false); }
    });
    return () => { active = false; };
  }, [ready, repo, resourceId, versionId, audience, db.revision]);
  const currentResource = db.resources.find(item => item.id === resourceId);
  const current = detail && currentResource && detail.resource.id === resourceId && (!versionId || detail.version.id === versionId) && visibleResource(db, currentResource, audience, detail.version.id) ? detail : null;
  return { detail: current, error, loading: !ready || loading, audience, returnPath };
}

function ReaderEmpty({ loading = false, message }: { loading?: boolean; message?: string }) {
  return <section className="empty panel" aria-live="polite"><BookOpen size={36} aria-hidden="true" /><h1>{loading ? '자료를 불러오고 있어요' : '지금은 이 자료를 열 수 없어요'}</h1><p>{loading ? '자료의 판본과 열람 권리를 확인하고 있습니다.' : message || '자료가 없거나 검수·권리 확인을 위해 비공개 또는 보류 상태입니다. 저장한 구판 참조는 자동으로 바뀌지 않습니다.'}</p>{!loading && <Link className="button secondary" href="/library"><Library size={16} />자료실로 돌아가기</Link>}</section>;
}

function VersionBadges({ resource, version }: { resource: Resource; version: ResourceVersion }) {
  return <div className="row" style={{ flexWrap: 'wrap' }}><span className="badge">{instrumentName(resource.instrument)}</span><span className="badge">판본 {version.version}</span><span className="badge">{resource.datasetKind === 'synthetic_demo' ? '합성 시연 · 교육 내용 아님' : reviewLabels[version.reviewState]}</span><span className="badge">{rightsLabels[version.rights.state]}</span></div>;
}

function SourceInfo({ detail }: { detail: Detail }) {
  const { db } = useLibrary();
  const { resource, version } = detail;
  const context = version.gugakContext;
  const editorial = db.editorialUnits.filter(item => version.editorialUnitIds.includes(item.id));
  const slides = db.sourceSlides.filter(slide => editorial.some(item => item.sourceSlideIds.includes(slide.id)));
  const text = (value: { value: unknown; state: string }) => value.value === null ? '미확인 · 원문 또는 검수 근거 필요' : `${typeof value.value === 'object' ? JSON.stringify(value.value) : String(value.value)} (${value.state === 'expert_reviewed' ? '전문가 검토 기록' : value.state === 'source_observed' ? '원문 관찰' : '미확인'})`;
  return <div className="stack"><h3>자료 정보와 확인 범위</h3><dl className="info-table">
    <div><dt>자료군</dt><dd>{instrumentName(resource.instrument)}</dd></div>
    <div><dt>악기형 · 현수</dt><dd>{text(context.variant)}<br />현수: {text(context.stringCount)}</dd></div>
    <div><dt>조율</dt><dd>{text(context.tuning)}</dd></div>
    <div><dt>음역</dt><dd>{text(context.soundingRange)}</dd></div>
    <div><dt>기보법</dt><dd>{context.notationKinds.map(item => notationLabels[item]).join(' · ') || '미확인'}</dd></div>
    <div><dt>장단</dt><dd>{context.jangdan.value?.name ?? '미확인 · 장단을 추정하지 않음'}</dd></div>
    <div><dt>교육 검수</dt><dd>{resource.datasetKind === 'synthetic_demo' ? '합성 인터페이스 시연 / 실제 음악 승인 0건' : reviewLabels[version.reviewState]}<br />{version.reviewScope || '검수 범위 미등록'}{version.reviewerNameConsent && version.reviewerDisplayName && <><br />검수자: {version.reviewerDisplayName}</>}</dd></div>
    <div><dt>이용 권리</dt><dd>{rightsLabels[version.rights.state]}<br />열람 {version.rights.allowView ? '허용' : '불가'} · 인쇄 {version.rights.allowPrint ? '허용' : '불가'} · 내려받기 {version.rights.allowDownload ? '허용' : '불가'}</dd></div>
    <div><dt>판본</dt><dd>{version.version} · 수정 {version.revision}회<br />{version.changeSummary}</dd></div>
    <div><dt>AI 활용</dt><dd>{version.aiUsage || '기록 없음'}</dd></div>
  </dl><h3>원문 위치</h3>{resource.sourceRefs.length ? <ul>{resource.sourceRefs.map(ref => <li key={ref.id}><strong>{ref.title}</strong>{ref.chapter && <p>원문 장: {ref.chapter}</p>}<p>원문 페이지: {ref.pageRange || '미확인'}</p>{sourceUrl(ref.url) ? <a href={sourceUrl(ref.url)!} target="_blank" rel="noopener noreferrer">원자료 위치 확인 <ExternalLink size={13} aria-hidden="true" /><span className="sr-only"> (외부 사이트, 새 탭)</span></a> : <span className="muted">원문 파일 미연결</span>}</li>)}</ul> : <p className="muted">실제 원문과 연결하지 않은 합성 시연 자료입니다.</p>}
  <p className="muted">편집 단원 번호와 원본 슬라이드 번호는 서로 다릅니다.</p>{slides.length > 0 ? <ul>{slides.map(slide => <li key={slide.id}>원본 슬라이드 {slide.slideNumber} · {db.sources.find(source => source.id === slide.sourceDocumentId)?.originalName ?? '출처 파일 미확인'} · {slide.visualCheckState === 'checked' ? '시각검토 기록 있음' : '시각검토 필요'}</li>)}</ul> : <p className="muted">연결된 원본 슬라이드: 없음. 번호를 추정하지 않았습니다.</p>}</div>;
}

function BookmarkButton({ detail, unitId = null }: { detail: Detail; unitId?: string | null }) {
  const { db, repo, run } = useLibrary();
  const [busy, setBusy] = useState(false);
  const saved = db.bookmarks.some(item => item.resourceId === detail.resource.id && item.versionId === detail.version.id && item.unitId === unitId);
  return <button className="button secondary" disabled={busy} aria-pressed={saved} onClick={async () => { setBusy(true); await run(() => repo.toggleBookmark(detail.resource.id, detail.version.id, unitId), saved ? '북마크를 해제했습니다.' : '현재 판본으로 북마크에 저장했습니다.'); setBusy(false); }}><Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />{saved ? '저장됨' : '북마크'}</button>;
}

function IssueDialog({ detail, unit }: { detail: Detail; unit?: Unit }) {
  const { repo, run } = useLibrary();
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const description = String(data.get('description') || '').trim();
    const evidence = String(data.get('evidence') || '').trim();
    if (!description || !evidence) { setError('문제 내용과 관찰 근거를 모두 입력해 주세요.'); return; }
    setBusy(true); setError('');
    const result = await run(() => repo.reportIssue({ resourceId: detail.resource.id, versionId: detail.version.id, unitId: unit?.id ?? null, blockId: String(data.get('blockId') || '') || null, category: String(data.get('category')) as ReviewIssue['category'], severity: String(data.get('severity')) as ReviewIssue['severity'], description, evidence, suggestion: String(data.get('suggestion') || '').trim() }), '오류 신고를 저장했습니다. 판본과 단원 위치가 함께 기록됩니다.');
    setBusy(false);
    if (result) { form.reset(); dialog.current?.close(); } else setError('신고를 저장하지 못했습니다. 화면 안내를 확인해 주세요.');
  }
  return <><button className="button ghost" onClick={() => dialog.current?.showModal()}><Flag size={16} />오류 신고</button><dialog ref={dialog} className="modal" aria-labelledby={`${id}-title`}><form onSubmit={submit} className="stack"><div className="row" style={{ justifyContent: 'space-between' }}><h2 id={`${id}-title`}>자료 오류 신고</h2><button type="button" className="button ghost" aria-label="오류 신고 닫기" onClick={() => dialog.current?.close()}><X size={20} /></button></div><p className="muted">{detail.resource.title} · 판본 {detail.version.version}{unit ? ` · ${unit.title}` : ''}</p><label className="field">분류<select name="category" defaultValue="other"><option value="music">음악 내용</option><option value="pedagogy">교육·설명</option><option value="safety">안전</option><option value="rights">권리</option><option value="other">기타</option></select></label><label className="field">중요도<select name="severity" defaultValue="minor"><option value="minor">경미 · 문구와 표시</option><option value="major">주요 · 학습에 영향</option><option value="critical">긴급 · 즉시 확인 필요</option></select></label>{unit && <label className="field">신고 위치<select name="blockId"><option value="">이 단원 전체</option>{unit.blocks.map((block, index) => <option value={block.id} key={block.id}>블록 {index + 1} · {block.type}</option>)}</select></label>}<label className="field">문제 내용<textarea name="description" rows={3} required maxLength={2000} placeholder="어떤 부분에 문제가 있는지 알려주세요." /></label><label className="field">관찰 근거<textarea name="evidence" rows={2} required maxLength={2000} placeholder="화면에서 확인한 내용 또는 출처 위치" /></label><label className="field">수정 제안 (선택)<textarea name="suggestion" rows={2} maxLength={2000} /></label><p className="notice">주요·긴급 문제 또는 안전 문제는 자료 열람을 보류하고 재검토하도록 기록됩니다. 학생 이름 등 개인정보는 입력하지 마세요.</p>{error && <p className="error" role="alert">{error}</p>}<div className="row"><button className="button" disabled={busy} type="submit">{busy ? '저장 중…' : '신고 저장'}</button><button className="button secondary" type="button" onClick={() => dialog.current?.close()}>취소</button></div></form></dialog></>;
}

function AddToPlan({ detail, unit }: { detail: Detail; unit: Unit }) {
  const { db, repo, run, role } = useLibrary();
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [selected, setSelected] = useState('new');
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  if (role === 'student') return null;
  const isDemo = detail.resource.datasetKind === 'synthetic_demo';
  const plans = db.plans.filter(plan => plan.instrument === detail.resource.instrument && plan.isDemo === isDemo);
  const chosen = plans.find(plan => plan.id === selected);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const data = new FormData(event.currentTarget);
    const reference = { resourceId: detail.resource.id, versionId: detail.version.id, unitId: unit.id };
    let plan: LessonPlan;
    if (selected === 'new') {
      plan = { id: uid('plan'), title: `${instrumentName(detail.resource.instrument)} 자료 살펴보기${isDemo ? ' (합성 시연)' : ''}`, instrument: detail.resource.instrument, instrumentSystem: detail.resource.instrumentSystem, targetLevel: detail.resource.level ?? 1, objectives: ['자료의 출처와 확인 상태를 살펴본다. (교안 작성 제안)'], durationMinutes: 40, materials: ['자료 열람 기기'], activities: [{ id: uid('activity'), phase: 'intro', title: '자료 상태와 출처 확인', minutes: 5, teacherNotes: '제안 활동이며 음악 학습 내용은 검수 후 구성합니다.', alternative: '자료 정보 화면 함께 읽기', resources: [], appLinkIds: [] }, { id: uid('activity'), phase: 'main', title: '선택 단원 살펴보기', minutes: 10, teacherNotes: '현재 판본으로 연결했습니다.', alternative: '교사가 확인 상태 설명하기', resources: [reference], appLinkIds: [] }, { id: uid('activity'), phase: 'main', title: '자료 확인 질문 정리', minutes: 15, teacherNotes: '확인되지 않은 내용은 질문으로 남깁니다.', alternative: '구두로 질문 나누기', resources: [], appLinkIds: [] }, { id: uid('activity'), phase: 'wrapup', title: '정리와 다음 준비', minutes: 10, teacherNotes: '', alternative: '오늘 살펴본 자료 되짚기', resources: [], appLinkIds: [] }], isDemo, updatedAt: new Date().toISOString(), revision: 0 };
    } else {
      if (!chosen) { setError('선택한 수업안을 다시 확인해 주세요.'); setBusy(false); return; }
      const activityId = String(data.get('activity') || '');
      const activity = chosen.activities.find(item => item.id === activityId);
      if (!activity) { setError('자료를 담을 활동을 선택해 주세요.'); setBusy(false); return; }
      if (activity.resources.some(item => item.resourceId === reference.resourceId && item.versionId === reference.versionId && item.unitId === reference.unitId)) { setError('이 활동에 이미 같은 판본과 단원이 담겨 있어요.'); setBusy(false); return; }
      plan = { ...chosen, activities: chosen.activities.map(item => item.id === activityId ? { ...item, resources: [...item.resources, reference] } : item) };
    }
    const result = await run(() => repo.saveLessonPlan(plan, plan.revision), '단원을 현재 판본으로 수업안에 담았습니다.');
    setBusy(false);
    if (result) setSavedId(result.id); else setError('수업안 연결을 저장하지 못했습니다. 자료의 판본과 확인 상태를 확인해 주세요.');
  }
  return <><button className="button" onClick={() => { setSavedId(null); setError(''); dialog.current?.showModal(); }}><Plus size={16} />교안에 담기</button><dialog ref={dialog} className="modal" aria-labelledby={`${id}-title`}><form className="stack" onSubmit={save}><div className="row" style={{ justifyContent: 'space-between' }}><h2 id={`${id}-title`}>수업안에 단원 담기</h2><button type="button" className="button ghost" aria-label="교안 담기 닫기" onClick={() => dialog.current?.close()}><X size={20} /></button></div>{savedId ? <><p><Check size={20} /> 현재 판본으로 저장했어요.</p><p className="muted">자료가 개정되어도 이 수업안의 판본은 자동으로 바뀌지 않습니다.</p><Link href={`/teacher/plans/${savedId}`} className="button" onClick={() => dialog.current?.close()}>수업안 편집하기<ArrowRight size={16} /></Link></> : <><p>{unit.title} · 판본 {detail.version.version}</p><label className="field">수업안<select value={selected} onChange={event => setSelected(event.target.value)}><option value="new">새 40분 수업안에 담기 (작성 제안)</option>{plans.map(plan => <option key={plan.id} value={plan.id}>{plan.title}</option>)}</select></label>{chosen && <label className="field">자료를 담을 활동<select name="activity" key={chosen.id} required>{chosen.activities.map(activity => <option value={activity.id} key={activity.id}>{activity.title} · {activity.minutes}분</option>)}</select></label>}<p className="notice">선택 단원의 자료 ID·판본·단원을 함께 저장합니다. 악기형이 맞지 않거나 보류된 자료는 연결할 수 없습니다.</p>{error && <p className="error" role="alert">{error}</p>}<button className="button" disabled={busy}>{busy ? '저장 중…' : '이 판본으로 담기'}</button></>}</form></dialog></>;
}

function PrintButton({ detail, audience }: { detail: Detail; audience: Audience }) {
  const { repo, run } = useLibrary();
  if (!detail.version.rights.allowPrint) return null;
  return <button className="button secondary" onClick={async () => { const printable = await run(() => repo.getPrintableResource(detail.resource.id, detail.version.id, audience)); if (printable) window.print(); }}><Printer size={16} />인쇄</button>;
}

function PrintProvenance({ detail }: { detail: Detail }) {
  const { resource, version } = detail;
  return <section className="print-only print-watermark"><strong>{resource.datasetKind === 'synthetic_demo' ? '합성 시연 자료 · 실제 음악 승인 자료 아님' : '국악기 교육 전자도서관'}</strong><p>{resource.title} · 판본 {version.version} · {rightsLabels[version.rights.state]} · 인쇄 {version.rights.allowPrint ? '허용' : '불가'}</p><p>원문 출처: {resource.sourceRefs.length ? resource.sourceRefs.map(source => `${source.title} / 페이지 ${source.pageRange || '미확인'}`).join(' · ') : '실제 원문 연결 없음'}</p><p>검수 범위: {version.reviewScope || '등록된 검수 범위 없음'} · AI 활용: {version.aiUsage || '기록 없음'}</p></section>;
}

export function ResourceDetail({ resourceId }: { resourceId: string }) {
  const { db } = useLibrary();
  const { detail, loading, error, audience, returnPath } = useDetail(resourceId);
  if (!detail) return <ReaderEmpty loading={loading} message={error} />;
  const { resource, version, units } = detail;
  const position = db.positions.find(item => item.projectId === 'gugak-library' && item.resourceId === resource.id && item.resourceVersionId === version.id && db.assets.some(asset => asset.id === item.assetId && asset.resourceVersionId === version.id && asset.availability === 'available' && asset.rights.allowView));
  const resumeUnit = units.find(item => item.id === position?.unitId) ?? units[0];
  const oldPosition = db.positions.find(item => item.resourceId === resource.id && item.resourceVersionId !== version.id);
  return <><nav className="breadcrumb" aria-label="현재 위치"><Link href={returnPath}>{returnPath.startsWith('/bookmarks') ? '책갈피' : '자료실'}</Link><ChevronRight size={14} /><span>{instrumentName(resource.instrument)}</span></nav><section className={`detail-layout${version.rights.allowPrint ? '' : ' print-restricted'}`}><PrintProvenance detail={detail} /><div className="detail-cover"><BookCover resource={resource} /><p className="muted" style={{ marginTop: 20 }}>구조화 단원으로 읽는 시연 자료<br />PDF 원본은 제공되지 않습니다.</p></div><div className="detail-content stack"><p className="eyebrow">GUGAK DIGITAL LIBRARY</p><h1>{resource.title}</h1><p>{resource.description}</p><VersionBadges resource={resource} version={version} /><div className="row"><span className="muted"><Clock3 size={15} /> 약 {resource.estimatedMinutes}분</span><span className="muted"><BookOpen size={15} /> 편집 단원 {units.length}개</span></div><p className="notice">{resource.datasetKind === 'synthetic_demo' ? '이 자료는 책 읽기·저장·교안 연결 기능을 확인하기 위한 합성 시연입니다. 실제 국악 교육 내용이나 전문가 승인 자료가 아닙니다.' : '표시된 검수 범위와 권리를 확인한 뒤 이용해 주세요.'}</p><div className="row" style={{ flexWrap: 'wrap' }}>{resumeUnit && <Link className="button" href={unitHref(resource.id, version.id, resumeUnit.id, audience, returnPath)}><BookOpen size={17} />{position ? '이어서 읽기' : '단원 읽기'}<ArrowRight size={16} /></Link>}<BookmarkButton detail={detail} /><PrintButton detail={detail} audience={audience} /></div>{oldPosition && <p className="notice">다른 판본의 읽던 위치가 남아 있습니다. 현재 판본으로 자동 이동하지 않았습니다. <Link href={detailHref(resource.id, oldPosition.resourceVersionId, audience, returnPath)}>저장한 판본 확인</Link></p>}<div className="panel stack"><div className="row" style={{ justifyContent: 'space-between' }}><h2>이 책의 목차</h2><span className="muted">편집 단원</span></div><ol className="unit-list">{units.map((unit, index) => <li key={unit.id}><Link className="unit-link" href={unitHref(resource.id, version.id, unit.id, audience, returnPath)}><span className="unit-number">{String(index + 1).padStart(2, '0')}</span><span>{unit.title}</span><ChevronRight size={18} /></Link></li>)}</ol>{units.length === 0 && <p className="empty">등록된 편집 단원이 없습니다.</p>}</div><div className="panel row"><FileClock size={28} /><div><strong>PDF 준비 중</strong><p className="muted">원본 PPTX의 PDF 변환·권리·시각검사가 완료되지 않았습니다. 사용할 수 있는 PDF 파일은 없습니다.</p></div></div><details className="panel reader-meta"><summary>출처·악기형·검수·권리 정보 자세히 보기</summary><SourceInfo detail={detail} /></details><IssueDialog detail={detail} /></div></section></>;
}

function SafeBlock({ block, index, scale }: { block: ContentBlock; index: number; scale: number }) {
  const [failed, setFailed] = useState(false);
  const media = localMedia(block.src);
  if (block.type === 'paragraph') return <p style={{ whiteSpace: 'pre-wrap', fontSize: `${scale}rem`, lineHeight: 1.95 }}>{block.text}</p>;
  if (block.type === 'audio') return <figure><figcaption>{block.caption || `음원 ${index + 1}`}</figcaption>{media && !failed ? <audio controls preload="none" onError={() => setFailed(true)} src={media}>오디오를 지원하는 브라우저에서 열어 주세요.</audio> : <p className="notice">연결된 음원이 없습니다. 자동 재생하지 않습니다.</p>}{block.text && <p>{block.text}</p>}</figure>;
  if (block.type === 'image' || block.type === 'score') return <figure className="neutral-diagram">{media && !failed ? <><img src={media} alt={block.alt || block.caption || '설명 미등록 이미지'} loading="lazy" onError={() => setFailed(true)} style={{ maxWidth: '100%', height: 'auto' }} />{block.type === 'score' && <details><summary>악보 크게 보기</summary><div style={{ overflow: 'auto' }}><img src={media} alt={`${block.alt || '악보'} 확대`} style={{ width: '150%', maxWidth: 'none' }} /></div></details>}</> : <><FileClock size={28} /><p>{block.type === 'score' ? '악보 원문 미연결' : '이미지 원문 미연결'}</p><p>{block.alt || '확인된 원본 자산이 없어 이미지를 표시하지 않습니다.'}</p></>}<figcaption>{block.caption || block.text || '원본 자산과 대체 설명을 확인해야 합니다.'}</figcaption></figure>;
  return <figure className="neutral-diagram"><span className="badge">{block.type === 'jeonggan' ? '정간보 원문 설명' : '국악 기보 설명'}</span><p style={{ whiteSpace: 'pre-wrap', fontSize: `${scale}rem` }}>{block.text || '연결된 원문 설명이 없습니다.'}</p>{block.caption && <figcaption>{block.caption}</figcaption>}<p className="muted">원문 방향과 격자를 확인하기 전 기보를 재구성하지 않습니다. 음높이 생성이나 기보법 자동 변환은 제공하지 않습니다.</p></figure>;
}

export function UnitReader({ resourceId, unitId }: { resourceId: string; unitId: string }) {
  const { db, repo, ready, notify } = useLibrary();
  const { detail, loading, error, audience, returnPath } = useDetail(resourceId);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [unitError, setUnitError] = useState('');
  const [scale, setScale] = useState(1.05);
  const recorded = useRef('');
  const versionId = detail?.version.id;
  useEffect(() => {
    if (!ready || !versionId) return;
    let active = true;
    void repo.getUnit(resourceId, versionId, unitId, audience).then(value => { if (active) { setUnit(value); setUnitError(''); } }).catch((cause: unknown) => { if (active) { setUnit(null); setUnitError(cause instanceof Error ? cause.message : '단원을 찾을 수 없습니다.'); } });
    return () => { active = false; };
  }, [ready, repo, resourceId, versionId, unitId, audience, db.revision]);
  useEffect(() => {
    if (!detail || !unit || unit.id !== unitId || unit.resourceVersionId !== detail.version.id) return;
    const asset = db.assets.find(item => item.resourceVersionId === detail.version.id && item.format === 'structured' && item.availability === 'available' && item.rights.allowView);
    if (!asset) return;
    const key = `${resourceId}/${detail.version.id}/${asset.id}/${unit.id}`;
    if (recorded.current === key) return;
    recorded.current = key;
    void repo.recordReadingPosition({ projectId: 'gugak-library', resourceId, resourceVersionId: detail.version.id, assetId: asset.id, pageNumber: null, unitId: unit.id, updatedAt: new Date().toISOString() }).catch((cause: unknown) => notify(cause instanceof Error ? cause.message : '읽던 위치를 저장하지 못했습니다.'));
  }, [detail, unit, unitId, resourceId, db.assets, repo, notify]);
  if (!detail) return <ReaderEmpty loading={loading} message={error} />;
  if (!unit || unit.id !== unitId || unit.resourceVersionId !== detail.version.id) return <ReaderEmpty loading={!unitError} message={unitError} />;
  const asset = db.assets.find(item => item.resourceVersionId === detail.version.id && item.format === 'structured' && item.availability === 'available' && item.rights.allowView);
  if (!asset) return <ReaderEmpty message="이 판본의 읽기 자산이 준비되지 않았거나 열람이 보류되었습니다." />;
  const index = detail.units.findIndex(item => item.id === unit.id);
  const previous = detail.units[index - 1];
  const next = detail.units[index + 1];
  const currentUrl = unitHref(resourceId, detail.version.id, unit.id, audience, returnPath);
  const mappedApps = db.apps.filter(app => unit.appLinkIds.includes(app.id));
  return <><nav className="breadcrumb" aria-label="현재 위치"><Link href={returnPath}>{returnPath.startsWith('/bookmarks') ? '책갈피' : '자료실'}</Link><ChevronRight size={14} /><Link href={detailHref(resourceId, detail.version.id, audience, returnPath)}>{detail.resource.title}</Link><ChevronRight size={14} /><span>편집 단원 {index + 1}</span></nav><div className="reader-layout"><aside className="reader-toc"><details open><summary>이 책의 목차</summary><p className="muted">판본 {detail.version.version} · {detail.units.length}개 단원</p><ol className="unit-list">{detail.units.map((item, itemIndex) => <li key={item.id}><Link className="unit-link" aria-current={item.id === unit.id ? 'page' : undefined} href={unitHref(resourceId, detail.version.id, item.id, audience, returnPath)}><span className="unit-number">{String(itemIndex + 1).padStart(2, '0')}</span><span>{item.title}</span></Link></li>)}</ol></details><p className="notice">합성 시연 자료<br />실제 음악 교육 내용과 원문 승인을 대신하지 않습니다.</p><Link className="button ghost" href={detailHref(resourceId, detail.version.id, audience, returnPath)}><ArrowLeft size={16} />책 정보</Link></aside><div className="stack"><div className="reader-controls"><span className="muted">편집 단원 {index + 1} / {detail.units.length}</span><div className="row"><button className="button ghost" aria-label="본문 글자 작게" disabled={scale <= 0.95} onClick={() => setScale(value => Math.max(0.95, value - 0.1))}>가 −</button><button className="button ghost" aria-label="본문 글자 크게" disabled={scale >= 1.55} onClick={() => setScale(value => Math.min(1.55, value + 0.1))}>가 ＋</button><BookmarkButton detail={detail} unitId={unit.id} /><PrintButton detail={detail} audience={audience} /></div></div><article className={`reader-paper${detail.version.rights.allowPrint && asset.rights.allowPrint ? '' : ' print-restricted'}`}><PrintProvenance detail={detail} /><p className="eyebrow">{instrumentName(detail.resource.instrument)} · 편집 단원 {String(index + 1).padStart(2, '0')}</p><h1>{unit.title}</h1><VersionBadges resource={detail.resource} version={detail.version} /><hr />{unit.blocks.length ? unit.blocks.map((block, blockIndex) => <SafeBlock key={block.id} block={block} index={blockIndex} scale={scale} />) : <p className="empty">이 단원에는 아직 구조화된 본문이 없습니다.</p>}<div className="notice"><ShieldCheck size={18} /><p>이 화면은 구조화 단원 보기입니다. PDF 파일을 열거나 변환하지 않았습니다. 원문·악기형·기보·검수 범위는 아래 자료 정보에서 확인하세요.</p></div></article><nav className="reader-nav" aria-label="단원 이동">{previous ? <Link className="button secondary" href={unitHref(resourceId, detail.version.id, previous.id, audience, returnPath)}><ArrowLeft size={16} /><span>이전 단원</span></Link> : <span className="muted">첫 번째 단원입니다</span>}{next ? <Link className="button" href={unitHref(resourceId, detail.version.id, next.id, audience, returnPath)}><span>다음 단원</span><ArrowRight size={16} /></Link> : <Link className="button secondary" href={detailHref(resourceId, detail.version.id, audience, returnPath)}>목차로 돌아가기<Check size={16} /></Link>}</nav><section className="panel stack"><h2>수업으로 이어가기</h2><p className="muted">단원을 현재 판본으로 담고, 연결 상태가 확인된 자료를 살펴보세요.</p><div className="row" style={{ flexWrap: 'wrap' }}><AddToPlan detail={detail} unit={unit} /><Link className="button secondary" href={`/practice?from=${encodeURIComponent(currentUrl)}`}>연습실 보기<ArrowRight size={16} /></Link><IssueDialog detail={detail} unit={unit} /></div>{mappedApps.length ? mappedApps.map(app => <div className="notice" key={app.id}><strong>{app.title}</strong><p>{app.purpose}</p>{canUseApp(app, detail.resource, detail.version) && validateAppUrl(app.url).valid ? <><a className="button secondary" href={validateAppUrl(app.url).url!} target="_blank" rel="noopener noreferrer">외부 도구 열기<ExternalLink size={15} /><span className="sr-only"> (새 탭)</span></a><p className="muted">새 탭에서 열립니다. 이용 후 이 탭으로 돌아오면 현재 판본과 단원을 이어볼 수 있습니다. 앱 열기를 학습 완료로 기록하지 않습니다.</p></> : <><button className="button secondary" disabled>연결 준비 중</button><p className="muted">내용·악기형·권한 확인이 끝나지 않아 실행할 수 없습니다.</p></>}</div>) : <p className="notice">이 단원에 검증된 외부 연습 도구가 연결되지 않았습니다. 연결 준비 중입니다.</p>}</section><details className="panel reader-meta"><summary>원문 위치와 검수·권리 확인</summary><SourceInfo detail={detail} /></details></div></div></>;
}

export function BookmarksPage() {
  const { db, repo, ready, run } = useLibrary();
  const [details, setDetails] = useState<Record<string, Detail | null>>({});
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    void Promise.all(db.bookmarks.map(async item => { const resource = db.resources.find(value => value.id === item.resourceId); const key = `${item.resourceId}/${item.versionId}`; try { return [key, await repo.getResource(item.resourceId, item.versionId, resource?.datasetKind === 'synthetic_demo' ? 'demo' : 'public')] as const; } catch { return [key, null] as const; } })).then(items => { if (active) { setDetails(Object.fromEntries(items)); setLoaded(true); } });
    return () => { active = false; };
  }, [ready, repo, db.revision, db.bookmarks, db.resources]);
  return <><header className="page-heading"><div><p className="eyebrow">MY READING SHELF</p><h1>나의 책갈피</h1><p>다시 보고 싶은 자료와 단원을 판본 그대로 모아두세요.</p></div></header><div className="toolbar"><span>북마크 {db.bookmarks.length}개</span><Link className="button secondary" href="/library"><Search size={16} />자료 더 찾아보기</Link></div>{!ready || !loaded ? <p className="panel" role="status">책갈피와 판본 상태를 확인하고 있어요.</p> : db.bookmarks.length === 0 ? <section className="empty panel"><Bookmark size={36} /><h2>아직 저장한 책갈피가 없어요</h2><p>자료 상세 또는 단원에서 북마크를 누르면 여기에 모입니다.</p><Link href="/library" className="button">자료실 둘러보기<ArrowRight size={16} /></Link></section> : <div className="grid-3">{db.bookmarks.map(item => { const resource = db.resources.find(value => value.id === item.resourceId); const detail = details[`${item.resourceId}/${item.versionId}`]; const audience: Audience = resource?.datasetKind === 'synthetic_demo' ? 'demo' : 'public'; const available = Boolean(detail && resource && visibleResource(db, resource, audience, item.versionId) && (!item.unitId || detail.units.some(unit => unit.id === item.unitId))); const unit = detail?.units.find(value => value.id === item.unitId); return <article className="panel stack" key={`${item.resourceId}/${item.versionId}/${item.unitId}`}><span className="badge">{resource ? instrumentName(resource.instrument) : '자료 미확인'}</span><h2>{resource?.title || '찾을 수 없는 자료'}</h2><p>{unit?.title || (item.unitId ? '저장한 단원' : '책 전체')}</p><p className="muted">저장 판본: {detail?.version.version || item.versionId}</p>{!available && <p className="notice">이 판본은 보류·비공개 상태이거나 더 이상 열 수 없습니다. 책갈피는 그대로 보관됩니다.</p>}<div className="row" style={{ flexWrap: 'wrap' }}>{available ? <Link className="button" href={item.unitId ? unitHref(item.resourceId, item.versionId, item.unitId, audience, '/bookmarks') : detailHref(item.resourceId, item.versionId, audience, '/bookmarks')}>저장한 판본 열기<ArrowRight size={16} /></Link> : <button className="button secondary" disabled>열람 제한</button>}<button className="button ghost" onClick={() => run(() => repo.toggleBookmark(item.resourceId, item.versionId, item.unitId), '책갈피를 해제했습니다.')} aria-label={`${resource?.title || '자료'} ${unit?.title || ''} 책갈피 해제`}>해제</button></div></article>; })}</div>}<RecentReadings /></>;
}

function RecentReadings() {
  const { db, repo, ready } = useLibrary();
  const [details, setDetails] = useState<Record<string, Detail | null>>({});
  const [loaded, setLoaded] = useState(false);
  const recent = [...db.positions].filter(position => position.projectId === 'gugak-library').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    const positions = [...db.positions].filter(position => position.projectId === 'gugak-library').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
    void Promise.all(positions.map(async position => {
      const resource = db.resources.find(item => item.id === position.resourceId);
      const key = `${position.resourceId}/${position.resourceVersionId}/${position.assetId}`;
      try { return [key, await repo.getResource(position.resourceId, position.resourceVersionId, resource?.datasetKind === 'synthetic_demo' ? 'demo' : 'public')] as const; }
      catch { return [key, null] as const; }
    })).then(items => { if (active) { setDetails(Object.fromEntries(items)); setLoaded(true); } });
    return () => { active = false; };
  }, [ready, repo, db.revision, db.positions, db.resources]);
  return <section className="stack" style={{ marginTop: 40 }} aria-labelledby="recent-reading-title"><div><h2 id="recent-reading-title">최근 읽은 자료</h2><p className="muted">최근 열어 본 자료 6개까지 표시합니다. 읽던 판본과 단원을 그대로 보관합니다.</p></div>{!ready || !loaded ? <p role="status">최근 읽던 위치를 확인하고 있어요.</p> : recent.length === 0 ? <p className="panel muted">아직 읽기 기록이 없습니다. 단원을 열면 읽던 위치가 여기에 표시됩니다.</p> : <ol className="unit-list">{recent.map(position => {
    const key = `${position.resourceId}/${position.resourceVersionId}/${position.assetId}`;
    const detail = details[key];
    const resource = db.resources.find(item => item.id === position.resourceId);
    const version = db.versions.find(item => item.id === position.resourceVersionId && item.resourceId === position.resourceId);
    const asset = db.assets.find(item => item.id === position.assetId && item.resourceVersionId === position.resourceVersionId);
    const audience: Audience = resource?.datasetKind === 'synthetic_demo' ? 'demo' : 'public';
    const unit = detail?.units.find(item => item.id === position.unitId);
    const available = Boolean(detail && resource && visibleResource(db, resource, audience, position.resourceVersionId) && asset?.availability === 'available' && asset.rights.allowView && (!position.unitId || unit));
    const reason = !resource || !version ? '저장한 자료 또는 판본을 찾을 수 없습니다.' : resource.publicationState === 'on_hold' || asset?.availability === 'on_hold' ? '재검토를 위해 열람이 보류된 자료입니다.' : resource.publishedVersionId !== position.resourceVersionId ? '저장 판본이 현재 공개 판본과 다릅니다. 판본을 자동 변경하지 않았습니다.' : '저장 판본의 권리·공개 상태 또는 읽기 자산을 확인해야 합니다.';
    const path = position.unitId ? unitHref(position.resourceId, position.resourceVersionId, position.unitId, audience, '/bookmarks') : detailHref(position.resourceId, position.resourceVersionId, audience, '/bookmarks');
    const href = `${path}&asset=${encodeURIComponent(position.assetId)}${position.pageNumber !== null ? `&page=${position.pageNumber}` : ''}`;
    return <li className="panel" key={key}><article className="stack"><div className="row" style={{ justifyContent: 'space-between' }}><span className="badge">{resource ? instrumentName(resource.instrument) : '자료 미확인'}</span><time className="muted" dateTime={position.updatedAt}>{new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' }).format(new Date(position.updatedAt))}</time></div><h3>{detail?.resource.title || version?.resourceSnapshot?.title || resource?.title || '찾을 수 없는 자료'}</h3><p className="muted">저장 판본 {version?.version || position.resourceVersionId} · {unit?.title || (position.unitId ? '저장한 단원' : position.pageNumber !== null ? `${position.pageNumber}페이지` : '저장한 읽기 위치')}</p>{available ? <Link className="button secondary" href={href} aria-label={`${detail?.resource.title} 저장한 위치에서 이어읽기`}>저장한 위치에서 이어읽기<ArrowRight size={16} /></Link> : <><p className="notice">{reason} 읽기 기록은 그대로 보관됩니다.</p><button className="button secondary" disabled>저장한 위치 열람 제한</button></>}</article></li>;
  })}</ol>}</section>;
}

export function PracticePage() {
  const { db, ready } = useLibrary();
  const params = useSearchParams();
  const from = params.get('from');
  const returnPath = from && /^\/library\/[^/?#]+\/units\/[^/?#]+\?/.test(from) && !from.includes('//') ? from : null;
  const [family, setFamily] = useState('전체');
  const filtered = instruments.filter(item => family === '전체' || item.family === family);
  const activeApps = db.apps.filter(app => db.resources.some(resource => { const version = db.versions.find(item => item.id === resource.publishedVersionId); return version && visibleResource(db, resource, resource.datasetKind === 'synthetic_demo' ? 'demo' : 'public', version.id) && canUseApp(app, resource, version); }));
  return <><header className="page-heading"><div><p className="eyebrow">PRACTICE ROOM</p><h1>배움과 연습을 잇는 공간</h1><p>악기 자료군에 맞는 도구를 확인하고, 읽던 단원으로 돌아가세요.</p></div></header>{returnPath && <Link href={returnPath} className="button secondary"><ArrowLeft size={16} />읽던 판본·단원으로 돌아가기</Link>}<div className="notice" style={{ marginBlock: 24 }}><ShieldCheck size={20} /><div><strong>현재 실행 가능한 국악 연습 앱 {activeApps.length}개</strong><p>실제 문서에서 관찰한 후보와 준비 항목을 구분했습니다. 실행·내용·악기형·개인정보 확인이 끝나기 전에는 외부 도구를 열지 않습니다.</p></div></div><div className="toolbar"><div className="tabs" role="group" aria-label="연습 자료군 분류">{['전체', '현악', '관악', '타악', '묶음'].map(value => <button className={`button ${family === value ? '' : 'ghost'}`} key={value} aria-pressed={family === value} onClick={() => setFamily(value)}>{value}</button>)}</div><span className="muted"><SlidersHorizontal size={15} /> {filtered.length}개 자료군</span></div>{!ready ? <p role="status">연습 도구 확인 상태를 불러오고 있어요.</p> : <div className="grid-3">{filtered.map(item => { const apps = db.apps.filter(app => app.instruments.includes(item.id)); const candidate = apps.find(app => app.status === 'unchecked' && app.url !== null && app.scope === 'mvp_candidate'); const verified = activeApps.some(app => app.instruments.includes(item.id)); return <article className="practice-card panel stack" key={item.id}><div className="row" style={{ justifyContent: 'space-between' }}><span className="practice-icon" style={{ background: `${item.color}15`, color: item.color }} aria-hidden="true">{item.name.slice(0, 1)}</span><span className="badge">{verified ? '단원 연결 확인' : candidate ? '후보 · 미점검' : '연결 준비 중'}</span></div><div><p className="eyebrow">{item.english}</p><h2>{item.name}</h2></div><p className="muted">{verified ? '연결 조건을 충족한 도구가 있습니다. 호환되는 단원에서 악기형과 목표를 확인한 뒤 열어 주세요.' : candidate ? `${candidate.title} — 문서에서 관찰된 후보입니다. 음악 내용·악기형 호환성과 권한 확인이 필요합니다.` : '검증된 전용 도구가 아직 연결되지 않았습니다. 자료와 맞는 도구를 확인한 뒤 제공합니다.'}</p><p className="muted">악기형: 미확인<br />이 시연은 권한을 요청하지 않음<br />외부 앱의 필요 권한은 미확인</p><button className="button secondary" disabled aria-label={`${item.name} 연습 도구 ${verified ? '단원 선택 필요' : '연결 준비 중'}`}>{verified ? '관련 단원에서 연결 확인' : candidate ? '후보 검토 중' : '연결 준비 중'}</button><Link href={`/library?instrument=${item.id}`} className="button ghost">관련 자료 살펴보기<ChevronRight size={15} /></Link></article>; })}</div>}</>;
}
