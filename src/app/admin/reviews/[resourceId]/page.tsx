import { ReviewPage } from '@/components/staff';
export default async function Page({params}:{params:Promise<{resourceId:string}>}){return <ReviewPage {...await params}/>}
