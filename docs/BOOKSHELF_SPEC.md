# 책장형 홈 구현 계약

기준은 PROMPT_PACK 부록이다. CSS 선반과 타이포그래피 표지로 따뜻한 종이색·남색·절제된 나무색을 구성한다. 책 사진·외부 텍스처를 수집하지 않는다.

## 상태와 행동

상단에 국악 서비스 이름, 지속 시연 배너, 검색을 둔다. 자료군·악기형·수준·종류·기보·정렬/초기화가 홈 책장과 목록에 같은 query를 적용한다. 책장/목록 전환은 결과와 필터를 유지한다. 이어읽기는 resource/version/asset/unit에 고정하며 접근성 있는 목록 대안을 제공한다.

책 표지에는 제목, 자료군, 수준 미확인 허용, 판본, 검수·권리, 실제 파일 종류, 합성 배지를 표시한다. 책 주링크는 하나이고 북마크 버튼은 링크 밖이다. 장식 책등은 aria-hidden 처리한다.

실제 원자료는 PPTX이다. 이번 앱의 열람 자산은 합성 구조화 단원이며 실제 PDF는 준비되지 않았다. PDF 준비 중을 명시하고 없는 PDF의 페이지 수·다운로드·새 탭을 만들지 않는다. 실제 PDF 도입 시 pageCount/checksum/권리와 모든 페이지의 글꼴·악보·기호 시각검사를 별도 확보한다.

## 요구 대응

| ID | 수락 기준 | 연결 요구 |
|---|---|---|
| B01 | PPTX를 PDF 완료 교재로 표시하지 않음 | R03/R14 |
| B02 | 합성 자료/실제 승인 자료 통계 분리 | R04/R14 |
| B03 | book click의 resource/version/asset 일치 | R07/R15 |
| B04 | 같은 판본의 읽던 단원/페이지 복원, 범위 검사 | R07 |
| B05 | 보류/교체 판본 경고, 숫자 위치 자동 이식 금지 | R11 |
| B06 | 필터·정렬·보기·뒤로가기 유지 | R02 |
| B07 | 열람/인쇄/다운로드 권리 실제 명령 검사 | R04/R09 |
| B08 | 320/360/768/1440/1920px 및 200% 확대 | R13 |
| B09 | 표지 실패/없음은 자체 타이포그래피 대체 | R06 |
| B10 | 앱/영상 없거나 미점검이면 비활성, 자동재생 없음 | R08/R12/R20 |
| B11 | 클래식과 프로젝트·저장키·책 분리 | R07/R14 |
| B12 | 실제 PDF 사용 시 변환/접근성 검증 기록 | R06/R13/R15 |

## 데이터

BookPresentation은 resourceId/resourceVersionId와 표지 출처를 갖는다. ReadingAsset은 판본·format·fileRef·pageCount·checksum·availability와 allowView/allowPrint/allowDownload를 분리한다. BookPosition은 projectId/resourceId/resourceVersionId/assetId/pageNumber/unitId/updatedAt를 갖는다. null은 미확인이다.

CSS grid의 가변 카드폭을 사용하며 고정 배경 절대좌표를 쓰지 않는다. 320px에서 한 열로 줄일 수 있다. 본문 18px·1.6 줄간격, 핵심 터치영역 44px 목표, 명확한 focus, reduced-motion을 적용한다. 실제 검사 결과와 미실행 PDF 항목은 TEST_REPORT에 남긴다.
