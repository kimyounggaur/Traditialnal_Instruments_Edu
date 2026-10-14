import { ResourceDetail } from '@/components/reader';
export default async function Page({params}:{params:Promise<{resourceId:string}>}){const{resourceId}=await params;return <ResourceDetail resourceId={resourceId}/>}
