# 국악기 교육 전자도서관: 단계별 바이브코딩 프롬프트팩

레슨 디자이너 · 한국어 로컬 프로토타입 · v1.0 · 2026-10-14

> 클래식 악기 교육 전자도서관의 조사 → 설계 → 원자료 구조화 → 화면 구현 → 교안 → 검수 → 회귀검사 → 인수 흐름을 국악 자료에 적용한 새 프로젝트용 실행 문서입니다. 이 문서의 작성은 새 앱 구현·배포·전문가 승인 완료를 뜻하지 않습니다. 실제 구현 결과는 별도 테스트 보고서로 확인합니다.

## 목차
1. 실행 방법과 원칙
2. 확인된 원자료와 범위
3. 화면·요구사항
4. 기술 구성과 파일 구조
5. 국악 데이터 계약과 편집 파이프라인
6. 통합 마스터 프롬프트
7. P00–P11 순차 구현 프롬프트
8. 테스트와 완료 기준
9. 수정·재개·전문가 검수 프롬프트
10. 후속 실서비스 전환
11. 원자료 인벤토리와 근거

## 1. 실행 방법과 원칙

### 한 단계씩 만들기
1. 국악 전용 새 작업 폴더를 엽니다. 기존 클래식 프로젝트의 파일·데이터·배포 주소를 덮어쓰지 않습니다.
2. 이 파일을 프로젝트 루트의 PROMPT_PACK.md로 저장합니다.
3. P00부터 한 블록씩 코딩 AI에 전달합니다. 앞 단계의 실제 산출물과 테스트를 확인한 후 다음 단계로 갑니다.
4. 전체 일괄 실행은 6장의 통합 마스터를 사용합니다. 두 작업창에서 같은 프로젝트를 동시에 생성하지 않습니다.
5. 오류가 있으면 9장의 수정 프롬프트와 실제 로그를 사용합니다. 비밀값·학생 개인정보는 로그에서 제거합니다.
6. 최종 결과는 로컬 실행 안내, 실제 동작, 시험 결과, 미검증 내용, 남은 승인 사항으로 받습니다.

### 매 단계 응답 계약
변경 파일 / 실행 명령과 성공·실패·미실행 / 화면 확인법 / 남은 문제 / 다음 단계를 보고합니다. docs/STATUS.md에 실제 증거를 남깁니다. 빌드 통과와 음악 내용의 정확성은 다른 검증입니다.

### 재사용과 분리
클래식의 검색·뷰어·저장·수업안·권리·판본·검수·테스트 패턴을 재사용합니다. 악기 목록, 콘텐츠 수량, 앱 목록, 운지, 조율, 음역, 교재 본문을 단순 문자열 치환으로 복제하지 않습니다. 국악 namespace는 gugak-library이며 기존 lesson-designer-library 저장 키와 충돌하지 않아야 합니다.

## 2. 확인된 원자료와 범위

### 출발점
- 클래식 프롬프트 기준 파일: https://drive.google.com/file/d/1U9_lnsl_Cwra95tdoYrUGR45j16YZJ7r/view
- 국악 실제 업로드 폴더: https://drive.google.com/drive/folders/1JZsTqjE9YeQL8cUX_Zcg-9K7-AzH9c6M
- 국악 원자료는 PPTX 14개 자료군입니다. 타악기·사물놀이는 단일 악기 이름이 아니라 묶음 범주입니다.
- 파일 수, 악기 자료군 수, 슬라이드 수, 편집 단원 수, 승인 레슨 수, 앱 수는 각각 집계합니다. 파일 하나를 레슨 하나로 계산하지 않습니다.
- 추출 가능한 텍스트는 원문 관찰이며 OCR·도식·악보·운지·저작권·전문가 정확성을 검증했다는 뜻이 아닙니다.
- 실제 음악 내용 승인과 권리 확인 증거가 없으면 초안, 미검수, 비공개로 시작합니다.

### 제품 범위
P0: 14개 자료군 내비게이션, 원자료 인벤토리, 검색·필터, 상세·단원 뷰어, 북마크·이어보기, 익명 학생 탐색, 교사 수업안, 관리자 콘텐츠 편집, 검수·권리·판본·오류 신고, 로컬 저장, 인쇄, 접근성, 자동 테스트.
P1: 사용자가 확인한 연습 웹앱의 링크 등록, 장단·정간보 자료 표시 보강, 승인 자료의 근거 검색. 링크만으로 앱의 학습 효과를 인증하지 않습니다.
P2: 실제 계정·서버 권한·다중 사용자·공동 편집·학생 서비스·AI·앱 API/SSO·공개 배포. 별도 요구와 검토가 필요합니다.

### 수량의 정직성
| 항목 | 출발값 | 의미 |
|---|---:|---|
| 원자료 PPTX | 14 | 실제 업로드 파일 |
| 주 탐색 자료군 | 14 | 타악기·사물놀이 묶음 포함 |
| 실제 승인 레슨 | 0 | 승인 증거 제공 전 기준 |
| 공개 활성 연습 앱 | 0 | 안전·내용·호환성 점검 전 기준 |
| 편집 단원 | 미확정 | 실제 목차·슬라이드 매핑 후 결정 |
| 합성 시연 자료 | 14개 제안 | 자료군마다 1개, 실제 교재와 별도 |
| 합성 시연 단원 | 28개 제안 | 시연 자료당 중립 UI 단원 2개 |
| 합성 시연 교안 | 14개 제안 | 자료군마다 1개, 교육 승인 아님 |

14/28/14는 개발 fixture 목표입니다. ‘완성된 국악 교재·레슨 수’로 표시하지 않습니다. 클래식 프로젝트의 콘텐츠·앱 수량은 가져오지 않습니다.
## 3. 화면·요구사항

### 사용자와 시연 모드
- 학생(익명 시연): 승인 공개자료 또는 분리된 합성 데모 탐색·북마크. 이름·학교·점수·녹음 수집 없음.
- 교사: 승인·공개 가능한 자료 검색, 수업안 편집·저장·복제·출력, 오류 신고.
- 검수자: 배정 자료 확인, 위치별 의견, 재검수. 프로토타입에서는 가상 역할입니다.
- 편집 관리자: 메타데이터/앱 후보 관리, 검수 의뢰·수정, 공개 여부 관리.
- 모든 화면 상단: ‘시연용 프로토타입 · 실계정 인증 없음 · 가상 데이터’.
- 역할 전환 스위치는 화면 시연 장치입니다. 실제 보안 경계가 아니며 정적 번들에 포함된 데이터는 비밀이 아닙니다. 실제 미공개 교재·민감 자료는 넣지 않습니다.

### 정보 구조
| 경로 | 주요 구성 | 핵심 행동/예외 |
|---|---|---|
| `/` | 14개 자료군 선택, 이어보기, 수업 준비 바로가기 | 기록 없으면 시작 안내, 삭제된 자료면 이어보기 초기화 |
| `/library` | 검색, 자료군/악기형/기보법/장단/종류/난이도/목표 필터, 정렬, 결과수 | URL query 반영, 초기화, 검색 0건 안내 |
| `/library/[resourceId]` | 설명, 출처·권리·버전·검수 범위, 단원 | 없는 ID는 404, 보류된 자료는 사용 중지 안내 |
| `/library/[resourceId]/units/[unitId]` | 목차, 본문/도식/대체텍스트, 확대 | 전후 단원, 북마크, 앱 연결, 오류 신고 |
| `/practice` | 악기별 앱 카드, 학습목표, 검증·호환성 표시 | 외부 새 탭, 복귀 안내, 정적 대체 자료 |
| `/bookmarks` | 북마크·최근 자료 | 빈 상태, 해제, 상태 변경 경고 |
| `/teacher/plans` | 저장 교안 목록 | 새로 만들기, 복제, 제목 검색 |
| `/teacher/plans/[planId]` | 목표·대상수준·시간·준비물·활동 편집 | 자료 버전 고정, 총시간, 저장·출력 |
| `/admin/resources` | 초안 포함 메타데이터 목록 | 편집/검수 요청, 권리 누락 경고 |
| `/admin/apps` | 확인된 후보, 악기체계·URL·상태·단원 연결 | URL 검증, 중복 검사, 점검 증거 기록 |
| `/admin/reviews/[resourceId]` | 버전 비교, 지적·수정·재검토 이력 | 상태 전이 조건, 반려 사유, 공개 차단 |
| `/admin/issues` | 위치별 오류 신고 목록 | 심각도·처리상태, 안전 이슈 보류 |

### 필수 요구사항 ID
- R01 자료군: 5장의 14개 ID만 주 내비게이션. 타악기·사물놀이는 묶음으로 표시. 장구 자료와 사물놀이 내 장구 파트를 별도로 연결하며 중복 집계하지 않음.
- R02 목록: 검색어는 제목·주제어·목표·설명에 적용. 여러 필터는 AND, 같은 필터의 다중 선택은 OR. 공백 정리, Unicode 정규화, 영문 대소문자 무시. URL 복원과 브라우저 뒤로가기 지원.
- R03 종류: 교재/악보/도식/활동자료/수업안. 파일 없는 항목에 가짜 다운로드 버튼 금지.
- R04 공개: 실제 자료는 해당 버전의 승인+권리확인+필수 메타데이터+공개 상태가 모두 있어야 공개 가능. 이 조건은 UI만 아니라 데이터 조회/명령 함수에서 검사.
- R05 상세: 검수자 표기는 동의된 표시명만, 검수 범위·버전·날짜를 분리. 미검수는 ‘교육 내용 검수 전’.
- R06 단원: 본문은 정제된 구조화 블록. 외부 HTML/스크립트 실행 금지. 이미지 alt, 악보 확대와 텍스트 안내, 음원 수동 재생.
- R07 저장: 북마크/최근 위치/수업안은 이 브라우저에만 저장. 새로고침 유지, 스키마 버전, 저장 실패/손상 복구/초기화 확인.
- R08 연습 앱: 외부 링크와 단원 연결만. 열었다고 연습 완료·점수·학습효과 기록 금지.
- R09 교안: 시간 합계가 전체 시간과 맞지 않으면 수정 안내. 인쇄에 출처·버전·데모 여부 포함.
- R10 관리자: URL, 난이도, 단원 매핑, 검수/권리/공개 상태 편집. 임의 승인 드롭다운 금지.
- R11 검수: 위치별 중대/일반 의견, 근거, 수정, 재검수, 승인/반려, 버전 변경 이력.
- R12 안전: 카메라·마이크·위치 권한 요청 없음. 실아동 데이터/분석 SDK/외부 AI 요청 없음.
- R13 접근성: 한국어 문서 언어, 키보드, focus, 레이블, 오류 안내, 명암, 텍스트 확대, 반응형.
- R14 정직성: 샘플 승인은 ‘승인 흐름 시연’으로 별도 표기. 실제 승인·성과 총계와 합산 금지.

### UI 제안
따뜻한 종이색 배경, 진한 남색 본문, 악기별 색은 보조 표식으로만 사용합니다. 기본 본문 18px, 줄간격 1.6, 넓은 행간·여백, 읽기 본문 최대 약 72ch, 핵심 버튼 최소 44×44px을 목표로 합니다. 본문 일반 텍스트 명암비 4.5:1, 큰 글자 3:1 이상을 확인합니다. 글자 크기는 사용자 확대 설정을 존중합니다. 360px 모바일, 768px 태블릿, 1440px 데스크톱, 1920px 교실 화면을 확인하고 200% 확대 시 기능이 잘리지 않게 합니다. 애니메이션은 최소화하고 `prefers-reduced-motion`을 반영합니다.

## 4. 기술 구성과 파일 구조

### 기본 선택
신규 프로젝트는 Next.js App Router + TypeScript + Tailwind CSS + Zod + Vitest + React Testing Library + Playwright로 제안합니다. Next.js는 목록/상세 라우팅과 추후 서버 저장소 분리를 위한 선택입니다. 초기에는 외부 백엔드 없이 동작합니다. 아이콘 라이브러리는 이미 있으면 재사용하고 새 의존성은 필요한 것만 추가합니다.

