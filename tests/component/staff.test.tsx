// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LibraryProvider } from '@/components/provider';
import { Shell } from '@/components/shell';
import { TeacherPlans, PlanEditor } from '@/components/staff-teacher';
import { AdminSources, AdminResources, ReviewPage } from '@/components/staff-admin';
import { createSeed } from '@/data/seed';
import type { Database } from '@/domain/types';
import type { ReactNode } from 'react';

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/teacher/plans',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: navigation.push }),
}));

const saved = (): Database => JSON.parse(window.localStorage.getItem('gugak-library:v1')!);
function mount(children: ReactNode) {
  return render(<LibraryProvider><Shell>{children}</Shell></LibraryProvider>);
}

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem('gugak-library:v1', JSON.stringify(createSeed()));
  navigation.push.mockReset();
});

describe('source inventory and independent review/rights boundaries', () => {
  it('separates 14 actual PPTX files and 702 counted slides from zero bundled source bodies', async () => {
    mount(<AdminSources />);
    await screen.findByRole('table', { name: '실제 PPTX 원자료 목록' });
    expect(screen.getByRole('heading', { name: 'PPTX 14개' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '702장' })).toBeInTheDocument();
    expect(screen.getByText('앱에 탑재된 원문 본문').parentElement?.querySelector('h2')).toHaveTextContent('0개');
    expect(screen.getAllByRole('row')).toHaveLength(15);
    fireEvent.click(screen.getByRole('button', { name: '가야금 원자료 정보' }));
    expect(screen.getByText('1LfgBG-QMkeObR_WwEhZp-nN5o37Bdwoi')).toBeInTheDocument();
    expect(screen.getByText('권리 미확인 원문 본문은 앱에 넣지 않았습니다. 원본은 변경하지 않았습니다.')).toBeInTheDocument();
    expect(screen.getByText('0개 · 매핑 0건이면 원문 대조 전 상태')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('locks actual-source approval/publication even after selecting the editor role', async () => {
    mount(<ReviewPage resourceId="source-resource-gayageum" />);
    await screen.findByText('실제 원자료 · 승인 보류');
    fireEvent.change(screen.getByRole('combobox', { name: '시연 역할' }), { target: { value: 'editor' } });
    expect(screen.getByRole('button', { name: '검수 요청' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '이 판본 공개' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '메타데이터 초안 편집' })).toBeEnabled();
    expect(screen.getByText(/실제 원자료의 음악 승인·공개 변경은 잠겨 있습니다/)).toBeInTheDocument();
    expect(saved().resources.find(resource => resource.id === 'source-resource-gayageum')).toMatchObject({ datasetKind: 'source_unreviewed', publicationState: 'private', publishedVersionId: null });
    expect(saved().versions.find(version => version.id === 'source-resource-gayageum-v1')?.approvedAt).toBeNull();
  });

  it('allows synthetic request/approval but refuses publication with unknown rights and keeps real approval at zero', async () => {
    const seed = saved();
    const resource = seed.resources.find(item => item.id === 'demo-gayageum')!;
    resource.publicationState = 'private';
    resource.publishedVersionId = null;
    seed.versions.find(item => item.id === 'demo-gayageum-v1')!.rights.state = 'unknown';
    window.localStorage.setItem('gugak-library:v1', JSON.stringify(seed));
    mount(<><ReviewPage resourceId="demo-gayageum" /><AdminResources /></>);
    await screen.findByRole('heading', { level: 2, name: '초안' });
    fireEvent.change(screen.getByRole('combobox', { name: '시연 역할' }), { target: { value: 'editor' } });
    fireEvent.change(screen.getByRole('textbox', { name: '처리 사유 · 변경 요약' }), { target: { value: '합성 UI 절차를 점검하는 테스트입니다.' } });
    fireEvent.change(screen.getByRole('textbox', { name: '검수 범위' }), { target: { value: '합성 시연 문구와 인터페이스만 확인' } });
    fireEvent.click(screen.getByRole('button', { name: '검수 요청' }));
    await screen.findByRole('heading', { level: 2, name: '검수 중' });
    fireEvent.change(screen.getByRole('combobox', { name: '시연 역할' }), { target: { value: 'reviewer' } });
    fireEvent.change(screen.getByRole('textbox', { name: '승인 근거 · 합성 시연용' }), { target: { value: 'demo-component-test-only: 실제 음악 검수 아님' } });
    fireEvent.click(screen.getByRole('button', { name: '합성 승인 시연' }));
    await screen.findByRole('heading', { level: 2, name: '승인' });
    expect(screen.getByText('실제 승인 공개자료 0건')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: '시연 역할' }), { target: { value: 'editor' } });
    fireEvent.click(screen.getByRole('button', { name: '이 판본 공개' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('공개 조건을 충족하지 못했습니다.');
    expect(saved().versions.find(version => version.id === 'demo-gayageum-v1')?.reviewState).toBe('approved');
    expect(saved().resources.find(item => item.id === 'demo-gayageum')).toMatchObject({ datasetKind: 'synthetic_demo', publicationState: 'private', publishedVersionId: null });
    expect(screen.getByText('실제 승인 공개자료 0건')).toBeInTheDocument();
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('teacher workflow with real repository persistence', () => {
  it('shows fourteen saved plans and duplicates exact unit/version references without changing the original', async () => {
    const original = structuredClone(saved().plans.find(plan => plan.id === 'plan-gayageum')!);
    mount(<TeacherPlans />);
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(14));
    expect(screen.getByText('14개 수업안')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '가야금 · 40분 수업 준비 시연 복제' }));
    await waitFor(() => expect(saved().plans).toHaveLength(15));
    const data = saved();
    const copy = data.plans.find(plan => plan.title === '가야금 · 40분 수업 준비 시연 (복사)')!;
    expect(copy.id).not.toBe(original.id);
    expect(copy.activities).toEqual(original.activities);
    expect(copy.activities[0].resources[0]).toEqual({ resourceId: 'demo-gayageum', versionId: 'demo-gayageum-v1', unitId: 'demo-gayageum-u1' });
    expect(data.plans.find(plan => plan.id === original.id)).toEqual(original);
    expect(navigation.push).toHaveBeenCalledWith(`/teacher/plans/${copy.id}`);
  });

  it('creates a new selected-instrument 40-minute plan with no invented learning content links', async () => {
    mount(<TeacherPlans />);
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(14));
    fireEvent.change(screen.getByRole('combobox', { name: '새 수업안의 자료군' }), { target: { value: 'yanggeum' } });
    fireEvent.click(screen.getByRole('button', { name: '새 수업안 만들기' }));
    await waitFor(() => expect(saved().plans).toHaveLength(15));
    const plan = saved().plans.find(item => item.title === '양금 수업안')!;
    expect(plan.instrument).toBe('yanggeum');
    expect(plan.isDemo).toBe(true);
    expect(plan.activities.map(activity => activity.minutes)).toEqual([5, 10, 15, 10]);
    expect(plan.activities.flatMap(activity => activity.resources)).toEqual([]);
    expect(plan.activities.flatMap(activity => activity.appLinkIds)).toEqual([]);
    expect(navigation.push).toHaveBeenCalledWith(`/teacher/plans/${plan.id}`);
  });

  it('rejects a five-minute shortfall before saving and persists only after the total is corrected', async () => {
    mount(<PlanEditor planId="plan-gayageum" />);
    await screen.findByRole('heading', { level: 1, name: '가야금 · 40분 수업 준비 시연' });
    fireEvent.change(screen.getAllByRole('spinbutton', { name: '활동 시간 (분)' })[2], { target: { value: '10' } });
    expect(screen.getByRole('alert')).toHaveTextContent('5분 부족');
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    expect(saved().plans.find(plan => plan.id === 'plan-gayageum')?.activities[2].minutes).toBe(15);
    fireEvent.change(screen.getByRole('spinbutton', { name: '전체 수업 시간 (분)' }), { target: { value: '35' } });
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await screen.findByText('수업안을 저장했습니다.');
    expect(saved().plans.find(plan => plan.id === 'plan-gayageum')).toMatchObject({ durationMinutes: 35, revision: 1 });
    expect(saved().plans.find(plan => plan.id === 'plan-gayageum')?.activities[2].minutes).toBe(10);
  });
});
