// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ResourceDetail, UnitReader, PracticePage, BookmarksPage } from '@/components/reader';
import { createRepository, type GugakRepository } from '@/repositories';
import { createSeed } from '@/data/seed';
import type { Database } from '@/domain/types';

const navigation = vi.hoisted(() => ({ query: '' }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/library',
  useSearchParams: () => new URLSearchParams(navigation.query),
  useRouter: () => ({ push: vi.fn() }),
}));
let db: Database;
let repo: GugakRepository;
const notify = vi.fn();
const run = vi.fn(async (operation: () => Promise<unknown>) => operation());
vi.mock('@/components/provider', () => ({ useLibrary: () => ({ db, repo, ready: true, role: 'teacher', notify, run }) }));

async function fixture(change?: (seed: Database) => void) {
  const initial = createSeed();
  change?.(initial);
  repo = createRepository({ getItem: () => JSON.stringify(initial), setItem: () => undefined, removeItem: () => undefined });
  await repo.init();
  db = await repo.read();
}
beforeEach(async () => { navigation.query = ''; notify.mockClear(); run.mockClear(); await fixture(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('detail and reader route, source, rights boundaries', () => {
  it('shows synthetic origin, two structured units, unconfirmed context and a non-clickable PDF placeholder', async () => {
    render(<ResourceDetail resourceId="demo-gayageum" />);
    expect(await screen.findByRole('heading', { name: '가야금 · 함께 읽는 첫 장' })).toBeInTheDocument();
    expect(screen.getByText('편집 단원 2개')).toBeInTheDocument();
    expect(screen.getByText('PDF 준비 중')).toBeInTheDocument();
    expect(document.querySelector('a[href$=".pdf"], iframe, object, embed')).toBeNull();
    expect(screen.getByText('실제 음악 승인 0건', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('연결된 원본 슬라이드: 없음. 번호를 추정하지 않았습니다.')).toBeInTheDocument();
    expect(screen.getAllByText('미확인 · 원문 또는 검수 근거 필요').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/440\s?Hz/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '단원 읽기' })).toHaveAttribute('href', '/library/demo-gayageum/units/demo-gayageum-u1?version=demo-gayageum-v1&return=%2Flibrary');
  });

  it.each([
    ['source-resource-gayageum', ''],
    ['source-resource-gayageum', 'audience=public&version=source-resource-gayageum-v1'],
    ['demo-gayageum', 'audience=public&version=demo-gayageum-v1'],
    ['does-not-exist', ''],
  ])('rejects inaccessible direct detail %s %s', async (resourceId, query) => {
    navigation.query = query;
    render(<ResourceDetail resourceId={resourceId} />);
    expect(await screen.findByRole('heading', { name: '지금은 이 자료를 열 수 없어요' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '단원 읽기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '인쇄' })).not.toBeInTheDocument();
  });

  it.each(['on_hold', 'rights_unknown', 'missing_asset'] as const)('%s prevents direct unit content and print actions', async state => {
    await fixture(seed => {
      if (state === 'on_hold') seed.resources.find(r => r.id === 'demo-gayageum')!.publicationState = 'on_hold';
      if (state === 'rights_unknown') seed.versions.find(v => v.id === 'demo-gayageum-v1')!.rights.state = 'unknown';
      if (state === 'missing_asset') seed.assets.find(a => a.id === 'asset-gayageum-structured')!.availability = 'missing';
    });
    render(<UnitReader resourceId="demo-gayageum" unitId="demo-gayageum-u1" />);
    expect(await screen.findByRole('heading', { name: '지금은 이 자료를 열 수 없어요' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '자료 읽기 안내' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '인쇄' })).not.toBeInTheDocument();
  });

  it('rejects a unit from another resource instead of silently choosing a nearby page', async () => {
    render(<UnitReader resourceId="demo-gayageum" unitId="demo-haegeum-u1" />);
    expect(await screen.findByRole('heading', { name: '지금은 이 자료를 열 수 없어요' })).toBeInTheDocument();
    expect(screen.getByText('이 판본에 해당 단원이 없습니다.')).toBeInTheDocument();
  });

  it('preserves the complete listing return URL through reader, next unit and practice detour', async () => {
    const returnPath = '/library?instrument=gayageum&level=1&sort=level&view=list';
    navigation.query = `version=demo-gayageum-v1&return=${encodeURIComponent(returnPath)}`;
    render(<UnitReader resourceId="demo-gayageum" unitId="demo-gayageum-u1" />);
    await screen.findByRole('heading', { name: '자료 읽기 안내' });
    expect(screen.getByRole('link', { name: '자료실' })).toHaveAttribute('href', returnPath);
    const next = new URL(screen.getByRole('link', { name: '다음 단원' }).getAttribute('href')!, 'https://local.test');
    expect(next.pathname).toBe('/library/demo-gayageum/units/demo-gayageum-u2');
    expect(next.searchParams.get('return')).toBe(returnPath);
    expect(next.searchParams.get('version')).toBe('demo-gayageum-v1');
    const practice = new URL(screen.getByRole('link', { name: '연습실 보기' }).getAttribute('href')!, 'https://local.test');
    expect(new URL(practice.searchParams.get('from')!, 'https://local.test').searchParams.get('return')).toBe(returnPath);
  });

  it('does not permit an external return redirect', async () => {
    navigation.query = `return=${encodeURIComponent('https://evil.example/path')}`;
    render(<ResourceDetail resourceId="demo-gayageum" />);
    await screen.findByRole('heading', { name: '가야금 · 함께 읽는 첫 장' });
    expect(screen.getByRole('link', { name: '자료실' })).toHaveAttribute('href', '/library');
    expect(document.querySelector('a[href*="evil.example"]')).toBeNull();
  });

  it('renders untrusted block text literally without script nodes', async () => {
    const unit = structuredClone(db.units.find(u => u.id === 'demo-gayageum-u1')!);
    const payload = '<script>window.__readerInjected = true</script>';
    unit.blocks = [{ id: 'untrusted-literal', type: 'paragraph', text: payload }];
    vi.spyOn(repo, 'getUnit').mockResolvedValue(unit);
    render(<UnitReader resourceId="demo-gayageum" unitId="demo-gayageum-u1" />);
    expect(await screen.findByText(payload)).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect((window as Window & { __readerInjected?: boolean }).__readerInjected).toBeUndefined();
  });

  it('preserves source-described jeonggan direction as text and does not generate pitches', async () => {
    const unit = structuredClone(db.units.find(u => u.id === 'demo-gayageum-u1')!);
    const original = '원본 읽기 방향: 위에서 아래로. 원본 슬라이드 7의 격자 구조 확인 필요.';
    unit.blocks = [{ id: 'direction-note', type: 'jeonggan', text: original, caption: '전문가 확인 필요' }];
    vi.spyOn(repo, 'getUnit').mockResolvedValue(unit);
    render(<UnitReader resourceId="demo-gayageum" unitId="demo-gayageum-u1" />);
    expect(await screen.findByText(original)).toBeInTheDocument();
    expect(screen.getByText(/음높이 생성이나 기보법 자동 변환은 제공하지 않습니다/)).toBeInTheDocument();
    expect(document.querySelector('canvas')).toBeNull();
  });

  it('uses only safe local demo media and preserves image alternative text', async () => {
    const unit = structuredClone(db.units.find(u => u.id === 'demo-gayageum-u1')!);
    unit.blocks = [
      { id: 'safe-image', type: 'image', src: '/demo/source-diagram.png', alt: '원본에서 설명한 도식의 대체 설명' },
      { id: 'external-image', type: 'image', src: 'https://untrusted.example/tracker.png', alt: '연결 금지 외부 이미지' },
    ];
    vi.spyOn(repo, 'getUnit').mockResolvedValue(unit);
    render(<UnitReader resourceId="demo-gayageum" unitId="demo-gayageum-u1" />);
    expect(await screen.findByRole('img', { name: '원본에서 설명한 도식의 대체 설명' })).toHaveAttribute('src', '/demo/source-diagram.png');
    expect(document.querySelector('img[src^="https:"]')).toBeNull();
    expect(screen.getByText('연결 금지 외부 이미지')).toBeInTheDocument();
  });

  it('records a version-specific reading position and rechecks print rights at the command', async () => {
    const record = vi.spyOn(repo, 'recordReadingPosition');
    const printGate = vi.spyOn(repo, 'getPrintableResource');
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    render(<UnitReader resourceId="demo-haegeum" unitId="demo-haegeum-u2" />);
    await screen.findByRole('heading', { name: '수업 준비 메모' });
    await waitFor(() => expect(record).toHaveBeenCalledWith(expect.objectContaining({
      projectId: 'gugak-library', resourceId: 'demo-haegeum', resourceVersionId: 'demo-haegeum-v1',
      assetId: 'asset-haegeum-structured', unitId: 'demo-haegeum-u2', pageNumber: null,
    })));
    fireEvent.click(screen.getByRole('button', { name: '인쇄' }));
    await waitFor(() => expect(print).toHaveBeenCalledOnce());
    expect(printGate).toHaveBeenCalledWith('demo-haegeum', 'demo-haegeum-v1', 'demo');
  });
});

describe('unverified app and bookmark presentation', () => {
  it('the only observed app candidate and all TODO tools have disabled controls with no executable href', async () => {
    render(<UnitReader resourceId="demo-gayageum" unitId="demo-gayageum-u1" />);
    await screen.findByRole('heading', { name: '자료 읽기 안내' });
    expect(screen.getByRole('button', { name: '연결 준비 중' })).toBeDisabled();
    expect(screen.queryByRole('link', { name: /외부 도구 열기/ })).not.toBeInTheDocument();
    expect(document.querySelector('a[href*="gayageum-fingering-edu"]')).toBeNull();
  });

  it('practice lists fourteen disabled candidates and restores the exact reader URL', () => {
    const from = '/library/demo-gayageum/units/demo-gayageum-u1?version=demo-gayageum-v1&return=%2Flibrary%3Fview%3Dlist';
    navigation.query = `from=${encodeURIComponent(from)}`;
    render(<PracticePage />);
    expect(screen.getAllByRole('article')).toHaveLength(14);
    expect(screen.getAllByRole('button', { name: /연습 도구 연결 준비 중/ })).toHaveLength(14);
    screen.getAllByRole('button', { name: /연습 도구 연결 준비 중/ }).forEach(button => expect(button).toBeDisabled());
    expect(document.querySelector('a[href^="http"]')).toBeNull();
    expect(screen.getByRole('link', { name: '읽던 판본·단원으로 돌아가기' })).toHaveAttribute('href', from);
  });

  it('keeps an on-hold bookmark with a warning instead of creating an accessible content link', async () => {
    await fixture(seed => {
      seed.resources.find(r => r.id === 'demo-gayageum')!.publicationState = 'on_hold';
      seed.bookmarks.push({ resourceId: 'demo-gayageum', versionId: 'demo-gayageum-v1', unitId: 'demo-gayageum-u1' });
    });
    render(<BookmarksPage />);
    expect(await screen.findByRole('button', { name: '열람 제한' })).toBeDisabled();
    expect(screen.getByText(/책갈피는 그대로 보관됩니다/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '저장한 판본 열기' })).not.toBeInTheDocument();
  });
});

describe('recent reading history', () => {
  it('shows only the six newest records and preserves version, asset, unit and bookmarks return', async () => {
    let oldestTitle = '';
    let newestTitle = '';
    let newestPath = '';
    await fixture(seed => {
      const resources = seed.resources.filter(resource => resource.datasetKind === 'synthetic_demo').slice(0, 7);
      oldestTitle = resources[0].title;
      newestTitle = resources[6].title;
      seed.positions = resources.map((resource, index) => {
        const version = seed.versions.find(item => item.id === resource.publishedVersionId)!;
        const asset = seed.assets.find(item => item.resourceVersionId === version.id && item.format === 'structured')!;
        const unitId = version.unitIds[0];
        if (index === 6) newestPath = `/library/${resource.id}/units/${unitId}?version=${version.id}&return=%2Fbookmarks&asset=${asset.id}`;
        return { projectId: 'gugak-library', resourceId: resource.id, resourceVersionId: version.id, assetId: asset.id, pageNumber: null, unitId, updatedAt: `2026-10-14T10:0${index}:00.000Z` };
      });
    });
    render(<BookmarksPage />);
    const region = screen.getByRole('region', { name: '최근 읽은 자료' });
    await within(region).findByRole('link', { name: `${newestTitle} 저장한 위치에서 이어읽기` });
    const items = within(region).getAllByRole('listitem');
    expect(items).toHaveLength(6);
    expect(within(items[0]).getByRole('heading', { name: newestTitle })).toBeInTheDocument();
    expect(within(region).queryByText(oldestTitle)).not.toBeInTheDocument();
    expect(within(items[0]).getByRole('link')).toHaveAttribute('href', newestPath);
  });

  it('keeps a held reading position visible without opening it or rewriting its saved version', async () => {
    await fixture(seed => {
      seed.resources.find(resource => resource.id === 'demo-gayageum')!.publicationState = 'on_hold';
      seed.positions = [{ projectId: 'gugak-library', resourceId: 'demo-gayageum', resourceVersionId: 'demo-gayageum-v1', assetId: 'asset-gayageum-structured', pageNumber: null, unitId: 'demo-gayageum-u2', updatedAt: '2026-10-14T10:00:00.000Z' }];
    });
    const record = vi.spyOn(repo, 'recordReadingPosition');
    render(<BookmarksPage />);
    expect(await screen.findByRole('button', { name: '저장한 위치 열람 제한' })).toBeDisabled();
    expect(screen.getByText(/재검토를 위해 열람이 보류된 자료입니다/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /저장한 위치에서 이어읽기/ })).not.toBeInTheDocument();
    expect(record).not.toHaveBeenCalled();
    expect((await repo.read()).positions[0]).toMatchObject({ resourceVersionId: 'demo-gayageum-v1', unitId: 'demo-gayageum-u2' });
  });

  it('returns from a saved reading to bookmarks and keeps that return for the next unit', async () => {
    navigation.query = 'version=demo-gayageum-v1&return=%2Fbookmarks';
    render(<UnitReader resourceId="demo-gayageum" unitId="demo-gayageum-u1" />);
    await screen.findByRole('heading', { name: '자료 읽기 안내' });
    expect(screen.getByRole('link', { name: '책갈피' })).toHaveAttribute('href', '/bookmarks');
    expect(new URL(screen.getByRole('link', { name: '다음 단원' }).getAttribute('href')!, 'https://local.test').searchParams.get('return')).toBe('/bookmarks');
  });
});
