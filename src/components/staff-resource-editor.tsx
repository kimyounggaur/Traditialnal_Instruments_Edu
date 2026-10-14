'use client';

import {useEffect,useId,useRef,useState,type FormEvent} from 'react';
import {X,Save,ShieldCheck} from 'lucide-react';
import {useLibrary} from './provider';
import type {ResourceDetail,ResourcePatch} from '@/repositories/contracts';
import {resourceSchema,gugakContextSchema,rightsSchema,unitSchema} from '@/domain/schemas';
import type {NotationKind} from '@/domain/types';

const notationOptions:Array<{id:NotationKind;label:string}>=[{id:'unknown',label:'미확인'},{id:'jeongganbo',label:'정간보'},{id:'staff',label:'오선보'},{id:'yulja',label:'율자'},{id:'gueum',label:'구음'},{id:'mixed',label:'혼합'},{id:'other',label:'기타'}];
const lines=(value:FormDataEntryValue|null)=>String(value??'').split('\n').map(line=>line.trim()).filter(Boolean);
const pretty=(value:unknown)=>JSON.stringify(value,null,2);
function readJson(value:FormDataEntryValue|null,label:string):unknown {
 try{return JSON.parse(String(value??''));}catch{throw new Error(`${label} JSON 형식을 확인해 주세요. 입력한 내용은 그대로 보존했습니다.`);}
}

