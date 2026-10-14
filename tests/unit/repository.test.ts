import { describe, expect, it } from 'vitest';
import { createSeed } from '../../src/data/seed';
import { createRepository, STORAGE_KEY, type StorageLike } from '../../src/repositories';
import type { BookPosition, Database, ReviewIssue } from '../../src/domain/types';

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  writes = 0;
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.writes++; this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const issueInput = (severity: ReviewIssue['severity'] = 'major') => ({ resourceId: 'demo-gayageum', versionId: 'demo-gayageum-v1', unitId: 'demo-gayageum-u1', blockId: null, category: 'music' as const, severity, description: '시연 검수 오류 위치', evidence: '해당 합성 문구에서 관찰한 내용', suggestion: '합성 문구 확인 및 수정' });
const position = (pageNumber = 2): BookPosition => ({ projectId: 'gugak-library', resourceId: 'demo-gayageum', resourceVersionId: 'demo-gayageum-v1', assetId: 'asset-gayageum-structured', pageNumber, unitId: 'demo-gayageum-u2', updatedAt: '2026-10-14T12:00:00.000Z' });

describe('repository visibility and storage', () => {
  it('exposes fourteen synthetic books and no real public books, with private direct-ID reads blocked', async () => {
    const repo = createRepository(null);
    expect(await repo.listResources({}, 'demo')).toHaveLength(14);
    expect(await repo.listResources({}, 'public')).toHaveLength(0);
    expect(await repo.listResources({}, 'admin')).toHaveLength(28);
    await expect(repo.getResource('source-resource-gayageum', undefined, 'demo')).rejects.toMatchObject({ code: 'not_found' });
    await expect(repo.getResource('source-resource-gayageum', 'source-resource-gayageum-v1', 'public')).rejects.toMatchObject({ code: 'not_allowed' });
    const apps = await repo.listApps();
    expect(apps.every(app => app.url === null && !app.enabled)).toBe(true);
  });

  it('blocks direct resource and unit reads when the actual structured asset lacks view rights', async () => {
    const storage = new MemoryStorage();
    const seed = createSeed();
    seed.assets.find(asset => asset.id === 'asset-gayageum-structured')!.rights.allowView = false;
    storage.values.set(STORAGE_KEY, JSON.stringify(seed));
    const repo = createRepository(storage);
    expect(await repo.listResources({ instruments: ['gayageum'] })).toHaveLength(0);
    await expect(repo.getResource('demo-gayageum', 'demo-gayageum-v1')).rejects.toMatchObject({ code: 'not_allowed' });
    await expect(repo.getUnit('demo-gayageum', 'demo-gayageum-v1', 'demo-gayageum-u1')).rejects.toMatchObject({ code: 'not_allowed' });
  });

  it('waits for delayed restoration without overwriting existing data', async () => {
    const seed = createSeed();
    seed.plans[0].title = '이전 세션에서 작성한 제목';
    let complete: ((value: string | null) => void) | undefined;
    let writes = 0;
    const storage: StorageLike = { getItem: () => new Promise(resolve => { complete = resolve; }), setItem: () => { writes++; }, removeItem: () => undefined };
    const repo = createRepository(storage);
    const initializing = repo.init();
    expect(repo.snapshot().ready).toBe(false);
    expect(writes).toBe(0);
    complete!(JSON.stringify(seed));
    await initializing;
    expect(repo.snapshot().data.plans[0].title).toBe('이전 세션에서 작성한 제목');
    expect(writes).toBe(0);
  });

  it('preserves corrupted storage and displays a memory fallback warning', async () => {
    const storage = new MemoryStorage();
    storage.values.set(STORAGE_KEY, '{broken json');
    const repo = createRepository(storage);
    await repo.init();
    expect(repo.snapshot()).toMatchObject({ ready: true, storageMode: 'memory' });
    expect(repo.snapshot().warning).toContain('손상');
    await repo.toggleBookmark('demo-gayageum', 'demo-gayageum-v1');
    expect(storage.values.get(STORAGE_KEY)).toBe('{broken json');
    expect(repo.snapshot().data.bookmarks).toHaveLength(1);
  });

  it('keeps a quota-failed change in memory and never writes the classical key', async () => {
    const keys: string[] = [];
    const repo = createRepository({ getItem: () => null, setItem: key => { keys.push(key); throw new DOMException('Quota full', 'QuotaExceededError'); }, removeItem: () => undefined });
    await repo.toggleBookmark('demo-gayageum', 'demo-gayageum-v1');
    expect(repo.snapshot().data.bookmarks).toHaveLength(1);
    expect(repo.snapshot().warning).toContain('용량');
    expect(keys).toEqual([STORAGE_KEY]);
  });

  it('recovers corrupted storage only through an explicit reset and preserves other project keys', async () => {
    const storage = new MemoryStorage();
    storage.values.set(STORAGE_KEY, '{broken');
    storage.values.set('lesson-designer-library', 'classical content');
    const repo = createRepository(storage);
    await repo.init();
    expect(repo.snapshot().storageMode).toBe('memory');
    await repo.reset();
    expect(repo.snapshot().storageMode).toBe('persistent');
    expect(repo.snapshot().warning).toBeNull();
    expect(JSON.parse(storage.values.get(STORAGE_KEY)!).schemaVersion).toBe(1);
    expect(storage.values.get('lesson-designer-library')).toBe('classical content');
  });

  it('checks the persisted revision across two repositories and prevents overwriting a concurrent edit', async () => {
    const storage = new MemoryStorage();
    const first = createRepository(storage), second = createRepository(storage);
    await Promise.all([first.init(), second.init()]);
    const plan = (await first.read()).plans[0];
    await first.saveLessonPlan({ ...plan, title: '첫 창의 변경' }, 0);
    await expect(second.saveLessonPlan({ ...plan, title: '오래된 창의 변경' }, 0)).rejects.toMatchObject({ code: 'conflict' });
    expect(second.snapshot().data.plans.find(item => item.id === plan.id)?.title).toBe('첫 창의 변경');
  });

  it('serializes simultaneous writes and accepts only one update of a given revision', async () => {
    const storage = new MemoryStorage();
    const first = createRepository(storage), second = createRepository(storage);
    await Promise.all([first.init(), second.init()]);
    const plan = (await first.read()).plans[0];
    const results = await Promise.allSettled([
      first.saveLessonPlan({ ...plan, title: '동시 변경 하나' }, 0),
      second.saveLessonPlan({ ...plan, title: '동시 변경 둘' }, 0),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
    const failure = results.find(result => result.status === 'rejected');
    expect(failure?.status === 'rejected' && failure.reason.code).toBe('conflict');
  });

  it('persists bookmarks and exact version/asset/page positions and rejects out of range pages', async () => {
    const storage = new MemoryStorage();
    const repo = createRepository(storage);
    await repo.toggleBookmark('demo-gayageum', 'demo-gayageum-v1', 'demo-gayageum-u2');
    const saved = await repo.recordReadingPosition(position());
    const restored = createRepository(storage);
    await restored.init();
    expect(restored.snapshot().data.positions[0]).toEqual(saved);
    expect(restored.snapshot().data.bookmarks[0].unitId).toBe('demo-gayageum-u2');
    await expect(restored.recordReadingPosition(position(3))).rejects.toMatchObject({ code: 'validation_error' });
    expect(restored.snapshot().data.positions).toHaveLength(1);
  });
});

describe('repository commands and immutable versions', () => {
  it('saves all fourteen instrument lesson plans, maintains totals, and rejects time mismatch', async () => {
    const repo = createRepository(null);
    const seed = await repo.read();
    for (const plan of seed.plans) {
      const saved = await repo.saveLessonPlan(plan, 0, `save-${plan.id}`);
      expect(saved.revision).toBe(1);
    }
    const plan = (await repo.read()).plans[0];
    await expect(repo.saveLessonPlan({ ...plan, durationMinutes: 45 }, 1)).rejects.toMatchObject({ code: 'validation_error' });
    expect((await repo.read()).plans[0].durationMinutes).toBe(40);
  });

  it('deduplicates a repeated command, including after reload', async () => {
    const storage = new MemoryStorage();
    const repo = createRepository(storage);
    const plan = (await repo.read()).plans[0];
    await repo.saveLessonPlan({ ...plan, title: '한 번만 저장' }, 0, 'same-save');
    await repo.saveLessonPlan({ ...plan, title: '한 번만 저장' }, 0, 'same-save');
    const restored = createRepository(storage);
    const replayed = await restored.saveLessonPlan(plan, 0, 'same-save');
    expect(replayed.revision).toBe(1);
    expect(replayed.title).toBe('한 번만 저장');
    expect((await restored.read()).commandIds.filter(id => id === 'same-save')).toHaveLength(1);
  });

  it('preserves approved content and pinned lesson versions when creating a new draft', async () => {
    const repo = createRepository(null);
    await repo.transitionReview({ resourceId: 'demo-gayageum', versionId: 'demo-gayageum-v1', target: 'in_review', actorId: 'demo-editor', role: 'editor', reason: '합성 시연 검토', reviewScope: '합성 인터페이스 문구' }, 0);
    const approved = await repo.transitionReview({ resourceId: 'demo-gayageum', versionId: 'demo-gayageum-v1', target: 'approved', actorId: 'demo-reviewer', role: 'reviewer', reason: '합성 흐름 승인 시연', evidenceRef: 'demo-evidence' }, 1);
    const original = await repo.getResource('demo-gayageum');
    const edited = await repo.updateResource('demo-gayageum', { title: '새 판본 제목', sourceRefs: [{ id: 'demo-revised-source', title: '새 판본 출처 시연', url: null, chapter: null, pageRange: null }], changeSummary: '중립 문구 수정', blocks: [{ id: 'new-neutral-block', type: 'paragraph', text: '개정한 중립 시연 문구' }] }, approved.revision);
    expect(edited.version.id).not.toBe(approved.id);
    expect(edited.version).toMatchObject({ reviewState: 'draft', approvedBy: null, approvedAt: null, approvalEvidenceRef: null, basedOnVersionId: approved.id });
    const state = await repo.read();
    expect(state.versions.find(version => version.id === approved.id)).toEqual(approved);
    expect(state.units.filter(unit => original.version.unitIds.includes(unit.id))).toEqual(original.units);
    expect(state.plans[0].activities[0].resources[0].versionId).toBe(approved.id);
    const stillPublished = await repo.getResource('demo-gayageum');
    expect(stillPublished.version.id).toBe(approved.id);
    expect(stillPublished.resource.title).toBe(original.resource.title);
    expect(stillPublished.resource.sourceRefs).toEqual(original.resource.sourceRefs);
    const draft = await repo.getResource('demo-gayageum', edited.version.id, 'admin');
    expect(draft.resource.title).toBe('새 판본 제목');
    expect(draft.resource.sourceRefs[0].id).toBe('demo-revised-source');
  });

  it('halts direct reads for major issues, keeps fixed and verified distinct, and does not republish automatically', async () => {
    const repo = createRepository(null);
    await repo.toggleBookmark('demo-gayageum', 'demo-gayageum-v1');
    const issue = await repo.reportIssue(issueInput(), 'major-report');
    await expect(repo.getResource('demo-gayageum', issue.versionId)).rejects.toMatchObject({ code: 'not_allowed' });
    await expect(repo.updateIssue(issue.id, { status: 'verified', actorRole: 'reviewer' })).rejects.toMatchObject({ code: 'not_allowed' });
    await repo.updateIssue(issue.id, { status: 'fixed', resolution: '문구 수정 완료 주장', actorRole: 'editor' });
    await expect(repo.updateIssue(issue.id, { status: 'verified', actorRole: 'editor' })).rejects.toMatchObject({ code: 'not_allowed' });
    await repo.updateIssue(issue.id, { status: 'verified', actorRole: 'reviewer' });
    await expect(repo.getResource('demo-gayageum', issue.versionId)).rejects.toMatchObject({ code: 'not_allowed' });
    expect(await repo.toggleBookmark('demo-gayageum', 'demo-gayageum-v1')).toBe(false);
    expect((await repo.getLessonPlan('plan-gayageum')).activities[0].resources[0].versionId).toBe(issue.versionId);
  });

  it('blocks source approval even with a simulated reviewer and evidence', async () => {
    const repo = createRepository(null);
    const resourceId = 'source-resource-gayageum', versionId = `${resourceId}-v1`;
    await repo.transitionReview({ resourceId, versionId, target: 'in_review', actorId: 'demo-editor', role: 'editor', reason: '원자료 검토 요청', reviewScope: '음악 및 권리' }, 0);
    await expect(repo.transitionReview({ resourceId, versionId, target: 'approved', actorId: 'demo-reviewer', role: 'reviewer', reason: '가상 검수', evidenceRef: 'demo-evidence' }, 1)).rejects.toMatchObject({ code: 'validation_error' });
    expect(await repo.listResources({}, 'public')).toHaveLength(0);
  });

  it('resumes a held structured asset only after verification, approval, and explicit publication', async () => {
    const repo = createRepository(null);
    const issue = await repo.reportIssue(issueInput());
    await repo.updateIssue(issue.id, { status: 'fixed', resolution: '중립 시연 문구 확인 완료', actorRole: 'editor' });
    await repo.updateIssue(issue.id, { status: 'verified', actorRole: 'reviewer' });
    const held = (await repo.read()).assets.find(asset => asset.id === 'asset-gayageum-structured');
    expect(held?.availability).toBe('on_hold');
    await repo.transitionReview({ resourceId: issue.resourceId, versionId: issue.versionId, target: 'in_review', actorId: 'demo-editor', role: 'editor', reason: '지적 확인 이후 검수 요청', reviewScope: '합성 문구' }, 0);
    const approved = await repo.transitionReview({ resourceId: issue.resourceId, versionId: issue.versionId, target: 'approved', actorId: 'demo-reviewer', role: 'reviewer', reason: '지적 확인 이후 별도 승인 시연', evidenceRef: 'demo-evidence' }, 1);
    expect((await repo.read()).assets.find(asset => asset.id === held?.id)?.availability).toBe('on_hold');
    await repo.publishResource(issue.resourceId, issue.versionId, approved.revision);
    const published = await repo.read();
    expect(published.assets.find(asset => asset.id === held?.id)?.availability).toBe('available');
    expect(published.assets.find(asset => asset.id === 'asset-gayageum-pdf')?.availability).toBe('missing');
    expect((await repo.getResource(issue.resourceId)).version.id).toBe(issue.versionId);
  });

  it('blocks printing separately from view permission and strips denied references from printable plans', async () => {
    const repo = createRepository(null);
    const detail = await repo.getResource('demo-gayageum');
    await repo.updateResource(detail.resource.id, { rights: { ...detail.version.rights, allowPrint: false }, changeSummary: '출력 권리 제한 시연' }, detail.version.revision);
    await expect(repo.getPrintableResource(detail.resource.id, detail.version.id)).rejects.toMatchObject({ code: 'not_allowed' });
    const printable = await repo.getPrintablePlan('plan-gayageum');
    expect(printable.excludedReferences).toHaveLength(3);
    expect(printable.plan.activities.every(activity => activity.resources.length === 0)).toBe(true);
  });

  it('prints permitted structured content even when its separate PDF is missing', async () => {
    const repo = createRepository(null);
    const printable = await repo.getPrintablePlan('plan-gayageum');
    expect(printable.excludedReferences).toHaveLength(0);
    expect(printable.plan.activities[0].resources[0].versionId).toBe('demo-gayageum-v1');
    expect((await repo.getPrintableResource('demo-gayageum', 'demo-gayageum-v1')).units).toHaveLength(2);
  });

  it('rejects unsafe and incomplete app activation without changing candidate metadata', async () => {
    const repo = createRepository(null);
    const app = (await repo.read()).apps[0];
    await expect(repo.updateApp({ ...app, url: 'javascript:alert(1)' }, app.revision)).rejects.toMatchObject({ code: 'validation_error' });
    await expect(repo.updateApp({ ...app, enabled: true, status: 'available' }, app.revision)).rejects.toMatchObject({ code: 'not_allowed' });
    expect((await repo.read()).apps[0]).toEqual(app);
  });
});

describe('repository import and mutation isolation', () => {
  it('returns detached reads and frozen snapshots without mutating seed or raw sources', async () => {
    const repo = createRepository(null);
    const before = createSeed();
    const read = await repo.read();
    read.sources[0].originalName = '변경 시도';
    expect((await repo.read()).sources[0]).toEqual(before.sources[0]);
    expect(Object.isFrozen(repo.snapshot().data.sources[0])).toBe(true);
    const detail = await repo.getResource('demo-gayageum');
    await repo.updateResource('demo-gayageum', { title: '바뀐 합성 제목', changeSummary: '제목 수정' }, detail.version.revision);
    expect((await repo.read()).sources).toEqual(before.sources);
    expect(createSeed().resources[0].title).toBe(before.resources[0].title);
  });

  it('edits real source resource metadata as a private draft while preserving original source records and references', async () => {
    const repo = createRepository(null);
    const before = await repo.read();
    const resourceId = 'source-resource-gayageum';
    const original = await repo.getResource(resourceId, undefined, 'admin');
    const updated = await repo.updateResource(resourceId, {
      title: '검토를 위한 메타데이터 수정',
      objectives: ['편집 검토 목표 초안'],
      changeSummary: '원자료를 바꾸지 않는 메타데이터 초안 수정',
    }, original.version.revision);
    expect(updated.resource.title).toBe('검토를 위한 메타데이터 수정');
    const admin = await repo.getResource(resourceId, undefined, 'admin');
    expect(admin.resource.objectives).toEqual(['편집 검토 목표 초안']);
    expect(admin.resource.sourceRefs).toEqual(original.resource.sourceRefs);
    expect(admin.resource).toMatchObject({ publicationState: 'private', datasetKind: 'source_unreviewed', publishedVersionId: null });
    expect(admin.version.reviewState).toBe('draft');
    expect(admin.units).toHaveLength(0);
    const after = await repo.read();
    expect(after.sources).toEqual(before.sources);
    expect(after.sourceSlides).toEqual(before.sourceSlides);
    expect(after.resources.find(resource => resource.id === resourceId)?.sourceRefs).toEqual(original.resource.sourceRefs);
    await expect(repo.getResource(resourceId, admin.version.id, 'public')).rejects.toMatchObject({ code: 'not_allowed' });
  });

  it('exports no restricted original content and restores plans while preserving existing text', async () => {
    const repo = createRepository(null);
    const plan = (await repo.read()).plans[0];
    await repo.saveLessonPlan({ ...plan, title: '백업된 수업안' }, 0);
    const exported = await repo.exportData();
    const data = JSON.parse(exported) as Database;
    expect(data.sourceSlides).toEqual([]);
    expect(data.resources.every(resource => resource.datasetKind === 'synthetic_demo')).toBe(true);
    expect(data.units.every(unit => unit.blocks.length === 0)).toBe(true);
    const fresh = createRepository(null);
    await fresh.importData(exported);
    expect((await fresh.getLessonPlan(plan.id)).title).toBe('백업된 수업안');
    expect((await fresh.getResource('demo-gayageum')).units[0].blocks.length).toBeGreaterThan(0);
    expect((await fresh.read()).sources).toHaveLength(14);
    expect((await fresh.read()).resources).toHaveLength(28);
  });

  it('rejects corrupted, oversized, unsafe, foreign-key invalid, and source-tampered imports atomically', async () => {
    const repo = createRepository(null);
    const baseline = await repo.read();
    const exported = JSON.parse(await repo.exportData()) as Database;
    await expect(repo.importData('{')).rejects.toMatchObject({ code: 'validation_error' });
    await expect(repo.importData(' '.repeat(2 * 1024 * 1024 + 1))).rejects.toMatchObject({ code: 'validation_error' });
    const unsafe = structuredClone(exported); unsafe.plans[0].title = '<script>alert(1)</script>';
    await expect(repo.importData(JSON.stringify(unsafe))).rejects.toMatchObject({ code: 'validation_error' });
    const invalid = structuredClone(exported); invalid.plans[0].activities[0].resources[0].versionId = 'missing-version';
    await expect(repo.importData(JSON.stringify(invalid))).rejects.toMatchObject({ code: 'validation_error' });
    const tampered = structuredClone(exported); tampered.sources[0].originalName = '변조된 원본.pptx';
    await expect(repo.importData(JSON.stringify(tampered))).rejects.toMatchObject({ code: 'not_allowed' });
    expect(await repo.read()).toEqual(baseline);
  });
});
