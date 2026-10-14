'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Library, Bookmark, NotebookPen, AudioLines, SlidersHorizontal, ArrowUpRight, Leaf, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useLibrary } from './provider';
const nav=[{href:'/',text:'나의 서재',icon:Library},{href:'/library',text:'자료 둘러보기',icon:BookOpen},{href:'/practice',text:'연습실',icon:AudioLines},{href:'/teacher/plans',text:'수업 준비',icon:NotebookPen},{href:'/bookmarks',text:'북마크',icon:Bookmark},{href:'/admin/resources',text:'자료 관리',icon:SlidersHorizontal}];
export function Shell({children}:{children:ReactNode}){
 const pathname=usePathname();const {role,setRole,notice,notify,warning}=useLibrary();
 return <><a href="#main" className="skip-link">본문으로 건너뛰기</a><div className="demo-banner"><span className="demo-dot"/> 시연용 프로토타입 · 실계정 인증 없음 · 가상 데이터 <span className="banner-divider">|</span><span>국악 교육 전자도서관</span></div>
 <div className="app-shell"><aside className="sidebar no-print"><Link href="/" className="brand" aria-label="국악의 서재 홈"><span className="brand-mark"><BookOpen size={26}/></span><span>국악의 서재<small>LESSON DESIGNER</small></span></Link><div className="side-caption">우리 음악, 가르침의 시작</div><nav aria-label="주 메뉴">{nav.map(n=><Link key={n.href} href={n.href} aria-current={pathname===n.href?'page':undefined} className={pathname===n.href||(n.href!=='/'&&pathname.startsWith(n.href))?'nav-item active':'nav-item'}><n.icon size={21}/>{n.text}{n.href==='/bookmarks'&&<span className="nav-small">저장</span>}</Link>)}</nav>
 <div className="side-bottom"><div className="side-note"><Leaf size={20}/><strong>천천히, 깊이 배우는<br/>우리 음악의 시간.</strong><p>자료를 펼치고<br/>나만의 수업을 준비하세요.</p></div><Link className="nav-item" href="/admin/resources"><SlidersHorizontal size={20}/>자료 관리<ArrowUpRight size={16}/></Link><small>레슨 디자이너 · 국악 에디션</small></div></aside>
 <div className="workspace"><header className="topbar no-print"><span className="topbar-context">레슨 디자이너 <span>/</span> 국악 교육</span><label className="role-control">시연 모드<select aria-label="시연 역할" value={role} onChange={e=>setRole(e.target.value)}><option value="student">익명 학생</option><option value="teacher">교사</option><option value="reviewer">검수자</option><option value="editor">편집 관리자</option></select></label></header>
 {warning&&<div className="storage-warning" role="alert">{warning}</div>}{notice&&<div className="toast no-print" role="status"><span>{notice}</span><button className="icon-button" aria-label="알림 닫기" onClick={()=>notify('')}><X size={19}/></button></div>}
 <main id="main" tabIndex={-1}>{children}</main><footer className="footer"><span>국악의 서재 <b>·</b> 원자료의 맥락을 지키는 수업 준비</span><span>브라우저에만 저장 · 가상 역할은 실제 접근 권한이 아닙니다</span></footer></div></div></>;
}
