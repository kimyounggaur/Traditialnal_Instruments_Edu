# 구조와 실행 환경

한국어 로컬 시연 앱이며 Next.js App Router + TypeScript + React를 사용한다. 원자료와 클래식 앱은 별도 경로로 보존한다. runtime과 정확한 설치 결과는 package-lock.json을 기준으로 재현한다.

## 2026-10-14 lockfile 관찰

| 도구 | 고정 설치 버전 |
|---|---|
| Next.js | 16.4.0 |
| React | 19.2.0 |
| TypeScript | 5.9.3 |
| Tailwind CSS | 4.3.3 |
| Zod | 4.6.7 |
| Vitest | 3.2.7 |
| React Testing Library | 16.3.3 |
| Playwright test | 1.64.1 |
| ESLint | 9.39.5 |

2026-10-14에 공식 문서의 [App Router](https://nextjs.org/docs/app), [Vitest 안내](https://vitest.dev/guide/), [Playwright 설치/검사](https://playwright.dev/docs/intro), [WCAG 2.2 빠른 참조](https://www.w3.org/WAI/WCAG22/quickref/)를 확인했다. 최신 문서가 설치된 구버전의 모든 API를 보장하지 않으므로 실제 호환성은 이 프로젝트 lockfile과 실행 검사로 확인한다. WCAG 인증을 주장하지 않는다.

## 계층

1. src/app: 라우트·페이지·로딩/오류/404.
2. src/components: 책장/목록/뷰어/교안/검수/공통 UI. 데이터 수정은 repository 명령만 사용.
3. src/domain: 타입·Zod 입력검사·공개/권리 정책·검색·URL 정책·교안·검수 상태기계. 순수 함수로 테스트.
4. src/data: 실제 원자료 메타데이터와 합성 fixture. 실제 원문/스캔/음원 제외.
5. src/repositories: Promise 기반 계약, mock 구현, 브라우저 localStorage 어댑터.
6. scripts/extract_pptx.py: 앱 외부에서 실행하는 읽기 전용 원자료 추출기. 원문 결과를 public/src로 복사하지 않음.

## 저장과 조회

localStorage 키는 gugak-library:v1이다. schemaVersion으로 버전 경계를 두고 복원 완료 전에 seed를 저장하지 않는다. SSR에서는 window/localStorage에 접근하지 않는다. 손상/차단/할당량 오류는 화면을 유지하며 저장 불가 상태를 알린다.

audience public/demo/admin을 분리하되 역할 선택은 실보안이 아니다. 실제 공개 판정은 목록, 단일 ID, 단원, 북마크/교안 참조, 인쇄 등 모든 통로에서 반복 사용한다. source_unreviewed는 승인 필드를 위조해도 공개하지 않는다. 합성 자료는 별도의 demo 정책을 사용한다.

쓰기에는 expectedRevision과 commandId를 적용한다. 충돌은 사용자 편집을 덮어쓰지 않고 복사/다시 읽기 안내로 처리한다. 이벤트는 append-only 방식이지만 localStorage는 변조 방지 감사 저장소가 아니다.

## 원자료 경계

원본 PPTX 14개는 Drive에서 읽기만 수행했다. 702슬라이드의 XML 텍스트를 로컬 비공개 작업 폴더에 불변 JSON으로 추출했다. 앱에는 ID/이름/해시/수량/관찰상태만 기록한다. 원본은 수정하지 않았으며 OCR·렌더링·교육/권리 검토·PDF 변환을 수행하지 않았다. SOURCE_ACCESS.md를 참조한다.

## 서버 전환 조건

현재 데이터 계약과 repository 인터페이스를 유지해 서버 어댑터를 추가한다. 실제 계정·역할의 서버 권한, 불변판본·감사·충돌, 권리별 파일 접근, 백업/복구·삭제·보관정책이 먼저 필요하다. 미성년자 개인정보와 비용/동의, 외부 앱 API·SSO·권한은 별도 설계 대상이다. 이번 작업은 DB/키/OAuth/유료서비스/계정/배포를 생성하지 않는다.