이 문서는 특정 버전을 ‘최신’으로 고정하지 않습니다. 구현일의 공식 문서와 저장소 lockfile을 확인하고 호환되는 버전을 정한 뒤 정확한 버전을 기록합니다. 기존 Vite/React 프로젝트가 있으면 Next.js로 무조건 이전하지 않습니다. 기능과 데이터 계약을 기존 라우터·스타일·테스트 체계에 맞게 적용하고 큰 이전은 별도 제안합니다.

기본 mock은 Promise 기반 repository 인터페이스로 읽기/쓰기합니다. localStorage는 브라우저 전용 어댑터에서만 접근하며 SSR 중 접근하지 않습니다. 초기 로딩/복원 완료 상태를 분리해 hydration 불일치와 첫 렌더의 저장 덮어쓰기를 막습니다. Zustand 등 전역 상태 라이브러리는 필요성이 확인될 때만 사용합니다.

### 권장 구조: 기존 프로젝트에서는 동등한 구조로 매핑
```text
gugak-library/
  PROMPT_PACK.md
  README.md
  docs/
    SPEC.md  ARCHITECTURE.md  DATA_CONTRACT.md
    SOURCE_MANIFEST.md  ASSET_RIGHTS.md  STATUS.md
    TEST_REPORT.md  DEMO_SCRIPT.md  HANDOFF.md
  public/demo/                  # 자체 만든 중립 데모 도식만
  src/app/
    layout.tsx  page.tsx  globals.css
    library/page.tsx
    library/[resourceId]/page.tsx
    library/[resourceId]/units/[unitId]/page.tsx
    practice/page.tsx  bookmarks/page.tsx
    teacher/plans/page.tsx
    teacher/plans/[planId]/page.tsx
    admin/resources/page.tsx  admin/apps/page.tsx
    admin/reviews/[resourceId]/page.tsx  admin/issues/page.tsx
    loading.tsx  error.tsx  not-found.tsx
  src/components/
    layout/  library/  viewer/  practice/  lesson-plan/  review/  ui/
  src/domain/
    schemas.ts  types.ts  visibility.ts  review-machine.ts
    search.ts  url-policy.ts  lesson-plan.ts
  src/data/
    source-manifest.json  editorial-units.json  app-catalog.json
    demo-fixtures.ts  seed.ts
  src/repositories/
    contracts.ts  mock-repository.ts  local-storage.ts  index.ts
  src/hooks/  src/lib/
  tests/unit/  tests/component/  tests/e2e/
  package.json  [package-manager-lockfile]
```

화면 컴포넌트가 seed 배열이나 localStorage를 직접 고치지 않고 repository 명령을 호출하게 합니다. URL 정책·공개 조건·상태 전이는 순수 함수로 분리해 테스트합니다.


### 국악 추가 요구사항
- R15 원자료 추적: 파일 ID, 파일 버전/해시, 원본 슬라이드 번호와 추출 블록 위치를 보존. 화면의 편집 단원 번호를 원본 페이지 번호로 속이지 않음.
- R16 악기형: 가야금·아쟁 등의 악기형, 현수, 조율·음역은 미확정 값 허용. 악기명만으로 모든 모델에 운지를 적용하지 않음.
- R17 기보: 정간보·오선보·율자/구음·혼합·기타·미확인 구분. 정간보는 읽기 방향·정간/행/대강 구조와 원문 근거를 저장. 자동 변환 정답 판정 금지.
- R18 장단: 이름만으로 고정 박자·BPM·구음·강세를 채우지 않음. 장단형·전승/악곡 문맥·분박·한배·구음 출처를 독립 필드로 보존.
- R19 편집: 원문 추출 텍스트와 편집 원고를 분리하며 원문 덮어쓰기 금지. 편집 저장은 초안, 음악·권리 검토 이후 공개 가능.
- R20 일치성: 단원과 앱의 자료군·악기형·기보·학습 목표가 맞지 않거나 미확인인 경우 학생 연습 연결 비활성.

## 5. 국악 데이터 계약과 편집 파이프라인

### 악기 자료군 사전
| ID | 표시명 | 탐색 분류 제안 | 모델 확인 질문 |
|---|---|---|---|
| gayageum | 가야금 | 현악 | 정악/산조/개량형, 현수·조율·곡목? |
| geomungo | 거문고 | 현악 | 악기형, 조현·괘·줄·술대 표기? |
| daegeum | 대금 | 관악 | 정악/산조형과 운지·기준음 문맥? |
| danso | 단소 | 관악 | 모델·조율·율명/실음 대응? |
| saenghwang | 생황 | 관악 | 관수·모델·음 배열·운지체계? |
| sogeum | 소금 | 관악 | 대금/단소 운지를 그대로 혼용하지 않는가? |
| ajaeng | 아쟁 | 현악 | 정악/산조/개량형, 현수·활/발현 문맥? |
| yanggeum | 양금 | 현악 | 채로 줄을 치는 타현; 음 배열·조율 출처? |
| janggu | 장구 | 타악 | 반주/사물놀이 등 문맥, 채·구음·장단형? |
| cheolhyeongeum | 철현금 | 현악 | 악기형·조율·연주 도구·주법 출처? |
| taepyeongso | 태평소 | 관악 | 서·호흡·운지·음역의 모델과 문맥? |
| piri | 피리 | 관악 | 향/세/당피리 등 악기형·서·운지 문맥? |
| percussion-samulnori | 타악기·사물놀이 | 묶음 | 북·장구·징·꽹과리 등 실제 수록 파트? |
| haegeum | 해금 | 현악 | 조율 기준·줄/손 위치·활 설명 근거? |

이 표의 세 분류는 웹 탐색 편의를 위한 제안입니다. 팔음 분류나 모든 학술 분류를 대체하지 않습니다. 원문 분류는 originalClassification에 보존합니다. 양금은 타현 악기이므로 ‘채를 사용한다’는 이유로 현악 속성을 삭제하지 않습니다. 근거: 국립국악원 양금 항목(11장).

### 원본→편집→공개 파이프라인
1. 파일 메타데이터를 manifest에 등록합니다. 실제 원본 파일은 불변으로 보존합니다.
2. PPTX를 안전하게 읽어 슬라이드 순서, 텍스트, 도형/이미지 참조, 노트, 외부 링크를 추출합니다. XML 외부 엔티티·매크로·외부 링크 자동 실행 금지, ZIP 크기/개수 제한을 둡니다.
3. 이미지·악보 안의 글자는 텍스트 추출만으로 확인한 것으로 표시하지 않습니다. OCR은 별도 결과와 confidence·검수 상태를 보존합니다.
4. 원문 슬라이드 묶음에서 편집 단원 후보를 만듭니다. 표지/목차/빈 페이지는 레슨으로 세지 않습니다. 한 단원은 여러 슬라이드 참조 가능.
5. 관리자 편집자는 원문과 편집 원고를 나란히 비교합니다. 맞춤법 수정도 변경 이력에 남깁니다. AI가 보완한 내용은 ai_assisted로 표시하고 새 근거가 없으면 확인 필요.
6. 음악·교육·안전 검토와 권리 검토를 분리합니다. 원본 업로드는 출판·배포 허락의 증명이 아닙니다.
7. 승인된 정확한 버전만 공개합니다. 개정은 새 draft를 만들며 교안에 쓰인 구판은 자동 교체하지 않습니다.

### 최소 타입 계약
아래는 구현용 기준이며 Zod 스키마로 런타임 입력도 검증합니다. ID는 안정적인 문자열, 시간은 ISO 8601, 알 수 없는 값은 null로 두고 추정값을 채우지 않습니다.

```typescript
type Instrument = 'gayageum'|'geomungo'|'daegeum'|'danso'|'saenghwang'|'sogeum'|'ajaeng'|'yanggeum'|'janggu'|'cheolhyeongeum'|'taepyeongso'|'piri'|'percussion-samulnori'|'haegeum';
type ReviewState = 'draft' | 'in_review' | 'changes_requested'
  | 're_review' | 'approved' | 'rejected';
type PublicationState = 'private' | 'published' | 'on_hold';
type RightsState = 'unknown' | 'pending' | 'cleared' | 'restricted';
type DatasetKind = 'source_unreviewed' | 'synthetic_demo' | 'reviewed_real';
type LinkStatus = 'todo' | 'unchecked' | 'available' | 'broken' | 'restricted';
interface SourceRef {
  id: string; title: string; url: string | null;
  chapter: string | null; pageRange: string | null;
  originalFieldName?: string;
}
interface RightsRecord {
  state: RightsState; holder: string | null; license: string | null;
  evidenceRef: string | null; allowView: boolean; allowPrint: boolean;
  allowDownload: boolean; allowRedistribute: boolean;
  checkedAt: string | null; checkedBy: string | null;
}
interface Resource {
  id: string; title: string; instrument: Instrument;
  instrumentSystem: string; kind: 'textbook'|'score'|'diagram'|'activity';
  level: 1|2|3|null; objectives: string[]; topics: string[];
  prerequisites: string[]; estimatedMinutes: number;
  datasetKind: DatasetKind; currentDraftVersionId: string;
  publishedVersionId: string | null; publicationState: PublicationState;
  sourceRefs: SourceRef[]; editorialUnitIds: string[]; modulePlanIds: string[];
}
interface ResourceVersion {
  id: string; resourceId: string; version: string;
  reviewState: ReviewState; rights: RightsRecord; unitIds: string[];
  aiUsage: string; reviewScope: string | null;
  reviewerDisplayName: string | null; reviewerNameConsent: boolean;
  reviewedAt: string | null; approvedBy: string | null;
  approvedAt: string | null; approvalEvidenceRef: string | null;
  basedOnVersionId: string | null; changeSummary: string;
  revision: number; createdAt: string;
}
interface Unit {
  id: string; resourceVersionId: string; order: number; title: string;
  blocks: Array<{ id: string; type: 'paragraph'|'image'|'score'|'audio'|'jeonggan'|'gugak_notation';
    text?: string; src?: string; alt?: string; caption?: string }>;
  appLinkIds: string[];
}
interface AppLink {
  id: string; title: string; url: string | null; sourceDocumentUrl: string;
  instruments: Instrument[]; instrumentSystem: string | null;
  scope: 'mvp_candidate'|'common_tool'|'other'|'excluded_mismatch';
  purpose: string; level: number | null; status: LinkStatus;
  checkedAt: string | null; checkEvidence: string | null;
  contentAccuracyChecked: boolean; requiresCamera: 'yes'|'no'|'unknown';
  requiresLogin: 'yes'|'no'|'unknown'; enabled: boolean;
  fallbackResourceId: string | null;
}
interface ModulePlan {
  id: string; instrument: Instrument; slot: number;
  title: string; editorialUnitIds: string[]; mappingState: 'proposed'|'reviewed';
}
interface ReviewIssue {
  id: string; resourceId: string; versionId: string; unitId: string | null;
  blockId: string | null; category: 'music'|'pedagogy'|'safety'|'rights'|'other';
  severity: 'critical'|'major'|'minor'; description: string;
  evidence: string; suggestion: string; resolution: string | null;
  status: 'open'|'fixed'|'verified'|'dismissed'; dismissalReason: string | null;
}
interface ReviewEvent {
  id: string; resourceId: string; versionId: string;
  from: ReviewState; to: ReviewState; actorId: string; role: string;
  reason: string; at: string; snapshotRevision: number;
}
interface LessonPlan {
  id: string; title: string; instrument: Instrument; targetLevel: 1|2|3;
  objectives: string[]; durationMinutes: number; materials: string[];
  activities: Array<{ id: string; phase: 'intro'|'main'|'wrapup';
    title: string; minutes: number; teacherNotes: string; alternative: string;
    resources: Array<{resourceId: string; versionId: string; unitId: string}>;
    appLinkIds: string[] }>;
  isDemo: boolean; updatedAt: string; revision: number;
}
interface Bookmark { resourceId: string; versionId: string; unitId: string | null }
interface ReadingPosition { resourceId: string; versionId: string; unitId: string; updatedAt: string }
```

