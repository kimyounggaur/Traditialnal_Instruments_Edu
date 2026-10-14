import { expect, test, type Page } from '@playwright/test';

// AUTHORED, NOT RUN in the managed Sites environment: no approved browser-control
// capability is available. Run locally with `npm run test:e2e` after installing
// Playwright's browser in your own environment. No external app needs to open.
const groups = [
  ['gayageum', '가야금'], ['geomungo', '거문고'], ['daegeum', '대금'],
  ['danso', '단소'], ['saenghwang', '생황'], ['sogeum', '소금'],
  ['ajaeng', '아쟁'], ['yanggeum', '양금'], ['janggu', '장구'],
  ['cheolhyeongeum', '철현금'], ['taepyeongso', '태평소'], ['piri', '피리'],
  ['percussion-samulnori', '타악기·사물놀이'], ['haegeum', '해금'],
] as const;

async function openUnit(page: Page, id = 'gayageum') {
  await page.goto(`/library/demo-${id}/units/demo-${id}-u1?version=demo-${id}-v1`);
  await expect(page.getByRole('heading', { name: '자료 읽기 안내' })).toBeVisible();
}

for (const [id, name] of groups) {
  test(`${name}: filtered shelf → detail → units → version-pinned new 40-minute plan`, async ({ page }) => {
    await page.goto(`/library?instrument=${id}&level=1&sort=level`);
    await expect(page.getByRole('article')).toHaveCount(1);
    await page.getByRole('link', { name: `${name} 시연 교재 열기` }).click();
    await expect(page.getByRole('heading', { name: `${name} · 함께 읽는 첫 장` })).toBeVisible();
    await expect(page.getByText('PDF 준비 중', { exact: true })).toBeVisible();
    await expect(page.locator('a[href$=".pdf"]')).toHaveCount(0);
    await page.getByRole('link', { name: '단원 읽기' }).click();
    await expect(page.getByRole('heading', { name: '자료 읽기 안내' })).toBeVisible();
    await expect(page.getByRole('button', { name: '연결 준비 중', exact: true })).toBeDisabled();
    await expect(page.getByRole('link', { name: /외부 도구 열기/ })).toHaveCount(0);
    await page.getByRole('link', { name: '다음 단원' }).click();
    await expect(page.getByRole('heading', { name: '수업 준비 메모' })).toBeVisible();
    await page.getByRole('button', { name: '교안에 담기' }).click();
    const dialog = page.getByRole('dialog', { name: '수업안에 단원 담기' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: '이 판본으로 담기' }).click();
    await expect(dialog.getByText('현재 판본으로 저장했어요.', { exact: false })).toBeVisible();
    const plan = await page.evaluate(({ resourceId, versionId, unitId }) => {
      const data = JSON.parse(localStorage.getItem('gugak-library:v1') || '{}');
      return data.plans?.find((item: { id: string; activities: { resources: { resourceId: string; versionId: string; unitId: string }[] }[] }) =>
        !item.id.startsWith('plan-copy-') && !item.id.endsWith(resourceId.replace('demo-', '')) &&
        item.activities.some(activity => activity.resources.some(ref => ref.resourceId === resourceId && ref.versionId === versionId && ref.unitId === unitId)));
    }, { resourceId: `demo-${id}`, versionId: `demo-${id}-v1`, unitId: `demo-${id}-u2` });
    expect(plan?.isDemo).toBe(true);
    expect(plan?.durationMinutes).toBe(40);
    expect(plan?.activities.reduce((sum: number, activity: { minutes: number }) => sum + activity.minutes, 0)).toBe(40);
    await dialog.getByRole('link', { name: '수업안 편집하기' }).click();
    await expect(page).toHaveURL(/\/teacher\/plans\//);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
}

test('public library starts at zero and synthetic/private detail IDs do not bypass it', async ({ page }) => {
  await page.goto('/library?audience=public');
  await expect(page.getByRole('heading', { name: '공개할 수 있는 승인 자료가 아직 없습니다.' })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
  for (const path of [
    '/library/demo-gayageum?audience=public',
    '/library/source-resource-gayageum?version=source-resource-gayageum-v1&audience=public',
    '/library/source-resource-gayageum?audience=admin',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: '지금은 이 자료를 열 수 없어요' })).toBeVisible();
    await expect(page.getByRole('button', { name: '인쇄', exact: true })).toHaveCount(0);
  }
});

test('Q03/Q09/Q11 search aliases, unrelated technique and empty recovery', async ({ page }) => {
  await page.goto('/library');
  await page.getByRole('textbox', { name: '서재 검색' }).fill('  GAYAGEUM  ');
  await page.getByRole('button', { name: '검색', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('link', { name: '가야금 시연 교재 열기' })).toBeVisible();
  await page.goto(`/library?instrument=yanggeum&q=${encodeURIComponent('농현')}`);
  await expect(page.getByRole('heading', { name: '조건에 맞는 자료가 없습니다.' })).toBeVisible();
  await page.getByRole('button', { name: '검색·필터 초기화' }).click();
  await expect(page.getByRole('article')).toHaveCount(14);
});

test('Q10 full filters survive list/detail/unit/practice/back navigation', async ({ page }) => {
  const listing = '/library?instrument=haegeum&level=1&sort=level&view=list';
  await page.goto(listing);
  await page.getByRole('link', { name: '해금 시연 교재 열기' }).click();
  await page.getByRole('link', { name: '단원 읽기' }).click();
  const readerUrl = page.url();
  await page.getByRole('link', { name: '연습실 보기' }).click();
  await page.getByRole('link', { name: '읽던 판본·단원으로 돌아가기' }).click();
  await expect(page).toHaveURL(readerUrl);
  await page.getByRole('link', { name: '자료실', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${listing.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('button', { name: '목록 보기' })).toHaveAttribute('aria-pressed', 'true');
});

test('saved bookmark and exact reading position survive reload', async ({ page }) => {
  await openUnit(page, 'danso');
  await page.getByRole('button', { name: '북마크', exact: true }).click();
  await expect(page.getByRole('button', { name: '저장됨', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.getByRole('button', { name: '저장됨', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const position = await page.evaluate(() => JSON.parse(localStorage.getItem('gugak-library:v1') || '{}').positions?.[0]);
  expect(position).toMatchObject({ projectId: 'gugak-library', resourceId: 'demo-danso', resourceVersionId: 'demo-danso-v1', unitId: 'demo-danso-u1' });
});

test('major issue puts the exact version on hold and prevents direct content access', async ({ page }) => {
  await openUnit(page);
  await page.getByRole('button', { name: '오류 신고', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '자료 오류 신고' });
  await dialog.getByLabel('중요도').selectOption('major');
  await dialog.getByLabel('문제 내용').fill('시연용 주요 문제 신고입니다.');
  await dialog.getByLabel('관찰 근거').fill('현재 합성 시연 첫 단원 문구를 확인했습니다.');
  await dialog.getByRole('button', { name: '신고 저장' }).click();
  await expect(page.getByRole('heading', { name: '지금은 이 자료를 열 수 없어요' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '지금은 이 자료를 열 수 없어요' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '자료 읽기 안내' })).toHaveCount(0);
});

test('native dialog traps keyboard focus and Escape restores the trigger', async ({ page }) => {
  await openUnit(page);
  const trigger = page.getByRole('button', { name: '오류 신고', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: '자료 오류 신고' });
  await expect(dialog).toBeVisible();
  for (let index = 0; index < 12; index++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('corrupt local storage warns without destroying the original saved value', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('gugak-library:v1', '{corrupt-json'));
  await page.goto('/library');
  await expect(page.getByRole('alert')).toContainText('원래 저장값을 덮어쓰지 않고');
  await expect(page.getByRole('article')).toHaveCount(14);
  expect(await page.evaluate(() => localStorage.getItem('gugak-library:v1'))).toBe('{corrupt-json');
});

test('normal reading and practice do not request external services or camera/microphone', async ({ page }) => {
  const external: string[] = [];
  page.on('request', request => { if (new URL(request.url()).hostname !== '127.0.0.1' && new URL(request.url()).hostname !== 'localhost') external.push(request.url()); });
  await page.addInitScript(() => {
    Object.defineProperty(window, '__mediaRequestCount', { value: 0, writable: true });
    if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => { (window as unknown as { __mediaRequestCount: number }).__mediaRequestCount += 1; throw new Error('No media permissions in test'); };
  });
  await openUnit(page);
  await page.getByRole('link', { name: '연습실 보기' }).click();
  await expect(page.getByRole('button', { name: /연습 도구 연결 준비 중/ })).toHaveCount(14);
  await expect(page.locator('main a[href^="https:"]')).toHaveCount(0);
  expect(external).toEqual([]);
  expect(await page.evaluate(() => (window as unknown as { __mediaRequestCount: number }).__mediaRequestCount)).toBe(0);
});

for (const width of [320, 360, 768, 1440, 1920]) {
  test(`layout at ${width}px: shelf and reader have no document overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/library');
    await expect(page.getByRole('article')).toHaveCount(14);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.getByRole('link', { name: '타악기·사물놀이 시연 교재 열기' }).click();
    await page.getByRole('link', { name: '단원 읽기' }).click();
    await expect(page.getByRole('heading', { name: '자료 읽기 안내' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
}

test('200% text-resize proxy preserves the reader; full browser zoom still requires manual QA', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1000 });
  await openUnit(page);
  await page.addStyleTag({ content: 'html { font-size: 36px !important; }' });
  await expect(page.getByRole('heading', { name: '자료 읽기 안내' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
