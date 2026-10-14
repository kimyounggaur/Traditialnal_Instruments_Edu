// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BookshelfPage } from '@/components/bookshelf';
import { LibraryProvider } from '@/components/provider';
import { Shell } from '@/components/shell';
import { STORAGE_KEY } from '@/repositories';

vi.mock('next/navigation', () => ({
  usePathname: () => '/library',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
}));

function LibraryScreen() {
  return <LibraryProvider><Shell><BookshelfPage /></Shell></LibraryProvider>;
}

beforeEach(() => window.localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('local persistence failure recovery through real provider', () => {
  it('does not overwrite corrupt storage, exposes a warning and keeps fourteen cards usable', async () => {
    window.localStorage.setItem(STORAGE_KEY, '{not-valid-json');
    render(<LibraryScreen />);
    expect(await screen.findByRole('alert')).toHaveTextContent('원래 저장값을 덮어쓰지 않고');
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(14));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('{not-valid-json');
    expect(screen.getByRole('link', { name: '가야금 시연 교재 열기' })).toBeInTheDocument();
  });

  it('quota failure retains the bookmark in memory with an explicit persistence warning', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('storage quota', 'QuotaExceededError');
    });
    render(<LibraryScreen />);
    fireEvent.click(await screen.findByRole('button', { name: '가야금 북마크 추가' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('메모리에만 저장');
    expect(await screen.findByRole('button', { name: '가야금 북마크 해제' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('article')).toHaveLength(14);
    expect(setItem).toHaveBeenCalled();
  });

  it('uses the gugak storage namespace and leaves an existing classical sentinel untouched', async () => {
    window.localStorage.setItem('classical-library:v1', 'existing-classical-sentinel');
    render(<LibraryScreen />);
    fireEvent.click(await screen.findByRole('button', { name: '해금 북마크 추가' }));
    await screen.findByRole('button', { name: '해금 북마크 해제' });
    const persisted = JSON.parse(window.localStorage.getItem('gugak-library:v1')!);
    expect(persisted.bookmarks).toEqual([{ resourceId: 'demo-haegeum', versionId: 'demo-haegeum-v1', unitId: null }]);
    expect(window.localStorage.getItem('classical-library:v1')).toBe('existing-classical-sentinel');
  });

  it('gives skip navigation, a named role control, and a dismissible live notification', async () => {
    render(<LibraryScreen />);
    expect(screen.getByRole('link', { name: '본문으로 건너뛰기' })).toHaveAttribute('href', '#main');
    expect(screen.getByRole('combobox', { name: '시연 역할' })).toHaveValue('teacher');
    expect(screen.getByText(/가상 역할은 실제 접근 권한이 아닙니다/)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: '장구 북마크 추가' }));
    expect(await screen.findByText('북마크에 담았습니다.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '알림 닫기' }));
    expect(screen.queryByText('북마크에 담았습니다.')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(14));
  });
});