export function ResourceEditor({resourceId,onClose}:{resourceId:string;onClose:()=>void}) {
 const {repo,notify,db}=useLibrary();
 const dialog=useRef<HTMLDialogElement>(null);
 const form=useRef<HTMLFormElement>(null);
 const errorRef=useRef<HTMLParagraphElement>(null);
 const id=useId();
 const [detail,setDetail]=useState<ResourceDetail|null>(null);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [dirty,setDirty]=useState(false);
 useEffect(()=>{const element=dialog.current;if(element&&!element.open)element.showModal();return()=>{element?.close();};},[]);
 useEffect(()=>{let active=true;void repo.getResource(resourceId,undefined,'admin').then(value=>{if(active){setDetail(value);setLoading(false);}}).catch((cause:unknown)=>{if(active){setError(cause instanceof Error?cause.message:'자료를 불러올 수 없습니다.');setLoading(false);}});return()=>{active=false;};},[repo,resourceId]);
 const close=()=>{if(busy)return;if(dirty&&!window.confirm('저장하지 않은 편집 내용이 있습니다. 취소하고 닫을까요?'))return;dialog.current?.close();onClose();};
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!detail||busy)return;
  setError('');setBusy(true);
  try{
   const data=new FormData(event.currentTarget);
   const resource=resourceSchema.parse({...detail.resource,title:String(data.get('title')??''),description:String(data.get('description')??''),objectives:lines(data.get('objectives')),topics:lines(data.get('topics')),level:data.get('level')==='unknown'?null:Number(data.get('level')),instrumentSystem:String(data.get('instrumentSystem')??'unknown').trim()||'unknown',kind:String(data.get('kind')),estimatedMinutes:Number(data.get('estimatedMinutes')),notationKinds:data.getAll('notationKinds'),jangdanNames:lines(data.get('jangdanNames')),sourceRefs:detail.resource.datasetKind==='synthetic_demo'?readJson(data.get('sourceRefs'),'출처'):detail.resource.sourceRefs});
   const rights=rightsSchema.parse(readJson(data.get('rights'),'권리 기록'));
   const gugakContext=gugakContextSchema.parse(readJson(data.get('gugakContext'),'국악 근거 정보'));
   const units=detail.resource.datasetKind==='synthetic_demo'?unitSchema.array().parse(readJson(data.get('units'),'구조화 단원')):detail.units;
   if(gugakContext.instrumentId!==resource.instrument)throw new Error('국악 근거 정보의 자료군을 다른 악기로 바꿀 수 없습니다.');
   const originalIds=new Set(detail.units.map(unit=>unit.id));
   if(units.length!==detail.units.length||units.some(unit=>!originalIds.has(unit.id)||unit.resourceVersionId!==detail.version.id))throw new Error('기존 단원 ID와 판본을 유지해 주세요. 원자료에서 확인되지 않은 단원을 새로 만들 수 없습니다.');
   const changeSummary=String(data.get('changeSummary')??'').trim();
   if(!changeSummary)throw new Error('변경 요약을 입력해 주세요.');
   const patch:ResourcePatch={title:resource.title,description:resource.description,objectives:resource.objectives,topics:resource.topics,level:resource.level,instrumentSystem:resource.instrumentSystem,kind:resource.kind,estimatedMinutes:resource.estimatedMinutes,notationKinds:resource.notationKinds,jangdanNames:resource.jangdanNames,sourceRefs:resource.sourceRefs,rights,gugakContext,units,reviewScope:String(data.get('reviewScope')??'').trim(),changeSummary};
   await repo.updateResource(resourceId,patch,detail.version.revision,`edit-${globalThis.crypto.randomUUID()}`);
   setDirty(false);notify('편집 내용을 초안으로 저장했습니다. 교육 승인과 공개는 별도의 검수 흐름에서 처리합니다.');dialog.current?.close();onClose();
  }catch(cause:unknown){
   const message=cause instanceof Error?cause.message:'저장하지 못했습니다.';
   setError(`${message}\n입력 내용은 유지됩니다. 충돌이면 현재 입력을 복사한 뒤 창을 닫고 최신 판본을 다시 여세요.`);
   requestAnimationFrame(()=>errorRef.current?.focus());
  }finally{setBusy(false);}
 }
 const current=detail?.resource.id===resourceId?detail:null;
 const real=current&&current.resource.datasetKind!=='synthetic_demo';
 return <dialog ref={dialog} className="modal" aria-labelledby={`${id}-title`} onCancel={event=>{event.preventDefault();close();}} style={{maxWidth:'min(960px, calc(100vw - 24px))',width:'100%',maxHeight:'90dvh',overflowY:'auto',padding:'clamp(18px, 4vw, 36px)'}}>
  <div className="row" style={{justifyContent:'space-between',alignItems:'flex-start'}}><div><p className="eyebrow">CONTENT EDITOR · LOCAL DEMO</p><h2 id={`${id}-title`}>{real?'원자료 메타데이터 초안 편집':'자료 초안 편집'}</h2></div><button type="button" className="button ghost" aria-label="편집 창 닫기" disabled={busy} onClick={close}><X size={20}/></button></div>
  {loading&&<p role="status">현재 초안과 판본을 불러오고 있습니다.</p>}
  {error&&<p ref={errorRef} tabIndex={-1} className="notice error" role="alert" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{error}</p>}
  {current&&<><p className="notice"><ShieldCheck size={17} aria-hidden="true"/> 시연용 편집입니다. 실제 전문가 승인·권리 허락을 대신하지 않습니다. 판본 {current.version.version} · 수정 {current.version.revision}회</p>
   {real&&<section className="stack"><p className="notice">원문은 읽기 전용입니다. 자료의 메타데이터 초안만 편집할 수 있으며, 실제 전문가 검수와 권리 확인 전에는 승인·공개할 수 없습니다. 원본 파일명·Drive ID·해시·출처 연결·원문 본문은 변경하지 않습니다.</p><dl className="info-table">{db.sources.filter(source=>current.resource.sourceRefs.some(ref=>ref.id===source.id)).map(source=><div key={source.id}><dt>불변 원자료</dt><dd><strong>{source.originalName}</strong><br/>Drive ID: {source.driveFileId}<br/><span style={{overflowWrap:'anywhere'}}>SHA-256: {source.sha256??'미확인'}</span></dd></div>)}</dl></section>}<form ref={form} key={current.version.id} onSubmit={save} onChange={()=>setDirty(true)} className="stack">
    <div className="form-grid grid-2">
     <label className="field" style={{gridColumn:'1 / -1'}}>자료 제목<input name="title" required maxLength={1000} defaultValue={current.resource.title}/></label>
     <label className="field" style={{gridColumn:'1 / -1'}}>설명<textarea name="description" rows={3} maxLength={20000} defaultValue={current.resource.description}/></label>
     <label className="field">목표 · 한 줄에 하나<textarea name="objectives" rows={3} defaultValue={current.resource.objectives.join('\n')}/></label>
     <label className="field">주제어 · 한 줄에 하나<textarea name="topics" rows={3} defaultValue={current.resource.topics.join('\n')}/></label>
     <label className="field">수준<select name="level" defaultValue={current.resource.level??'unknown'}><option value="unknown">미확인</option><option value="1">수준 1</option><option value="2">수준 2</option><option value="3">수준 3</option></select></label>
     <label className="field">악기형<input name="instrumentSystem" defaultValue={current.resource.instrumentSystem} aria-describedby={`${id}-system-help`}/><small id={`${id}-system-help`}>미확인은 unknown으로 보존합니다. 운지·조율을 추정하지 않습니다.</small></label>
     <label className="field">자료 종류<select name="kind" defaultValue={current.resource.kind}><option value="textbook">교재</option><option value="score">악보</option><option value="diagram">도식</option><option value="activity">활동자료</option></select></label>
     <label className="field">예상 시간 · 분<input name="estimatedMinutes" type="number" min={0} step={1} required defaultValue={current.resource.estimatedMinutes}/></label>
    </div>
    <fieldset><legend>기보법 · 검색 태그</legend><div className="row" style={{flexWrap:'wrap'}}>{notationOptions.map(option=><label key={option.id} style={{display:'inline-flex',alignItems:'center',gap:8,minHeight:44}}><input type="checkbox" name="notationKinds" value={option.id} defaultChecked={current.resource.notationKinds.includes(option.id)} style={{width:20,height:20}}/>{option.label}</label>)}</div><p className="muted">태그 선택은 원문 기보나 정확성의 확인을 뜻하지 않습니다.</p></fieldset>
    <label className="field">장단 이름 · 한 줄에 하나<textarea name="jangdanNames" rows={2} defaultValue={current.resource.jangdanNames.join('\n')}/><small>이름만으로 박자·속도·구음을 채우지 않습니다.</small></label>
    <label className="field">검수 요청 범위<textarea name="reviewScope" rows={2} defaultValue={current.version.reviewScope??''} placeholder="예: 원문 위치, 악기형 확인, 교육·안전 검토"/></label>
    <details className="panel"><summary>출처와 국악 근거 편집</summary><div className="stack" style={{marginTop:20}}><label className="field">출처 기록 JSON{real&&<small>실제 원자료 연결은 읽기 전용입니다.</small>}<textarea name="sourceRefs" readOnly={Boolean(real)} aria-readonly={Boolean(real)} rows={9} spellCheck={false} defaultValue={pretty(current.resource.sourceRefs)} style={{fontFamily:'monospace'}}/></label><label className="field">국악 근거 정보 JSON<textarea name="gugakContext" rows={14} spellCheck={false} defaultValue={pretty(current.version.gugakContext)} style={{fontFamily:'monospace'}}/></label><p className="muted">확인되지 않은 값은 null, state는 unconfirmed입니다. sourceSlideIds는 실제 등록된 슬라이드 ID만 허용합니다. 현재 앱에 등록된 원문 슬라이드: {db.sourceSlides.length}개.</p></div></details>
    <details className="panel"><summary>권리 기록 편집</summary><div className="stack" style={{marginTop:20}}><p className="notice">열람·인쇄·내려받기는 각각 별도 권리입니다. 이 편집으로 교육 승인이나 공개가 자동 처리되지 않습니다.</p><label className="field">RightsRecord JSON<textarea name="rights" rows={12} spellCheck={false} defaultValue={pretty(current.version.rights)} style={{fontFamily:'monospace'}}/></label></div></details>
    <details className="panel"><summary>{real?'원문 단원 확인 · 읽기 전용':'구조화 단원 편집'}</summary><div className="stack" style={{marginTop:20}}><p className="notice">단원 ID·판본·순서를 유지하세요. 실행 가능한 HTML이나 외부 스크립트는 저장하지 않습니다. 미확인 이미지·악보·음원은 추가하지 않습니다.</p><label className="field">단원과 본문 블록 JSON<textarea name="units" readOnly={Boolean(real)} aria-readonly={Boolean(real)} rows={18} spellCheck={false} defaultValue={pretty(current.units)} style={{fontFamily:'monospace'}}/></label></div></details>
    <details className="panel"><summary>편집 전 판본과 비교</summary><p className="muted">이 기록은 편집창을 연 시점의 내용입니다. 저장 전 입력을 비교할 수 있으며 승인된 구판은 덮어쓰지 않습니다.</p><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontSize:13}}>{pretty({title:current.resource.title,sourceRefs:current.resource.sourceRefs,version:current.version.version,revision:current.version.revision,reviewState:current.version.reviewState,unitTitles:current.units.map(unit=>({id:unit.id,title:unit.title}))})}</pre></details>
    <label className="field">변경 요약 <span className="muted">필수</span><textarea name="changeSummary" rows={2} required maxLength={20000} placeholder="무엇을 어떤 근거로 수정했는지 적어 주세요."/></label>
    <p className="muted">저장은 초안 또는 수정 응답으로 처리됩니다. 검수 상태·승인자·승인 증빙은 이 편집창에서 직접 바꿀 수 없습니다.</p>
    <div className="row" style={{justifyContent:'flex-end',flexWrap:'wrap'}}><button type="button" className="button secondary" disabled={busy} onClick={close}>취소</button><button className="button" type="submit" disabled={busy}><Save size={17}/>{busy?'저장 중…':'초안 저장'}</button></div>
   </form>
  </>}
 </dialog>;
}
