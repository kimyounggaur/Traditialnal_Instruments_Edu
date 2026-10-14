import { Suspense } from 'react';
import { IssuesPage } from '@/components/staff';
export default function Page(){return <Suspense fallback={<p>화면을 준비하고 있습니다…</p>}><IssuesPage/></Suspense>}