학생·학교·성적·얼굴·음성 테이블은 만들지 않습니다. 교안 targetLevel은 자료 난이도이며 실제 학생 진단이 아닙니다. `ReviewIssue.fixed`는 수정자가 고쳤다는 주장이고 `verified`는 재검수 확인이므로 분리합니다. 변경 이력은 mock에서도 기존 이벤트 수정/삭제 대신 새 이벤트를 추가합니다. 그러나 localStorage는 위·변조 방지 감사 저장소가 아니므로 실제 감사 증거로 쓰지 않습니다.

### 공개 판정
`canPublish(version, resource, issues)`는 다음을 모두 확인합니다.
1. 실제 콘텐츠는 `reviewed_real`, 검수 `approved`, 승인 증빙/승인자/일시/범위가 존재.
2. 권리 `cleared`와 열람 허용, 필수 출처/악기체계/수준/단원 메타데이터 충족.
3. 해당 버전에 미해결 critical/major 지적 없음. dismissed는 사유 필수이며 안전·핵심 음악 이슈를 편집자 혼자 무시할 수 없음.
4. 공개 상태가 published이고 승인된 해당 versionId와 일치.
5. 일반 공개 조회에는 이 판정만 통과. 교안·북마크의 직접 ID 조회에도 동일 적용.

합성 데모는 별도 `demoVisible` 판정으로 시연 서고에만 보입니다. 공개 승인 함수를 우회해 실제 승인으로 만들지 않습니다. 기본 화면에서 ‘데모 서고’임을 계속 알리고, ‘실자료 공개 보기’는 승인 자료가 아직 없으면 정직하게 0건을 표시합니다. 실제 원자료 초안은 관리자 메타데이터 목록에만 있습니다. 원문 내용은 권리와 검수 확인 전 공개하지 않습니다.

### 검수 상태 전이
| 현재 | 행동/다음 | 조건 |
|---|---|---|
| draft | 검토 요청 → in_review | 버전·출처·검토범위 존재, 검수자 역할 배정 |
| in_review | 수정 요청 → changes_requested | 위치·심각도·근거·수정요청 기록 |
| changes_requested | 수정 제출 → re_review | 새 버전/수정내역, 각 지적에 응답 |
| re_review | 재수정 → changes_requested | 미해결 지적 기록 |
| in_review/re_review | 승인 → approved | 실제 승인 증거와 미해결 중대 오류 0, 검수 범위 명시 |
| in_review/re_review | 반려 → rejected | 반려 사유 필수 |
| rejected | 새 초안 버전 생성 → draft | 기존 버전 보존, 새 ID와 수정 요약 |
| approved | 내용 개정 → 새 draft | 기존 승인 버전 불변, 승인 승계 금지 |

승인과 공개는 별도 행동입니다. 권리 확인 전에는 승인되었어도 공개할 수 없습니다. 안전/중대 오류 신고가 들어오면 해당 공개본을 on_hold로 전환하는 시연을 제공하고, 교안에서 ‘보류된 자료 사용 중’ 경고를 띄웁니다. 새 판본을 저장했다고 기존 교안 버전을 몰래 바꾸지 않습니다. ‘새 판본 비교 후 적용’은 교사가 선택합니다.

### 저장소 계약
`listResources(query, audience)`, `getResource(id, versionId, audience)`, `getUnit(...)`, `listApps(...)`, `saveLessonPlan(plan, expectedRevision)`, `toggleBookmark(...)`, `recordReadingPosition(...)`, `transitionReview(command, expectedRevision)`, `reportIssue(...)`, `updateApp(...)`를 정의합니다. 모든 읽기와 쓰기는 Promise를 반환하고 `not_found`, `validation_error`, `storage_unavailable`, `conflict`, `not_allowed` 오류를 UI에서 구분합니다. double-click 중복 이벤트를 막고 수정 revision 충돌 시 덮어쓰기 대신 새로고침/복사 안내를 제공합니다.


ModulePlan은 선택적 편집 기획 레코드이며 고정 개수나 슬롯 수가 없습니다. source/편집 단원/자료 판본과 각각 별도 집계합니다.

### 원자료·국악 추가 타입
```typescript
type EvidenceState = 'unconfirmed'|'source_observed'|'expert_reviewed';
type NotationKind = 'jeongganbo'|'staff'|'yulja'|'gueum'|'mixed'|'other'|'unknown';
interface EvidenceValue<T> {
  value: T | null; state: EvidenceState;
  sourceSlideIds: string[]; reviewerId: string | null; reviewedAt: string | null;
}
interface SourceDocument {
  id: string; driveFileId: string; originalName: string;
  instrumentId: Instrument; mimeType: string; byteSize: number | null;
  modifiedTime: string | null; sha256: string | null;
  slideCount: number | null; extractionState: 'metadata_only'|'text_extracted'|'visual_checked'|'failed';
  rightsState: RightsState; originalUrl: string;
}
interface SourceSlide {
  id: string; sourceDocumentId: string; slideNumber: number;
  originalText: string; notesText: string | null; textExtractionComplete: boolean;
  visualCheckState: 'unchecked'|'checked'|'needs_review';
  extractedAssets: Array<{id:string; kind:string; rightsState:RightsState}>;
}
interface EditorialUnit {
  id: string; instrumentId: Instrument; title: string; sourceSlideIds: string[];
  originalTextRef: string; editedBlocks: Unit['blocks'];
  contentOrigin: 'source_transcription'|'ai_assisted'|'human_authored'|'synthetic_demo';
  editRevision: number; changedBy: string; changeSummary: string;
  mappingState: 'proposed'|'reviewed'; resourceVersionId: string | null;
}
interface GugakContext {
  instrumentId: Instrument; originalClassification: string | null;
  variant: EvidenceValue<string>; stringCount: EvidenceValue<number>;
  tuning: EvidenceValue<string>; soundingRange: EvidenceValue<string>;
  notationKinds: NotationKind[];
  pitchSystem: EvidenceValue<string>; referencePitch: EvidenceValue<string>;
  genreOrTradition: EvidenceValue<string>; techniqueTerms: EvidenceValue<string[]>;
  jangdan: EvidenceValue<{name:string; variant:string|null; beats:string|null;
    subdivisions:string|null; hanbae:string|null; gueum:string|null}>;
  jeonggan: EvidenceValue<{readingDirection:string; gridDescription:string;
    yulNames:string[]; symbolsLegend:string|null}>;
}
```
ResourceVersion에는 gugakContext와 editorialUnitIds를 추가합니다. UI는 null을 ‘미확인’으로 표시하며 0, 기본 440Hz, C장조, 표준 운지 등의 값으로 대체하지 않습니다. 평조/계면조·율명·청 등을 서양 조성·음고와 자동 일대일 변환하지 않습니다. 온음계 자동 채점·농현 깊이 정답값·운지 자동 교정은 제외합니다.

