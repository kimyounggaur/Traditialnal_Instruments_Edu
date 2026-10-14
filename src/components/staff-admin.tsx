'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ArrowRight, ClipboardList, Download, ExternalLink, History, Plus, RotateCcw, Save, Search, ShieldCheck, Upload, X } from 'lucide-react';
import { useLibrary } from './provider';
import { ResourceEditor } from './staff-resource-editor';
import { instruments, type ReviewIssue, type ReviewState } from '@/domain/types';
import { resourceForVersion, canPublish, unresolvedMajorIssues } from '@/domain/visibility';
import { MAX_BACKUP_BYTES, type ResourceDetail, type IssueUpdate } from '@/repositories';
export { AdminApps } from './staff-apps';

const reviewNames: Record<ReviewState, string> = { draft: '초안', in_review: '검수 중', changes_requested: '수정 요청', re_review: '재검수', approved: '승인', rejected: '반려' };
const rightsNames: Record<string, string> = { unknown: '권리 미확인', pending: '권리 확인 중', cleared: '권리 확인', restricted: '이용 제한' };
const issueNames: Record<string, string> = { open: '미처리', fixed: '수정 완료 · 재확인 전', verified: '재확인 완료', dismissed: '사유 기록 후 기각' };
const categoryNames: Record<string, string> = { music: '음악 내용', pedagogy: '교육', safety: '안전', rights: '권리', other: '기타' };
const instrumentName = (id: string) => instruments.find(item => item.id === id)?.name ?? id;
const safeSource = (value: string) => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && ['drive.google.com', 'docs.google.com'].includes(url.hostname) ? url.href : null; } catch { return null; } };

export function AdminNav() {
  return <nav className="toolbar no-print" aria-label="관리 도구"><div className="row"><Link className="button secondary" href="/admin/resources">자료 편집</Link><Link className="button secondary" href="/admin/sources">원자료 인벤토리</Link><Link className="button secondary" href="/admin/apps">앱 연결 관리</Link><Link className="button secondary" href="/admin/issues">오류 신고</Link></div></nav>;
}

function AdminNotice() {
  return <p className="notice">이 화면은 브라우저에 저장되는 로컬 관리 시연입니다. 역할 선택은 로그인이나 서버 접근 권한이 아닙니다. 실제 음악·권리 승인은 생성하지 않으며, 원자료는 비공개 상태로 보존합니다.</p>;
}

