// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { BookshelfPage, BookCard, BookCover } from '@/components/bookshelf';
import { createRepository, type GugakRepository } from '@/repositories';
import type { Database } from '@/domain/types';

const navigation = vi.hoisted(() => ({ query: '', path: '/library', push: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => navigation.path,
  useSearchParams: () => new URLSearchParams(navigation.query),
  useRouter: () => ({ push: navigation.push }),
}));

let db: Database;
let repo: GugakRepository;
const run = vi.fn(async (operation: () => Promise<unknown>) => operation());
vi.mock('@/components/provider', () => ({
  useLibrary: () => ({ db, repo, ready: true, run }),
}));

const expectedInstruments = [
  ['gayageum', '가야금'], ['geomungo', '거문고'], ['daegeum', '대금'],
  ['danso', '단소'], ['saenghwang', '생황'], ['sogeum', '소금'],
  ['ajaeng', '아쟁'], ['yanggeum', '양금'], ['janggu', '장구'],
  ['cheolhyeongeum', '철현금'], ['taepyeongso', '태평소'], ['piri', '피리'],
  ['percussion-samulnori', '타악기·사물놀이'], ['haegeum', '해금'],
] as const;

beforeEach(async () => {
  navigation.query = '';
  navigation.path = '/library';
  navigation.push.mockReset();
  run.mockClear();
  repo = createRepository(null);
  await repo.init();
  db = await repo.read();
});
afterEach(cleanup);

