# 최종 검사 보고서

검사일: 2026-10-14. 대상: 국악의 서재 v1.0.0 로컬 시연 소스. 마지막 기능 코드 통합 후 `python3 scripts/verify.py`를 실제 실행했다. **자동 테스트 126/126, 린트·타입·프로덕션 빌드·추출기 안전 검사 통과**. 브라우저 E2E는 실행하지 않았다.

## 환경과 증거

Node.js 24.19.0, npm 11.9.0, Next.js 16.4.0, React 19.2.0, TypeScript 5.9.3, Vitest 3.2.7, React Testing Library 16.3.3, jsdom 26, Playwright Test 1.64.1. 정확한 의존성은 `package-lock.json`에 고정되어 있다.

명령별 시작 시각·종료 코드·출력은 `docs/verification.log`, 구조화된 결과는 `docs/verification-results.json`이다. 아래 시각은 UTC이며 한국 시각은 9시간을 더한다. 검사 실행기 내부의 Vitest 시계 표시보다 기록기의 ISO 시작 시각을 기준으로 삼았다.

| 실제 명령 | UTC 시작 | 소요 | 결과 |
|---|---|---:|---|
| `npm run lint` | 12:44:02 | 5.12초 | PASS · exit 0 |
| `npm run typecheck` | 12:44:07 | 2.69초 | PASS · exit 0 |
| `npm test` | 12:44:10 | 5.24초 | PASS · 6파일 126개, skip 0 |
| `npm run build` | 12:44:15 | 8.52초 | PASS · Next.js 프로덕션 빌드 |
| `python3 scripts/extract_pptx.py --self-test` | 12:44:24 | 0.05초 | PASS · 정상 추출·출력 불변·위험 입력 10종 |

빌드 과정에서 Next.js가 `tsconfig.json`의 include에 `.next/dev/types/**/*.ts`를 추가했다. 이 생성 결과까지 반영한 뒤 `npm run typecheck`를 한 번 더 실행해 exit 0을 확인했다. 이후 기능 코드와 테스트는 변경하지 않고 문서·패키징만 마무리했다.

npm의 환경 설정 `http-proxy` 경고는 실행 환경에서 발생했으며 명령 실패는 없었다. 빌드 성공은 서버 시작·실제 브라우저 렌더링 검증을 의미하지 않는다.

## 테스트 구성

| 파일 | 통과 | 주요 계약 |
|---|---:|---|
| `tests/unit/domain.test.ts` | 38 | 스키마·외래키, 14자료군, Q01–Q12, nullable 악기형, 검수 상태, URL·공개·권리 정책 |
| `tests/unit/repository.test.ts` | 22 | 저장·복구·충돌, 판본·메타데이터 불변, 원자료 보존, 권리·인쇄, 신고·재검수, 백업 |
| `tests/component/bookshelf.test.tsx` | 35 | 14개 책장·목록, 검색과 필터, 실제/합성 통계, URL·북마크 |
| `tests/component/provider-and-shell.test.tsx` | 4 | 저장 실패 경고·메모리 유지, 클래식 키 보존, 역할 시연·알림 |
| `tests/component/reader.test.tsx` | 21 | 직접 주소 차단, 구조화 본문·출처·판본, PDF 없음, 권리, 최근 읽기·복귀 |
| `tests/component/staff.test.tsx` | 6 | 교안 작성·복제·시간 검증, 14/702/본문0 구분, 실제 승인 잠금, 권리 미확인 공개 차단 |
| 합계 | **126** | 단위 60 + 컴포넌트 66 |

수정한 주요 결함은 목표 필터 누락, 리더 경로와 public 쿼리 불일치, PDF 준비중 상태가 구조화 인쇄까지 차단하던 문제, 로컬 이미지 경로 불일치, 일부 표지 대비, 과거 판본의 메타데이터 보존이다. 수정 후 최종 전체 검사를 통과했다. 세부 재현과 CSS 기본 색상 대비 계산은 `QA_FINDINGS.md`를 참조한다.

## 빌드와 원자료 검사

Next.js가 홈·서고·단원·북마크·연습실·교안·관리자 경로와 404를 포함한 14개 라우트 항목을 빌드했다. 정적 페이지 생성은 11/11로 종료했다. 번들 생성과 타입 확인까지가 이번 실행 범위다.

실제 PPTX 14개의 파일 ID·바이트·SHA-256을 기록하고 읽기 전용 XML 추출을 수행했다. 결과는 702슬라이드, XML 문단 9,300개, 자산 참조 245개, 외부 링크 0개다. 이는 음악 내용의 정확성이나 시각 검수 결과가 아니다. 원본과 추출 본문은 앱과 소스 ZIP에 넣지 않았다. 원본 설계서도 변경하지 않았다.

추출기 자체 검사는 합성 ZIP을 대상으로 정상 처리, 기존 출력 덮어쓰기 거부, 위험 경로·외부 엔티티·매크로·크기/개수 제한 등 10종 위험 입력 차단을 확인했다. 원자료 접근 증거와 편집 후보는 `SOURCE_ACCESS.md`, `SOURCE_MANIFEST.json`, `EDITORIAL_CANDIDATES.md`에 있다.

코드 검사에서 외부 AI·분석 SDK·`getUserMedia`·학생정보 전송 코드는 발견되지 않았다. 실제 네트워크 캡처는 수행하지 않았으므로 런타임 네트워크 검증 통과로 표시하지 않는다.

## 미실행 검사

| 항목 | 현재 상태와 이유 |
|---|---|
| Playwright E2E | 28개 시나리오 작성, 0개 실행. 현재 관리형 환경에서 control-browser 기능이 없고 Sites 스킬은 임의 서버·브라우저 설치·우회 실행을 금지한다. skip 통과로 집계하지 않음 |
| 320/360/768/1440/1920px 실제 화면 | CSS 및 시나리오만 준비. 스크린샷·잘림·배치 검증 미실행 |
| 실제 200% 페이지 확대 | 미실행. 작성된 200% 글자 크기 대리 검사는 실제 페이지 확대와 다름 |
| 키보드·native dialog·포커스 복귀 | 일부 이름/역할은 jsdom 검사. 실제 Tab/Shift+Tab/Enter/Escape 동작 미실행 |
| 인쇄 미리보기·PDF·악보/기호·스크린리더 | 권리 명령 검사는 통과. 실제 출력 배치·원본 시각검사·접근성 인증 미실행 |
| `npm start` | 프로덕션 빌드는 통과. 현재 환경에서 서버 시작 미실행 |
| 외부 연습 앱 실사용·호환성 | 미점검 후보 1개와 TODO 13개를 비활성으로 유지. 공개 활성 0개 |
| 실제 콘텐츠·권리 승인 | 실제 승인 0개. 합성 검수 시연을 실제 승인으로 계산하지 않음 |

## 재현

압축을 푼 프로젝트 폴더에서 Node.js 22 이상으로 실행한다. 최초 설치에는 인터넷 연결이 필요하다.

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
python3 scripts/extract_pptx.py --self-test
```

사용자 로컬 환경에서 남은 브라우저 검사를 실행하려면 다음을 사용한다. Playwright 설정이 개발 서버를 관리하므로 같은 포트의 별도 서버와 충돌하지 않는지 확인한다.

```bash
npx playwright install chromium
npm run test:e2e
```

프로덕션 실행은 `npm run build` 후 `npm start`, 수동 검사는 `DEMO_SCRIPT.md`의 책장→상세→단원→교안→연습 준비→출력→오류/검수 순서다. 실제 확대·인쇄·스크린리더와 전 페이지 원본 검사는 별도로 수행해야 한다.
