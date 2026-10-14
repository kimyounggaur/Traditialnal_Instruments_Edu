import { instruments, instrumentIds, type Instrument, type Resource, type ResourceQuery, type NotationKind } from './types';
export function normalizeSearch(value:string):string { return value.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US'); }
export function searchResources(resources:Resource[],query:ResourceQuery={}):Resource[] {
 const q=normalizeSearch(query.q??'');
 const selected=(filters:string[]|undefined,value:string)=>!filters?.length||filters.includes(value);
 return resources.filter(r=>{
  const i=instruments.find(i=>i.id===r.instrument)!;
  const aliases=r.instrument==='percussion-samulnori'?['사물놀이','타악기','samulnori']:[];
  const haystack=normalizeSearch([r.title,r.description,...r.objectives,...r.topics,...r.jangdanNames,i.name,i.id,i.english,...aliases].join(' '));
  return (!q||haystack.includes(q))&&selected(query.instruments,r.instrument)&&selected(query.families,i.family)&&selected(query.kinds,r.kind)&&(!query.levels?.length||query.levels.includes(r.level??'unknown'))&&selected(query.instrumentSystems,r.instrumentSystem)&&(!query.notationKinds?.length||query.notationKinds.some(n=>r.notationKinds.includes(n)))&&(!query.jangdanNames?.length||query.jangdanNames.some(n=>r.jangdanNames.includes(n)))&&(!query.objectives?.length||query.objectives.some(n=>r.objectives.includes(n)));
 }).sort((a,b)=>query.sort==='level'?(a.level??99)-(b.level??99)||a.title.localeCompare(b.title,'ko'):query.sort==='instrument'?instrumentIds.indexOf(a.instrument)-instrumentIds.indexOf(b.instrument):query.sort==='recent'?b.id.localeCompare(a.id):a.title.localeCompare(b.title,'ko'));
}
export function parseResourceQuery(params:URLSearchParams):ResourceQuery {
 const values=(key:string)=>params.getAll(key).flatMap(v=>v.split(',')).filter(Boolean);
 const validInstruments=values('instrument').filter((i):i is Instrument=>instrumentIds.includes(i as Instrument));
 const validKinds=values('kind').filter((k):k is Resource['kind']=>['textbook','score','diagram','activity'].includes(k));
 const levels=values('level').map(l=>l==='unknown'?'unknown':Number(l)).filter((v):v is 1|2|3|'unknown'=>v==='unknown'||v===1||v===2||v===3);
 const notations=values('notation').filter((n):n is NotationKind=>['jeongganbo','staff','yulja','gueum','mixed','other','unknown'].includes(n));
 const sort=params.get('sort');
 return {q:normalizeSearch(params.get('q')??''),instruments:validInstruments,kinds:validKinds,levels,notationKinds:notations,instrumentSystems:values('system'),jangdanNames:values('jangdan'),objectives:values('objective'),sort:sort==='instrument'||sort==='level'||sort==='recent'?sort:'title'};
}
export function queryToSearchParams(query:ResourceQuery):URLSearchParams {
 const p=new URLSearchParams();if(query.q?.trim())p.set('q',normalizeSearch(query.q));
 const add=(key:string,values:unknown[]|undefined)=>values?.forEach(v=>p.append(key,String(v)));
 add('instrument',query.instruments);add('kind',query.kinds);add('level',query.levels);add('notation',query.notationKinds);add('system',query.instrumentSystems);add('jangdan',query.jangdanNames);add('objective',query.objectives);if(query.sort&&query.sort!=='title')p.set('sort',query.sort);return p;
}