describe('14-family bookshelf and honest counts', () => {
  it('renders fourteen separately named book links and never links private source records', async () => {
    render(<BookshelfPage />);
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(14));
    for (const [id, label] of expectedInstruments) {
      expect(screen.getByRole('link', { name: `${label} 시연 교재 열기` }))
        .toHaveAttribute('href', `/library/demo-${id}?return=%2Flibrary`);
    }
    expect(document.querySelector('a[href*="source-resource-"]')).toBeNull();
    expect(screen.getByText('원자료는 PPTX 14개이며', { exact: false })).toBeInTheDocument();
  });

  it('distinguishes 14 PPTX sources, 14 synthetic books, 0 public books and 0 active apps', async () => {
    render(<BookshelfPage home />);
    await screen.findByRole('link', { name: '가야금 시연 교재 열기' });
    const counts = [
      ['원자료 PPTX', '14'], ['실제 승인 공개자료', '0'],
      ['합성 시연 교재', '14'], ['공개 활성 연습 앱', '0'],
    ];
    for (const [label, count] of counts) {
      expect(screen.getByText(label).parentElement?.querySelector('strong')).toHaveTextContent(count);
    }
    expect(screen.queryByText('14 PDF')).not.toBeInTheDocument();
  });

  it('Q12 public query has no synthetic cards or private-source links', async () => {
    navigation.query = 'audience=public';
    render(<BookshelfPage />);
    expect(await screen.findByRole('heading', { name: '공개할 수 있는 승인 자료가 아직 없습니다.' })).toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(screen.queryByRole('link', { name: /시연 교재 열기/ })).not.toBeInTheDocument();
    expect(document.querySelector('a[href*="source-resource-"]')).toBeNull();
    expect(screen.getByRole('button', { name: '합성 데모 서고 열기' })).toBeInTheDocument();
  });

  it.each(expectedInstruments)('%s cover identifies its instrument and synthetic origin', (id, name) => {
    const resource = db.resources.find(item => item.id === `demo-${id}`)!;
    render(<BookCover resource={resource} />);
    expect(screen.getByText(name, { exact: true })).toBeInTheDocument();
    expect(screen.getByText(/합성 시연용/)).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });

  it('bookmarks are named, pressed-state controls and pass the exact version', () => {
    const resource = db.resources.find(item => item.id === 'demo-gayageum')!;
    const toggle = vi.spyOn(repo, 'toggleBookmark');
    render(<BookCard resource={resource} />);
    const button = screen.getByRole('button', { name: '가야금 북마크 추가' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(button);
    expect(toggle).toHaveBeenCalledWith('demo-gayageum', 'demo-gayageum-v1');
  });
});

describe('rendered search tasks and URL contracts', () => {
  it.each([
    ['Q01', 'instrument=gayageum', ['가야금']],
    ['Q02', 'instrument=haegeum&level=1', ['해금']],
    ['Q03', `q=${encodeURIComponent('  GAYAGEUM  ')}`, ['가야금']],
    ['Q04', `q=${encodeURIComponent('타악기·사물놀이')}`, ['타악기·사물놀이']],
    ['Q05', `q=${encodeURIComponent('소금')}`, ['소금']],
    ['Q06', `q=${encodeURIComponent('정간보')}`, ['가야금']],
    ['Q07', `q=${encodeURIComponent('장단 이름')}`, ['장구']],
    ['OR', 'instrument=gayageum&instrument=haegeum', ['가야금', '해금']],
    ['notation', 'notation=jeongganbo', ['가야금']],
  ])('%s filters the rendered cards', async (_id, query, labels) => {
    navigation.query = query;
    render(<BookshelfPage />);
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(labels.length));
    for (const label of labels) expect(screen.getByRole('link', { name: `${label} 시연 교재 열기` })).toBeInTheDocument();
  });

  it('Q08 retains unknown-model entries without inventing instrument models', async () => {
    navigation.query = 'system=unknown';
    render(<BookshelfPage />);
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(14));
    fireEvent.click(screen.getByRole('button', { name: '상세 필터' }));
    expect(screen.getByRole('combobox', { name: '악기형' })).toHaveValue('unknown');
  });

  it.each([
    ['Q09', 'instrument=yanggeum&q=%EB%86%8D%ED%98%84'],
    ['Q11', `q=${encodeURIComponent('존재하지않는단어')}`],
    ['missing objective', `objective=${encodeURIComponent('존재하지않는목표')}`],
  ])('%s displays an actionable empty state', async (_id, query) => {
    navigation.query = query;
    render(<BookshelfPage />);
    expect(await screen.findByRole('heading', { name: '조건에 맞는 자료가 없습니다.' })).toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: '검색·필터 초기화' }));
    expect(navigation.push).toHaveBeenLastCalledWith('/library', { scroll: false });
  });

  it('Q10 embeds a complete return URL and preserves query filters during view changes', async () => {
    navigation.query = 'instrument=haegeum&level=1&sort=level&q=%ED%95%B4%EA%B8%88';
    render(<BookshelfPage />);
    const link = await screen.findByRole('link', { name: '해금 시연 교재 열기' });
    const href = new URL(link.getAttribute('href')!, 'https://local.test');
    expect(href.searchParams.get('return')).toBe(`/library?${navigation.query}`);
    fireEvent.click(screen.getByRole('button', { name: '목록 보기' }));
    const pushed = new URL(navigation.push.mock.calls.at(-1)![0], 'https://local.test');
    expect(pushed.searchParams.get('view')).toBe('list');
    expect(pushed.searchParams.get('instrument')).toBe('haegeum');
    expect(pushed.searchParams.get('level')).toBe('1');
    expect(pushed.searchParams.get('q')).toBe('해금');
    expect(pushed.searchParams.get('sort')).toBe('level');
  });

  it('malformed enum filters safely show the valid collection without opening source metadata', async () => {
    navigation.query = 'instrument=not-an-instrument&kind=script&level=999&sort=malformed';
    render(<BookshelfPage />);
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(14));
    expect(screen.getByRole('combobox', { name: '정렬' })).toHaveValue('title');
    expect(document.querySelector('a[href*="source-resource-"]')).toBeNull();
  });

  it('search strings are literal input and never create executable markup', async () => {
    const payload = '<script>window.__gugakInjected = true</script>';
    navigation.query = `q=${encodeURIComponent(payload)}`;
    render(<BookshelfPage />);
    expect(await screen.findByRole('heading', { name: '조건에 맞는 자료가 없습니다.' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '서재 검색' })).toHaveValue(payload);
    expect(document.querySelector('script')).toBeNull();
    expect((window as Window & { __gugakInjected?: boolean }).__gugakInjected).toBeUndefined();
  });

  it('list view retains accessible book headings and exact destination links', async () => {
    navigation.query = 'view=list&instrument=percussion-samulnori';
    render(<BookshelfPage />);
    const article = await screen.findByRole('article');
    expect(within(article).getByRole('heading', { name: '타악기·사물놀이 · 묶음' })).toBeInTheDocument();
    expect(within(article).getByRole('link', { name: '타악기·사물놀이 시연 교재 열기' })).toHaveAttribute('href', `/library/demo-percussion-samulnori?return=${encodeURIComponent(`/library?${navigation.query}`)}`);
  });
});
