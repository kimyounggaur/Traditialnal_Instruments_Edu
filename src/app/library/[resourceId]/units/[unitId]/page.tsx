import { UnitReader } from '@/components/reader';
export default async function Page({params}:{params:Promise<{resourceId:string;unitId:string}>}){return <UnitReader {...await params}/>}
