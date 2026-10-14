'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <section className="empty"><h1>화면을 불러오지 못했습니다.</h1><p>저장된 자료는 유지됩니다. 다시 열어주세요.</p><button className="button" onClick={reset}>다시 시도</button></section>}
