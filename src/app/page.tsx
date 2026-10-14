import { Suspense } from 'react';
import { BookshelfPage } from '@/components/bookshelf';
export default function Page(){return <Suspense fallback={<p>서재를 준비하고 있습니다…</p>}><BookshelfPage home/></Suspense>}
