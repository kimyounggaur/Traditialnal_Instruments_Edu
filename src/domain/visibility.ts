import type {Audience, Database, Resource, ResourceVersion, ReviewIssue, ResourceMetadata} from './types';
export function unresolvedMajorIssues(version:ResourceVersion,issues:ReviewIssue[]):ReviewIssue[] {
 return issues.filter(i=>i.versionId===version.id&&(i.severity==='major'||i.severity==='critical'||i.category==='safety')&&!(i.status==='verified'&&Boolean(i.resolution?.trim()))&&!(i.status==='dismissed'&&Boolean(i.dismissalReason?.trim())&&i.category!=='music'&&i.category!=='safety'));
}
export function canPublish(version:ResourceVersion,resource:Resource,issues:ReviewIssue[]):boolean {
 resource=resourceForVersion(resource,version);
 return resource.datasetKind==='reviewed_real' && resource.publicationState==='published' && resource.publishedVersionId===version.id && version.resourceId===resource.id && version.reviewState==='approved' && Boolean(version.approvedBy?.trim()&&version.approvedAt&&version.approvalEvidenceRef?.trim()&&version.reviewScope?.trim()) && version.rights.state==='cleared'&&version.rights.allowView&&Boolean(version.rights.evidenceRef?.trim()&&version.rights.checkedAt&&version.rights.checkedBy?.trim())&&Boolean(resource.title.trim()&&resource.instrumentSystem.trim()&&resource.instrumentSystem!=='unknown'&&resource.level!==null&&resource.objectives.length&&resource.sourceRefs.length&&resource.sourceRefs.every(s=>s.title.trim())&&version.unitIds.length)&&unresolvedMajorIssues(version,issues).length===0;
}
export function demoVisible(version:ResourceVersion,resource:Resource,issues:ReviewIssue[]):boolean {
 resource=resourceForVersion(resource,version);
 return resource.datasetKind==='synthetic_demo'&&resource.publicationState==='published'&&resource.publishedVersionId===version.id&&version.resourceId===resource.id&&version.rights.state==='cleared'&&version.rights.allowView&&version.unitIds.length>0&&unresolvedMajorIssues(version,issues).length===0;
}
export function visibleResource(db:Database,resource:Resource,audience:Audience,versionId?:string):boolean {
 if(audience==='admin')return db.versions.some(v=>v.resourceId===resource.id&&v.id===(versionId??resource.currentDraftVersionId));
 const version=db.versions.find(v=>v.id===(versionId??resource.publishedVersionId)&&v.resourceId===resource.id);
 const viewableAsset=version&&db.assets.some(asset=>asset.resourceVersionId===version.id&&asset.format==='structured'&&asset.availability==='available'&&asset.rights.allowView);
 return Boolean(version&&viewableAsset&&(audience==='demo'?demoVisible(version,resource,db.issues):canPublish(version,resource,db.issues)));
}
export function visibleVersion(db:Database,resource:Resource,audience:Audience,versionId?:string):ResourceVersion|null {
 if(!visibleResource(db,resource,audience,versionId))return null;
 return db.versions.find(v=>v.id===(versionId??(audience==='admin'?resource.currentDraftVersionId:resource.publishedVersionId)))??null;
}

export function resourceMetadata(resource:Resource):ResourceMetadata { const {title,description,instrumentSystem,kind,level,objectives,topics,prerequisites,estimatedMinutes,sourceRefs,notationKinds,jangdanNames}=resource;return structuredClone({title,description,instrumentSystem,kind,level,objectives,topics,prerequisites,estimatedMinutes,sourceRefs,notationKinds,jangdanNames}); }
export function resourceForVersion(resource:Resource,version:ResourceVersion):Resource { return {...resource,...structuredClone(version.resourceSnapshot??{})}; }
