# React/TypeScript 정적 검토

2026-10-14, React best practices 스킬의 상태·효과·접근성·저장 경계 항목을 적용했다.

- Provider는 저장소를 lazy initializer로 한 번 만들고 useEffect에서 브라우저 복원을 시작한다. SSR 중 window/localStorage 접근 없음.
- 화면 컴포넌트는 repository 명령으로만 데이터를 변경한다. snapshot은 불변이며 외부 읽기 결과는 복사본이다.
- 단원 위치 기록은 resource/version/asset/unit 키로 중복 저장을 막는다. db revision 변경을 다시 저장하는 무한 루프를 피한다.
- 비동기 목록/상세 결과는 취소 플래그로 오래된 요청이 현재 화면에 덮이는 것을 막는다.
- 검색/목록 화면은 Suspense 경계에 있으며 데이터복원 전 로딩 상태를 구분한다.
- 이벤트에 의한 교안 저장·오류 신고·검수 전이는 이벤트 핸들러에서 실행한다.
- 학생·계정·서비스 비밀값 또는 서버 전역 가변 상태를 생성하지 않는다.
- 외부 스크립트/폰트/분석 도구를 로드하지 않는다. Next.js 개발/빌드 텔레메트리는 실행 래퍼에서 비활성화한다.
- 링크와 북마크 버튼을 중첩하지 않는다. 레이블/본문 건너뛰기/aria-live/포커스 표시/native dialog/reduced-motion을 적용한다.

이 검토는 소스 검토이며 브라우저 시각·보조기술 접근성 인증 또는 성능 프로파일 측정이 아니다. 테스트·빌드의 실제 결과는 TEST_REPORT.md가 우선한다.
