# 검사 환경과 재현

- 기준일: 2026-10-14
- Node.js v24.19.0 / npm 11.9.0
- Next.js 16.4.0 / React 19.2.0 / TypeScript 5.9.3
- Vitest 3.2.7 / jsdom 26 / React Testing Library 16.3.3
- Playwright Test 1.64.1: 시나리오만 작성. 브라우저 실행은 하지 않음.
- package-lock.json을 그대로 `npm ci`로 재현.

현재 환경의 Sites 스킬 지침은 managed-linux에서 control-browser가 없으면 임의 서버·브라우저 설치·다른 브라우저 경로를 사용하지 말도록 정한다. 해당 기능이 없어 실제 브라우저 화면/인쇄/200% 페이지 확대/Playwright E2E와 production start는 미실행으로 남겼다. 테스트를 skip 처리한 뒤 통과로 집계하지 않는다.

프로젝트 소스와 Node 기반 검사는 정상 실행 가능하므로 lint/typecheck/Vitest/build/안전 추출기 검사는 실제 실행한다. 최종 결과와 로그는 TEST_REPORT와 verification.log에 있다.
