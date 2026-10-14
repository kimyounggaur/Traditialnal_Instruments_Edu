# 원자료 접근·추출 증거

확인일 2026-10-14. 사용자가 제공한 프롬프트팩의 정확한 Drive 폴더와 파일 ID만 사용했다. 연결된 Google Drive 도구의 metadata → folder listing → raw fetch 경로로 읽었으며 계정 추가/공유 변경/권한 요청/외부링크 실행은 하지 않았다.

## 실제 결과

- 폴더 목록: 지정된 PPTX 14개와 파일명·MIME·bytes 일치. 각 파일은 공개 공유되지 않은 상태로 관찰되었다.
- 가야금 개별 metadata 조회 성공: `1LfgBG-QMkeObR_WwEhZp-nN5o37Bdwoi`, 14,971,996 bytes, modified 2026-10-12T09:54:10.000Z.
- 14개 raw fetch 및 파일 다운로드 성공, 전체 175,327,482 bytes.
- 안전 추출 결과: 14개/702슬라이드. SourceDocument별 SHA-256·슬라이드/문단/자산참조 수는 SOURCE_MANIFEST.json.
- 원본 파일과 raw JSON은 `/workspace/scratch/0d1c698ccdb8/source-audit/`에만 저장. 이 경로는 임시 비공개 작업 경로이며 앱/배포 ZIP에 포함하지 않는다. 원본은 Drive에 그대로 있고 다시 ID로 읽어 재생성할 수 있다.
- 실제 PDF 변환, 이미지 OCR, 전 페이지 렌더링·시각검사, 악보·기보·음악 전문가 검수, 권리 확인은 미실행. 앱의 원문 SourceSlide 배열은 비워두고 메타데이터만 사용한다.
- 명시적 목차 범위가 있는 4자료군에서 25개 편집 묶음 후보를 제안했다. 원문과 별도 private JSON이며 미채택 초안이다. EDITORIAL_CANDIDATES.md 참조.

## 추출기와 검사

`scripts/extract_pptx.py`는 Python 표준 라이브러리로 ZIP/XML만 읽는다. ZIP 멤버를 파일시스템에 풀지 않는다. 슬라이드 순서는 presentation.xml의 relationship 순서를 따른다. 원문 문단 위치/줄바꿈, 노트, 도형 ID/이름, 이미지·오디오·영상 참조, 외부 링크 참조를 보존하며 그 자산이나 링크를 실행/다운로드하지 않는다.

제한: 압축파일128MiB, 멤버6000개, 단일80MiB, 전체확장400MiB, XML12MiB, 최대압축비1000. 경로 역참조·중복이름·symlink·암호화·매크로 프로젝트·DTD/ENTITY·잘못된 XML을 거부한다. UTF-16/32의 NUL 포함 선언도 검사한다. 정상 OOXML package-root `/ppt/...` 관계는 ZIP 내부로만 정규화하고 탈출은 거부한다.

추출 JSON은 exclusive-create `x`로 생성하고 읽기 전용으로 바꾼다. 기존 출력은 덮어쓸 수 없다. 원본 SHA-256과 추출 관찰 상태를 기록한다. 이 파일 모드는 실보안/변조방지 감사 저장소가 아니다.

실행한 검사:

```bash
python3 scripts/extract_pptx.py --self-test
python3 scripts/extract_pptx.py /path/original.pptx --source-id source-gayageum --output /private/path/gayageum-raw.json
```

self-test 결과: 정상 합성 추출, 출력 덮어쓰기 거부, 10개 악성 입력(상위경로·절대경로·역슬래시·DTD·UTF-16 DTD·매크로·개수·확장크기·XML크기·관계 탈출) 모두 통과. 실제 14개 처리에서는 파일 크기와 manifest가 모두 일치했다. 처음 가야금 검사에서 합법적 package-root 관계를 거부한 문제를 수정한 뒤 self-test와 실제 추출을 재실행했다. 접근제어를 우회한 수정이 아니다.

## 남은 한계

텍스트 추출 성공은 교육 내용 승인이나 원문 재배포 허가가 아니다. 이미지 내부 텍스트, 글꼴/위치/정간 방향/악보/연주법/안전 안내의 실제 판면은 별도 검토가 필요하다. 데이터는 source_observed이며 실제 권리는 unknown, 검수는 draft, 공개는 private이다. 서명·승인일·승인자·동의를 생성하지 않았다.