function BackupPanel() {
  const { db, repo, run, role } = useLibrary();
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [filename, setFilename] = useState('');
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function exportBackup() {
    setBusy(true); setError('');
    const output = await run(() => repo.exportData());
    if (typeof output === 'string') {
      const url = URL.createObjectURL(new Blob([output], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = `gugak-library-backup-${new Date().toISOString().slice(0, 10)}.json`; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else setError('백업을 만들지 못했습니다. 저장 상태를 확인해 주세요.');
    setBusy(false);
  }
  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    setError(''); setText(''); setFilename('');
    if (file.size > MAX_BACKUP_BYTES) { setError('JSON 백업은 2MB 이하여야 합니다.'); event.target.value = ''; return; }
    try { const contents = await file.text(); setText(contents); setFilename(file.name); setRevision(db.revision); } catch { setError('파일을 읽지 못했습니다. 다른 파일을 선택해 주세요.'); }
    event.target.value = '';
  }
  async function importBackup() {
    if (!text || !window.confirm(`${filename}의 합성 시연 자료와 저장 기록을 가져옵니다. 현재 자료와 병합하며 실제 원자료는 변경하지 않습니다. 진행할까요?`)) return;
    setBusy(true); setError('');
    const result = await run(async () => { await repo.importData(text, revision); return true; }, '합성 시연 백업을 병합했습니다. 원자료와 승인 판본은 보호됩니다.');
    if (result) { setText(''); setFilename(''); } else setError('가져오기를 완료하지 못했습니다. 기존 자료와 선택한 파일은 보존됩니다. 화면 안내를 확인해 주세요.');
    setBusy(false);
  }
  async function reset() {
    if (!window.confirm('이 브라우저에 저장한 수업안·책갈피·편집·검수 시연 기록을 초기 상태로 되돌립니다. 필요하면 먼저 JSON 백업을 내려받으세요. 초기화할까요?')) return;
    setBusy(true); await run(() => repo.reset(), '이 브라우저의 국악 도서관 시연 자료를 초기화했습니다.'); setBusy(false);
  }
  return <details className="panel"><summary>로컬 백업 · 가져오기 · 초기화</summary><div className="stack" style={{ marginTop: 18 }}><p className="muted">합성 자료와 사용자가 만든 수업안을 JSON으로 관리합니다. 원문·내려받기 불가 본문은 제외하며, 크기·스키마·참조·유해 문자열·판본 충돌을 검사합니다.</p><div className="row"><button className="button secondary" onClick={exportBackup} disabled={busy}><Download size={16} />JSON 백업</button><button className="button secondary" onClick={() => input.current?.click()} disabled={busy || role !== 'editor'}><Upload size={16} />JSON 파일 선택</button><button className="button danger" onClick={reset} disabled={busy || role !== 'editor'}><RotateCcw size={16} />시연 초기화</button><input ref={input} type="file" accept=".json,application/json" aria-label="JSON 백업 파일" hidden onChange={selectFile} /></div>{role !== 'editor' && <p className="muted">가져오기와 초기화는 상단에서 편집 관리자 역할을 선택한 후 사용할 수 있습니다.</p>}{filename && <div className="notice"><p>선택한 파일: {filename} · 아직 반영하지 않았습니다.</p><button className="button" disabled={busy || role !== 'editor'} onClick={importBackup}>검사 후 가져오기</button><button className="button ghost" onClick={() => { setText(''); setFilename(''); }}>선택 취소</button></div>}{error && <p className="error" role="alert">{error}</p>}</div></details>;
}

export function AdminResources() {
  const { db, ready, role } = useLibrary();
  const [kind, setKind] = useState('demo');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const resources = db.resources.filter(resource => kind === 'all' || (kind === 'demo' ? resource.datasetKind === 'synthetic_demo' : resource.datasetKind !== 'synthetic_demo')).filter(resource => { const version = db.versions.find(item => item.id === resource.currentDraftVersionId); const metadata = version ? resourceForVersion(resource, version) : resource; return `${metadata.title} ${instrumentName(resource.instrument)}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()); });
  const realApproved = db.resources.filter(resource => { const version = db.versions.find(item => item.id === resource.publishedVersionId); return version && canPublish(version, resource, db.issues); }).length;
  return <div className="stack"><header className="page-heading"><div><p className="eyebrow">EDITORIAL WORKSPACE</p><h1>자료 편집 관리</h1><p>원문을 보존하면서 편집 초안과 판본을 관리합니다.</p></div><span className="badge">실제 승인 공개자료 {realApproved}건</span></header><AdminNav /><AdminNotice /><div className="toolbar"><div className="tabs" role="group" aria-label="관리 자료 구분">{[['demo', '합성 시연'], ['source', '실제 원자료'], ['all', '전체']].map(([value, label]) => <button key={value} className={kind === value ? 'active' : ''} aria-pressed={kind === value} onClick={() => setKind(value)}>{label}</button>)}</div><label className="search-box"><Search size={17} /><input aria-label="관리 자료 검색" placeholder="자료명 또는 자료군 검색" value={query} onChange={event => setQuery(event.target.value)} /></label></div>{!ready ? <p role="status">자료를 불러오고 있어요.</p> : <div className="table-wrap"><table><caption className="sr-only">관리 자료 목록</caption><thead><tr><th>자료 · 자료군</th><th>초안 판본</th><th>검수 · 권리</th><th>공개 상태</th><th>작업</th></tr></thead><tbody>{resources.map(resource => { const version = db.versions.find(item => item.id === resource.currentDraftVersionId); if (!version) return null; const current = resourceForVersion(resource, version); return <tr key={resource.id}><td><strong>{current.title}</strong><p className="muted">{instrumentName(resource.instrument)} · {resource.datasetKind === 'synthetic_demo' ? '합성 시연' : '실제 원자료 · 본문 미탑재'}</p></td><td>{version.version}<p className="muted">수정 {version.revision}회</p></td><td>{reviewNames[version.reviewState]}<p className="muted">{rightsNames[version.rights.state]}</p></td><td>{resource.publicationState === 'published' ? '공개' : resource.publicationState === 'on_hold' ? '보류' : '비공개'}</td><td><div className="row"><button className="button secondary" disabled={role !== 'editor'} onClick={() => setEditing(resource.id)} aria-label={`${instrumentName(resource.instrument)} ${resource.datasetKind === 'synthetic_demo' ? '편집' : '메타데이터 편집'}`}>{resource.datasetKind === 'synthetic_demo' ? '편집' : '메타데이터 편집'}</button><Link className="button ghost" href={`/admin/reviews/${resource.id}`}>판본·검수<ArrowRight size={14} /></Link></div></td></tr>; })}</tbody></table>{resources.length === 0 && <p className="empty">검색 조건에 맞는 자료가 없습니다.</p>}</div>}<p className="muted">실제 원자료는 메타데이터 초안만 편집하며 원본 파일·본문·승인은 변경하지 않습니다. 승인·반려된 합성 자료를 편집하면 새 초안 판본이 만들어집니다.</p><BackupPanel />{editing && <ResourceEditor resourceId={editing} onClose={() => setEditing(null)} />}</div>;
}

export function AdminSources() {
  const { db, ready } = useLibrary();
  const [selected, setSelected] = useState<string | null>(null);
  const totalSlides = db.sources.reduce((sum, source) => sum + (source.slideCount ?? 0), 0);
  const source = db.sources.find(item => item.id === selected);
  const slides = db.sourceSlides.filter(item => item.sourceDocumentId === selected);
  return <div className="stack"><header className="page-heading"><div><p className="eyebrow">SOURCE INVENTORY</p><h1>원자료 인벤토리</h1><p>원본 PPTX의 파일명·위치·확인 범위를 보존합니다.</p></div></header><AdminNav /><AdminNotice /><div className="grid-3"><div className="panel"><span className="muted">실제 원자료</span><h2>PPTX {db.sources.length}개</h2></div><div className="panel"><span className="muted">확인한 원본 슬라이드</span><h2>{totalSlides}장</h2></div><div className="panel"><span className="muted">앱에 탑재된 원문 본문</span><h2>{db.sourceSlides.length}개</h2></div></div><p className="notice">원본 슬라이드 {totalSlides}장은 교육 레슨 수나 승인 교재 수가 아닙니다. 추출된 원문은 권리 확인 전 앱 본문에 포함하지 않았습니다. 실제 음악 승인과 권리 허락은 별도 검토가 필요합니다.</p>{!ready ? <p role="status">원자료 목록을 불러오고 있어요.</p> : <div className="table-wrap"><table><caption className="sr-only">실제 PPTX 원자료 목록</caption><thead><tr><th>자료군 · 원본 파일명</th><th>원본 슬라이드</th><th>확인 상태</th><th>권리</th><th>확인</th></tr></thead><tbody>{db.sources.map(item => <tr key={item.id}><td><strong>{instrumentName(item.instrumentId)}</strong><p className="muted">{item.originalName}</p></td><td>{item.slideCount === null ? '미확인' : `${item.slideCount}장`}</td><td>{item.extractionState === 'text_extracted' ? '텍스트 추출 기록 있음' : item.extractionState === 'visual_checked' ? '시각검토 기록 있음' : item.extractionState === 'failed' ? '추출 실패' : '메타데이터 확인'}<p className="muted">{item.extractionState === 'visual_checked' ? '검토 범위 별도 확인 필요' : '시각검토 필요'} · 앱 본문 미탑재</p></td><td>{rightsNames[item.rightsState]}</td><td><button className="button secondary" onClick={() => setSelected(item.id)} aria-label={`${instrumentName(item.instrumentId)} 원자료 정보`}>정보 보기</button></td></tr>)}</tbody></table></div>}{source && <section className="panel stack" aria-label="선택한 원자료 상세"><div className="row" style={{ justifyContent: 'space-between' }}><h2>{source.originalName}</h2><button className="button ghost" onClick={() => setSelected(null)}><X size={16} />닫기</button></div><dl className="info-table"><div><dt>원본 파일 ID</dt><dd><code>{source.driveFileId}</code></dd></div><div><dt>형식</dt><dd>{source.mimeType}</dd></div><div><dt>크기</dt><dd>{source.byteSize === null ? '미확인' : `${source.byteSize.toLocaleString()} bytes`}</dd></div><div><dt>SHA-256</dt><dd><code>{source.sha256 || '미확인'}</code></dd></div><div><dt>연결한 앱 본문</dt><dd>{slides.length}개</dd></div><div><dt>편집 단원 매핑</dt><dd>{db.editorialUnits.filter(unit => unit.sourceSlideIds.some(id => slides.some(slide => slide.id === id))).length}개 · 매핑 0건이면 원문 대조 전 상태</dd></div></dl>{safeSource(source.originalUrl) && <a className="button secondary" href={safeSource(source.originalUrl)!} target="_blank" rel="noopener noreferrer">원본 파일 위치<ExternalLink size={16} /><span className="sr-only"> (외부 사이트, 새 탭)</span></a>}<div className="grid-2"><div className="panel"><h3>원문 · 읽기 전용</h3><p className="muted">{slides.length ? '등록된 원문을 원본 위치와 대조합니다.' : '권리 미확인 원문 본문은 앱에 넣지 않았습니다. 원본은 변경하지 않았습니다.'}</p>{slides.map(slide => <div key={slide.id}><p>원본 슬라이드 {slide.slideNumber}</p><p style={{ whiteSpace: 'pre-wrap' }}>{slide.originalText}</p></div>)}</div><div className="panel"><h3>편집본 · 연결 대기</h3><p className="muted">원문 슬라이드와 편집 단원은 별도 기록입니다. 현재 실제 원문 매핑과 전문가 내용 검수는 완료되지 않았습니다. 가상의 목차나 악기 정보를 원문으로 만들지 않습니다.</p></div></div></section>}</div>;
}

export function ReviewPage({ resourceId }: { resourceId: string }) {
  const { db, repo, ready } = useLibrary();
  const [versionId, setVersionId] = useState('');
  const [detail, setDetail] = useState<ResourceDetail | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { if (!ready) return; let active = true; void repo.getResource(resourceId, versionId || undefined, 'admin').then(value => { if (active) { setDetail(value); setError(''); } }).catch((cause: unknown) => { if (active) { setDetail(null); setError(cause instanceof Error ? cause.message : '판본을 열 수 없습니다.'); } }); return () => { active = false; }; }, [ready, repo, resourceId, versionId, db.revision]);
  if (!detail) return <div className="stack"><AdminNav /><h1>판본·검수 관리</h1><p className={error ? 'error' : 'panel'} role={error ? 'alert' : 'status'}>{error || '판본을 불러오고 있어요.'}</p></div>;
  const versions = db.versions.filter(item => item.resourceId === resourceId);
  const events = db.events.filter(item => item.resourceId === resourceId && item.versionId === detail.version.id);
  const issues = db.issues.filter(item => item.resourceId === resourceId && item.versionId === detail.version.id);
  return <div className="stack"><header className="page-heading"><div><p className="eyebrow">VERSION & REVIEW</p><h1>판본·검수 관리</h1><p>{detail.resource.title}</p></div><span className="badge">{detail.resource.datasetKind === 'synthetic_demo' ? '합성 승인 시연' : '실제 원자료 · 승인 보류'}</span></header><AdminNav /><AdminNotice /><label className="field">확인할 판본<select value={versionId || detail.version.id} onChange={event => setVersionId(event.target.value)}>{versions.map(version => <option key={version.id} value={version.id}>판본 {version.version} · {reviewNames[version.reviewState]} · 수정 {version.revision}회{version.id === detail.resource.currentDraftVersionId ? ' (현재 초안)' : ''}{version.id === detail.resource.publishedVersionId ? ' (공개 참조)' : ''}</option>)}</select></label><div className="grid-3"><div className="panel"><span className="muted">검수 상태</span><h2>{reviewNames[detail.version.reviewState]}</h2><p className="muted">판본 {detail.version.version} · 수정 {detail.version.revision}회</p></div><div className="panel"><span className="muted">권리 상태</span><h2>{rightsNames[detail.version.rights.state]}</h2><p className="muted">열람 {detail.version.rights.allowView ? '허용' : '불가'} · 인쇄 {detail.version.rights.allowPrint ? '허용' : '불가'}</p></div><div className="panel"><span className="muted">미해결 중대·안전 지적</span><h2>{unresolvedMajorIssues(detail.version, db.issues).length}건</h2><p className="muted">해결·별도 재확인·재승인이 필요합니다.</p></div></div><ReviewActions key={detail.version.id} detail={detail} onNewDraft={() => setVersionId('')} /><section className="panel stack"><h2>원문·판본 정보</h2><p>현재 변경 요약: {detail.version.changeSummary}</p><p>검수 범위: {detail.version.reviewScope || '미등록'}</p><p>승인 근거: {detail.version.approvalEvidenceRef || '없음'}</p><p className="muted">승인 담당: {detail.version.approvedBy || '없음'} · 승인 기록: {detail.version.approvedAt || '없음'}</p><ul>{detail.resource.sourceRefs.map(source => <li key={source.id}>{source.title} · 원문 페이지 {source.pageRange || '미확인'}</li>)}</ul><p className="muted">악기형: {detail.version.gugakContext.variant.value || '미확인'} · 조율: {detail.version.gugakContext.tuning.value || '미확인'} · 음역: {detail.version.gugakContext.soundingRange.value || '미확인'}</p></section><section className="panel stack"><div className="row" style={{ justifyContent: 'space-between' }}><h2>이 판본의 지적 {issues.length}건</h2><IssueReportForm detail={detail} /></div>{issues.length ? issues.map(issue => <IssueCard key={issue.id} issue={issue} />) : <p className="muted">등록된 지적이 없습니다. 지적이 없다는 사실은 전문 검수가 끝났다는 뜻이 아닙니다.</p>}</section><section className="panel stack"><h2><History size={20} /> 판본 이력</h2><p className="muted">로컬 이벤트를 추가 기록하며, 서버의 보안 감사 증거가 아닙니다.</p>{events.length ? <ol className="unit-list">{[...events].reverse().map(event => <li className="progress-step" key={event.id}><strong>{reviewNames[event.from]} → {reviewNames[event.to]}</strong><p>{event.reason}</p><p className="muted">{event.role} · {event.actorId} · {event.at} · 수정 {event.snapshotRevision}</p></li>)}</ol> : <p className="muted">아직 검수·변경 이력이 없습니다.</p>}</section></div>;
}

function ReviewActions({ detail, onNewDraft }: { detail: ResourceDetail; onNewDraft: () => void }) {
  const { repo, run, role } = useLibrary();
  const [reason, setReason] = useState('');
  const [scope, setScope] = useState(detail.version.reviewScope || '');
  const [evidence, setEvidence] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const demo = detail.resource.datasetKind === 'synthetic_demo';
  const current = detail.resource.currentDraftVersionId === detail.version.id;
  const state = detail.version.reviewState;
  async function transition(target: ReviewState) {
    if (!demo || !reason.trim()) { setError(demo ? '처리 사유를 입력해 주세요.' : '실제 원자료는 이 시연에서 승인하지 않습니다.'); return; }
    setBusy(true); setError('');
    const result = await run(() => repo.transitionReview({ resourceId: detail.resource.id, versionId: detail.version.id, target, actorId: role === 'reviewer' ? 'demo-reviewer-a' : 'demo-editor', role: role === 'reviewer' ? 'reviewer' : 'editor', reason: reason.trim(), reviewScope: scope.trim(), evidenceRef: evidence.trim() || undefined }, detail.version.revision), '합성 자료의 검수 상태를 기록했습니다. 실제 음악 승인으로 집계하지 않습니다.');
    if (!result) setError('상태를 변경하지 못했습니다. 검수 범위·지적 응답·승인 근거와 현재 역할을 확인해 주세요.');
    setBusy(false);
  }
  async function newDraft() {
    if (!reason.trim()) { setError('새 초안의 변경 요약을 처리 사유에 입력해 주세요.'); return; }
    setBusy(true); const result = await run(() => repo.updateResource(detail.resource.id, { changeSummary: reason.trim() }, detail.version.revision), '기존 승인·반려 판본을 보존하고 새 초안을 만들었습니다.'); setBusy(false); if (result) onNewDraft();
  }
  async function publish() {
    setBusy(true); setError(''); const result = await run(() => repo.publishResource(detail.resource.id, detail.version.id, detail.version.revision), '검수·권리 조건을 확인하여 합성 시연 판본을 공개했습니다.'); if (!result) setError('공개 조건을 충족하지 못했습니다. 권리, 승인, 중대 지적과 재승인 이력을 확인해 주세요.'); setBusy(false);
  }
  return <section className="panel stack"><h2>검수 절차</h2><p className="muted">초안 → 검수 요청 → 수정 요청 → 재검수 → 승인 또는 반려. 승인·반려 이후 편집은 새 초안에서 진행합니다.</p>{!demo && <p className="notice">실제 원자료의 음악 승인·공개 변경은 잠겨 있습니다. 메타데이터 초안과 권리 검토 메모는 편집할 수 있습니다. 음악 전문가와 권리 책임자의 실제 검토 근거를 준비해야 합니다.</p>}{demo && <p className="notice">가상 검수자 A로 절차만 시연합니다. 실제 검수자의 이름·서명·승인일을 생성하지 않습니다.</p>}<div className="form-grid"><label className="field">처리 사유 · 변경 요약<textarea value={reason} onChange={event => setReason(event.target.value)} rows={3} maxLength={1000} placeholder="이번 처리의 이유 또는 수정 내용을 기록하세요." /></label><label className="field">검수 범위<textarea value={scope} onChange={event => setScope(event.target.value)} rows={3} maxLength={1000} placeholder="악기형 / 조율 / 음역 / 운지·주법 / 장단 / 기보 / 교육 / 안전 중 확인 범위를 명시하세요." /></label></div><label className="field">승인 근거 · 합성 시연용<input value={evidence} onChange={event => setEvidence(event.target.value)} maxLength={1000} placeholder="실제 전문가 증빙과 구분되는 시연 근거를 직접 입력하세요." /></label><div className="row"><button className="button secondary" onClick={() => setEditing(true)} disabled={!current || role !== 'editor' || busy}>{demo ? '초안 내용 편집' : '메타데이터 초안 편집'}</button>{state === 'draft' && <button className="button" onClick={() => transition('in_review')} disabled={!demo || role !== 'editor' || busy}>검수 요청</button>}{state === 'changes_requested' && <button className="button" onClick={() => transition('re_review')} disabled={!demo || role !== 'editor' || busy}>재검수 요청</button>}{['in_review', 're_review'].includes(state) && <><button className="button secondary" onClick={() => transition('changes_requested')} disabled={!demo || role !== 'reviewer' || busy}>수정 요청</button><button className="button" onClick={() => transition('approved')} disabled={!demo || role !== 'reviewer' || busy}>합성 승인 시연</button><button className="button danger" onClick={() => transition('rejected')} disabled={!demo || role !== 'reviewer' || busy}>반려</button></>}{['approved', 'rejected'].includes(state) && <button className="button secondary" onClick={newDraft} disabled={!demo || !current || role !== 'editor' || busy}><Plus size={16} />새 초안 판본</button>}<button className="button secondary" onClick={publish} disabled={!demo || state !== 'approved' || role !== 'editor' || busy}><ShieldCheck size={16} />이 판본 공개</button></div><p className="muted">현재 역할: {role === 'reviewer' ? '검수자' : role === 'editor' ? '편집 관리자' : '열람 역할'}. 요청·편집·공개는 편집 관리자, 승인·반려·재확인은 검수자 역할로 진행합니다. 권리 확인은 승인과 별개입니다.</p>{error && <p className="error" role="alert">{error}</p>}{editing && <ResourceEditor resourceId={detail.resource.id} onClose={() => { setEditing(false); onNewDraft(); }} />}</section>;
}

function IssueReportForm({ detail }: { detail: ResourceDetail }) {
  const { repo, run, role } = useLibrary();
  const dialog = useRef<HTMLDialogElement>(null);
  const [unitId, setUnitId] = useState(detail.units[0]?.id || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const unit = detail.units.find(item => item.id === unitId);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setBusy(true); setError('');
    const result = await run(() => repo.reportIssue({ resourceId: detail.resource.id, versionId: detail.version.id, unitId: unitId || null, blockId: String(data.get('blockId') || '') || null, category: String(data.get('category')) as ReviewIssue['category'], severity: String(data.get('severity')) as ReviewIssue['severity'], description: String(data.get('description') || '').trim(), evidence: String(data.get('evidence') || '').trim(), suggestion: String(data.get('suggestion') || '').trim() }), '합성 판본의 검수 지적을 기록했습니다.'); setBusy(false); if (result) { form.reset(); dialog.current?.close(); } else setError('지적을 저장하지 못했습니다. 위치·근거·수정 제안을 확인해 주세요.');
  }
  return <><button className="button secondary" disabled={detail.resource.datasetKind !== 'synthetic_demo' || !['editor', 'reviewer'].includes(role)} onClick={() => dialog.current?.showModal()}><Plus size={15} />지적 등록</button><dialog ref={dialog} className="modal" aria-labelledby="admin-issue-title"><form className="stack" onSubmit={submit}><div className="row" style={{ justifyContent: 'space-between' }}><h2 id="admin-issue-title">판본 검수 지적 등록</h2><button className="button ghost" type="button" onClick={() => dialog.current?.close()} aria-label="지적 등록 닫기"><X size={20} /></button></div><p className="muted">판본 {detail.version.version} · 파일·슬라이드는 근거란에 실제 확인한 위치만 입력하세요.</p><label className="field">편집 단원<select value={unitId} onChange={event => setUnitId(event.target.value)} required><option value="">단원 선택</option>{detail.units.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="field">블록<select name="blockId" key={unitId}><option value="">단원 전체</option>{unit?.blocks.map((block, index) => <option key={block.id} value={block.id}>블록 {index + 1} · {block.type}</option>)}</select></label><div className="form-grid"><label className="field">분류<select name="category"><option value="music">음악 내용</option><option value="pedagogy">교육</option><option value="safety">안전</option><option value="rights">권리</option><option value="other">기타</option></select></label><label className="field">심각도<select name="severity" defaultValue="minor"><option value="minor">경미</option><option value="major">주요</option><option value="critical">긴급</option></select></label></div><label className="field">문제 내용<textarea name="description" required maxLength={1000} /></label><label className="field">관찰 근거 · 원문 위치<textarea name="evidence" required maxLength={2000} /></label><label className="field">수정 제안<textarea name="suggestion" required maxLength={2000} /></label><p className="notice">주요·긴급 또는 안전 지적은 자료를 보류합니다. 학생 개인정보는 입력하지 마세요.</p>{error && <p className="error" role="alert">{error}</p>}<button className="button" disabled={busy}>지적 저장</button></form></dialog></>;
}

function IssueCard({ issue }: { issue: ReviewIssue }) {
  const { db, repo, run, role } = useLibrary();
  const [resolution, setResolution] = useState(issue.resolution || '');
  const [dismissal, setDismissal] = useState(issue.dismissalReason || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const resource = db.resources.find(item => item.id === issue.resourceId);
  const demo = resource?.datasetKind === 'synthetic_demo';
  async function update(status: IssueUpdate['status']) {
    setBusy(true); setError('');
    const result = await run(() => repo.updateIssue(issue.id, { status, resolution: resolution.trim(), dismissalReason: dismissal.trim(), actorRole: role === 'reviewer' ? 'reviewer' : 'editor' }), '지적 처리 상태를 기록했습니다. 공개와 재승인은 별도로 진행합니다.');
    setBusy(false); if (!result) setError('처리하지 못했습니다. 수정 내용·재확인 순서·기각 사유와 역할을 확인해 주세요.');
  }
  return <article className="panel stack"><div className="row"><span className="badge">{categoryNames[issue.category]} · {issue.severity === 'critical' ? '긴급' : issue.severity === 'major' ? '주요' : '경미'}</span><span className="badge">{issueNames[issue.status]}</span><span className="muted">{demo ? '합성 시연' : '실제 원자료 · 처리 보류'}</span></div><h3>{issue.description}</h3><p className="muted">{resource?.title || issue.resourceId} · 판본 {db.versions.find(item => item.id === issue.versionId)?.version || issue.versionId}</p><p className="muted">편집 단원: {issue.unitId || '자료 전체'} · 블록: {issue.blockId || '단원 전체'}</p><p>관찰 근거: {issue.evidence}</p><p>수정 제안: {issue.suggestion || '없음'}</p><div className="form-grid"><label className="field">수정 내용 · 재확인 근거<textarea value={resolution} onChange={event => setResolution(event.target.value)} maxLength={2000} placeholder="실제 수정과 확인한 내용을 기록하세요." /></label><label className="field">기각 사유<textarea value={dismissal} onChange={event => setDismissal(event.target.value)} maxLength={2000} placeholder="기각하는 경우 구체적인 근거가 필요합니다." /></label></div><div className="row"><button className="button secondary" disabled={!demo || busy || !['editor', 'reviewer'].includes(role) || issue.status !== 'open'} onClick={() => update('fixed')}><Save size={15} />수정 완료 기록</button><button className="button" disabled={!demo || busy || role !== 'reviewer' || issue.status !== 'fixed'} onClick={() => update('verified')}>검수자 재확인</button><button className="button ghost" disabled={!demo || busy || !['editor', 'reviewer'].includes(role) || ['verified', 'dismissed'].includes(issue.status) || role !== 'reviewer' && ['music', 'safety'].includes(issue.category) && ['critical', 'major'].includes(issue.severity)} onClick={() => update('dismissed')}>사유 기록 후 기각</button><Link className="button ghost" href={`/admin/reviews/${issue.resourceId}`}>판본 검수로 이동<ArrowRight size={15} /></Link></div><p className="muted">수정 완료와 검수자 재확인은 다릅니다. 재확인해도 보류가 자동 해제되거나 자료가 재공개되지 않습니다.</p>{error && <p className="error" role="alert">{error}</p>}</article>;
}

export function IssuesPage() {
  const { db, ready } = useLibrary();
  const [filter, setFilter] = useState('all');
  const issues = db.issues.filter(issue => filter === 'all' || issue.status === filter);
  return <div className="stack"><header className="page-heading"><div><p className="eyebrow">ISSUE REVIEW</p><h1>오류 신고와 재확인</h1><p>위치와 근거를 보존하고, 수정과 재확인을 구분합니다.</p></div><span className="badge">전체 {db.issues.length}건</span></header><AdminNav /><AdminNotice /><label className="field">처리 상태<select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">전체</option>{Object.entries(issueNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{!ready ? <p role="status">신고 내용을 불러오고 있어요.</p> : issues.length ? issues.map(issue => <IssueCard key={issue.id} issue={issue} />) : <section className="empty"><ClipboardList size={36} /><h2>표시할 지적이 없습니다</h2><p>자료 읽기 화면의 오류 신고 또는 판본 검수의 지적 등록에서 시작할 수 있습니다.</p><Link className="button secondary" href="/admin/resources">검수할 자료 찾기<ArrowRight size={15} /></Link></section>}</div>;
}
