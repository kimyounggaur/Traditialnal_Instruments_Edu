import Link from 'next/link';
export default function NotFound(){return <section className="empty"><span className="eyebrow">404 · 찾을 수 없는 자료</span><h1>이 책은 서재에 없습니다.</h1><p>주소를 확인하거나 자료 목록에서 다시 선택해주세요.</p><Link className="button" href="/library">서재로 돌아가기</Link></section>}
