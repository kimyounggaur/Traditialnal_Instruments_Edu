# 데이터 계약

실제 타입과 Zod 구현은 src/domain/types.ts, schemas.ts가 기준이다. 아래는 데이터의 의미와 변하지 않아야 할 조건이다.

## 원자료에서 열람까지

SourceDocument → SourceSlide → EditorialUnit → ResourceVersion → Unit / ReadingAsset.

| 레코드 | 소유하는 사실 | 금지되는 해석 |
|---|---|---|
| SourceDocument | Drive ID·원명·bytes·수정일·SHA-256·실제 슬라이드 수 | 한 파일=한 레슨 |
| SourceSlide | 원 슬라이드 번호·XML 블록 위치·불변 originalText·노트·이미지/링크 참조 | OCR·도식·음악 검증 완료 |
| EditorialUnit | sourceSlideIds·별도 editedBlocks·변경 요약·revision·제안/검토 상태 | 원문 덮어쓰기·임의 페이지 |
| Resource | 자료군·종류·목표·현재 초안/공개판본 ID·공개상태 | 최신 초안=승인판본 |
| ResourceVersion | 불변 본문판본·검수·권리·범위·증빙·국악 문맥 | 승인 자동 승계 |
| Unit | 정제된 블록·순서·판본·앱 참조 | HTML 실행·악보 자동 생성 |
| ReadingAsset | format·fileRef·checksum·실측 pageCount·각 권리 | 열람권=인쇄/다운로드권 |
| BookPosition | project/resource/version/asset/unit/page | 새 파일에 구판 페이지 자동 이식 |
| LessonPlan | 활동·시간·자료판본/단원·앱 참조 | 학생 진단·실성과 |
| AppLink | 실제 출처 URL·모델·목표·점검 증거 | HTTP 성공=내용/안전 검증 |
| ReviewIssue/Event | 위치·심각도·근거·수정·검증·이력 | fixed=verified·실보안 감사 |

## 국악 문맥

EvidenceValue는 value=null을 허용하고 unconfirmed/source_observed/expert_reviewed를 구분한다. sourceSlideIds, reviewerId, reviewedAt은 근거가 있을 때만 기록한다. 파일명 관찰만으로 모델 전체의 조율·음역·운지를 확정하지 않는다.

GugakContext에는 originalClassification, variant, stringCount, tuning, soundingRange, notationKinds, pitchSystem, referencePitch, genreOrTradition, techniqueTerms, jangdan, jeonggan을 구분한다. notationKinds는 jeongganbo/staff/yulja/gueum/mixed/other/unknown이다. 모르는 값에 0·440Hz·C장조·기본 운지를 넣지 않는다.

장단은 이름/세부형/박/분박/한배/구음을 독립 보관한다. 정간은 읽기 방향/격자/율명/범례를 원문과 함께 저장한다. 평조·계면조·청을 서양 조성과 자동 대응하지 않는다.

## 공개·권리

실제 공개는 reviewed_real + approved + 실제 승인자/시간/범위/증빙 + cleared/allowView + 필수 메타데이터 + 미해결 critical/major 없음 + 정확한 publishedVersionId + published를 모두 요구한다. source_unreviewed에 승인값만 넣어도 공개되지 않는다.

synthetic_demo는 demo 서고의 별도 정책이다. 가상 승인 시연이 실제 승인 수를 늘리지 않는다. 권리 필드는 holder/license/evidenceRef/checkedAt/checkedBy/allowView/allowPrint/allowDownload/allowRedistribute를 분리한다. 실제 자료 초기값은 unknown, 모두 불허, 승인값 null이다.

## 상태 전이

draft → in_review → changes_requested → re_review → approved/rejected.
검토 요청에는 범위·출처·배정이 필요하다. 수정 요청에는 위치·심각도·근거가 필요하다. 재제출에는 응답과 변경내용이 필요하다. 승인에는 중대 미해결0·증빙·검토범위가 필요하며 실제 자료의 승인을 AI가 만들지 않는다. rejected 또는 approved를 개정할 때 새 ID의 draft를 만들고 기존 승인판본과 교안 참조를 보존한다.

critical/major 신고는 해당 공개판본을 on_hold로 바꿔 직접 조회도 차단하고 기존 교안은 경고한다. fixed는 수정자의 주장, verified는 재검수 확인이다. 임의 삭제/단독 무시로 중대 오류를 없애지 않는다.

## 조회/명령/실패

모든 repository 호출은 Promise를 반환한다. listResources/getResource/getUnit/listApps, saveLessonPlan/toggleBookmark/recordReadingPosition/transitionReview/reportIssue/updateApp를 제공한다. not_found/validation_error/storage_unavailable/conflict/not_allowed를 구분한다. 중복 commandId는 재실행하지 않는다.

앱 URL은 https와 허용된 호스트만, 사용자정보·토큰 query·javascript/data/file/프로토콜 상대/내부망은 거부한다. 모델·기보·목표 미확인 또는 불일치는 활성 연결을 막는다. sourceEvidence/availability/contentCompatibility/privacyPermission 점검을 모두 갖춰야 하며 카메라/마이크/로그인 필요 앱은 로컬 MVP에서 비활성이다.

학생·학교·점수·녹음·얼굴 테이블은 만들지 않는다. JSON 가져오기는 크기·스키마·ID/FK·URL을 검증한 뒤 반영하며 실패 시 기존 데이터가 남는다.
