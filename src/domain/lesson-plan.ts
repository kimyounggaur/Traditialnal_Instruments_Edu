import type {Database,LessonPlan} from './types';
import {lessonPlanSchema} from './schemas';
import {visibleResource,resourceForVersion} from './visibility';
import {canUseApp} from './url-policy';
export function validateLessonPlan(plan:LessonPlan,db?:Database):string[] {
 const parsed=lessonPlanSchema.safeParse(plan);if(!parsed.success)return [...new Set(parsed.error.issues.map(i=>i.message))];
 const errors:string[]=[];const total=plan.activities.reduce((sum,a)=>sum+a.minutes,0);
 if(total!==plan.durationMinutes)errors.push(`활동 시간 합계 ${total}분과 전체 ${plan.durationMinutes}분이 다릅니다. ${Math.abs(total-plan.durationMinutes)}분 ${total<plan.durationMinutes?'부족':'초과'}합니다.`);
 if(new Set(plan.activities.map(a=>a.id)).size!==plan.activities.length)errors.push('활동 ID가 중복되었습니다.');
 plan.activities.forEach(a=>{
  const refs=a.resources.map(r=>`${r.resourceId}/${r.versionId}/${r.unitId}`);if(new Set(refs).size!==refs.length)errors.push('같은 활동에 중복 자료가 있습니다.');
  if(!db)return;
  a.resources.forEach(ref=>{
   const r=db.resources.find(r=>r.id===ref.resourceId),v=db.versions.find(v=>v.id===ref.versionId&&v.resourceId===ref.resourceId),u=db.units.find(u=>u.id===ref.unitId&&u.resourceVersionId===ref.versionId);
   if(!r||!v||!u){errors.push('참조 자료·판본·단원을 찾을 수 없습니다.');return;}
   if(r.instrument!==plan.instrument)errors.push('교안과 자료의 자료군이 다릅니다.');
   if(plan.instrumentSystem&&plan.instrumentSystem!=='unknown'&&resourceForVersion(r,v).instrumentSystem!==plan.instrumentSystem)errors.push('교안과 자료의 악기형이 다르거나 미확인입니다.');
   if(r.publicationState==='on_hold'){errors.push('보류된 자료 사용 중입니다.');return;}
   if(!visibleResource(db,r,plan.isDemo?'demo':'public',v.id))errors.push('공개 조건을 충족하지 않는 자료가 포함되어 있습니다.');
  });
  a.appLinkIds.forEach(id=>{const app=db.apps.find(app=>app.id===id);const compatible=a.resources.some(ref=>{const r=db.resources.find(r=>r.id===ref.resourceId);const v=db.versions.find(v=>v.id===ref.versionId);return app&&r&&v&&canUseApp(app,r,v);});if(!compatible)errors.push('미점검 또는 자료와 호환되지 않는 앱이 포함되어 있습니다.');});
 });
 return [...new Set(errors)];
}
export function planWarnings(plan:LessonPlan,db:Database):string[] { return validateLessonPlan(plan,db); }
