import type { Metadata } from 'next';
import './globals.css';
import { LibraryProvider } from '@/components/provider';
import { Shell } from '@/components/shell';
export const metadata:Metadata={title:'국악의 서재 | 레슨 디자이너',description:'14개 국악 자료군을 탐색하고 수업을 준비하는 한국어 로컬 시연 전자도서관.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ko"><body><LibraryProvider><Shell>{children}</Shell></LibraryProvider></body></html>;}
