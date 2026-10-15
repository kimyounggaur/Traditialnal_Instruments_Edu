// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Shell } from '@/components/shell';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('@/components/provider', () => ({
  useLibrary: () => ({ role: 'student', setRole: vi.fn(), notify: vi.fn(), notice: '', warning: '' }),
}));

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })));
  vi.stubGlobal('IntersectionObserver', undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('screen motion preferences and reveal fallback', () => {
  it('persists a pause and restores it on the next visit', () => {
    const firstVisit = render(<Shell><p>오늘의 연습</p></Shell>);
    const toggle = screen.getByRole('button', { name: '화면 움직임' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(toggle);
    expect(toggle).toHaveTextContent('움직임 꺼짐');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(window.localStorage.getItem('gugak-library:motion')).toBe('off');

    firstVisit.unmount();
    render(<Shell><p>다시 온 서재</p></Shell>);
    expect(screen.getByRole('button', { name: '화면 움직임' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: '화면 움직임' }));
    expect(window.localStorage.getItem('gugak-library:motion')).toBe('on');
  });

  it('honors reduced motion even with an enabled saved preference and reacts to system changes', () => {
    let preferenceListener: (() => void) | undefined;
    const media = {
      matches: true,
      addEventListener: vi.fn((_event: string, listener: () => void) => { preferenceListener = listener; }),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('matchMedia', vi.fn(() => media));
    window.localStorage.setItem('gugak-library:motion', 'on');
    render(<Shell><p>가야금 배우기</p></Shell>);
    const toggle = screen.getByRole('button', { name: '화면 움직임' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(toggle.closest('.app-shell')).toHaveAttribute('data-motion', 'off');

    act(() => {
      media.matches = false;
      preferenceListener?.();
    });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(toggle.closest('.app-shell')).toHaveAttribute('data-motion', 'on');
  });

  it('keeps content visible without IntersectionObserver and keeps pausing usable when storage fails', () => {
    render(<Shell><article className="book-cell" data-reveal-state="pending">해금 자료</article></Shell>);
    expect(screen.getByRole('article')).toHaveAttribute('data-reveal-state', 'visible');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage unavailable'); });
    fireEvent.click(screen.getByRole('button', { name: '화면 움직임' }));
    expect(screen.getByRole('button', { name: '화면 움직임' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('article')).toHaveAttribute('data-reveal-state', 'visible');
  });

  it('reveals cards entering the viewport and immediately releases waiting cards when paused', () => {
    let revealEntries: IntersectionObserverCallback | undefined;
    const unobserve = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) { revealEntries = callback; }
      observe = vi.fn();
      unobserve = unobserve;
      disconnect = disconnect;
    });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 2000, bottom: 2200, left: 0, right: 200, width: 200, height: 200, x: 0, y: 2000, toJSON: () => ({}),
    });
    render(<Shell>
      <article className="book-cell">대금 자료</article>
      <article className="book-cell">장구 자료</article>
    </Shell>);
    const [firstCard, secondCard] = screen.getAllByRole('article');
    expect(firstCard).toHaveAttribute('data-reveal-state', 'pending');
    act(() => revealEntries?.([{
      target: firstCard,
      isIntersecting: true,
      intersectionRatio: 1,
      boundingClientRect: firstCard.getBoundingClientRect(),
      intersectionRect: firstCard.getBoundingClientRect(),
      rootBounds: null,
      time: 0,
    }], {} as IntersectionObserver));
    expect(firstCard).toHaveAttribute('data-reveal-state', 'visible');
    expect(unobserve).toHaveBeenCalledWith(firstCard);
    expect(secondCard).toHaveAttribute('data-reveal-state', 'pending');

    fireEvent.click(screen.getByRole('button', { name: '화면 움직임' }));
    expect(secondCard).toHaveAttribute('data-reveal-state', 'visible');
    expect(disconnect).toHaveBeenCalled();
  });
});