### 국악 표현에 관한 편집 규칙
- 정간보는 음높이뿐 아니라 시간 구조를 담는 기보입니다. 원문 방향과 구획을 보존하고 ‘한 정간은 언제나 몇 초/한 박’처럼 맥락 없는 상수로 바꾸지 않습니다. 가로 교육용과 세로 자료를 구분합니다. [국립국악원 정간보](https://www.gugak.go.kr/ency/topic/view/1315)
- 농현은 레퍼토리·조 등에 따라 쓰임과 폭이 달라질 수 있으므로 모든 악기의 비브라토와 동일한 단일 주법으로 취급하지 않습니다. 시김새 태그와 실제 세부 주법 설명의 관계는 전문가가 확인합니다. [국립국악원 농현](https://www.gugak.go.kr/ency/topic/view/2104)
- 장단명은 검색 태그로 사용 가능하지만 같은 명칭에 고정된 패턴·속도 한 개만 강제하지 않습니다. 템포 수치가 있으면 단위와 출처를 함께 기록합니다.
- 모든 국악기가 농현을 한다고 seed를 생성하지 않습니다. 양금처럼 발음 방식과 표현 방식이 다른 자료에 부적절한 주법을 복사하지 않습니다.
- 가야금의 현수나 피리의 종류가 원문에서 확인되지 않으면 악기형은 미확정입니다. 악기형 선택 UI가 원문 사실을 자동 보충하지 않습니다.

### 시드·레지스트리
- source-manifest.json: 실제 14개 파일 메타데이터. 모든 원자료 rights unknown, 콘텐츠 review draft, 실제 approval null.
- source-slides.json: 확인된 슬라이드만. 추출하지 못하면 빈 배열과 실패 이유; 가짜 페이지 생성 금지.
- editorial-units.json: 원문 목차에 따른 후보. 단원 수 미확정에서 시작 가능. 임의의 악기당 6단원 강제 금지.
- demo-fixtures.ts: 자료군당 중립 자료 1개/단원 2개/40분 교안 1개. 총 14/28/14는 합성 시연 목표이며 실제 실적에 합산하지 않음.
- app-catalog.json: 공개 활성 앱 0개로 출발. URL 없는 기능 요청은 status todo, url null, enabled false. 존재하지 않는 vercel 주소를 생성하지 않음.
- 실제 출처에서 관찰된 후보 URL만 등록할 수 있으나 unchecked/disabled 상태를 유지. 공개 활성은 출처·실행·내용/모델 적합성·권한/개인정보 점검 근거가 모두 필요.
- 클래식 원문에서 확인된 가야금 후보 https://gayageum-fingering-edu.vercel.app/ 는 존재가 목록에 실렸다는 근거만 있음. 실행/정확성/모델 적합성 미점검이므로 초기 비활성. 이 후보 1개를 14악기 앱 구축 완료로 계산하지 않음.
- 교사 수업안은 40분 예시(5+10+15+10)이며 실제 학생 이름·점수 없이 자료판본/악기형/준비물/대체활동을 기록.


## 책장형 홈 적용 계약 — 이번 판 필수 추가

사용자가 요청한 책 진열대 배경·가지런한 책 형태 PDF 교재·클릭 열람을 홈에 적용합니다. 아래 부록의 공통 설계가 기존 홈 설명을 보완하며 충돌 시 책장형 홈을 우선합니다. 현재 실제 PDF가 없는 자료는 PDF 준비 중/구조화 단원으로 구분합니다. 검색·악기분류·수준·읽던 위치·영상/연습 연결·권리·검수 기능은 유지합니다.

P00에는 BOOKSHELF_SPEC, P01에는 책장+목록 대안, P02에는 ReadingAsset/BookPosition, P03에는 판본별 위치 저장, P04에는 책장 필터, P05에는 PDF/구조화 뷰어 분기, P06에는 연습 후 복귀, P10에는 320px/200% 확대·페이지 복원·권리 차단, P11에는 책장형 데모를 추가합니다. 이 적용 계약은 아래 모든 P단계와 마스터 프롬프트의 입력입니다.

## 6. 통합 마스터 프롬프트

이 파일 전체와 작업 폴더를 제공한 후 아래 블록을 보냅니다.

```text
프로젝트는 ‘레슨 디자이너 국악기 교육 전자도서관’ 한국어 로컬 프로토타입이다. PROMPT_PACK.md, docs/SPEC.md, DATA_CONTRACT.md, STATUS.md와 실제 코드를 읽고 기존 변경사항을 보존하라. 클래식 프로젝트와 별도 폴더·저장키·정체성을 유지하라. 국악 원자료는 PPTX 14개이며 슬라이드·단원·레슨·앱 수는 서로 다르다. 모든 실제 원자료는 미검수/권리미확인/비공개로 시작한다. 악기형·조율·음역·장단·기보·주법은 출처 없이 생성하지 마라. mock 우선, 실제 계정·외부 DB·배포·push·결제·카메라·마이크·실학생 정보·외부 AI 호출은 제외한다. 합성 승인 시연과 실제 승인은 구분한다. 실행한 검사만 성공이라 기록하고 미실행·실패를 숨기지 마라. 변경 파일, 명령과 결과, 화면 확인법, 남은 문제를 보고하고 STATUS를 갱신하라.

첨부 프롬프트팩 P00~P11을 순서대로 구현하라. 클래식의 기존 작업 흐름을 국악용 새 프로젝트에 적용하며 원자료 분석·편집·검수·교안·테스트·인수까지 완료한다. 개발 중 필요한 일반 설계는 문서 기준으로 결정하되 외부 권한·비용·실데이터·배포나 큰 환경 변경이 필요하면 해당 단계만 보류하고 질문한다. 원자료 접근이 막혀도 안전한 메타데이터/합성 데모 흐름은 진행한다. 승인/권리/단원 수/앱 URL을 추정하지 마라. 각 단계의 완료 기준을 실제 검사한 뒤 다음 단계로 진행하고 최종 결과에는 완료와 미검증을 구분하라.
```

## 7. P00–P11 순차 구현 프롬프트

각 단계는 이 문서 전체와 함께 사용합니다. 앞 단계가 없다면 필요한 계약부터 보완합니다.

### P00. 현황 분석과 구현 계약

화면에서 확인: 14개 자료군과 원자료 수, 미확정 단원 수, 별도 국악 프로젝트 범위가 명확합니다.

```text
[P00: 현황 분석과 구현 계약]
프로젝트는 ‘레슨 디자이너 국악기 교육 전자도서관’ 한국어 로컬 프로토타입이다. PROMPT_PACK.md, docs/SPEC.md, DATA_CONTRACT.md, STATUS.md와 실제 코드를 읽고 기존 변경사항을 보존하라. 클래식 프로젝트와 별도 폴더·저장키·정체성을 유지하라. 국악 원자료는 PPTX 14개이며 슬라이드·단원·레슨·앱 수는 서로 다르다. 모든 실제 원자료는 미검수/권리미확인/비공개로 시작한다. 악기형·조율·음역·장단·기보·주법은 출처 없이 생성하지 마라. mock 우선, 실제 계정·외부 DB·배포·push·결제·카메라·마이크·실학생 정보·외부 AI 호출은 제외한다. 합성 승인 시연과 실제 승인은 구분한다. 실행한 검사만 성공이라 기록하고 미실행·실패를 숨기지 마라. 변경 파일, 명령과 결과, 화면 확인법, 남은 문제를 보고하고 STATUS를 갱신하라.

코드를 바꾸기 전에 AGENTS.md, README, package.json, lockfile, 라우터, 테스트, 기존 변경사항을 확인하라. 기존 클래식 앱을 참고할 수 있어도 그 폴더에서 덮어쓰지 마라. 신규 프로젝트면 별도 gugak-library 폴더를 만들고 TypeScript/Next.js/Tailwind를 제안한다. 기존 국악 코드가 있다면 그 스택을 유지한다. 설치 버전은 공식 문서와 lockfile로 확인하고 비밀값은 출력하지 마라.
산출물: SPEC에 R01~R20/역할/경로/예외, ARCHITECTURE에 repository 경계, SOURCE_MANIFEST에 실제 14개 파일 ID·이름·관찰 상태, DATA_CONTRACT에 SourceDocument→SourceSlide→EditorialUnit→ResourceVersion, STATUS에 P00~P11을 기록하라.
원자료 접근 불가 시 메타데이터와 중립 합성 fixture로 계속하되 본문/단원 수는 미확정으로 둔다. 14 자료군이 14 단일 악기라는 주장을 하지 마라. 요구사항-화면-테스트 대응표와 클래식에서 재사용/국악에서 변경할 목록을 작성하라.
검증: 별도 폴더와 저장키, 14개 고유 ID, 원문 불변, 실제 승인 0개, 외부 앱 비활성 계약을 검사하라.
```

### P01. 기초 화면과 디자인 시스템

화면에서 확인: 14개 자료군, 익명 학생·교사·관리자 시연 모드와 지속 시연 배너가 보입니다.

```text
[P01: 기초 화면과 디자인 시스템]
프로젝트는 ‘레슨 디자이너 국악기 교육 전자도서관’ 한국어 로컬 프로토타입이다. PROMPT_PACK.md, docs/SPEC.md, DATA_CONTRACT.md, STATUS.md와 실제 코드를 읽고 기존 변경사항을 보존하라. 클래식 프로젝트와 별도 폴더·저장키·정체성을 유지하라. 국악 원자료는 PPTX 14개이며 슬라이드·단원·레슨·앱 수는 서로 다르다. 모든 실제 원자료는 미검수/권리미확인/비공개로 시작한다. 악기형·조율·음역·장단·기보·주법은 출처 없이 생성하지 마라. mock 우선, 실제 계정·외부 DB·배포·push·결제·카메라·마이크·실학생 정보·외부 AI 호출은 제외한다. 합성 승인 시연과 실제 승인은 구분한다. 실행한 검사만 성공이라 기록하고 미실행·실패를 숨기지 마라. 변경 파일, 명령과 결과, 화면 확인법, 남은 문제를 보고하고 STATUS를 갱신하라.

공통 헤더·메뉴·컨테이너·버튼·필드·배지·빈상태·로딩·오류·404를 구현하라. 학생(익명 시연)/교사/검수자/편집 관리자 역할 스위치는 화면 시연이며 보안이 아니라고 표시한다. 로그인된 실사용자 얼굴·학교·이름을 생성하지 마라.
서고/연습실/수업 준비/북마크/관리 메뉴와 14개 자료군 내비게이션을 연결하라. 타악기·사물놀이 묶음은 장구 전용 자료와 구분한다. 실제 공개 콘텐츠가 없는 경우 0건과 편집 중 안내를 제공하고 합성 데모를 명시적으로 선택하게 하라.
한국어 lang, 18px 본문, 넉넉한 줄간격, 명확한 focus, 44px 목표 버튼, 색 이외 상태 표시, 모바일과 교실 화면을 적용한다. dev/build/lint/typecheck/test/test:e2e 스크립트를 실제 명령으로 구성하라.
검증: 모든 경로, 없는 ID, 360px 넘침, 200% 확대, 키보드, reduced-motion, lint/typecheck/build. 실자료 완성처럼 보이는 허위 통계를 만들지 마라.
```

### P02. 원자료와 국악 스키마 구성

화면에서 확인: 원본 파일 수·슬라이드 추출 상태·편집 단원·실제 승인·합성 자료 수가 분리됩니다.

```text
[P02: 원자료와 국악 스키마 구성]
프로젝트는 ‘레슨 디자이너 국악기 교육 전자도서관’ 한국어 로컬 프로토타입이다. PROMPT_PACK.md, docs/SPEC.md, DATA_CONTRACT.md, STATUS.md와 실제 코드를 읽고 기존 변경사항을 보존하라. 클래식 프로젝트와 별도 폴더·저장키·정체성을 유지하라. 국악 원자료는 PPTX 14개이며 슬라이드·단원·레슨·앱 수는 서로 다르다. 모든 실제 원자료는 미검수/권리미확인/비공개로 시작한다. 악기형·조율·음역·장단·기보·주법은 출처 없이 생성하지 마라. mock 우선, 실제 계정·외부 DB·배포·push·결제·카메라·마이크·실학생 정보·외부 AI 호출은 제외한다. 합성 승인 시연과 실제 승인은 구분한다. 실행한 검사만 성공이라 기록하고 미실행·실패를 숨기지 마라. 변경 파일, 명령과 결과, 화면 확인법, 남은 문제를 보고하고 STATUS를 갱신하라.

5장의 타입과 nullable 값·출처·검수 상태를 TypeScript/Zod로 구현하라. Resource, ResourceVersion, Unit, SourceDocument, SourceSlide, EditorialUnit, GugakContext, AppLink, ReviewIssue/Event, LessonPlan을 분리하라. ID/FK/슬라이드 번호 범위를 검증한다. 알 수 없는 level은 null이다.
부록 실제 인벤토리의 Drive ID와 파일명을 그대로 source-manifest에 등록하라. 원본 파일 다운로드/추출이 가능한 경우 ZIP/XML 안전 제한을 두고 텍스트·슬라이드 위치를 추출한다. 이미지 악보·도식은 visual unchecked, OCR은 별도 기록이다. 원자료 텍스트가 없으면 없는 대로 표기하고 가상의 목차를 실제 단원으로 만들지 마라.
자료군당 합성 자료 1/단원 2/40분 교안 1을 작성하라. 본문은 ‘검수된 설명을 넣을 자리’ 등의 중립 UI 예시이며 실제 운지·주법·조율값을 생성하지 않는다. 총 14/28/14가 demo 통계에만 포함되어야 한다.
app-catalog는 활성 0개이며 확인된 가야금 후보 1개를 unchecked/disabled로 보관하거나 빈 목록을 사용한다. 나머지 TODO는 url null. 14개 자료군 모두 앱 URL을 채우려고 하지 마라.
검증: source 14, 고유 자료군 14, 승인 실자료 0, 활성 앱 0, 중복 ID/FK 없음, 출처 없는 실음·조율 값 없음, 악기형 null 보존을 검사하라.
```

### P03. 저장소와 복구 동작

화면에서 확인: 새로고침 후 교안이 유지되고 저장 장애를 정직하게 알립니다.

```text
[P03: 저장소와 복구 동작]
프로젝트는 ‘레슨 디자이너 국악기 교육 전자도서관’ 한국어 로컬 프로토타입이다. PROMPT_PACK.md, docs/SPEC.md, DATA_CONTRACT.md, STATUS.md와 실제 코드를 읽고 기존 변경사항을 보존하라. 클래식 프로젝트와 별도 폴더·저장키·정체성을 유지하라. 국악 원자료는 PPTX 14개이며 슬라이드·단원·레슨·앱 수는 서로 다르다. 모든 실제 원자료는 미검수/권리미확인/비공개로 시작한다. 악기형·조율·음역·장단·기보·주법은 출처 없이 생성하지 마라. mock 우선, 실제 계정·외부 DB·배포·push·결제·카메라·마이크·실학생 정보·외부 AI 호출은 제외한다. 합성 승인 시연과 실제 승인은 구분한다. 실행한 검사만 성공이라 기록하고 미실행·실패를 숨기지 마라. 변경 파일, 명령과 결과, 화면 확인법, 남은 문제를 보고하고 STATUS를 갱신하라.

Promise 기반 repository와 mock/localStorage 어댑터를 구현하라. UI가 seed 배열을 직접 수정하지 않게 하라. audience public/demo/admin을 분리하고 공개판정은 모든 목록/상세/교안 직접 조회에서 공통 적용하라. 클라이언트 역할 스위치가 실제 접근제어라는 설명은 금지한다.
저장키 gugak-library:v1과 schemaVersion을 사용하고 클래식 키를 읽거나 수정하지 마라. SSR에서 window 접근 금지, 복원 전 초기값 저장 금지, 손상 JSON·용량초과·저장차단은 메모리 대체모드와 경고를 제공하라. 교안·편집·검수 명령은 expectedRevision과 commandId 중복방지를 적용한다.
초기화 확인 취소는 데이터를 보존한다. 원문 source 레코드와 편집 원고를 분리하고 편집해도 originalText가 변하지 않게 하라.
검증: 새로고침, 복원 지연, 손상 JSON, QuotaExceededError, 저장 차단, 초기화 취소/확정, 두 탭 revision 충돌, 중복 클릭, 클래식 저장키 불변을 검사하라.
```

### P04. 국악 전자도서관 검색

화면에서 확인: 악기형·장단·기보법과 미확인 값까지 구분하며 필터가 주소에 남습니다.

```text
[P04: 국악 전자도서관 검색]
프로젝트는 ‘레슨 디자이너 국악기 교육 전자도서관’ 한국어 로컬 프로토타입이다. PROMPT_PACK.md, docs/SPEC.md, DATA_CONTRACT.md, STATUS.md와 실제 코드를 읽고 기존 변경사항을 보존하라. 클래식 프로젝트와 별도 폴더·저장키·정체성을 유지하라. 국악 원자료는 PPTX 14개이며 슬라이드·단원·레슨·앱 수는 서로 다르다. 모든 실제 원자료는 미검수/권리미확인/비공개로 시작한다. 악기형·조율·음역·장단·기보·주법은 출처 없이 생성하지 마라. mock 우선, 실제 계정·외부 DB·배포·push·결제·카메라·마이크·실학생 정보·외부 AI 호출은 제외한다. 합성 승인 시연과 실제 승인은 구분한다. 실행한 검사만 성공이라 기록하고 미실행·실패를 숨기지 마라. 변경 파일, 명령과 결과, 화면 확인법, 남은 문제를 보고하고 STATUS를 갱신하라.

제목/설명/목표/주제 검색과 자료군·악기형·기보법·장단명·종류·수준 필터를 구현하라. 다른 필터는 AND, 같은 필터의 다중선택은 OR. Unicode NFC, 공백 정리, 영문 대소문자 무시와 정확한 한글/영문 자료군 별칭을 지원하라.
‘소금’은 이 라이브러리 문맥의 악기, ‘타악기·사물놀이’는 묶음으로 검색한다. 농현·시김새·장단은 실제 태그 또는 명시적 합성 fixture에만 연결한다. 문자열만 보고 모든 악기에 자동 태그하지 마라. variant unknown을 전체 모델 호환으로 해석하지 마라.
URL query에 검색어·필터·정렬을 보존하고 refresh/back/forward에서 복원한다. 잘못된 값은 안전하게 정규화한다. 관리자 원문 검색과 공개 검색을 분리한다. 공개에는 승인자료 0건, 데모에는 합성 배지와 별도 집계를 제공하라.
검증: 8장의 Q01~Q12, 0건/초기화, 키보드, 카드 내부 버튼 이벤트 충돌, 원자료 본문 public 누출 차단을 검사하라.
```

### P05. 원문 추적 단원 뷰어

화면에서 확인: 각 단원의 파일·슬라이드·판본과 기보법·악기형 확인 상태가 표시됩니다.

```text
[P05: 원문 추적 단원 뷰어]
프로젝트는 ‘레슨 디자이너 국악기 교육 전자도서관’ 한국어 로컬 프로토타입이다. PROMPT_PACK.md, docs/SPEC.md, DATA_CONTRACT.md, STATUS.md와 실제 코드를 읽고 기존 변경사항을 보존하라. 클래식 프로젝트와 별도 폴더·저장키·정체성을 유지하라. 국악 원자료는 PPTX 14개이며 슬라이드·단원·레슨·앱 수는 서로 다르다. 모든 실제 원자료는 미검수/권리미확인/비공개로 시작한다. 악기형·조율·음역·장단·기보·주법은 출처 없이 생성하지 마라. mock 우선, 실제 계정·외부 DB·배포·push·결제·카메라·마이크·실학생 정보·외부 AI 호출은 제외한다. 합성 승인 시연과 실제 승인은 구분한다. 실행한 검사만 성공이라 기록하고 미실행·실패를 숨기지 마라. 변경 파일, 명령과 결과, 화면 확인법, 남은 문제를 보고하고 STATUS를 갱신하라.

자료 상세·목차·단원 전후 이동·북마크·이어보기·교안 담기·오류 신고를 구현하라. 파일이 없으면 다운로드 버튼을 숨기고 원문 미연결 안내를 제공한다. 편집 단원과 원본 슬라이드 번호는 다른 라벨로 표시하라.
구조화 블록만 렌더링하고 임의 HTML/스크립트를 실행하지 않는다. 이미지 alt/설명, 악보 확대, 키보드 조작, 음원 수동 재생을 제공한다. 정간보는 원문 방향과 격자를 유지하고 텍스트 대체 설명을 제공한다. 오선보와 정간보의 자동 전환·음높이 생성은 하지 마라.
표시 내용: 악기 자료군·악기형/현수 미확인 여부·조율/음역 근거·장단/기보·교육 검수·권리·버전·원문 위치. 출처 페이지 번호를 추정하지 마라. 열람권 없는 자산은 번들/프리로드에도 포함하지 마라.
검증: 없는 파일/단원/보류판본, 이미지 실패, 악보 확대, 출처 링크, 이어보기 복원, 수정 후 구판 참조, script 문자열 무해화, 자동재생 없음.
```

### P06. 연습실과 앱 레지스트리

화면에서 확인: 미확인 앱은 준비 중이며 실행 버튼을 눌러도 외부로 이동하지 않습니다.

```text
[P06: 연습실과 앱 레지스트리]
프로젝트는 ‘레슨 디자이너 국악기 교육 전자도서관’ 한국어 로컬 프로토타입이다. PROMPT_PACK.md, docs/SPEC.md, DATA_CONTRACT.md, STATUS.md와 실제 코드를 읽고 기존 변경사항을 보존하라. 클래식 프로젝트와 별도 폴더·저장키·정체성을 유지하라. 국악 원자료는 PPTX 14개이며 슬라이드·단원·레슨·앱 수는 서로 다르다. 모든 실제 원자료는 미검수/권리미확인/비공개로 시작한다. 악기형·조율·음역·장단·기보·주법은 출처 없이 생성하지 마라. mock 우선, 실제 계정·외부 DB·배포·push·결제·카메라·마이크·실학생 정보·외부 AI 호출은 제외한다. 합성 승인 시연과 실제 승인은 구분한다. 실행한 검사만 성공이라 기록하고 미실행·실패를 숨기지 마라. 변경 파일, 명령과 결과, 화면 확인법, 남은 문제를 보고하고 STATUS를 갱신하라.

연습실 카드와 단원-앱 매핑을 구현하라. registry는 사용자 제공 또는 실제 문서에서 관찰된 URL만 보관한다. TODO 카드는 url null/status todo/enabled false이고 클릭 가능한 가짜 주소를 만들지 않는다. 후보 URL도 실행·내용·악기형·권한/개인정보 확인 전 비활성이다.
음악적으로 다른 모델(가야금 현수 등), 미확인 악기형, 단원 목표 불일치는 mapping validation_error로 처리하라. 양금에 가야금 농현 앱을 자동 연결하지 마라. 실제 국악 전용 도구가 없으면 권리 확인된 정적 자료 또는 ‘연결 준비 중’을 보여라.
활성화 조건은 sourceEvidence, availabilityCheck, contentCompatibilityCheck, privacyPermissionCheck의 완료와 enabled true이다. 단순 HTTP 200으로 통과시키지 마라. https URL 정책과 허용 호스트, 사용자정보/토큰 query 금지, 새 탭 noopener noreferrer, 외부 이동·복귀 안내를 구현한다. javascript/data/file/protocol-relative/private-host URL을 거부한다.
카메라/마이크/로그인 필요 앱은 MVP에서 비활성. iframe 강제 삽입, CORS 우회, API/SSO/진도 동기화는 하지 마라. 앱 열기를 학습 완료로 기록하지 않는다.
검증: TODO URL 없음, unchecked 비활성, 모델 mismatch, dangerous URL, 새 탭 속성, 복귀 위치, 활성 앱 0 초기 상태. 실제 네트워크 기능 점검은 별도 증거로 기록하라.
```

### P07. 교사 수업안과 학생 동선

화면에서 확인: 자료군별 수업안을 만들고 출처·판본·권리 안내가 포함된 인쇄물을 봅니다.

```text
[P07: 교사 수업안과 학생 동선]
프로젝트는 ‘레슨 디자이너 국악기 교육 전자도서관’ 한국어 로컬 프로토타입이다. PROMPT_PACK.md, docs/SPEC.md, DATA_CONTRACT.md, STATUS.md와 실제 코드를 읽고 기존 변경사항을 보존하라. 클래식 프로젝트와 별도 폴더·저장키·정체성을 유지하라. 국악 원자료는 PPTX 14개이며 슬라이드·단원·레슨·앱 수는 서로 다르다. 모든 실제 원자료는 미검수/권리미확인/비공개로 시작한다. 악기형·조율·음역·장단·기보·주법은 출처 없이 생성하지 마라. mock 우선, 실제 계정·외부 DB·배포·push·결제·카메라·마이크·실학생 정보·외부 AI 호출은 제외한다. 합성 승인 시연과 실제 승인은 구분한다. 실행한 검사만 성공이라 기록하고 미실행·실패를 숨기지 마라. 변경 파일, 명령과 결과, 화면 확인법, 남은 문제를 보고하고 STATUS를 갱신하라.

교안 목록/편집/저장/복제/삭제 확인/출력을 구현하라. 제목·자료군·악기형·대상 수준·목표·전체 시간·준비물·도입/활동/정리·교사 메모·대체활동을 둔다. 원문에 없는 목표는 교안 작성 제안으로 구분한다.
활동은 resourceId/versionId/unitId와 appId를 참조한다. 다른 악기형 연결이나 보류된 자료는 경고/차단하고 새 버전은 교사가 비교 후 명시적으로 적용한다. 위/아래 버튼으로 순서 변경 가능하게 하라. 전체 시간과 합계 일치, 분 양의 정수, 제목·목표를 검증한다. 40분 합성 예시는 5+10+15+10분이다.
학생 모드는 익명으로 승인 공개자료/합성 데모만 찾고 읽는 시연이다. 실이름·학년·학교·성적·학습 진단·녹음 필드를 만들지 마라. 열람을 연주 숙달로 해석하지 않는다.
인쇄에는 출처·원본 슬라이드·판본·합성 워터마크·권리 제한을 보존한다. 인쇄권 없는 본문·악보·이미지는 출력에서 제외한다. 미저장 변경 후 이동 경고와 저장 실패 안내를 구현하라.
검증: 14 자료군 교안 smoke, 저장→새로고침→복제→인쇄, 시간 차이, 중복 추가, 충돌, 삭제 취소, 구판 유지, 제한 자산 누락을 검사하라.
```

### P08. 편집 관리자와 원문 대조

화면에서 확인: 슬라이드 원문과 편집본을 대조하고 저장해도 원본은 그대로입니다.

```text
[P08: 편집 관리자와 원문 대조]
프로젝트는 ‘레슨 디자이너 국악기 교육 전자도서관’ 한국어 로컬 프로토타입이다. PROMPT_PACK.md, docs/SPEC.md, DATA_CONTRACT.md, STATUS.md와 실제 코드를 읽고 기존 변경사항을 보존하라. 클래식 프로젝트와 별도 폴더·저장키·정체성을 유지하라. 국악 원자료는 PPTX 14개이며 슬라이드·단원·레슨·앱 수는 서로 다르다. 모든 실제 원자료는 미검수/권리미확인/비공개로 시작한다. 악기형·조율·음역·장단·기보·주법은 출처 없이 생성하지 마라. mock 우선, 실제 계정·외부 DB·배포·push·결제·카메라·마이크·실학생 정보·외부 AI 호출은 제외한다. 합성 승인 시연과 실제 승인은 구분한다. 실행한 검사만 성공이라 기록하고 미실행·실패를 숨기지 마라. 변경 파일, 명령과 결과, 화면 확인법, 남은 문제를 보고하고 STATUS를 갱신하라.

/admin/sources, /admin/resources, /admin/apps를 구현하라. source 문서는 파일명/ID/슬라이드 수/추출상태/시각검토상태/권리를 관리한다. 원문과 편집 단원은 나란히 표시하고 sourceSlideIds를 매핑한다. 매핑 0건·중복·잘못된 번호를 알린다.
제목·목표·수준·주제·악기형·기보·장단·용어·원문근거·권리·단원 블록을 편집한다. 수정본은 version/revision/changeSummary를 갱신한다. 승인 필드를 드롭다운으로 직접 변경하지 마라. 검수 요청은 P09 명령을 사용한다.
앱 후보는 URL/근거/모델/목표/점검일/관찰범위/제한사항을 편집하되 근거 없는 활성화는 거부한다. 서버가 임의 URL을 fetch하는 검사기는 만들지 마라. 원문 외부링크 자동 실행 금지.
JSON 가져오기/내보내기는 크기·스키마·FK·악성 문자열을 검증하고 다운로드 권리 없는 원문과 민감 데이터는 내보내지 않는다. 실패 시 원래 데이터 보존, 성공 시 변경 요약을 보여준다.
검증: 악기형 null, 조율 근거 누락, 잘못된 sourceSlideId, 중복 URL, 취소 복원, originalText 불변, 편집본 초안 유지, public 조회 차단을 검사하라.
```

### P09. 전문가 검수와 판본 관리

화면에서 확인: 수정→재검수→승인 시연 후에도 권리 미확인 공개가 막힙니다.

```text
[P09: 전문가 검수와 판본 관리]
프로젝트는 ‘레슨 디자이너 국악기 교육 전자도서관’ 한국어 로컬 프로토타입이다. PROMPT_PACK.md, docs/SPEC.md, DATA_CONTRACT.md, STATUS.md와 실제 코드를 읽고 기존 변경사항을 보존하라. 클래식 프로젝트와 별도 폴더·저장키·정체성을 유지하라. 국악 원자료는 PPTX 14개이며 슬라이드·단원·레슨·앱 수는 서로 다르다. 모든 실제 원자료는 미검수/권리미확인/비공개로 시작한다. 악기형·조율·음역·장단·기보·주법은 출처 없이 생성하지 마라. mock 우선, 실제 계정·외부 DB·배포·push·결제·카메라·마이크·실학생 정보·외부 AI 호출은 제외한다. 합성 승인 시연과 실제 승인은 구분한다. 실행한 검사만 성공이라 기록하고 미실행·실패를 숨기지 마라. 변경 파일, 명령과 결과, 화면 확인법, 남은 문제를 보고하고 STATUS를 갱신하라.

review-machine의 draft→in_review→changes_requested→re_review→approved/rejected와 반려 후 새 draft를 구현하라. 검수 범위를 악기형/조율/음역/운지·주법/장단/기보/교육/안전으로 구분하고 권리 검토는 별도 기록한다.
각 지적은 파일/슬라이드/편집단원/블록/판본, 근거, 심각도, 수정안, 처리, 재확인을 담는다. fixed와 verified는 구분한다. 중대 지적이나 승인 근거 누락은 공개를 막는다. 검수자 이름·날짜·서명을 AI가 만들지 않는다.
합성 자료에서만 가상 검수자 A의 승인 흐름을 시연하며 실제 승인 통계와 분리한다. 실제 자료는 음악 전문가와 권리 책임자의 검토 근거 제공 전 draft/private이다. 승인된 내용을 수정하면 새 초안과 검수 요구가 생기고 구판은 불변이다.
안전·핵심 음악 오류 신고는 해당판본 보류와 교안 경고를 만들고 일반 오류는 검토 대기로 둔다. 신고에 학생정보/이메일을 요구하지 않는다. append-only 이벤트는 localStorage에서 보안감사 증거가 아님을 밝힌다.
검증: 허용/금지 전이, revision 충돌, 중복 명령, 중대 오류 차단, 권리 차단, 개정 후 승인 승계 없음, 보류판본 직접 조회 차단, 구판 교안 유지.
```

### P10. 통합 테스트와 접근성

화면에서 확인: 전체 요구사항의 통과·실패·미실행과 국악 특화 회귀검사가 남습니다.

```text
[P10: 통합 테스트와 접근성]
프로젝트는 ‘레슨 디자이너 국악기 교육 전자도서관’ 한국어 로컬 프로토타입이다. PROMPT_PACK.md, docs/SPEC.md, DATA_CONTRACT.md, STATUS.md와 실제 코드를 읽고 기존 변경사항을 보존하라. 클래식 프로젝트와 별도 폴더·저장키·정체성을 유지하라. 국악 원자료는 PPTX 14개이며 슬라이드·단원·레슨·앱 수는 서로 다르다. 모든 실제 원자료는 미검수/권리미확인/비공개로 시작한다. 악기형·조율·음역·장단·기보·주법은 출처 없이 생성하지 마라. mock 우선, 실제 계정·외부 DB·배포·push·결제·카메라·마이크·실학생 정보·외부 AI 호출은 제외한다. 합성 승인 시연과 실제 승인은 구분한다. 실행한 검사만 성공이라 기록하고 미실행·실패를 숨기지 마라. 변경 파일, 명령과 결과, 화면 확인법, 남은 문제를 보고하고 STATUS를 갱신하라.

R01~R20에 Vitest/컴포넌트/Playwright 테스트를 작성하고 실행하라. 외부 앱 실네트워크에 의존하지 말고 URL/상태/이동 계약을 검사한다. 현재 production build/start도 가능한 경우 확인하라.
8장의 Q01~Q12, 14 자료군 탐색·교안 smoke, source 14와 단원 수 분리, 원문 불변, nullable 조율, 모델 mismatch, 정간보 방향 보존, 장단 단일값 강제 없음, 승인0/앱0 출발, public 우회차단, 합성 통계 분리, 저장 장애, 권리 인쇄, 버전 불변을 검사한다.
360/768/1440/1920px, 200% 확대, Tab/Shift+Tab/Enter/Escape, dialog focus와 복귀, 명암·label·aria-live·헤딩, 인쇄 미리보기를 확인한다. 악보 이미지만 보여 주고 대체 설명이 없으면 접근성 미완료로 기록하라.
네트워크/코드에서 getUserMedia, analytics, 외부 AI, 학생정보 전송이 없음을 확인하라. 자동 접근성 검사만으로 인증을 주장하지 마라.
TEST_REPORT에 실제 명령·시간·도구 버전·결과·재현법·증거 위치를 기록하고 실패는 최소 수정 후 재검사한다. skip 처리로 통과시킨 척하지 마라.
```

### P11. 최종 데모와 인수 문서

화면에서 확인: 새 국악 프로젝트 실행법과 실제 구현·자리표시자·미검증 범위가 구분됩니다.

```text
[P11: 최종 데모와 인수 문서]
프로젝트는 ‘레슨 디자이너 국악기 교육 전자도서관’ 한국어 로컬 프로토타입이다. PROMPT_PACK.md, docs/SPEC.md, DATA_CONTRACT.md, STATUS.md와 실제 코드를 읽고 기존 변경사항을 보존하라. 클래식 프로젝트와 별도 폴더·저장키·정체성을 유지하라. 국악 원자료는 PPTX 14개이며 슬라이드·단원·레슨·앱 수는 서로 다르다. 모든 실제 원자료는 미검수/권리미확인/비공개로 시작한다. 악기형·조율·음역·장단·기보·주법은 출처 없이 생성하지 마라. mock 우선, 실제 계정·외부 DB·배포·push·결제·카메라·마이크·실학생 정보·외부 AI 호출은 제외한다. 합성 승인 시연과 실제 승인은 구분한다. 실행한 검사만 성공이라 기록하고 미실행·실패를 숨기지 마라. 변경 파일, 명령과 결과, 화면 확인법, 남은 문제를 보고하고 STATUS를 갱신하라.

README에 설치/실행/테스트/초기화/로컬 저장 한계를 초보자 순서로 작성하라. DEMO_SCRIPT에는 5분 흐름: 자료군→검색→출처와 악기형→단원→교안→연습 준비상태→출력→오류 신고→검수/권리 차단을 작성한다.
HANDOFF에는 구현, 콘텐츠 미확인, 실제 전문가 검수, 권리, 앱 호환성, 서버 권한, 배포의 남은 조건을 분리한다. source 14, 추출 슬라이드, 편집 단원, 실제 승인, 합성 자료, 활성 앱의 각각의 실제 수를 계산하고 하드코딩 통계와 대조한다.
모든 버튼은 실제 동작 또는 이유가 있는 비활성 중 하나여야 한다. TODO를 정상 동작으로 시연하지 마라. 신규 국악 앱의 배포·공통 로그인·진도 동기화·자동 연주 교정·AI 답변이 완료되었다고 말하지 마라.
최종 lint/typecheck/unit/component/e2e/build를 마지막 코드 기준으로 실행하라. 미실행 검사는 이유와 재현 명령을 남긴다. 사용자가 요청하지 않은 push/PR/배포/계정 생성은 하지 마라. 최종 보고는 실행법, 완료 기능, 테스트, 콘텐츠/권리 한계, 다음 결정 다섯 항목으로 끝내라.
```

## 8. 테스트와 완료 기준

### 고정 검색 과제
실제 교육 지식 정확성 평가가 아닌 합성 fixture의 결정적 UI 테스트입니다.

| ID | 입력/상황 | 기대 결과 |
|---|---|---|
| Q01 | 가야금 선택 | 가야금 합성 자료만 |
| Q02 | 해금 + 수준1 | AND 조건 일치 |
| Q03 | ‘  GAYAGEUM  ’ | 영문 별칭 정규화 |
| Q04 | 타악기·사물놀이 | 묶음 자료 표시; 장구 전용과 구분 |
| Q05 | 소금 | 국악 자료군 소금 검색 |
| Q06 | 정간보 | 그 태그가 있는 합성 fixture만 |
| Q07 | 장단 이름 | 동일 이름 검색, 세부형은 별도 |
| Q08 | 악기형 미확인 | unknown만 선택 가능 |
| Q09 | 양금 + 농현 | 태그가 없으면 0건; 억지 연결 금지 |
| Q10 | 필터→단원→뒤로 | 검색/정렬/필터 복원 |
| Q11 | 존재하지 않는 단어 | 0건·해제 버튼 |
| Q12 | 실제 공개자료 | 승인 근거 없으면 0건 |

### 검증 매트릭스
| ID | 요구사항 | 최소 검사 |
|---|---|---|
| D01 | R01/R14/R15 | source14·자료군14, 단원 별도, ID/FK, 실승인0 |
| D02 | R04/R11 | 검수 전이, 승인/권리/중대지적 공개 차단 |
| D03 | R08/R20 | 앱 TODO·unchecked 비활성, URL·모델 mismatch |
| D04 | R07/R19 | 저장손상/실패/충돌, 원문 불변, 개정판 생성 |
| D05 | R16~R18 | 조율 null, 정간보 방향, 장단 문맥, 자동 음고 보충 없음 |
| U01 | R02 | Q01~Q12, URL 정규화 |
| U02 | R05/R06/R15 | 출처·슬라이드·버전·권리·검수 표시 |
| U03 | R09 | 교안 합계/필수/중복/인쇄 제한 |
| E01 | R01~R09 | 14자료군 탐색→단원→교안→저장→출력 |
| E02 | R10/R11/R19 | 편집→검토→수정→재검수→승인 시연→권리 차단 |
| E03 | R04/R11 | 신고→보류→교안 경고→명시적 새판본 적용 |
| E04 | R12 | 카메라/마이크/분석SDK/AI/개인정보 전송 없음 |
| A01 | R13 | 키보드·focus·200% 확대·대체텍스트 |
| A02 | R13 | 320/360/768/1440/1920px·명암·인쇄 |

### 도메인 테스트 작성 프롬프트
```text
현재 도메인 함수와 fixture를 읽고 아래 기대값을 단위 테스트로 구현하라. 테스트를 통과시키려고 공개·권리 조건을 느슨하게 하지 마라.
1. source_unreviewed를 review approved로 위조해도 public 제외.
2. reviewed_real이어도 rights unknown이면 공개 불가.
3. 승인 v1 수정 시 새 v2 draft, v1 불변, 교안 v1 유지.
4. critical 지적 open/fixed이면 공개 불가, verified 후에도 별도 승인 필요.
5. 가야금 특정 현수용 앱과 악기형 미확인 단원은 호환성 확정 불가, 연결 비활성.
6. url null/todo/unchecked는 실제 href를 렌더하지 않음.
7. javascript/data/file/protocol-relative/내부망 URL 거부, 허용된 https의 필요한 fragment는 보존.
8. 손상 JSON·QuotaExceededError에 화면 유지 및 저장 실패 표시.
9. synthetic_demo 승인·단원 수를 실자료 집계에서 제외.
10. 5+10+15+10=40, 5+10+10+10은 5분 부족.
11. 정간보 읽기 방향과 원문 슬라이드 번호를 편집 렌더에서도 보존.
12. 원문 추출 텍스트 편집 불가, editedBlocks 수정만 새 revision 생성.
13. tuning null을 440Hz로 자동 채우지 않음.
14. 원자료 14개에서 편집 단원 14개라고 추정하지 않음.
15. 타악기·사물놀이 묶음의 장구 파트를 장구 전용 원본 파일과 혼동하지 않음.
16. 클래식 저장키에 새 데이터 쓰지 않음.
각 fixture/기대값/결과를 보고하라. 실행 못한 것은 미실행으로 표시하라.
```

### 최종 체크리스트
- [ ] 클래식 프로젝트와 원본 PPTX/MD를 보존했다.
- [ ] 실제 14파일의 ID·이름·출처가 추적된다.
- [ ] 추출/시각 확인/편집/전문가 승인/권리를 구분했다.
- [ ] 모르는 음역·조율·현수·기보·장단형은 미확인이다.
- [ ] 표지·목차·슬라이드와 레슨 수를 혼동하지 않는다.
- [ ] 실제 승인 자료 0·활성 앱 0의 출발값을 정직하게 표시한다.
- [ ] 합성 시연을 모든 화면/출력에서 구분한다.
- [ ] 실학생 데이터·녹음·카메라·외부 AI를 사용하지 않는다.
- [ ] 교사·익명 학생·편집·검수 동선이 있고 실보안 여부가 명확하다.
- [ ] 앱 링크는 출처/정상 열림/내용 호환성/개인정보 점검을 구분한다.
- [ ] 승인판본 개정은 재검수, 교안의 구판은 자동 교체하지 않는다.
- [ ] 출력·다운로드는 권리 별도로 검사한다.
- [ ] 실제 lint/typecheck/unit/component/e2e/build 결과가 있다.
- [ ] 구현하지 않은 배포·연주 자동교정·진도·AI 정확성을 주장하지 않는다.

## 9. 수정·재개·전문가 검수 프롬프트

### B01. 최소 수정
```text
국악 전자도서관의 아래 문제를 최소 변경으로 수정하라. PROMPT_PACK, STATUS, 실제 코드와 테스트를 먼저 읽고 원자료/클래식 프로젝트를 보존하라.
증상: [화면 또는 로그]
재현: [클릭 순서/주소/화면 크기]
기대: [정상 동작]
재현→실패 테스트→원인 수정→회귀 검사 순서로 진행하라. 승인·권리·국악 모델·출처 조건을 제거해서 해결하지 마라. 재현 불가는 확인 사실과 필요한 정보로 나누어 보고하라. 변경 파일·명령·검사 결과·남은 한계를 알려라.
```

### B02. 중단 후 재개
```text
국악 전자도서관 작업을 이어가라. PROMPT_PACK, SPEC, DATA_CONTRACT, STATUS, TEST_REPORT, package.json/lockfile과 코드를 읽고 마지막 완료 단계를 실제로 확인하라. 새 프로젝트를 다시 만들지 말고 기존 변경을 보존하라. 가장 이른 미완료 P단계부터 진행한다. PPTX 14개와 레슨 수를 분리하고 미검수/권리미확인·앱 비활성·mock 한계를 유지한다. 현재 완료/불확실/이번 단계부터 짧게 보고하고 검사를 실행하라. 외부 계정/DB/배포/개인정보/권한이 필요하면 해당 작업만 보류하라.
```

### B03. 악기별 전문가 검수 목록
```text
이 작업은 승인 발급이 아니라 검수 요청 목록 작성이다. 실제 읽을 수 있는 원문만 대조하고 파일ID/슬라이드/편집단원/판본/확인 질문/근거/심각도 제안/담당 분야를 정리하라. 문서의 14자료군에 대해 악기형·현수·조율·음역, 운지/연주 도구/안전, 기보법·율명·구음, 장단형·한배, 시김새·농현을 실제 수록 여부에 맞춰 검토한다. 모든 악기에 모든 항목을 억지로 적용하지 마라.
가야금·아쟁의 종류, 생황 모델·관수, 피리 종류, 대금/소금/단소 구분, 장구 단독과 사물놀이 문맥, 양금 타현, 철현금·해금의 주법 근거를 확인 질문으로 둔다. 정간보 방향·시간 구조를 오선보로 임의 변환하지 마라. 의심스러운 내용을 확신에 찬 정답으로 교체하지 말고 ‘전문가 확인 필요’를 남긴다. 검수자 이름/승인일/증빙을 만들지 않는다. 메일 전송·공개·승인 상태 변경은 하지 마라.
```

### B04. 앱 읽기 전용 점검
```text
사용자가 고른 실제 후보 URL [여기에 URL]을 읽기 전용으로 확인하라. 페이지 접근, 악기형, 설명된 목적, 실제 보이는 기능, 모바일 레이아웃, 권한/개인정보 고지, 로그인 필요 여부, 원래 단원 복귀를 기록하라. URL이 없으면 TODO를 유지하고 주소를 지어내지 마라.
로그인·가입·권한 허용·카메라/마이크·학생정보·설정 변경·CAPTCHA가 필요하면 필요한 승인을 따로 확인한다. 보안 경고나 접근 거부를 우회하지 마라. HTTP 응답과 음악적 정확성은 별도다. 확인일·브라우저·크기·범위·제한·근거를 기록하되 단순 조회만으로 전문가 승인/공개 활성화를 하지 마라.
```

### B05. PPTX 콘텐츠 보강
```text
국악 원본 PPTX의 읽기 전용 추출 결과로 편집 단원 후보를 제안하라. manifest의 정확한 Drive ID를 사용하고 원본은 변경하지 마라. 표지/목차/활동/설명/악보/이미지/참고문헌 슬라이드를 구분하고 위치 참조를 보존하라. 단원 분할 이유와 여러 슬라이드 매핑을 표시하라. 이미지 속 내용을 읽지 못하면 시각검토 필요로 표시하고 OCR 결과는 확정 원문과 섞지 않는다. 새 교육 내용을 보충하기보다 누락/중복/검수 질문을 먼저 기록하라. 결과는 draft/private/rights unknown의 편집 제안이며 새 레슨 완성이나 전문 검수로 집계하지 않는다.
```

## 10. 후속 실서비스 전환

### F01. 승인 근거 안내
```text
생성형 AI 없이 ‘자료에서 찾아보기’ UI를 추가하라. 공개판정 통과한 정확한 판본 또는 분리된 합성 데모만 검색한다. 실제 승인자료가 없으면 ‘답변에 사용할 승인 자료가 없습니다’라고 표시하라. 장단·농현·운지·음역을 출처 없이 생성하지 말고 해당 판본의 단원 링크를 제공한다. 질문 로그를 저장·전송하지 않는다. 보류판본 제외, 근거없음, 악기형 혼동 테스트를 추가하라.
```

### F02. 서버 전환 설계
```text
현재 mock의 실서비스 전환 설계서만 작성하라. 계정·DB·키·OAuth·권한·배포는 실행하지 마라. repository 인터페이스를 유지하고 교사/학생/검수자/편집책임자 인증, 서버측 권한, 불변 판본, 감사 이벤트, 권리별 자산, 백업·복구, 저장정책과 비용을 설계한다. 실제 미성년자 서비스는 수집 최소화·동의·접근제어·보관/삭제를 별도 검토한다. 현재 공식 문서를 확인하고 secret/service role을 클라이언트에 넣지 않는다. 승인된 교재와 외부 앱의 권리·API·SSO·데이터 전송은 각각 확인하며 링크 연결을 통합 완료로 표현하지 마라.
```

| 구분 | 이번 로컬 범위 | 후속 조건 |
|---|---|---|
| 학생 | 익명 탐색 시연 | 실제 이용자·동의·보안 설계 |
| 저장 | 브라우저 mock | 서버 인증·권한·충돌·복구 |
| 자료 | 메타데이터/합성 데모/편집 초안 | 음악 검수+권리+버전 승인 |
| 앱 | 후보/비활성/검증된 링크 | API·SSO·전송·운영 계약 |
| AI | 선택적 근거 검색 UI | 평가셋·근거/보류·비용·안전 |
| 출판 | 로컬 교안 출력 | 원문/악보/음원별 이용허락 |
| 배포 | 로컬 실행 | 공개 범위·권리·보안·사용자 요청 |

## 11. 원자료 인벤토리와 근거

### A. 실제 14개 PPTX
아래 인벤토리는 source-manifest의 기준입니다. 본문 추출 여부·슬라이드 수와 음악 검수는 별도입니다. 원문 이름은 그대로 보존하고 UI 표시명만 정규화합니다.

| 원본 파일명 | Drive 파일 ID | bytes |
|---|---|---:|
| 가야금_12현산조_입문교재_20261012.pptx | `1LfgBG-QMkeObR_WwEhZp-nN5o37Bdwoi` | 14971996 |
| 거문고_6현_입문교재_20261012.pptx | `19chOvDpPLHXSIP2_56ALcuuThXZS7m9T` | 14367198 |
| 단소_정악형5지공_입문교재_20261012.pptx | `19k-Dz0TdK5cHLujcUMNevGthnPpPqw_1` | 9681142 |
| 대금_정악B♭관_입문교재_20261012.pptx | `1XeGFVCQZE85alBU5sUTT2vfrbaL__Shh` | 14440922 |
| 생황_입문교재_현행17관_20261012.pptx | `12fBb8SEpTf9ttS6GrC7rUkW7coxO5Ub4` | 9843785 |
| 소금_전통B♭관_입문교재_20261012.pptx | `1LdLd-io6_AYbUOLreph6uxAyIOx1aeSc` | 6446478 |
| 아쟁_8현산조_입문교재_20261012.pptx | `1kTTcDCQS5CO8yRJkIGdv-GTuLuZQ0wJw` | 10308142 |
| 양금_정악외채_입문교재_20261012.pptx | `12N9s_70TEAXU67UWcgqTMvKzB1oYUV_1` | 11735337 |
| 장구_맨손민요반주_입문교재_20261012.pptx | `1zk_xma4Lz78X7sEfNfk9fsJHZnppK-hC` | 11535198 |
| 철현금_개방현_입문교재_20261012.pptx | `1PjphXVsvq399W2Gavf6zE5sXBSf_5TGe` | 8477091 |
| 타악기_사물놀이_입문_교재.pptx | `1tPFAgiKrqVkpkIeTGnZunNEpcSzMgpQ8` | 28788303 |
| 태평소_첫소리_입문교재_20261012.pptx | `10PysRWhY_1WMdoGsocnvKbtv9ZJW3sTT` | 10834099 |
| 피리_첫소리_입문교재_20261012.pptx | `1zuXfQFWtFnFAkEgyscRUSYxY0VIjHEun` | 9335229 |
| 해금_첫소리_입문교재.pptx | `1bECr1SiexLPpL8HUQoKImWJKXpk1aY5l` | 14562562 |

파일명에서 직접 관찰되는 범위: 가야금 12현산조, 거문고 6현, 대금 정악B♭관, 단소 정악형5지공, 생황 현행17관, 소금 전통B♭관, 아쟁 8현산조, 양금 정악외채, 장구 맨손민요반주. 이는 파일명 메타데이터의 source_observed이며 전문가 검수·전체 운지/음역 확정이 아닙니다. 본문과 대조 후 세부 모델을 확정합니다. 나머지 악기형·조율·음역은 근거 없이 보충하지 않습니다.

### B. 근거 문서와 적용 한계
- [클래식 원본 프롬프트팩](https://drive.google.com/file/d/1U9_lnsl_Cwra95tdoYrUGR45j16YZJ7r/view): 단계·UI·검수·저장·테스트 구조의 기준. 국악 콘텐츠 사실의 근거는 아님.
- [국립국악원 정간보](https://www.gugak.go.kr/ency/topic/view/1315): 정간보의 시간·기보 구조와 가로/세로 교육용 맥락 확인. 이 앱의 변환 알고리즘을 검증한 자료는 아님.
- [국립국악원 농현](https://www.gugak.go.kr/ency/topic/view/2104): 맥락에 따른 농현 차이를 고려하는 편집 기준. 모든 악기에 동일한 수치를 적용하지 않음.
- [국립국악원 양금](https://www.gugak.go.kr/ency/topic/view/90): 타현의 현악기라는 발음 방식 구분. 원자료 악기 모델의 현수·음역을 자동 확정하지 않음.
- [국립국악원 아쟁](https://www.gugak.go.kr/ency/topic/view/71): 악기/주법 문맥을 검토할 공식 참고. PPTX 전체의 정확성 보증은 아님.
- 기술 적용 시 Next.js, Vitest, Playwright, W3C WCAG 공식 문서와 현재 lockfile을 다시 확인하고 선택 버전/근거일을 ARCHITECTURE에 기록합니다. 이 팩은 고정 ‘최신’ 버전을 주장하지 않습니다.

국악 참고 문서는 2026-10-14 검색 결과에서 관련 본문을 확인했습니다. 전재·음원·이미지 재사용 허락을 받은 것은 아닙니다. 실제 악기별 교육 내용의 전문가 검수는 여전히 필요합니다.

---
목표는 확인되지 않은 음악 지식을 그럴듯하게 채우는 것이 아니라, 원자료와 권리·판본·검수 상태를 보존하면서 교사가 실제로 수업을 준비할 수 있는 로컬 시연을 만드는 것입니다.


## 부록: 책장형 홈 공통 설계 전문

### 공통 책장형 홈 설계계획서

버전 1.0 · 2026-10-14 · 구현 전 설계 및 두 프롬프트팩 공통 삽입 계약

## 1. 확정 요구와 제안의 구분
사용자 요구: 클래식·국악 전자도서관의 메인 화면을 책 진열대 배경으로 구성하고 PDF 교재를 책 모양으로 가지런히 배치합니다. 책을 누르면 교재를 열람합니다. 설계계획서를 먼저 만들고 두 바이브코딩 프롬프트에 삽입합니다.
설계 제안: 책장/목록 보기 전환, 가변 열 수, 필터·읽던 페이지·연습 연결을 함께 제공합니다. 다음 규격은 구현을 위한 제안이며 사용자 확정값으로 포장하지 않습니다.

## 2. 홈 화면 구조
1. 상단: 서비스 이름, 클래식/국악 정체성, 시연/권리 안내, 검색창.
2. 탐색 바: 악기·자료군, 악기형(국악), 난이도/수준 미확인, 자료종류, 기보법(국악), 초기화, 정렬.
3. 이어 읽기: 현재 접근 가능한 마지막 교재와 판본, 마지막 페이지. 기록 없음/자료 보류/파일 교체 상태 처리.
4. 책장: 따뜻한 종이색·과하지 않은 나무색 선반 배경, 정렬된 책 표지 카드. 실제 책장 사진·외부 텍스처 다운로드 없이 CSS로 구현 가능.
5. 보조 보기: 동일 데이터의 접근성 높은 목록 보기. 책장과 목록 전환으로 검색·필터 상태가 사라지지 않음.
6. 하단: 결과수, 미확인/준비 중 안내, 출처·권리·검수 설명.

## 3. 책 표지 카드 계약
표지, 제목, 악기/자료군, 수준(미확인 허용), 판본, 검수/권리 상태, 파일 종류, 이어읽기, 북마크를 표시합니다. 장식용 책등에는 동일 내용을 중복 낭독시키지 않습니다.
- 표지는 실제 제공되고 열람권이 확인된 이미지 또는 새로 만든 타이포그래피 표지입니다. 이미지의 존재·권리를 추정하지 않습니다.
- 원본이 PPTX이면 PPTX 원자료로 표시합니다. 국악 PPTX 14개를 PDF 14권이라고 부르지 않습니다.
- PDF가 실제로 준비되기 전에는 ‘PDF 준비 중’ 또는 구조화 단원 보기로 연결합니다. 가짜 PDF 다운로드나 빈 새 탭은 금지합니다.
- 공개 접근권 없는 실제 교재는 public 책장에 노출하지 않습니다. 관리자에서 메타데이터만 볼 수 있고 실제 기밀 내용은 정적 번들에 넣지 않습니다.
- 합성 데모 책은 표지·상세·출력 모두 시연용이라고 표시합니다. 표지를 만들었다고 교재가 완성된 것이 아닙니다.
- 카드의 주 링크는 하나의 명확한 책 열기 동작입니다. 북마크 버튼과 중첩 링크 충돌을 피합니다.

## 4. 클릭 후 열람과 PDF
목록의 필터/스크롤을 유지한 채 자료 상세 또는 뷰어로 이동합니다. 데스크톱은 목차+본문+자료정보, 모바일은 접을 수 있는 목차를 권장합니다.
PDF 자산은 id, resourceVersionId, format, fileRef, pageCount, checksum, rights, availability를 가집니다. pageCount는 실제 검사값, fileRef는 검증된 자산 참조입니다. 원본 PPTX→PDF 변환은 별도 처리하고 페이지별 누락/글꼴/기호/악보 레이아웃을 시각검사해야 합니다. 변환 완료 전 링크를 활성화하지 않습니다.
PDF 뷰어 후보는 구현 시 현재 공식 문서와 유지관리 상태를 확인합니다. 화면에서 URL만 iframe으로 덮는 것을 완성 뷰어로 간주하지 않습니다. 확대/축소, 페이지 입력, 이전/다음, 목차/단원 연결, 로딩/오류, 키보드와 페이지 텍스트 또는 대체 설명이 필요합니다. 브라우저 내장 PDF만 사용한 경우 모바일·접근성·읽기위치의 실제 지원 범위를 보고합니다.
책 열기/이어읽기 저장키는 projectId/resourceId/versionId/assetId를 포함합니다. 페이지 범위를 검사하고 파일이 교체되거나 보류되면 자동으로 다른 판본의 같은 숫자로 이동하지 않습니다. 비교/새판본 안내 후 사용자 선택으로 전환합니다.
출력과 다운로드는 열람권과 별도입니다. rights.allowPrint/allowDownload=false이면 해당 버튼 및 실제 명령을 차단합니다.

## 5. 영상·연습 자료 연결
현재 단원의 appId/mediaId만 연결하고 검증된 실제 URL·권리·내용·악기형 적합성이 있는 경우 활성화합니다. 없음/미점검은 준비 중. 영상 자동재생, 카메라/마이크 권한, 학생 개인 정보 전달은 하지 않습니다. 외부 이동 후 돌아오면 책·판본·페이지·필터가 유지되어야 합니다.

## 6. 반응형·접근성
- 320/360px: 1~2열 가변. 2열에서 제목·버튼이 잘리면 1열을 사용합니다. 모바일 2~3열 고정은 요구하지 않습니다.
- 768px: 3~4열 제안, 1440px 이상: 가용폭 기반 5~7열 제안. 최소 카드폭과 200% 확대 우선.
- CSS grid minmax와 wrapping을 사용하고 고정 책장 이미지 위 절대 좌표 배치를 피합니다.
- 최소 44px 목표 터치영역, 충분한 텍스트 명암, 키보드 focus, aria-label, 장식 aria-hidden, reduced-motion.
- 책을 클릭할 때 과도한 3D 회전·자동 스크롤을 하지 않습니다. 애니메이션은 선택적 장식.
- 가로 넘침·자막/대체 설명·읽기 순서·대화상자 focus 복귀를 점검합니다.

## 7. 데이터 확장안
```typescript
interface BookPresentation {
  resourceId: string; resourceVersionId: string;
  coverAssetId: string | null; coverOrigin: 'provided'|'generated_typography'|'none';
  shelfOrder: number | null; displayTitle: string;
}
interface ReadingAsset {
  id: string; resourceVersionId: string; format: 'pdf'|'structured'|'pptx_source';
  fileRef: string | null; pageCount: number | null; checksum: string | null;
  availability: 'missing'|'processing'|'available'|'failed'|'on_hold';
  rights: {allowView:boolean; allowPrint:boolean; allowDownload:boolean};
}
interface BookPosition {
  projectId: 'classical-library'|'gugak-library'; resourceId:string;
  resourceVersionId:string; assetId:string; pageNumber:number|null;
  unitId:string|null; updatedAt:string;
}
```
변환 작업 상태와 공개 상태는 독립입니다. PDF 변환 성공이 음악 승인·권리 허락을 대신하지 않습니다. 모르는 pageCount/fileRef는 null입니다.

## 8. 구현 단계와 완료 기준
- P00: BOOKSHELF_SPEC.md 및 기존 요구사항 대응표. PDF 보유/미보유와 원본 형식 조사.
- P01: 책장 홈+목록 대안+필터+표지 상태를 구현. 시연 배너 유지.
- P02: BookPresentation/ReadingAsset/BookPosition 스키마 및 실제 자산/중립 데모 분리.
- P03: 프로젝트별 저장키·판본별 위치·손상 복구.
- P04: 검색/필터/정렬을 책장과 목록에서 동일하게 적용.
- P05: 실제 PDF 또는 구조화 뷰어, 페이지·단원·판본·권리 표시, 준비 중 분기.
- P06: 검증된 영상/앱만 연결, 복귀 위치 보존.
- P07: 교안 담기와 권리별 인쇄.
- P08/P09: 표지/자산/변환/권리/검수 편집과 공개 차단.
- P10: 아래 테스트 실행, 화면 수동검사.
- P11: 5분 데모를 ‘책장→책 열기→읽던 페이지→교안→연습→복귀→출력’으로 보강.

## 9. 수락 테스트
1. 실제 PDF 없는 국악 원자료를 PDF 완료 책으로 표시하지 않는다.
2. 합성 책장과 승인 실제 책장 통계가 다르다.
3. 클릭이 올바른 resource/version/asset을 연다.
4. 페이지 3 저장 후 새로고침·외부앱 복귀 시 같은 판본 3쪽, 페이지 범위 오류는 안전 처리.
5. 구판 보류·새판본 교체는 경고하고 자동 위치 이식하지 않는다.
6. 검색 필터/정렬/목록 전환/뒤로가기가 상태를 유지한다.
7. 권리 없는 자산은 열기·출력·다운로드 명령 모두 차단.
8. 320/360/768/1440/1920px·200% 확대에 잘림 없음; 키보드로 책 선택/북마크/복귀 가능.
9. 표지 실패/없음은 타이포그래피 대체, 권리 미확인 이미지 자동 수집 없음.
10. 영상/앱 없음은 비활성, 자동재생·권한요청 없음.
11. 클래식/국악 저장 키·파일·책 목록이 서로 섞이지 않는다.
12. 실제 PDF를 사용했다면 각 페이지 변환·폰트·악보·기호 시각검사 결과를 남긴다. 미실행은 미완료.

## 10. 인수 경계
이 계획은 책장형 홈의 설계입니다. 실제 PDF 변환·자산 생성·앱 구현·배포는 구현 작업의 결과와 검사 증거가 있어야 완료라 할 수 있습니다. 기존 프롬프트의 개인정보·권리·승인·mock 경계를 그대로 유지합니다.
