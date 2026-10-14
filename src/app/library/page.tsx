import { Suspense } from 'react';
import { BookshelfPage } from '@/components/bookshelf';
export default function Page(){return <Suspense fallback={<p>자료를 준비하고 있습니다…</p>}><BookshelfPage/></Suspense>}
