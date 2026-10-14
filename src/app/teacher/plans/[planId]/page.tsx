import { PlanEditor } from '@/components/staff';
export default async function Page({params}:{params:Promise<{planId:string}>}){return <PlanEditor {...await params}/>}
