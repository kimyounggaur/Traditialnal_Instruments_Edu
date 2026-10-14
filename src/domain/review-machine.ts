import {DomainValidationError,type ResourceVersion,type Resource,type ReviewCommand,type ReviewIssue} from './types';
import {unresolvedMajorIssues,resourceForVersion} from './visibility';
const allowed:Record<string,string[]>={draft:['in_review'],in_review:['changes_requested','approved','rejected'],changes_requested:['re_review'],re_review:['changes_requested','approved','rejected'],approved:[],rejected:[]};
export function transitionReview(version:ResourceVersion,command:ReviewCommand,resource:Resource,issues:ReviewIssue[]):ResourceVersion {
 resource=resourceForVersion(resource,version);
 const reject=(message:string):never=>{throw new DomainValidationError(message);};
 if(!allowed[version.reviewState]?.includes(command.target))reject('허용되지 않는 검수 상태 전이입니다. 승인·반려 후에는 새 초안 판본을 만드세요.');
 if(!command.reason.trim()||!command.actorId.trim())reject('검수 담당 역할과 사유가 필요합니다.');
 const scope=command.reviewScope?.trim()||version.reviewScope;
 const relevant=issues.filter(i=>i.versionId===version.id);
 if(command.target==='in_review'&&(!scope||!resource.sourceRefs.length||!version.version.trim()))reject('검수 요청에는 출처·판본·검수 범위가 필요합니다.');
 if(['changes_requested','approved','rejected'].includes(command.target)&&command.role!=='reviewer')reject('검수자 역할에서 처리할 수 있습니다.');
 if(command.target==='changes_requested'&&!relevant.some(i=>i.status==='open'&&i.description.trim()&&i.evidence.trim()&&i.suggestion.trim()&&i.unitId))reject('위치·근거·수정 제안이 있는 지적을 먼저 등록하세요.');
 if(command.target==='re_review'&&(!version.changeSummary.trim()||relevant.some(i=>i.status==='open'||(!i.resolution?.trim()&&i.status!=='dismissed'))))reject('수정 내역과 모든 지적에 대한 응답이 필요합니다.');
 if(command.target==='approved'){
  if(!scope||!command.evidenceRef?.trim())reject('승인 근거와 검수 범위가 필요합니다.');
  if(unresolvedMajorIssues(version,issues).length)reject('미해결 중대 지적이 있어 승인할 수 없습니다.');
  if(resource.datasetKind==='source_unreviewed')reject('실제 원자료는 전문가·권리 검토 근거를 별도 확인해야 합니다. 시연 승인으로 전환할 수 없습니다.');
  if(resource.datasetKind==='reviewed_real'&&(command.actorId.startsWith('demo')||command.evidenceRef?.startsWith('demo')))reject('실제 자료에 가상 승인 증거를 사용할 수 없습니다.');
 }
 const now=command.at??new Date().toISOString();
 return {...version,reviewState:command.target,reviewScope:scope??null,revision:version.revision+1,reviewedAt:command.role==='reviewer'?now:version.reviewedAt,approvedBy:command.target==='approved'?command.actorId:null,approvedAt:command.target==='approved'?now:null,approvalEvidenceRef:command.target==='approved'?command.evidenceRef!:null};
}
export function createDraftVersion(version:ResourceVersion,id:string,changeSummary:string,at=new Date().toISOString()):ResourceVersion {
 if(!id.trim()||id===version.id||!changeSummary.trim())throw new DomainValidationError('새 ID와 변경 요약이 필요합니다.');
 return {...structuredClone(version),id,version:`${version.version}-개정`,reviewState:'draft',basedOnVersionId:version.id,changeSummary,revision:0,createdAt:at,reviewedAt:null,approvedBy:null,approvedAt:null,approvalEvidenceRef:null,reviewerDisplayName:null,reviewerNameConsent:false};
}
