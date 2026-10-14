import { createSeed } from '../data/seed';
import { databaseSchema } from '../domain/schemas';
import { canPublish, demoVisible, resourceForVersion, resourceMetadata, visibleResource } from '../domain/visibility';
import { searchResources } from '../domain/search';
import { transitionReview as applyReviewTransition } from '../domain/review-machine';
import { validateLessonPlan } from '../domain/lesson-plan';
import { canUseApp, validateAppUrl } from '../domain/url-policy';
import type { AppLink, Audience, BookPosition, Database, EditorialUnit, LessonPlan, ReadingPosition, Resource, ResourceQuery, ResourceVersion, ReviewIssue, Unit } from '../domain/types';
import { RepositoryError, type IssueUpdate, type RepositoryReviewCommand, type RepositorySnapshot, type ResourceDetail, type ResourcePatch } from './contracts';
import { assertBackupSize, browserStorage, clone, containsUnsafeText, freeze, STORAGE_KEY, withStorageLock, type StorageLike } from './local-storage';

const now = () => new Date().toISOString();
const identifier = (prefix: string) => `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
const assert: (condition: unknown, code: ConstructorParameters<typeof RepositoryError>[0], message: string) => asserts condition = (condition, code, message) => {
  if (!condition) throw new RepositoryError(code, message);
};

/** Browser-local simulation only. Role selection is not an authentication boundary. */
export class GugakRepository {
  private data: Database = clone(createSeed());
  private state: RepositorySnapshot = freeze({ data: clone(this.data), ready: false, warning: null, storageMode: 'memory' });
  private storage: StorageLike | null = null;
  private listeners = new Set<() => void>();
  private initializing: Promise<void> | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private warning: string | null = null;

  constructor(private readonly suppliedStorage?: StorageLike | null) {}

  snapshot = (): RepositorySnapshot => this.state;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit(ready = true) {
    this.state = freeze({ data: clone(this.data), ready, warning: this.warning, storageMode: this.storage ? 'persistent' : 'memory' });
    this.listeners.forEach(listener => listener());
  }

  private memoryWarning(message: string) {
    this.storage = null;
    this.warning = message;
  }

  private parse(value: string): Database {
    assertBackupSize(value);
    const parsed: unknown = JSON.parse(value);
    assert(!containsUnsafeText(parsed), 'validation_error', '실행 가능한 문자열 또는 허용되지 않는 속성이 포함되어 있습니다.');
    return databaseSchema.parse(parsed) as Database;
  }

  init(): Promise<void> {
    if (this.initializing) return this.initializing;
    this.initializing = (async () => {
      try {
        this.storage = this.suppliedStorage === undefined ? browserStorage() : this.suppliedStorage;
        if (this.storage) {
          const existing = await this.storage.getItem(STORAGE_KEY);
          if (existing !== null) this.data = this.parse(existing);
        }
      } catch {
        this.memoryWarning('저장 자료를 읽을 수 없거나 손상되었습니다. 원래 저장값을 덮어쓰지 않고 이번 세션의 메모리에서 계속합니다.');
      }
      // Never save a seed during startup. The pending restore has now completed.
      this.emit();
    })();
    return this.initializing;
  }

  async read(): Promise<Database> { await this.init(); return clone(this.data); }

  private async fresh(): Promise<void> {
    if (!this.storage) return;
    try {
      const existing = await this.storage.getItem(STORAGE_KEY);
      if (existing !== null) {
        const latest = this.parse(existing);
        if (JSON.stringify(latest) !== JSON.stringify(this.data)) {
          this.data = latest;
          this.emit();
        }
      }
    } catch {
      this.memoryWarning('브라우저 저장소 접근이 중단되었습니다. 이번 세션의 변경은 메모리에만 남습니다.');
      this.emit();
    }
  }

  private mutate<T>(commandId: string | undefined, operation: (db: Database, repeated: boolean) => T): Promise<T> {
    const task = this.queue.catch(() => undefined).then(async () => {
      await this.init();
      return withStorageLock(this.storage, async () => {
      await this.fresh();
      const draft = clone(this.data);
      const repeated = Boolean(commandId && draft.commandIds.includes(commandId));
      const result = operation(draft, repeated);
      if (repeated) return clone(result);
      draft.revision += 1;
      if (commandId) draft.commandIds.push(commandId);
      const valid = databaseSchema.parse(draft) as Database;
      // Memory is authoritative after quota/privacy failure; keep the screen usable.
      this.data = valid;
      if (this.storage) {
        try { await this.storage.setItem(STORAGE_KEY, JSON.stringify(valid)); }
        catch { this.memoryWarning('브라우저 저장에 실패했습니다(용량 또는 접근 제한). 변경은 이번 세션의 메모리에만 저장됩니다. JSON 백업을 내려받으세요.'); }
      }
      this.emit();
      return clone(result);
      });
    });
    this.queue = task;
    return task.catch(error => {
      if (error instanceof RepositoryError) throw error;
      throw new RepositoryError('validation_error', error instanceof Error ? error.message : '입력값을 확인해 주세요.');
    });
  }

  private detail(db: Database, id: string, versionId: string | undefined, audience: Audience): ResourceDetail {
    const resource = db.resources.find(item => item.id === id);
    assert(resource, 'not_found', '자료를 찾을 수 없습니다.');
    const selectedId = versionId ?? (audience === 'admin' ? resource.currentDraftVersionId : resource.publishedVersionId);
    const version = db.versions.find(item => item.id === selectedId && item.resourceId === id);
    assert(version, 'not_found', '요청한 판본을 찾을 수 없습니다.');
    assert(visibleResource(db, resource, audience, version.id), 'not_allowed', resource.publicationState === 'on_hold' ? '검토를 위해 보류된 자료입니다. 기존 교안의 판본은 자동 변경하지 않습니다.' : '이 판본은 검수·권리·공개 조건을 충족하지 않았습니다.');
    return { resource, version, units: db.units.filter(unit => version.unitIds.includes(unit.id)).sort((a, b) => a.order - b.order) };
  }

  async listResources(query: ResourceQuery = {}, audience: Audience = 'demo'): Promise<Resource[]> {
    await this.init();
    const resources = this.data.resources.filter(resource => visibleResource(this.data, resource, audience)).map(resource => {
      const version = this.data.versions.find(item => item.id === (audience === 'admin' ? resource.currentDraftVersionId : resource.publishedVersionId));
      return version ? resourceForVersion(resource, version) : resource;
    });
    return clone(searchResources(resources, query));
  }

  async getResource(id: string, versionId?: string, audience: Audience = 'demo'): Promise<ResourceDetail> {
    await this.init();
    const detail = this.detail(this.data, id, versionId, audience);
    return clone({ ...detail, resource: resourceForVersion(detail.resource, detail.version) });
  }

  async getUnit(resourceId: string, versionId: string, unitId: string, audience: Audience = 'demo'): Promise<Unit> {
    const detail = await this.getResource(resourceId, versionId, audience);
    const unit = detail.units.find(item => item.id === unitId);
    assert(unit, 'not_found', '이 판본에 해당 단원이 없습니다.');
    return clone(unit);
  }

  async getPrintableResource(resourceId: string, versionId: string, audience: Audience = 'demo'): Promise<ResourceDetail> {
    assert(audience !== 'admin', 'not_allowed', '관리자 메타데이터 보기는 출력 권한이 아닙니다.');
    const detail = await this.getResource(resourceId, versionId, audience);
    const assets = this.data.assets.filter(asset => asset.resourceVersionId === versionId && asset.format === 'structured');
    assert(detail.version.rights.allowPrint && assets.length > 0 && assets.every(asset => asset.rights.allowPrint && asset.availability === 'available'), 'not_allowed', '해당 판본 또는 자산의 인쇄 권한이 없습니다.');
    return detail;
  }

  async listApps(audience: Audience = 'demo'): Promise<AppLink[]> {
    await this.init();
    if (audience === 'admin') return clone(this.data.apps);
    // Disabled cards are metadata-only and have no executable URL in reader queries.
    return clone(this.data.apps.map(app => ({ ...app, url: this.data.resources.some(resource => {
      const version = this.data.versions.find(item => item.id === (resource.publishedVersionId ?? resource.currentDraftVersionId));
      return version && visibleResource(this.data, resource, audience, version.id) && canUseApp(app, resource, version);
    }) ? app.url : null })));
  }

  async getLessonPlan(id: string, audience: Audience = 'demo'): Promise<LessonPlan> {
    await this.init();
    const plan = this.data.plans.find(item => item.id === id);
    assert(plan, 'not_found', '수업안을 찾을 수 없습니다.');
    assert(audience !== 'public' || !plan.isDemo, 'not_allowed', '합성 수업안은 시연 모드에서만 열 수 있습니다.');
    if (audience === 'public') for (const activity of plan.activities) for (const ref of activity.resources) {
      const detail = this.detail(this.data, ref.resourceId, ref.versionId, 'public');
      assert(detail.units.some(unit => unit.id === ref.unitId), 'not_allowed', '공개할 수 없는 단원 참조가 포함되어 있습니다.');
    }
    return clone(plan);
  }

  saveLessonPlan(plan: LessonPlan, expectedRevision: number, commandId?: string): Promise<LessonPlan> {
    return this.mutate(commandId, (db, repeated) => {
      const index = db.plans.findIndex(item => item.id === plan.id);
      const current = db.plans[index];
      if (repeated && current) return current;
      assert(current ? current.revision === expectedRevision : expectedRevision === 0, 'conflict', '다른 창에서 수업안이 바뀌었습니다. 새로고침하거나 복제본으로 보관하세요.');
      const errors = validateLessonPlan(plan, db);
      assert(errors.length === 0, 'validation_error', errors.join('\n'));
      assert(!containsUnsafeText(plan), 'validation_error', '실행 가능한 문자열을 입력할 수 없습니다.');
      for (const activity of plan.activities) for (const ref of activity.resources) {
        const detail = this.detail(db, ref.resourceId, ref.versionId, plan.isDemo ? 'demo' : 'public');
        assert(detail.units.some(unit => unit.id === ref.unitId), 'validation_error', '수업안의 단원과 판본 연결을 확인하세요.');
      }
      const saved = { ...clone(plan), revision: (current?.revision ?? 0) + 1, updatedAt: now() };
      if (index < 0) db.plans.push(saved); else db.plans[index] = saved;
      return saved;
    });
  }

  deleteLessonPlan(id: string, expectedRevision: number, commandId?: string): Promise<void> {
    return this.mutate(commandId, (db, repeated) => {
      if (repeated) return;
      const current = db.plans.find(plan => plan.id === id);
      assert(current, 'not_found', '수업안을 찾을 수 없습니다.');
      assert(current.revision === expectedRevision, 'conflict', '수업안이 변경되었습니다. 최신 내용을 확인한 뒤 삭제하세요.');
      db.plans = db.plans.filter(plan => plan.id !== id);
    });
  }

  duplicateLessonPlan(id: string, commandId?: string): Promise<LessonPlan> {
    const copyId = commandId ? `plan-copy-${commandId}` : identifier('plan');
    return this.mutate(commandId, (db, repeated) => {
      if (repeated) {
        const existing = db.plans.find(plan => plan.id === copyId);
        assert(existing, 'not_found', '복제한 수업안이 삭제되었습니다.');
        return existing;
      }
      const source = db.plans.find(plan => plan.id === id);
      assert(source, 'not_found', '원본 수업안을 찾을 수 없습니다.');
      const result = { ...clone(source), id: copyId, title: `${source.title} (복사)`, revision: 1, updatedAt: now() };
      db.plans.push(result);
      return result;
    });
  }

  async getPrintablePlan(id: string): Promise<{ plan: LessonPlan; excludedReferences: string[] }> {
    const plan = await this.getLessonPlan(id);
    const excludedReferences: string[] = [];
    for (const activity of plan.activities) {
      activity.resources = activity.resources.filter(ref => {
        try {
          const detail = this.detail(this.data, ref.resourceId, ref.versionId, plan.isDemo ? 'demo' : 'public');
          const assets = this.data.assets.filter(asset => asset.resourceVersionId === ref.versionId && asset.format === 'structured');
          const allowed = detail.version.rights.allowPrint && assets.length > 0 && assets.every(asset => asset.rights.allowPrint && asset.availability === 'available');
          if (allowed) return true;
        } catch { /* Rights are checked again at the print command boundary. */ }
        excludedReferences.push(`${ref.resourceId} / ${ref.versionId} / ${ref.unitId}`);
        return false;
      });
    }
    return { plan, excludedReferences };
  }

  toggleBookmark(resourceId: string, versionId: string, unitId: string | null = null, commandId?: string): Promise<boolean> {
    return this.mutate(commandId, (db, repeated) => {
      const index = db.bookmarks.findIndex(item => item.resourceId === resourceId && item.versionId === versionId && item.unitId === unitId);
      if (repeated) return index >= 0;
      if (index >= 0) { db.bookmarks.splice(index, 1); return false; }
      const detail = this.detail(db, resourceId, versionId, db.resources.find(item => item.id === resourceId)?.datasetKind === 'synthetic_demo' ? 'demo' : 'public');
      assert(!unitId || detail.units.some(unit => unit.id === unitId), 'validation_error', '북마크 단원이 판본과 일치하지 않습니다.');
      db.bookmarks.push({ resourceId, versionId, unitId });
      return true;
    });
  }

  recordReadingPosition(input: BookPosition | ReadingPosition, commandId?: string): Promise<BookPosition> {
    return this.mutate(commandId, (db, repeated) => {
      const versionId = 'resourceVersionId' in input ? input.resourceVersionId : input.versionId;
      const detail = this.detail(db, input.resourceId, versionId, db.resources.find(item => item.id === input.resourceId)?.datasetKind === 'synthetic_demo' ? 'demo' : 'public');
      const asset = db.assets.find(item => 'assetId' in input ? item.id === input.assetId && item.resourceVersionId === versionId : item.resourceVersionId === versionId && item.format === 'structured');
      assert(asset && asset.availability === 'available' && asset.rights.allowView, 'not_allowed', '지금 열 수 있는 읽기 자산이 없습니다.');
      const position: BookPosition = 'projectId' in input ? clone(input) : { projectId: 'gugak-library', resourceId: input.resourceId, resourceVersionId: versionId, assetId: asset.id, pageNumber: null, unitId: input.unitId, updatedAt: now() };
      assert(position.projectId === 'gugak-library', 'validation_error', '다른 프로젝트의 읽기 위치는 저장할 수 없습니다.');
      assert(position.unitId === null || detail.units.some(unit => unit.id === position.unitId), 'validation_error', '단원과 판본이 일치하지 않습니다.');
      assert(position.pageNumber === null || (Number.isInteger(position.pageNumber) && position.pageNumber >= 1 && asset.pageCount !== null && position.pageNumber <= asset.pageCount), 'validation_error', '페이지 번호가 실제 자산 범위를 벗어났습니다.');
      const index = db.positions.findIndex(item => item.resourceId === position.resourceId && item.resourceVersionId === versionId && item.assetId === asset.id);
      if (repeated && index >= 0) return db.positions[index];
      position.updatedAt = now();
      if (index >= 0) db.positions[index] = position; else db.positions.push(position);
      return position;
    });
  }

  updateResource(id: string, patch: ResourcePatch, expectedRevision: number, commandId?: string): Promise<ResourceDetail> {
    return this.mutate(commandId, (db, repeated) => {
      const detail = this.detail(db, id, undefined, 'admin');
      if (repeated) return { ...detail, resource: resourceForVersion(detail.resource, detail.version) };
      assert(detail.version.revision === expectedRevision, 'conflict', '다른 창에서 판본을 수정했습니다. 최신 버전을 확인하세요.');
      assert(!containsUnsafeText(patch), 'validation_error', '실행 가능한 코드나 링크를 저장할 수 없습니다.');
      assert(patch.changeSummary?.trim(), 'validation_error', '변경 요약을 입력하세요.');
      const { rights, gugakContext, reviewScope, changeSummary, units: editedUnits, blocks, ...metadata } = patch;
      const forbidden = Object.keys(metadata).filter(key => !['title', 'description', 'level', 'objectives', 'topics', 'instrumentSystem', 'kind', 'estimatedMinutes', 'notationKinds', 'jangdanNames', 'sourceRefs'].includes(key));
      assert(forbidden.length === 0, 'not_allowed', '승인·공개·원자료 필드는 편집 명령으로 변경할 수 없습니다.');
      const current = detail.version;
      const priorReviewState = current.reviewState;
      const originalAppLinks = detail.units.map(unit => [...unit.appLinkIds]);
      // Old local saves may lack a snapshot; capture metadata before the first edit.
      if (!current.resourceSnapshot) current.resourceSnapshot = resourceMetadata(detail.resource);
      let version = current;
      let units = detail.units;
      if (['approved', 'rejected'].includes(current.reviewState)) {
        const newId = identifier(`${id}-version`);
        const newUnits = units.map(unit => ({ ...clone(unit), id: identifier(`${id}-unit`), resourceVersionId: newId }));
        const unitMapping = new Map(units.map((unit, index) => [unit.id, newUnits[index].id]));
        version = { ...clone(current), id: newId, version: `${Number.parseInt(current.version, 10) + 1 || 2}.0`, basedOnVersionId: current.id, reviewState: 'draft', revision: 1, createdAt: now(), unitIds: newUnits.map(unit => unit.id), approvedBy: null, approvedAt: null, approvalEvidenceRef: null, reviewedAt: null, reviewerDisplayName: null, reviewerNameConsent: false, reviewScope: null };
        db.versions.push(version);
        db.units.push(...newUnits);
        db.assets.push(...db.assets.filter(asset => asset.resourceVersionId === current.id).map(asset => ({ ...clone(asset), id: identifier(`${id}-asset`), resourceVersionId: newId, fileRef: asset.format === 'structured' ? null : asset.fileRef })));
        detail.resource.currentDraftVersionId = newId;
        units = newUnits;
        if (editedUnits) for (const edited of editedUnits) {
          const target = units.find(unit => unit.id === unitMapping.get(edited.id));
          assert(target, 'validation_error', '편집 단원의 판본을 확인하세요.');
          target.title = edited.title; target.blocks = clone(edited.blocks); target.appLinkIds = clone(edited.appLinkIds);
        }
      } else {
        version.revision += 1;
        // A response to requested changes stays in that workflow until re-submission.
        if (version.reviewState !== 'changes_requested') version.reviewState = 'draft';
        if (editedUnits) for (const edited of editedUnits) {
          const target = units.find(unit => unit.id === edited.id);
          assert(target, 'validation_error', '편집 단원의 판본을 확인하세요.');
          target.title = edited.title; target.blocks = clone(edited.blocks); target.appLinkIds = clone(edited.appLinkIds);
        }
      }
      version.resourceSnapshot = resourceMetadata({ ...resourceForVersion(detail.resource, version), ...clone(metadata) });
      if (rights) version.rights = clone(rights);
      if (gugakContext) version.gugakContext = clone(gugakContext);
      if (reviewScope !== undefined) version.reviewScope = reviewScope;
      version.changeSummary = changeSummary!.trim();
      if (blocks) {
        assert(units[0], 'validation_error', '편집할 구조화 단원이 없습니다. 원자료에 가짜 단원을 만들지 않습니다.');
        units[0].blocks = clone(blocks);
      }
      for (const [unitIndex, unit] of units.entries()) for (const appId of unit.appLinkIds) {
        // Existing inactive candidate labels are not executable learning connections.
        if (originalAppLinks[unitIndex]?.includes(appId)) continue;
        const app = db.apps.find(item => item.id === appId);
        assert(app && canUseApp(app, resourceForVersion(detail.resource, version), version), 'validation_error', '악기형·기보·목표·권한을 확인한 앱만 연결할 수 있습니다.');
      }
      db.events.push({ id: identifier('edit'), resourceId: id, versionId: version.id, from: priorReviewState, to: version.reviewState, actorId: 'local-editor', role: 'editor', reason: version.changeSummary, at: now(), snapshotRevision: version.revision });
      return { resource: resourceForVersion(detail.resource, version), version, units };
    });
  }

  updateEditorialUnit(id: string, patch: Pick<EditorialUnit, 'editedBlocks' | 'sourceSlideIds' | 'changeSummary'>, expectedRevision: number): Promise<EditorialUnit> {
    return this.mutate(undefined, db => {
      const unit = db.editorialUnits.find(item => item.id === id);
      assert(unit, 'not_found', '편집 단원을 찾을 수 없습니다.');
      assert(unit.editRevision === expectedRevision, 'conflict', '편집 단원이 변경되었습니다.');
      assert(Object.keys(patch).every(key => ['editedBlocks', 'sourceSlideIds', 'changeSummary'].includes(key)), 'not_allowed', '원문 참조·원문 텍스트·승인 필드는 편집할 수 없습니다.');
      assert(patch.changeSummary.trim() && !containsUnsafeText(patch), 'validation_error', '안전한 편집 내용과 변경 요약을 입력하세요.');
      assert(new Set(patch.sourceSlideIds).size === patch.sourceSlideIds.length && patch.sourceSlideIds.every(slideId => db.sourceSlides.some(slide => slide.id === slideId)), 'validation_error', '실제로 추출한 원본 슬라이드만 중복 없이 연결할 수 있습니다.');
      const version = db.versions.find(item => item.id === unit.resourceVersionId);
      assert(!version || version.reviewState !== 'approved', 'not_allowed', '승인 판본은 새 초안을 만든 뒤 편집하세요.');
      Object.assign(unit, { editedBlocks: clone(patch.editedBlocks), sourceSlideIds: clone(patch.sourceSlideIds), changeSummary: patch.changeSummary, editRevision: unit.editRevision + 1, changedBy: 'local-editor' });
      return unit;
    });
  }

  transitionReview(command: RepositoryReviewCommand, expectedRevision: number): Promise<ResourceVersion> {
    return this.mutate(command.commandId, (db, repeated) => {
      const detail = this.detail(db, command.resourceId, command.versionId, 'admin');
      if (repeated) return detail.version;
      assert(detail.version.revision === expectedRevision, 'conflict', '검수 판본이 변경되었습니다. 최신 상태를 확인하세요.');
      const next = applyReviewTransition(detail.version, command, resourceForVersion(detail.resource, detail.version), db.issues);
      db.versions[db.versions.findIndex(version => version.id === next.id)] = next;
      db.events.push({ id: identifier('review'), resourceId: detail.resource.id, versionId: next.id, from: detail.version.reviewState, to: next.reviewState, actorId: command.actorId, role: command.role, reason: command.reason, at: command.at ?? now(), snapshotRevision: next.revision });
      return next;
    });
  }

  publishResource(resourceId: string, versionId: string, expectedRevision: number, commandId?: string): Promise<ResourceDetail> {
    return this.mutate(commandId, (db, repeated) => {
      const detail = this.detail(db, resourceId, versionId, 'admin');
      if (repeated) return detail;
      assert(detail.version.revision === expectedRevision, 'conflict', '공개할 판본이 변경되었습니다.');
      const candidate = { ...resourceForVersion(detail.resource, detail.version), publishedVersionId: versionId, publicationState: 'published' as const };
      assert(detail.version.reviewState === 'approved', 'not_allowed', '승인된 정확한 판본만 공개할 수 있습니다.');
      const blockingHistory = db.issues.some(issue => issue.versionId === versionId && (issue.severity !== 'minor' || issue.category === 'safety'));
      if (blockingHistory) {
        const lastApproval = db.events.reduce((latest, event, index) => event.versionId === versionId && event.to === 'approved' && event.from !== 'approved' && event.role === 'reviewer' ? index : latest, -1);
        const lastIssueChange = db.events.reduce((latest, event, index) => event.versionId === versionId && (event.id.startsWith('issue-event-') || event.id.startsWith('issue-resolution-')) ? index : latest, -1);
        assert(lastApproval > lastIssueChange, 'not_allowed', '중대 지적의 수정·재확인 후 별도 승인과 공개가 필요합니다. 이미 승인된 판본은 새 초안을 만들어 재검수하세요.');
      }
      assert(candidate.datasetKind === 'synthetic_demo' ? demoVisible(detail.version, candidate, db.issues) : canPublish(detail.version, candidate, db.issues), 'not_allowed', '권리·근거·필수 메타데이터·미해결 지적을 확인하세요.');
      Object.assign(detail.resource, candidate);
      // Only a validated explicit publish can resume a structured asset. A missing or
      // unverified physical PDF/PPTX file must never become available this way.
      db.assets.filter(asset => asset.resourceVersionId === versionId && asset.format === 'structured' && asset.availability === 'on_hold').forEach(asset => { asset.availability = 'available'; });
      db.events.push({ id: identifier('publish'), resourceId, versionId, from: detail.version.reviewState, to: detail.version.reviewState, actorId: 'local-editor', role: 'editor', reason: candidate.datasetKind === 'synthetic_demo' ? '합성 자료 공개 흐름 시연' : '검증된 판본 공개', at: now(), snapshotRevision: detail.version.revision });
      return detail;
    });
  }

  reportIssue(input: Omit<ReviewIssue, 'id' | 'status' | 'resolution' | 'dismissalReason'> & Partial<Pick<ReviewIssue, 'id'>>, commandId?: string): Promise<ReviewIssue> {
    const issueId = input.id ?? (commandId ? `issue-${commandId}` : identifier('issue'));
    return this.mutate(commandId, (db, repeated) => {
      if (repeated) {
        const existing = db.issues.find(issue => issue.id === issueId);
        assert(existing, 'not_found', '이미 처리된 명령입니다.');
        return existing;
      }
      const detail = this.detail(db, input.resourceId, input.versionId, 'admin');
      assert(input.description.trim() && input.evidence.trim(), 'validation_error', '문제 내용과 관찰 근거를 입력하세요.');
      assert(!containsUnsafeText(input), 'validation_error', '실행 가능한 문자열은 신고에 저장할 수 없습니다.');
      assert(!input.unitId || detail.units.some(unit => unit.id === input.unitId), 'validation_error', '신고 위치의 단원과 판본이 다릅니다.');
      if (input.blockId) assert(detail.units.some(unit => unit.id === input.unitId && unit.blocks.some(block => block.id === input.blockId)), 'validation_error', '신고 블록 위치가 올바르지 않습니다.');
      const issue: ReviewIssue = { ...clone(input), id: issueId, status: 'open', resolution: null, dismissalReason: null };
      db.issues.push(issue);
      if (['critical', 'major'].includes(issue.severity) || issue.category === 'safety') {
        if (detail.resource.publishedVersionId === input.versionId || detail.resource.currentDraftVersionId === input.versionId) detail.resource.publicationState = 'on_hold';
        db.assets.filter(asset => asset.resourceVersionId === input.versionId && asset.availability === 'available').forEach(asset => { asset.availability = 'on_hold'; });
      }
      db.events.push({ id: identifier('issue-event'), resourceId: input.resourceId, versionId: input.versionId, from: detail.version.reviewState, to: detail.version.reviewState, actorId: 'anonymous-demo', role: 'reporter', reason: `오류 신고: ${issue.description}`, at: now(), snapshotRevision: detail.version.revision });
      return issue;
    });
  }

  updateIssue(id: string, patch: IssueUpdate, commandId?: string): Promise<ReviewIssue> {
    return this.mutate(commandId, (db, repeated) => {
      const issue = db.issues.find(item => item.id === id);
      assert(issue, 'not_found', '신고를 찾을 수 없습니다.');
      if (repeated) return issue;
      assert(!containsUnsafeText(patch), 'validation_error', '안전한 처리 내용을 입력하세요.');
      if (patch.status === 'fixed') assert(patch.resolution?.trim(), 'validation_error', '수정 내용을 기록하세요.');
      if (patch.status === 'verified') assert(patch.actorRole === 'reviewer' && issue.status === 'fixed', 'not_allowed', '수정 완료 후 검수자가 별도로 재확인해야 합니다.');
      if (patch.status === 'dismissed') {
        assert(patch.dismissalReason?.trim(), 'validation_error', '기각 사유가 필요합니다.');
        assert(patch.actorRole === 'reviewer' || !(['safety', 'music'].includes(issue.category) && ['critical', 'major'].includes(issue.severity)), 'not_allowed', '안전·핵심 음악의 중대 지적은 편집자가 혼자 기각할 수 없습니다.');
      }
      issue.status = patch.status;
      if (patch.resolution !== undefined) issue.resolution = patch.resolution;
      if (patch.dismissalReason !== undefined) issue.dismissalReason = patch.dismissalReason;
      const version = db.versions.find(item => item.id === issue.versionId)!;
      db.events.push({ id: identifier('issue-resolution'), resourceId: issue.resourceId, versionId: issue.versionId, from: version.reviewState, to: version.reviewState, actorId: `local-${patch.actorRole}`, role: patch.actorRole, reason: `지적 상태 ${patch.status}: ${patch.resolution ?? patch.dismissalReason ?? ''}`, at: now(), snapshotRevision: version.revision });
      // Verification never automatically republishes, unholds an asset, or grants approval.
      return issue;
    });
  }

  updateApp(app: AppLink, expectedRevision?: number, commandId?: string): Promise<AppLink> {
    return this.mutate(commandId, (db, repeated) => {
      const index = db.apps.findIndex(item => item.id === app.id);
      const current = db.apps[index];
      if (repeated && current) return current;
      assert(!current || current.revision === (expectedRevision ?? app.revision), 'conflict', '앱 후보가 다른 창에서 수정되었습니다.');
      assert(!containsUnsafeText(app), 'validation_error', '허용되지 않는 문자열이 포함되어 있습니다.');
      const checked = validateAppUrl(app.url);
      assert(app.url === null || checked.valid, 'validation_error', checked.reason ?? '허용되지 않는 URL입니다.');
      assert(!app.url || !db.apps.some(item => item.id !== app.id && item.url && validateAppUrl(item.url).url === checked.url), 'validation_error', '같은 URL이 이미 등록되어 있습니다.');
      assert(app.status !== 'todo' || (app.url === null && !app.enabled), 'validation_error', '준비 중인 앱은 URL이 없고 비활성이어야 합니다.');
      if (app.enabled) assert(app.url && app.status === 'available' && app.sourceEvidence && app.availabilityCheck && app.contentCompatibilityCheck && app.privacyPermissionCheck && app.contentAccuracyChecked && app.checkEvidence && app.checkedAt && app.requiresCamera === 'no' && app.requiresMicrophone === 'no' && app.requiresLogin === 'no', 'not_allowed', '출처·실행·내용·개인정보 점검이 모두 완료되어야 활성화할 수 있습니다.');
      const saved = { ...clone(app), url: app.url === null ? null : checked.url, revision: (current?.revision ?? 0) + 1 };
      if (index < 0) db.apps.push(saved); else db.apps[index] = saved;
      return saved;
    });
  }

  async exportData(): Promise<string> {
    await this.init();
    const data = clone(this.data);
    // Download permission is independent from viewing and printing.
    const included = data.resources.filter(resource => resource.datasetKind === 'synthetic_demo');
    const resourceIds = new Set(included.map(resource => resource.id));
    const versions = data.versions.filter(version => resourceIds.has(version.resourceId));
    const versionIds = new Set(versions.map(version => version.id));
    data.resources = included.filter(resource => versionIds.has(resource.currentDraftVersionId));
    const exportedIds = new Set(data.resources.map(resource => resource.id));
    data.versions = versions.filter(version => exportedIds.has(version.resourceId));
    const validVersionIds = new Set(data.versions.map(version => version.id));
    data.resources.forEach(resource => { if (resource.publishedVersionId && !validVersionIds.has(resource.publishedVersionId)) { resource.publishedVersionId = null; resource.publicationState = 'private'; } resource.editorialUnitIds = []; });
    data.versions.forEach(version => { version.editorialUnitIds = []; if (version.basedOnVersionId && !validVersionIds.has(version.basedOnVersionId)) version.basedOnVersionId = null; });
    data.units = data.units.filter(unit => validVersionIds.has(unit.resourceVersionId)).map(unit => ({ ...unit, blocks: data.versions.find(version => version.id === unit.resourceVersionId)?.rights.allowDownload ? unit.blocks : [] }));
    data.assets = data.assets.filter(asset => validVersionIds.has(asset.resourceVersionId)).map(asset => asset.rights.allowDownload ? asset : { ...asset, fileRef: null, availability: asset.format === 'structured' ? asset.availability : 'missing' as const });
    data.sourceSlides = []; data.editorialUnits = [];
    data.plans = data.plans.map(plan => ({ ...plan, activities: plan.activities.map(activity => ({ ...activity, resources: activity.resources.filter(ref => validVersionIds.has(ref.versionId)) })) }));
    data.issues = data.issues.filter(issue => validVersionIds.has(issue.versionId));
    data.events = data.events.filter(event => validVersionIds.has(event.versionId));
    data.bookmarks = data.bookmarks.filter(bookmark => validVersionIds.has(bookmark.versionId));
    data.positions = data.positions.filter(position => data.assets.some(asset => asset.id === position.assetId));
    data.apps.forEach(app => { if (app.fallbackResourceId && !exportedIds.has(app.fallbackResourceId)) app.fallbackResourceId = null; });
    return JSON.stringify(databaseSchema.parse(data), null, 2);
  }

  importData(text: string, expectedRevision?: number): Promise<void> {
    return this.mutate(undefined, db => {
      assert(expectedRevision === undefined || expectedRevision === db.revision, 'conflict', '가져오기 전에 자료가 변경되었습니다. 최신 상태를 확인하세요.');
      const incoming = this.parse(text);
      // The local backup is for own drafts and synthetic records, never a public approval channel.
      assert(incoming.resources.every(resource => resource.datasetKind === 'synthetic_demo'), 'not_allowed', '가져오기는 합성 시연 자료에만 허용됩니다. 실제 원자료의 승인·권한을 가져오기로 변경할 수 없습니다.');
      assert(incoming.sourceSlides.length === 0 && incoming.editorialUnits.length === 0, 'not_allowed', '원문 추출 자료는 JSON 가져오기로 덮어쓸 수 없습니다.');
      assert(JSON.stringify(incoming.sources) === JSON.stringify(db.sources), 'not_allowed', '원자료 파일명·ID·메타데이터는 이 가져오기로 변경할 수 없습니다.');
      for (const version of db.versions.filter(item => item.reviewState === 'approved')) {
        const replacement = incoming.versions.find(item => item.id === version.id);
        assert(!replacement || JSON.stringify(replacement) === JSON.stringify(version), 'not_allowed', '승인된 판본은 가져오기로 덮어쓸 수 없습니다. 새 초안이 필요합니다.');
        for (const unit of db.units.filter(item => item.resourceVersionId === version.id)) {
          const nextUnit = incoming.units.find(item => item.id === unit.id);
          assert(!nextUnit || JSON.stringify({ ...nextUnit, blocks: nextUnit.blocks.length === 0 ? unit.blocks : nextUnit.blocks }) === JSON.stringify(unit), 'not_allowed', '승인된 단원은 불변입니다.');
        }
      }
      const merge = <T extends { id: string }>(current: T[], next: T[]): T[] => [...current.filter(item => !next.some(replacement => replacement.id === item.id)), ...next];
      // Merge backups without deleting existing versions, sources, or audit events.
      db.resources = merge(db.resources, incoming.resources);
      db.versions = merge(db.versions, incoming.versions);
      db.units = merge(db.units, incoming.units.map(unit => ({ ...unit, blocks: unit.blocks.length === 0 ? db.units.find(existing => existing.id === unit.id)?.blocks ?? [] : unit.blocks })));
      db.assets = merge(db.assets, incoming.assets);
      db.plans = merge(db.plans, incoming.plans);
      db.apps = merge(db.apps, incoming.apps);
      db.issues = merge(db.issues, incoming.issues);
      db.events.push(...incoming.events.filter(event => !db.events.some(existing => existing.id === event.id)));
      db.commandIds = [...new Set([...db.commandIds, ...incoming.commandIds])];
      db.bookmarks = incoming.bookmarks;
      db.positions = incoming.positions;
    });
  }

  reset(): Promise<void> {
    const task = this.queue.catch(() => undefined).then(async () => {
      await this.init();
      return withStorageLock(this.storage, async () => {
      const fresh = clone(createSeed());
      fresh.revision = this.data.revision + 1;
      this.data = fresh;
      try {
        // Explicit confirmed reset is the only recovery that replaces corrupt data.
        this.storage = this.suppliedStorage === undefined ? browserStorage() : this.suppliedStorage;
        if (this.storage) await this.storage.setItem(STORAGE_KEY, JSON.stringify(fresh));
        this.warning = null;
      } catch { this.memoryWarning('초기화한 자료를 브라우저에 저장하지 못했습니다. 이번 세션은 메모리에서 계속합니다.'); }
      this.emit();
      });
    });
    this.queue = task;
    return task;
  }
}

export function createRepository(storage?: StorageLike | null): GugakRepository { return new GugakRepository(storage); }
