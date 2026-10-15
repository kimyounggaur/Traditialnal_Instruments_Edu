'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowUpRight,
  AudioLines,
  BookOpen,
  Bookmark,
  Leaf,
  Library,
  NotebookPen,
  Pause,
  SlidersHorizontal,
  Waves,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLibrary } from './provider';

const MOTION_STORAGE_KEY = 'gugak-library:motion';
// Book cards are inserted after the repository is ready on the client.
// Leave server-rendered content untouched during React's selective hydration.
const revealSelector = '.book-cell';
const nav = [
  { href: '/', text: '나의 서재', icon: Library },
  { href: '/library', text: '자료 둘러보기', icon: BookOpen },
  { href: '/practice', text: '연습실', icon: AudioLines },
  { href: '/teacher/plans', text: '수업 준비', icon: NotebookPen },
  { href: '/bookmarks', text: '북마크', icon: Bookmark },
  { href: '/admin/resources', text: '자료 관리', icon: SlidersHorizontal },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { role, setRole, notice, notify, warning } = useLibrary();
  const [motionPreference, setMotionPreference] = useState(true);
  const [systemReducedMotion, setSystemReducedMotion] = useState(true);
  const mainRef = useRef<HTMLElement>(null);
  const motionEnabled = motionPreference && !systemReducedMotion;

  useEffect(() => {
    const media = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    const syncSystemPreference = () => setSystemReducedMotion(media?.matches ?? false);
    syncSystemPreference();

    try {
      const saved = window.localStorage.getItem(MOTION_STORAGE_KEY);
      if (saved === 'off' || saved === 'on') setMotionPreference(saved === 'on');
    } catch {
      // The preference remains usable for this visit when browser storage is unavailable.
    }

    media?.addEventListener?.('change', syncSystemPreference);
    return () => media?.removeEventListener?.('change', syncSystemPreference);
  }, []);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    const showPendingContent = () => {
      main.querySelectorAll<HTMLElement>('[data-reveal-state="pending"]').forEach(element => {
        element.dataset.revealState = 'visible';
      });
    };

    if (!motionEnabled || typeof window.IntersectionObserver !== 'function') {
      showPendingContent();
      return;
    }

    const observed = new WeakSet<HTMLElement>();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).dataset.revealState = 'visible';
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });

    const observeElement = (element: HTMLElement) => {
      if (observed.has(element)) return;
      observed.add(element);
      const bounds = element.getBoundingClientRect();
      if (bounds.top < window.innerHeight - 24 && bounds.bottom >= 0) {
        element.dataset.revealState = 'visible';
        return;
      }
      element.dataset.revealState = 'pending';
      observer.observe(element);
    };

    const observeContent = (container: HTMLElement) => {
      if (container.matches(revealSelector)) observeElement(container);
      container.querySelectorAll<HTMLElement>(revealSelector).forEach(observeElement);
    };

    observeContent(main);
    const mutations = typeof window.MutationObserver === 'function'
      ? new MutationObserver(records => {
        records.forEach(record => record.addedNodes.forEach(node => {
          if (node instanceof HTMLElement) observeContent(node);
        }));
      })
      : null;
    mutations?.observe(main, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations?.disconnect();
      showPendingContent();
    };
  }, [motionEnabled, pathname]);

  function toggleMotion() {
    const nextPreference = !motionPreference;
    setMotionPreference(nextPreference);
    try {
      window.localStorage.setItem(MOTION_STORAGE_KEY, nextPreference ? 'on' : 'off');
    } catch {
      // Motion can still be paused without persistent browser storage.
    }
  }

  return <>
    <a href="#main" className="skip-link">본문으로 건너뛰기</a>
    <div className="demo-banner">
      <span className="demo-dot" /> 시연용 프로토타입 · 실계정 인증 없음 · 가상 데이터
      <span className="banner-divider">|</span><span>국악 교육 전자도서관</span>
    </div>
    <div className="app-shell" data-motion={motionEnabled ? 'on' : 'off'}>
      <aside className="sidebar no-print">
        <Link href="/" className="brand" aria-label="국악의 서재 홈">
          <span className="brand-mark"><BookOpen size={26} /></span>
          <span>국악의 서재<small>LESSON DESIGNER</small></span>
        </Link>
        <div className="side-caption">우리 소리와 가까워지는 시간</div>
        <nav aria-label="주 메뉴">
          {nav.map((item, index) => <Link
            key={item.href}
            href={item.href}
            aria-current={pathname === item.href ? 'page' : undefined}
            className={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)) ? 'nav-item active' : 'nav-item'}
          >
            <item.icon size={21} />
            <span className="nav-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            {item.text}
            {item.href === '/bookmarks' && <span className="nav-small">저장</span>}
          </Link>)}
        </nav>
        <div className="side-bottom">
          <div className="side-note">
            <Leaf size={20} /><strong>천천히, 깊이 배우는<br />우리 음악의 시간.</strong>
            <p>자료를 펼치고<br />나만의 수업을 준비하세요.</p>
          </div>
          <Link className="nav-item" href="/admin/resources"><SlidersHorizontal size={20} />자료 관리<ArrowUpRight size={16} /></Link>
          <small>레슨 디자이너 · 국악 에디션</small>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar no-print">
          <span className="topbar-context">레슨 디자이너 <span>/</span> 국악 교육</span>
          <div className="topbar-actions">
            <button
              type="button"
              className="motion-toggle"
              aria-label="화면 움직임"
              aria-pressed={motionEnabled}
              title={systemReducedMotion ? '기기의 동작 줄이기 설정에 따라 움직임이 꺼져 있습니다.' : '화면 애니메이션 켜기 또는 끄기'}
              onClick={toggleMotion}
            >
              {motionEnabled ? <Pause size={14} aria-hidden="true" /> : <Waves size={15} aria-hidden="true" />}
              <span>{motionEnabled ? '움직임 켜짐' : '움직임 꺼짐'}</span>
            </button>
            <label className="role-control">시연 모드
              <select aria-label="시연 역할" value={role} onChange={event => setRole(event.target.value)}>
                <option value="student">익명 학생</option>
                <option value="teacher">교사</option>
                <option value="reviewer">검수자</option>
                <option value="editor">편집 관리자</option>
              </select>
            </label>
          </div>
        </header>
        {warning && <div className="storage-warning" role="alert">{warning}</div>}
        {notice && <div className="toast no-print" role="status">
          <span>{notice}</span>
          <button className="icon-button" aria-label="알림 닫기" onClick={() => notify('')}><X size={19} /></button>
        </div>}
        <main id="main" tabIndex={-1} ref={mainRef}>{children}</main>
        <footer className="footer">
          <span>국악의 서재 <b>·</b> 한 장씩, 나의 소리를 찾아가는 시간</span>
          <span>브라우저에만 저장 · 가상 역할은 실제 접근 권한이 아닙니다</span>
        </footer>
      </div>
    </div>
  </>;
}
